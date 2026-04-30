import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { OrgContext } from "@/hooks/useOrg";
import { PageHeader, EmptyState } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Loader2, Eye, Printer, ArrowRightCircle } from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatDate } from "@/lib/format";
import LineItemEditor from "@/components/LineItemEditor";
import { computeTotals, emptyItem, GST_RATES, LineItem } from "@/lib/calc";
import DocumentView, { DocPayload } from "@/components/DocumentView";

const statusColor: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  sent: "bg-info/15 text-info border-info/30",
  accepted: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  expired: "bg-muted text-muted-foreground",
  converted: "bg-accent/20 text-accent-foreground border-accent/40",
};

interface Quote {
  id: string; quotation_number: string; customer_name: string;
  capacity_kw: number; system_type: string | null;
  subtotal: number; total: number; status: string;
  issue_date: string; valid_until: string | null;
}

const initialForm = {
  quotation_number: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_gstin: "",
  customer_address: "",
  city: "", state: "", pincode: "",
  capacity_kw: "",
  system_type: "on-grid",
  subsidy_amount: "0",
  discount: "0",
  gst_type: "intra" as "intra" | "inter",
  gst_rate: "12",
  issue_date: new Date().toISOString().slice(0, 10),
  valid_until: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
  notes: "",
  terms: "1. 50% advance, 40% before commissioning, 10% on handover.\n2. Subsidy reimbursement subject to govt. approval timelines.\n3. 25-year linear performance warranty on modules.\n4. Quote valid for 15 days from issue date.",
};

