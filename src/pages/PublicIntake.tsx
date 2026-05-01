import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GovStrip } from "@/components/GovHeader";
import { Sun, Loader2, Upload, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(2, "Name required").max(120),
  mobile: z.string().trim().regex(/^[+0-9\s-]{10,15}$/, "Valid mobile number required"),
  email: z.string().trim().email("Valid email required").max(200).or(z.literal("")),
  address: z.string().trim().min(5, "Address required").max(500),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, "6-digit PIN").or(z.literal("")),
  annual_gross_income: z.string().optional(),
  annual_net_income: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type FileSlot = "aadhaar" | "pan" | "electricity" | "house_tax";
const FILE_LABELS: Record<FileSlot, string> = {
  aadhaar: "Aadhaar card",
  pan: "PAN card",
  electricity: "Electricity bill (latest)",
  house_tax: "House tax receipt",
};

export default function PublicIntake() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [orgInfo, setOrgInfo] = useState<{ id: string; name: string; logo_url: string | null; city: string | null; state: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [files, setFiles] = useState<Record<FileSlot, File | null>>({ aadhaar: null, pan: null, electricity: null, house_tax: null });
  const [form, setForm] = useState({
    full_name: "", mobile: "", email: "", address: "",
    city: "", state: "", pincode: "",
    annual_gross_income: "", annual_net_income: "", notes: "",
  });

  useEffect(() => {
    document.title = "Customer Intake · SolarPro";
    if (!token) return;
    (async () => {
      const { data } = await supabase.rpc("org_public_profile", { _token: token });
      if (data && data.length > 0) setOrgInfo(data[0] as any);
      setLoading(false);
    })();
  }, [token]);

  const setFile = (slot: FileSlot, f: File | null) => {
    if (f && f.size > 5 * 1024 * 1024) { toast.error(`${FILE_LABELS[slot]} must be under 5MB`); return; }
    setFiles({ ...files, [slot]: f });
  };

  const uploadOne = async (slot: FileSlot, file: File, orgId: string, submissionId: string): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const safeExt = ["jpg", "jpeg", "png", "pdf", "webp"].includes(ext) ? ext : "bin";
    const path = `${orgId}/intake/${submissionId}/${slot}.${safeExt}`;
    const { error } = await supabase.storage.from("lead-documents").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error(`${FILE_LABELS[slot]}: ${error.message}`); return null; }
    return path;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgInfo || !token) return;

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      return toast.error(first ?? "Please check the form");
    }
    if (!files.aadhaar) return toast.error("Aadhaar photo required");
    if (!files.electricity) return toast.error("Electricity bill required");

    setSubmitting(true);

    // 1. Insert submission row first to get an ID
    const { data: ins, error: insErr } = await supabase.from("lead_submissions").insert({
      org_id: orgInfo.id,
      intake_token: token,
      full_name: form.full_name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim() || null,
      address: form.address.trim(),
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      pincode: form.pincode.trim() || null,
      annual_gross_income: form.annual_gross_income ? Number(form.annual_gross_income) : null,
      annual_net_income: form.annual_net_income ? Number(form.annual_net_income) : null,
      notes: form.notes.trim() || null,
    }).select("id").single();

    if (insErr || !ins) {
      setSubmitting(false);
      return toast.error(insErr?.message ?? "Submission failed");
    }

    // 2. Upload files in parallel
    const uploads = await Promise.all([
      files.aadhaar ? uploadOne("aadhaar", files.aadhaar, orgInfo.id, ins.id) : Promise.resolve(null),
      files.pan ? uploadOne("pan", files.pan, orgInfo.id, ins.id) : Promise.resolve(null),
      files.electricity ? uploadOne("electricity", files.electricity, orgInfo.id, ins.id) : Promise.resolve(null),
      files.house_tax ? uploadOne("house_tax", files.house_tax, orgInfo.id, ins.id) : Promise.resolve(null),
    ]);

    // 3. Update submission with paths
    await supabase.from("lead_submissions").update({
      aadhaar_path: uploads[0],
      pan_path: uploads[1],
      electricity_bill_path: uploads[2],
      house_tax_path: uploads[3],
    }).eq("id", ins.id);

    setSubmitting(false);
    setDone(true);
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!orgInfo) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <h1 className="font-display text-2xl mb-2">Invalid intake link</h1>
          <p className="text-muted-foreground">This link has been deactivated or is incorrect. Please contact your solar provider for a new link.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <GovStrip />
        <div className="max-w-xl mx-auto px-6 py-20 text-center">
          <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="font-display text-3xl mb-2">Submission received</h1>
          <p className="text-muted-foreground mb-6">
            Thank you, <strong>{form.full_name}</strong>. <strong>{orgInfo.name}</strong> has received your details and documents. A representative will contact you on <strong>{form.mobile}</strong> shortly.
          </p>
          <p className="text-xs text-muted-foreground">Reference saved securely. You may close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GovStrip />
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          {orgInfo.logo_url ? (
            <img src={orgInfo.logo_url} alt="" className="h-12 w-12 object-contain rounded-md border border-border" />
          ) : (
            <div className="h-12 w-12 rounded-md bg-primary text-primary-foreground grid place-items-center"><Sun className="h-6 w-6" /></div>
          )}
          <div>
            <div className="font-display text-xl">{orgInfo.name}</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Customer Onboarding · Solar Subsidy Application</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="gov-card p-5 mb-6 bg-info/5 border-info/30">
          <h2 className="font-display text-base mb-1">Get your rooftop solar quotation</h2>
          <p className="text-sm text-muted-foreground">Fill in your details and upload the required documents. Your information is encrypted and shared only with {orgInfo.name}. Required for PM Surya Ghar / state subsidy processing.</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <Section title="Personal details">
            <div className="grid sm:grid-cols-2 gap-4">
              <F label="Full name *"><Input required value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} maxLength={120} /></F>
              <F label="Mobile number *"><Input required type="tel" value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} placeholder="+91 9XXXXXXXXX" /></F>
              <F label="Email address"><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></F>
              <F label="Pincode"><Input value={form.pincode} onChange={(e) => setForm({...form, pincode: e.target.value})} maxLength={6} placeholder="6-digit" /></F>
            </div>
            <F label="Full address *"><Textarea required rows={2} value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} maxLength={500} /></F>
            <div className="grid sm:grid-cols-2 gap-4">
              <F label="City"><Input value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} /></F>
              <F label="State"><Input value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} /></F>
            </div>
          </Section>

          <Section title="Income details">
            <p className="text-xs text-muted-foreground -mt-2 mb-2">Required for subsidy eligibility verification under PM Surya Ghar Yojana.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <F label="Annual gross income (₹)"><Input type="number" min="0" value={form.annual_gross_income} onChange={(e) => setForm({...form, annual_gross_income: e.target.value})} placeholder="e.g. 800000" /></F>
              <F label="Annual net income (₹)"><Input type="number" min="0" value={form.annual_net_income} onChange={(e) => setForm({...form, annual_net_income: e.target.value})} placeholder="e.g. 600000" /></F>
            </div>
          </Section>

          <Section title="Document uploads">
            <p className="text-xs text-muted-foreground -mt-2 mb-2">Accepted formats: JPG, PNG, PDF. Maximum 5 MB per file.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <FileField label="Aadhaar card *" required file={files.aadhaar} onChange={(f) => setFile("aadhaar", f)} />
              <FileField label="PAN card" file={files.pan} onChange={(f) => setFile("pan", f)} />
              <FileField label="Electricity bill *" required file={files.electricity} onChange={(f) => setFile("electricity", f)} />
              <FileField label="House tax receipt" file={files.house_tax} onChange={(f) => setFile("house_tax", f)} />
            </div>
          </Section>

          <Section title="Anything else?">
            <F label="Notes (optional)"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} maxLength={1000} placeholder="Roof type, expected system size, preferred timeline…" /></F>
          </Section>

          <div className="gov-card p-4 bg-muted/40 text-xs text-muted-foreground">
            By submitting, you authorise <strong>{orgInfo.name}</strong> to contact you regarding your solar enquiry and to process your documents for quotation and subsidy purposes.
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit application
            </Button>
          </div>
        </form>
      </main>

      <footer className="mt-10">
        <GovStrip />
        <div className="text-center text-[11px] uppercase tracking-widest text-muted-foreground py-3">
          Secured by SolarPro · Powered by Lovable Cloud
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="gov-card p-5 space-y-4">
      <legend className="px-2 text-xs uppercase tracking-widest text-primary font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}
function FileField({ label, file, onChange, required }: { label: string; file: File | null; onChange: (f: File | null) => void; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <label className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition">
        <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm truncate flex-1">{file ? file.name : <span className="text-muted-foreground">Choose JPG / PNG / PDF…</span>}</span>
        {file && <FileText className="h-4 w-4 text-success shrink-0" />}
        <input type="file" required={required && !file} hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </label>
      {file && <div className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>}
    </div>
  );
}
