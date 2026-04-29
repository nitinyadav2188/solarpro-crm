import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { OrgContext } from "@/hooks/useOrg";
import { PageHeader, EmptyState } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Receipt, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatDate } from "@/lib/format";

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

export default function Invoices() {
  const ctx = useOutletContext<OrgContext>();
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    invoice_number: "",
    customer_name: "",
    customer_gstin: "",
    customer_address: "",
    subtotal: "",
    gst_type: "intra" as "intra" | "inter",
    gst_rate: "18",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    notes: "",
  });

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
    const n = (count ?? 0) + 1;
    const yr = new Date().getFullYear().toString().slice(-2);
    return `INV-${yr}-${String(n).padStart(4, "0")}`;
  };

  const openDialog = async () => {
    setForm({ ...form, invoice_number: await generateNumber() });
    setOpen(true);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctx.orgId) return;
    if (!form.customer_name.trim() || !form.subtotal) {
      toast.error("Customer and amount are required");
      return;
    }
    setBusy(true);
    const subtotal = Number(form.subtotal);
    const rate = Number(form.gst_rate) / 100;
    let cgst = 0, sgst = 0, igst = 0;
    if (form.gst_type === "intra") {
      cgst = +(subtotal * rate / 2).toFixed(2);
      sgst = +(subtotal * rate / 2).toFixed(2);
    } else {
      igst = +(subtotal * rate).toFixed(2);
    }
    const total = +(subtotal + cgst + sgst + igst).toFixed(2);

    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("invoices").insert({
      org_id: ctx.orgId,
      invoice_number: form.invoice_number,
      customer_name: form.customer_name,
      customer_gstin: form.customer_gstin || null,
      customer_address: form.customer_address || null,
      subtotal, cgst, sgst, igst, total,
      status: "sent",
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      notes: form.notes || null,
      created_by: u.user?.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Invoice ${form.invoice_number} created · Total ${formatINR(total)}`);
    setOpen(false);
    load();
  };

  return (
    <div>
      <PageHeader
        icon={Receipt} title="Invoices"
        description="GST-ready invoices with CGST/SGST or IGST split."
        action={<Button onClick={openDialog}><Plus className="h-4 w-4 mr-1.5" /> New invoice</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New GST invoice</DialogTitle></DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <F label="Invoice #"><Input required value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></F>
              <F label="Issue date"><Input type="date" required value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></F>
            </div>
            <F label="Customer name *"><Input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Customer GSTIN"><Input value={form.customer_gstin} onChange={(e) => setForm({ ...form, customer_gstin: e.target.value })} /></F>
              <F label="Due date"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></F>
            </div>
            <F label="Customer address"><Input value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} /></F>
            <div className="grid grid-cols-3 gap-3">
              <F label="Subtotal (₹) *"><Input type="number" required value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} /></F>
              <F label="GST type">
                <Select value={form.gst_type} onValueChange={(v) => setForm({ ...form, gst_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intra">Intra (CGST+SGST)</SelectItem>
                    <SelectItem value="inter">Inter (IGST)</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="GST rate %">
                <Select value={form.gst_rate} onValueChange={(v) => setForm({ ...form, gst_rate: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["0", "5", "12", "18", "28"].map((r) => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            </div>
            {form.subtotal && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1 tabular-nums">
                <Row k="Subtotal" v={formatINR(Number(form.subtotal))} />
                {form.gst_type === "intra" ? (
                  <>
                    <Row k={`CGST @ ${Number(form.gst_rate) / 2}%`} v={formatINR(Number(form.subtotal) * Number(form.gst_rate) / 200)} />
                    <Row k={`SGST @ ${Number(form.gst_rate) / 2}%`} v={formatINR(Number(form.subtotal) * Number(form.gst_rate) / 200)} />
                  </>
                ) : (
                  <Row k={`IGST @ ${form.gst_rate}%`} v={formatINR(Number(form.subtotal) * Number(form.gst_rate) / 100)} />
                )}
                <div className="border-t border-border pt-1 mt-1">
                  <Row k="Total" v={formatINR(Number(form.subtotal) * (1 + Number(form.gst_rate) / 100))} bold />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="gov-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet"
          description="Create GST-ready invoices with one click. CGST/SGST and IGST are calculated automatically." />
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
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${statusColor[i.status] ?? ""}`}>{i.status}</Badge>
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
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (<div className={`flex justify-between ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}><span>{k}</span><span>{v}</span></div>);
}
