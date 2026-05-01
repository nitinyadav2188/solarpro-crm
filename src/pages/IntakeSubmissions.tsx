import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { OrgContext } from "@/hooks/useOrg";
import { PageHeader, EmptyState } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Inbox, Eye, Loader2, UserPlus, Download } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

interface Submission {
  id: string; full_name: string; mobile: string; email: string | null;
  address: string | null; city: string | null; state: string | null; pincode: string | null;
  annual_gross_income: number | null; annual_net_income: number | null;
  aadhaar_path: string | null; pan_path: string | null;
  electricity_bill_path: string | null; house_tax_path: string | null;
  notes: string | null; status: string; created_at: string;
  converted_lead_id: string | null;
}

const statusColor: Record<string, string> = {
  new: "bg-info/15 text-info border-info/30",
  reviewed: "bg-warning/15 text-warning border-warning/30",
  converted: "bg-success/15 text-success border-success/30",
  spam: "bg-muted text-muted-foreground",
};

export default function IntakeSubmissions() {
  const ctx = useOutletContext<OrgContext>();
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<Submission | null>(null);

  const load = async () => {
    if (!ctx.orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("lead_submissions")
      .select("*")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Submission[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [ctx.orgId]);

  const signed = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("lead-documents").createSignedUrl(path, 600);
    return data?.signedUrl ?? null;
  };

  const downloadDoc = async (path: string | null, label: string) => {
    if (!path) return toast.error(`${label} not provided`);
    const url = await signed(path);
    if (!url) return toast.error("Could not generate link");
    window.open(url, "_blank");
  };

  const convertToLead = async (s: Submission) => {
    if (!ctx.orgId) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: lead, error } = await supabase.from("leads").insert({
      org_id: ctx.orgId,
      name: s.full_name,
      phone: s.mobile,
      email: s.email,
      address: s.address,
      city: s.city,
      state: s.state,
      pincode: s.pincode,
      source: "website",
      stage: "new",
      notes: [
        s.notes,
        s.annual_gross_income ? `Annual gross: ₹${s.annual_gross_income}` : null,
        s.annual_net_income ? `Annual net: ₹${s.annual_net_income}` : null,
        "— Imported from public intake form",
      ].filter(Boolean).join("\n"),
      created_by: u.user?.id,
    }).select("id").single();
    if (error || !lead) { setBusy(false); return toast.error(error?.message ?? "Failed"); }

    // Link uploaded documents to this lead
    const docInserts = [
      { path: s.aadhaar_path, type: "aadhaar", name: "Aadhaar" },
      { path: s.pan_path, type: "pan", name: "PAN" },
      { path: s.electricity_bill_path, type: "electricity_bill", name: "Electricity Bill" },
      { path: s.house_tax_path, type: "house_tax", name: "House Tax Receipt" },
    ].filter(d => d.path);
    if (docInserts.length > 0) {
      await supabase.from("documents").insert(docInserts.map(d => ({
        org_id: ctx.orgId,
        entity_type: "lead",
        entity_id: lead.id,
        doc_type: d.type,
        file_name: d.name,
        file_path: d.path!,
        uploaded_by: u.user?.id,
      })));
    }

    await supabase.from("lead_submissions").update({ status: "converted", converted_lead_id: lead.id }).eq("id", s.id);
    setBusy(false);
    toast.success(`Converted to lead — ${docInserts.length} documents attached`);
    setActive(null);
    load();
  };

  const markSpam = async (id: string) => {
    await supabase.from("lead_submissions").update({ status: "spam" }).eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader icon={Inbox} title="Customer Intake" description="Submissions from your public intake form. Review, download documents, and convert to leads." />

      {loading ? (
        <div className="gov-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title="No submissions yet"
          description="Share your intake link from Settings via WhatsApp, SMS or QR. Customer-submitted details and documents will land here." />
      ) : (
        <div className="gov-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="data-table-header">Submitted</TableHead>
                <TableHead className="data-table-header">Name</TableHead>
                <TableHead className="data-table-header">Mobile</TableHead>
                <TableHead className="data-table-header">City</TableHead>
                <TableHead className="data-table-header">Docs</TableHead>
                <TableHead className="data-table-header">Status</TableHead>
                <TableHead className="data-table-header text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => {
                const docs = [s.aadhaar_path, s.pan_path, s.electricity_bill_path, s.house_tax_path].filter(Boolean).length;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{formatDate(s.created_at)}</TableCell>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.mobile}</TableCell>
                    <TableCell className="text-sm">{s.city ?? "—"}</TableCell>
                    <TableCell className="text-sm">{docs}/4</TableCell>
                    <TableCell><Badge variant="outline" className={`capitalize ${statusColor[s.status]}`}>{s.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setActive(s)}><Eye className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submission · {active?.full_name}</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info k="Mobile" v={active.mobile} />
                <Info k="Email" v={active.email ?? "—"} />
                <Info k="Annual gross" v={active.annual_gross_income ? `₹${active.annual_gross_income.toLocaleString("en-IN")}` : "—"} />
                <Info k="Annual net" v={active.annual_net_income ? `₹${active.annual_net_income.toLocaleString("en-IN")}` : "—"} />
              </div>
              <Info k="Address" v={[active.address, active.city, active.state, active.pincode].filter(Boolean).join(", ") || "—"} />
              {active.notes && <Info k="Notes" v={active.notes} />}

              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Documents</div>
                <div className="grid grid-cols-2 gap-2">
                  <DocBtn label="Aadhaar" path={active.aadhaar_path} onClick={downloadDoc} />
                  <DocBtn label="PAN" path={active.pan_path} onClick={downloadDoc} />
                  <DocBtn label="Electricity Bill" path={active.electricity_bill_path} onClick={downloadDoc} />
                  <DocBtn label="House Tax" path={active.house_tax_path} onClick={downloadDoc} />
                </div>
              </div>

              <DialogFooter className="gap-2">
                {active.status !== "spam" && active.status !== "converted" && (
                  <Button variant="outline" onClick={() => markSpam(active.id)}>Mark as spam</Button>
                )}
                {active.status !== "converted" && (
                  <Button onClick={() => convertToLead(active)} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    Convert to lead
                  </Button>
                )}
                {active.status === "converted" && (
                  <Badge variant="outline" className={statusColor.converted}>Already converted</Badge>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="font-medium">{v}</div>
    </div>
  );
}
function DocBtn({ label, path, onClick }: { label: string; path: string | null; onClick: (p: string | null, l: string) => void }) {
  return (
    <Button variant="outline" size="sm" disabled={!path} onClick={() => onClick(path, label)} className="justify-start">
      <Download className="h-3.5 w-3.5 mr-2" />
      <span className="truncate">{label} {!path && "(missing)"}</span>
    </Button>
  );
}
