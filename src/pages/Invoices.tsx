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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Plus, Loader2, Eye, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatDate } from "@/lib/format";
import LineItemEditor from "@/components/LineItemEditor";
import { computeTotals, emptyItem, GST_RATES, LineItem } from "@/lib/calc";
import DocumentView, { DocPayload } from "@/components/DocumentView";

const statusColor: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  sent: "bg-info/15 text-info border-info/30",
  partial: "bg-warning/20 text-warning border-warning/40",
  paid: "bg-success/15 text-success border-success/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground",
};

interface Invoice {
  id: string; invoice_number: string; customer_name: string;
  subtotal: number; cgst: number; sgst: number; igst: number; total: number;
  amount_paid: number; status: string; issue_date: string; due_date: string | null;
}

const initialForm = {
  invoice_number: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_gstin: "",
  customer_address: "",
  capacity_kw: "",
  system_type: "on-grid",
  discount: "0",
  gst_type: "intra" as "intra" | "inter",
  gst_rate: "12",
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
  notes: "",
};

export default function Invoices() {
  const ctx = useOutletContext<OrgContext>();
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [lines, setLines] = useState<LineItem[]>([emptyItem()]);
  const [previewDoc, setPreviewDoc] = useState<DocPayload | null>(null);

  const totals = useMemo(() => computeTotals(lines, {
    gst_type: form.gst_type, gst_rate: Number(form.gst_rate), discount: Number(form.discount || 0),
  }), [lines, form.gst_type, form.gst_rate, form.discount]);

  const load = async () => {
    if (!ctx.orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, customer_name, subtotal, cgst, sgst, igst, total, amount_paid, status, issue_date, due_date")
      .eq("org_id", ctx.orgId)
      .order("issue_date", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Invoice[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ctx.orgId]);

  const generateNumber = async () => {
    if (!ctx.orgId) return "INV-0001";
    const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId);
    const yr = new Date().getFullYear().toString().slice(-2);
    return `INV-${yr}-${String((count ?? 0) + 1).padStart(4, "0")}`;
  };

  const openDialog = async () => {
    setForm({ ...initialForm, invoice_number: await generateNumber() });
    setLines([emptyItem()]);
    setOpen(true);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctx.orgId) return;
    if (!form.customer_name.trim()) return toast.error("Customer name required");
    const validLines = lines.filter(l => l.description.trim() && l.amount > 0);
    if (validLines.length === 0) return toast.error("Add at least one line item");

    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: inv, error } = await supabase.from("invoices").insert({
      org_id: ctx.orgId,
      invoice_number: form.invoice_number,
      customer_name: form.customer_name,
      customer_gstin: form.customer_gstin || null,
      customer_address: form.customer_address || null,
      subtotal: totals.subtotal, cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst,
      total: totals.total, discount: totals.discount,
      gst_type: form.gst_type, gst_rate: Number(form.gst_rate),
      status: "sent",
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      notes: form.notes || null,
      created_by: u.user?.id,
    }).select("id").single();

    if (error || !inv) { setBusy(false); toast.error(error?.message ?? "Failed"); return; }

    const itemsPayload = validLines.map((l, i) => ({
      invoice_id: inv.id, org_id: ctx.orgId, position: i,
      description: l.description, hsn_sac: l.hsn_sac || null,
      quantity: l.quantity, unit: l.unit || null,
      unit_price: l.unit_price, amount: l.amount,
    }));
    const { error: e2 } = await supabase.from("invoice_items").insert(itemsPayload);
    setBusy(false);
    if (e2) { toast.error(e2.message); return; }
    toast.success(`Invoice ${form.invoice_number} created · ${formatINR(totals.total)}`);
    setOpen(false);
    load();
  };

  const openPreview = async (id: string) => {
    const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).single();
    const { data: its } = await supabase.from("invoice_items").select("*").eq("invoice_id", id).order("position");
    const { data: org } = await supabase.from("organizations").select("*").eq("id", ctx.orgId!).single();
    if (!inv || !org) return toast.error("Could not load invoice");
    setPreviewDoc({
      kind: "TAX INVOICE", number: inv.invoice_number, issue_date: inv.issue_date, due_date: inv.due_date,
      org: { name: org.name, gstin: org.gstin, address: org.address, city: org.city, state: org.state, pincode: org.pincode, phone: org.phone, email: org.email },
      customer: { name: inv.customer_name, gstin: inv.customer_gstin, address: inv.customer_address, phone: null, email: null },
      capacity_kw: null, system_type: null,
      items: (its ?? []) as any,
      gst_type: (inv.gst_type as any) ?? "intra", gst_rate: inv.gst_rate ?? 18,
      subtotal: inv.subtotal, discount: inv.discount ?? 0, cgst: inv.cgst, sgst: inv.sgst, igst: inv.igst,
      total: inv.total, notes: inv.notes,
    });
  };

  return (
    <div>
      <PageHeader
        icon={Receipt} title="Tax Invoices"
        description="Multi-line GST invoices with HSN codes, ready for filing."
        action={<Button onClick={openDialog}><Plus className="h-4 w-4 mr-1.5" /> New invoice</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New tax invoice</DialogTitle></DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <F label="Invoice #"><Input required value={form.invoice_number} onChange={(e) => setForm({...form, invoice_number: e.target.value})} /></F>
              <F label="Issue date"><Input type="date" required value={form.issue_date} onChange={(e) => setForm({...form, issue_date: e.target.value})} /></F>
              <F label="Due date"><Input type="date" value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})} /></F>
              <F label="Capacity (kW)"><Input type="number" step="0.01" value={form.capacity_kw} onChange={(e) => setForm({...form, capacity_kw: e.target.value})} /></F>
            </div>

            <fieldset className="border rounded-md p-3 space-y-3">
              <legend className="text-xs uppercase tracking-wider text-muted-foreground px-1">Bill to</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <F label="Name *"><Input required value={form.customer_name} onChange={(e) => setForm({...form, customer_name: e.target.value})} /></F>
                <F label="GSTIN"><Input value={form.customer_gstin} onChange={(e) => setForm({...form, customer_gstin: e.target.value})} className="font-mono uppercase" /></F>
                <F label="Phone"><Input value={form.customer_phone} onChange={(e) => setForm({...form, customer_phone: e.target.value})} /></F>
              </div>
              <F label="Address"><Input value={form.customer_address} onChange={(e) => setForm({...form, customer_address: e.target.value})} /></F>
            </fieldset>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            </div>

            <LineItemEditor items={lines} onChange={setLines} />

            <F label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></F>

            <div className="rounded-md bg-muted p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm tabular-nums">
              <Stat k="Subtotal" v={formatINR(totals.subtotal)} />
              <Stat k="Discount" v={`− ${formatINR(totals.discount)}`} />
              <Stat k="Tax" v={formatINR(totals.cgst + totals.sgst + totals.igst)} />
              <Stat k="Grand total" v={formatINR(totals.total)} bold />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b bg-background no-print">
            <DialogTitle className="text-sm">Invoice preview</DialogTitle>
            <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" /> Print / Save as PDF</Button>
          </div>
          <div className="p-4">{previewDoc && <DocumentView doc={previewDoc} />}</div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="gov-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet"
          description="Create your first multi-line GST invoice. HSN codes and CGST/SGST/IGST split are computed automatically." />
      ) : (
        <div className="gov-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="data-table-header">#</TableHead>
                <TableHead className="data-table-header">Customer</TableHead>
                <TableHead className="data-table-header">Issue</TableHead>
                <TableHead className="data-table-header">Due</TableHead>
                <TableHead className="data-table-header">Total</TableHead>
                <TableHead className="data-table-header">Paid</TableHead>
                <TableHead className="data-table-header">Status</TableHead>
                <TableHead className="data-table-header text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                  <TableCell className="font-medium">{i.customer_name}</TableCell>
                  <TableCell className="text-sm">{formatDate(i.issue_date)}</TableCell>
                  <TableCell className="text-sm">{formatDate(i.due_date)}</TableCell>
                  <TableCell className="tabular-nums">{formatINR(i.total)}</TableCell>
                  <TableCell className="tabular-nums">{formatINR(i.amount_paid)}</TableCell>
                  <TableCell><Badge variant="outline" className={`capitalize ${statusColor[i.status] ?? ""}`}>{i.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openPreview(i.id)}><Eye className="h-3.5 w-3.5" /></Button>
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