export default function Quotations() {
  const ctx = useOutletContext<OrgContext>();
  const [items, setItems] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [lines, setLines] = useState<LineItem[]>([emptyItem()]);
  const [previewDoc, setPreviewDoc] = useState<DocPayload | null>(null);

  const totals = useMemo(() => computeTotals(lines, {
    gst_type: form.gst_type, gst_rate: Number(form.gst_rate),
    discount: Number(form.discount || 0), subsidy: Number(form.subsidy_amount || 0),
  }), [lines, form.gst_type, form.gst_rate, form.discount, form.subsidy_amount]);

  const load = async () => {
    if (!ctx.orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("quotations")
      .select("id, quotation_number, customer_name, capacity_kw, system_type, subtotal, total, status, issue_date, valid_until")
      .eq("org_id", ctx.orgId)
      .order("issue_date", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Quote[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ctx.orgId]);

  const generateNumber = async () => {
    if (!ctx.orgId) return "QT-0001";
    const { count } = await supabase.from("quotations").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId);
    const yr = new Date().getFullYear().toString().slice(-2);
    return `QT-${yr}-${String((count ?? 0) + 1).padStart(4, "0")}`;
  };

  const openDialog = async () => {
    setForm({ ...initialForm, quotation_number: await generateNumber() });
    setLines([emptyItem()]);
    setOpen(true);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctx.orgId) return;
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    const validLines = lines.filter(l => l.description.trim() && l.amount > 0);
    if (validLines.length === 0) return toast.error("Add at least one line item with amount");

    setBusy(true);
    const { data: u } = await supabase.auth.getUser();

    const { data: q, error } = await supabase.from("quotations").insert({
      org_id: ctx.orgId,
      quotation_number: form.quotation_number,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone || null,
      customer_email: form.customer_email || null,
      customer_gstin: form.customer_gstin || null,
      customer_address: form.customer_address || null,
      city: form.city || null, state: form.state || null, pincode: form.pincode || null,
      capacity_kw: Number(form.capacity_kw || 0),
      system_type: form.system_type,
      subsidy_amount: Number(form.subsidy_amount || 0),
      discount: totals.discount,
      subtotal: totals.subtotal,
      cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst,
      total: totals.total,
      gst_type: form.gst_type,
      gst_rate: Number(form.gst_rate),
      status: "sent",
      issue_date: form.issue_date,
      valid_until: form.valid_until || null,
      notes: form.notes || null,
      terms: form.terms || null,
      created_by: u.user?.id,
    }).select("id").single();

    if (error || !q) { setBusy(false); toast.error(error?.message ?? "Failed"); return; }

    const itemsPayload = validLines.map((l, i) => ({
      quotation_id: q.id, org_id: ctx.orgId, position: i,
      description: l.description, hsn_sac: l.hsn_sac || null,
      quantity: l.quantity, unit: l.unit || null,
      unit_price: l.unit_price, amount: l.amount,
    }));
    const { error: e2 } = await supabase.from("quotation_items").insert(itemsPayload);
    setBusy(false);
    if (e2) { toast.error(e2.message); return; }
    toast.success(`Quotation ${form.quotation_number} created · ${formatINR(totals.total)}`);
    setOpen(false);
    load();
  };

  const openPreview = async (id: string) => {
    const { data: q } = await supabase.from("quotations").select("*").eq("id", id).single();
    const { data: its } = await supabase.from("quotation_items").select("*").eq("quotation_id", id).order("position");
    const { data: org } = await supabase.from("organizations").select("*").eq("id", ctx.orgId!).single();
    if (!q || !org) return toast.error("Could not load quotation");
    setPreviewDoc({
      kind: "QUOTATION", number: q.quotation_number, issue_date: q.issue_date, valid_until: q.valid_until,
      org: { name: org.name, gstin: org.gstin, address: org.address, city: org.city, state: org.state, pincode: org.pincode, phone: org.phone, email: org.email },
      customer: { name: q.customer_name, gstin: q.customer_gstin, address: [q.customer_address, q.city, q.state, q.pincode].filter(Boolean).join(", "), phone: q.customer_phone, email: q.customer_email },
      capacity_kw: q.capacity_kw, system_type: q.system_type,
      items: (its ?? []) as any,
      gst_type: q.gst_type as any, gst_rate: q.gst_rate,
      subtotal: q.subtotal, discount: q.discount, cgst: q.cgst, sgst: q.sgst, igst: q.igst,
      subsidy: q.subsidy_amount, total: q.total,
      notes: q.notes, terms: q.terms,
    });
  };

  const convertToInvoice = async (id: string) => {
    const { data: q } = await supabase.from("quotations").select("*").eq("id", id).single();
    const { data: its } = await supabase.from("quotation_items").select("*").eq("quotation_id", id).order("position");
    if (!q) return toast.error("Quotation not found");
    const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId!);
    const yr = new Date().getFullYear().toString().slice(-2);
    const inv_no = `INV-${yr}-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { data: inv, error } = await supabase.from("invoices").insert({
      org_id: ctx.orgId, invoice_number: inv_no,
      customer_name: q.customer_name, customer_gstin: q.customer_gstin,
      customer_address: [q.customer_address, q.city, q.state, q.pincode].filter(Boolean).join(", "),
      subtotal: q.subtotal, cgst: q.cgst, sgst: q.sgst, igst: q.igst, total: q.total,
      status: "sent", issue_date: new Date().toISOString().slice(0,10),
      gst_type: q.gst_type, gst_rate: q.gst_rate, discount: q.discount,
      quotation_id: q.id, notes: q.notes,
    }).select("id").single();
    if (error || !inv) return toast.error(error?.message ?? "Failed");

    if (its && its.length) {
      await supabase.from("invoice_items").insert(its.map((l: any, i: number) => ({
        invoice_id: inv.id, org_id: ctx.orgId, position: i,
        description: l.description, hsn_sac: l.hsn_sac, quantity: l.quantity,
        unit: l.unit, unit_price: l.unit_price, amount: l.amount,
      })));
    }
    await supabase.from("quotations").update({ status: "converted", converted_invoice_id: inv.id }).eq("id", id);
    toast.success(`Converted to invoice ${inv_no}`);
    load();
  };

  return (
    <div>
      <PageHeader
        icon={FileText} title="Quotations"
        description="Professional GST quotations with line items, subsidy, and one-click invoice conversion."
        action={<Button onClick={openDialog}><Plus className="h-4 w-4 mr-1.5" /> New quotation</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New quotation</DialogTitle></DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <F label="Quotation #"><Input required value={form.quotation_number} onChange={(e) => setForm({...form, quotation_number: e.target.value})} /></F>
              <F label="Issue date"><Input type="date" required value={form.issue_date} onChange={(e) => setForm({...form, issue_date: e.target.value})} /></F>
              <F label="Valid until"><Input type="date" value={form.valid_until} onChange={(e) => setForm({...form, valid_until: e.target.value})} /></F>
              <F label="Capacity (kW)"><Input type="number" step="0.01" value={form.capacity_kw} onChange={(e) => setForm({...form, capacity_kw: e.target.value})} /></F>
            </div>

            <fieldset className="border rounded-md p-3 space-y-3">
              <legend className="text-xs uppercase tracking-wider text-muted-foreground px-1">Customer</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <F label="Name *"><Input required value={form.customer_name} onChange={(e) => setForm({...form, customer_name: e.target.value})} /></F>
                <F label="Phone"><Input value={form.customer_phone} onChange={(e) => setForm({...form, customer_phone: e.target.value})} /></F>
                <F label="Email"><Input type="email" value={form.customer_email} onChange={(e) => setForm({...form, customer_email: e.target.value})} /></F>
                <F label="GSTIN"><Input value={form.customer_gstin} onChange={(e) => setForm({...form, customer_gstin: e.target.value})} className="font-mono uppercase" /></F>
                <F label="City"><Input value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} /></F>
                <F label="State / Pincode">
                  <div className="flex gap-2">
                    <Input value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} placeholder="State" />
                    <Input value={form.pincode} onChange={(e) => setForm({...form, pincode: e.target.value})} placeholder="PIN" className="w-24" />
                  </div>
                </F>
              </div>
              <F label="Address"><Input value={form.customer_address} onChange={(e) => setForm({...form, customer_address: e.target.value})} /></F>
            </fieldset>

            <fieldset className="border rounded-md p-3 space-y-3">
              <legend className="text-xs uppercase tracking-wider text-muted-foreground px-1">System & tax</legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <F label="System type">
                  <Select value={form.system_type} onValueChange={(v) => setForm({...form, system_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on-grid">On-Grid</SelectItem>
                      <SelectItem value="off-grid">Off-Grid</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                <F label="GST type">
                  <Select value={form.gst_type} onValueChange={(v) => setForm({...form, gst_type: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intra">Intra (CGST+SGST)</SelectItem>
                      <SelectItem value="inter">Inter (IGST)</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                <F label="GST rate %">
                  <Select value={form.gst_rate} onValueChange={(v) => setForm({...form, gst_rate: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                  </Select>
                </F>
                <F label="Discount (₹)"><Input type="number" min="0" value={form.discount} onChange={(e) => setForm({...form, discount: e.target.value})} /></F>
                <F label="Govt. subsidy (₹)"><Input type="number" min="0" value={form.subsidy_amount} onChange={(e) => setForm({...form, subsidy_amount: e.target.value})} /></F>
              </div>
            </fieldset>

            <LineItemEditor items={lines} onChange={setLines} />

            <div className="grid sm:grid-cols-2 gap-3">
              <F label="Notes"><Textarea rows={4} value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></F>
              <F label="Terms & conditions"><Textarea rows={4} value={form.terms} onChange={(e) => setForm({...form, terms: e.target.value})} /></F>
            </div>

            <div className="rounded-md bg-muted p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm tabular-nums">
              <Stat k="Subtotal" v={formatINR(totals.subtotal)} />
              <Stat k="Tax" v={formatINR(totals.cgst + totals.sgst + totals.igst)} />
              <Stat k="Subsidy" v={`− ${formatINR(Number(form.subsidy_amount || 0))}`} />
              <Stat k="Grand total" v={formatINR(totals.total)} bold />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create quotation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b bg-background no-print">
            <DialogTitle className="text-sm">Document preview</DialogTitle>
            <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" /> Print / Save as PDF</Button>
          </div>
          <div className="p-4">{previewDoc && <DocumentView doc={previewDoc} />}</div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="gov-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} title="No quotations yet"
          description="Create your first professional GST quotation. Convert to invoice with one click after acceptance." />
      ) : (
        <div className="gov-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="data-table-header">Quote #</TableHead>
                <TableHead className="data-table-header">Customer</TableHead>
                <TableHead className="data-table-header">kW</TableHead>
                <TableHead className="data-table-header">System</TableHead>
                <TableHead className="data-table-header">Issued</TableHead>
                <TableHead className="data-table-header">Valid till</TableHead>
                <TableHead className="data-table-header">Total</TableHead>
                <TableHead className="data-table-header">Status</TableHead>
                <TableHead className="data-table-header text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs">{q.quotation_number}</TableCell>
                  <TableCell className="font-medium">{q.customer_name}</TableCell>
                  <TableCell className="tabular-nums">{q.capacity_kw}</TableCell>
                  <TableCell className="capitalize text-sm">{q.system_type ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDate(q.issue_date)}</TableCell>
                  <TableCell className="text-sm">{formatDate(q.valid_until)}</TableCell>
                  <TableCell className="tabular-nums">{formatINR(q.total)}</TableCell>
                  <TableCell><Badge variant="outline" className={`capitalize ${statusColor[q.status] ?? ""}`}>{q.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openPreview(q.id)}><Eye className="h-3.5 w-3.5" /></Button>
                    {q.status !== "converted" && (
                      <Button size="sm" variant="ghost" title="Convert to invoice" onClick={() => convertToInvoice(q.id)}>
                        <ArrowRightCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>);
}
function Stat({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className={bold ? "text-lg font-bold text-foreground" : "text-base"}>{v}</div>
    </div>
  );
}
