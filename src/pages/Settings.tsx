import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { OrgContext } from "@/hooks/useOrg";
import { PageHeader } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Loader2, Copy, ExternalLink, Upload, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const ctx = useOutletContext<OrgContext>();
  const isOwner = ctx.roles.includes("owner");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [org, setOrg] = useState<any>(null);

  const load = async () => {
    if (!ctx.orgId) return;
    setLoading(true);
    const { data } = await supabase.from("organizations").select("*").eq("id", ctx.orgId).single();
    setOrg(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [ctx.orgId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctx.orgId || !isOwner) return;
    setBusy(true);
    const { error } = await supabase.from("organizations").update({
      name: org.name?.trim() ?? "",
      gstin: org.gstin?.trim() || null,
      pan: org.pan?.trim() || null,
      phone: org.phone?.trim() || null,
      email: org.email?.trim() || null,
      website: org.website?.trim() || null,
      address: org.address?.trim() || null,
      city: org.city?.trim() || null,
      state: org.state?.trim() || null,
      pincode: org.pincode?.trim() || null,
    }).eq("id", ctx.orgId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Company profile saved");
    load();
  };

  const uploadLogo = async (file: File) => {
    if (!ctx.orgId || !isOwner) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo must be under 2MB");
    setLogoBusy(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${ctx.orgId}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("org-logos").upload(path, file, { upsert: true });
    if (upErr) { setLogoBusy(false); return toast.error(upErr.message); }
    const { data } = supabase.storage.from("org-logos").getPublicUrl(path);
    const { error } = await supabase.from("organizations").update({ logo_url: data.publicUrl }).eq("id", ctx.orgId);
    setLogoBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Logo uploaded");
    load();
  };

  const rotateToken = async () => {
    if (!ctx.orgId || !isOwner) return;
    if (!confirm("Rotating will invalidate your current intake link. Existing customers won't be able to use the old link. Continue?")) return;
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("organizations").update({ intake_token: newToken }).eq("id", ctx.orgId);
    if (error) return toast.error(error.message);
    toast.success("New intake link generated");
    load();
  };

  if (loading || !org) {
    return <div><PageHeader icon={SettingsIcon} title="Settings" description="" /><div className="gov-card p-12 text-center text-muted-foreground">Loading…</div></div>;
  }

  const intakeUrl = `${window.location.origin}/intake/${org.intake_token}`;

  return (
    <div>
      <PageHeader icon={SettingsIcon} title="Company Settings" description="This information appears on every quotation and invoice you generate." />

      {!isOwner && (
        <div className="gov-card p-4 mb-4 border-warning/40 bg-warning/10 text-warning text-sm">
          Read-only — only organization owners can edit settings.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Company profile */}
        <form onSubmit={save} className="gov-card p-5 space-y-4 lg:col-span-2">
          <div>
            <h2 className="font-display text-lg">Company profile</h2>
            <p className="text-xs text-muted-foreground">Used as the seller details on every invoice & quotation.</p>
          </div>

          <fieldset disabled={!isOwner || busy} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <F label="Legal name *"><Input required value={org.name ?? ""} onChange={(e) => setOrg({ ...org, name: e.target.value })} /></F>
              <F label="GSTIN"><Input value={org.gstin ?? ""} onChange={(e) => setOrg({ ...org, gstin: e.target.value.toUpperCase() })} className="font-mono uppercase" placeholder="22AAAAA0000A1Z5" maxLength={15} /></F>
              <F label="PAN"><Input value={org.pan ?? ""} onChange={(e) => setOrg({ ...org, pan: e.target.value.toUpperCase() })} className="font-mono uppercase" placeholder="AAAPL1234C" maxLength={10} /></F>
              <F label="Phone"><Input value={org.phone ?? ""} onChange={(e) => setOrg({ ...org, phone: e.target.value })} placeholder="+91 9XXXXXXXXX" /></F>
              <F label="Email"><Input type="email" value={org.email ?? ""} onChange={(e) => setOrg({ ...org, email: e.target.value })} /></F>
              <F label="Website"><Input value={org.website ?? ""} onChange={(e) => setOrg({ ...org, website: e.target.value })} placeholder="https://" /></F>
            </div>
            <F label="Registered address"><Textarea rows={2} value={org.address ?? ""} onChange={(e) => setOrg({ ...org, address: e.target.value })} /></F>
            <div className="grid sm:grid-cols-3 gap-3">
              <F label="City"><Input value={org.city ?? ""} onChange={(e) => setOrg({ ...org, city: e.target.value })} /></F>
              <F label="State"><Input value={org.state ?? ""} onChange={(e) => setOrg({ ...org, state: e.target.value })} /></F>
              <F label="Pincode"><Input value={org.pincode ?? ""} onChange={(e) => setOrg({ ...org, pincode: e.target.value })} maxLength={6} /></F>
            </div>
          </fieldset>

          {isOwner && (
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save changes</Button>
            </div>
          )}
        </form>

        {/* Logo + intake link */}
        <div className="space-y-6">
          <div className="gov-card p-5 space-y-4">
            <h2 className="font-display text-lg">Company logo</h2>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-md border border-border bg-muted overflow-hidden grid place-items-center text-xs text-muted-foreground">
                {org.logo_url ? <img src={org.logo_url} alt="Logo" className="h-full w-full object-contain" /> : "No logo"}
              </div>
              {isOwner && (
                <label className="cursor-pointer">
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} disabled={logoBusy} />
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm hover:bg-secondary/80">
                    {logoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                  </span>
                </label>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">PNG/JPG/SVG, max 2MB. Appears on invoices & quotations.</p>
          </div>

          <div className="gov-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">Customer intake link</h2>
              {isOwner && (
                <Button size="sm" variant="ghost" onClick={rotateToken} title="Generate new link"><RefreshCw className="h-3.5 w-3.5" /></Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Share this link via WhatsApp, SMS, or QR code. Submissions land in <strong>Intake</strong> ready to convert into Leads.</p>
            <div className="flex gap-2">
              <Input readOnly value={intakeUrl} className="font-mono text-xs" />
              <Button type="button" size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(intakeUrl); toast.success("Link copied"); }}><Copy className="h-3.5 w-3.5" /></Button>
              <Button type="button" size="sm" variant="outline" asChild><a href={intakeUrl} target="_blank" rel="noopener"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
            </div>
          </div>

          <div className="gov-card p-5 space-y-2 border-info/30 bg-info/5">
            <h3 className="font-display text-sm">Twilio (SMS / WhatsApp)</h3>
            <p className="text-xs text-muted-foreground">Configuration deferred. You can connect this later to enable customer notifications.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
