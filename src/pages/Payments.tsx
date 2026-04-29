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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Wallet, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatDate } from "@/lib/format";

const METHODS = ["cash", "upi", "bank_transfer", "cheque", "razorpay", "other"] as const;

interface Payment {
  id: string; amount: number; method: string; reference: string | null;
  paid_at: string;
  invoice_id: string | null;
  invoices: { invoice_number: string; customer_name: string } | null;
}

interface InvoiceOpt { id: string; invoice_number: string; customer_name: string; total: number; amount_paid: number; }

export default function Payments() {
  const ctx = useOutletContext<OrgContext>();
  const [items, setItems] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    invoice_id: "",
    amount: "",
    method: "upi",
    reference: "",
    paid_at: new Date().toISOString().slice(0, 10),
  });

  const load = async () => {
    if (!ctx.orgId) return;
    setLoading(true);
    const [pRes, iRes] = await Promise.all([
      supabase.from("payments")
        .select("id, amount, method, reference, paid_at, invoice_id, invoices(invoice_number, customer_name)")
        .eq("org_id", ctx.orgId).order("paid_at", { ascending: false }),
      supabase.from("invoices")
        .select("id, invoice_number, customer_name, total, amount_paid")
        .eq("org_id", ctx.orgId).order("issue_date", { ascending: false }),
    ]);
    if (pRes.error) toast.error(pRes.error.message);
    setItems((pRes.data ?? []) as any);
    setInvoices((iRes.data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ctx.orgId]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctx.orgId) return;
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setBusy(true);

    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("payments").insert({
      org_id: ctx.orgId,
      invoice_id: form.invoice_id || null,
      amount: Number(form.amount),
      method: form.method as any,
      reference: form.reference || null,
      paid_at: form.paid_at,
      created_by: u.user?.id,
    });

    if (!error && form.invoice_id) {
      const inv = invoices.find((i) => i.id === form.invoice_id);
      if (inv) {
        const newPaid = Number(inv.amount_paid) + Number(form.amount);
        const status = newPaid >= Number(inv.total) ? "paid" : "partial";
        await supabase.from("invoices").update({ amount_paid: newPaid, status: status as any }).eq("id", inv.id);
      }
    }

    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment recorded");
    setOpen(false);
    setForm({ invoice_id: "", amount: "", method: "upi", reference: "", paid_at: new Date().toISOString().slice(0, 10) });
    load();
  };

  return (
    <div>
      <PageHeader
        icon={Wallet} title="Payments"
        description="Record received payments and auto-update invoice status."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Record payment</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-3">
                <F label="Invoice (optional)">
                  <Select value={form.invoice_id} onValueChange={(v) => setForm({ ...form, invoice_id: v === "__none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="No specific invoice" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No specific invoice</SelectItem>
                      {invoices.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.invoice_number} · {i.customer_name} · {formatINR(Number(i.total) - Number(i.amount_paid))} due
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </F>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Amount (₹) *"><Input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></F>
                  <F label="Date"><Input type="date" required value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} /></F>
                </div>
                <F label="Method">
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </F>
                <F label="Reference / UTR"><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></F>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Record</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="gov-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments recorded"
          description="Once you start receiving payments, they'll show here and reconcile to invoices automatically." />
      ) : (
        <div className="gov-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="data-table-header">Date</TableHead>
              <TableHead className="data-table-header">Amount</TableHead>
              <TableHead className="data-table-header">Method</TableHead>
              <TableHead className="data-table-header">Invoice</TableHead>
              <TableHead className="data-table-header">Customer</TableHead>
              <TableHead className="data-table-header">Reference</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{formatDate(p.paid_at)}</TableCell>
                  <TableCell className="tabular-nums font-medium">{formatINR(p.amount)}</TableCell>
                  <TableCell className="capitalize text-sm">{p.method.replace("_", " ")}</TableCell>
                  <TableCell className="font-mono text-xs">{p.invoices?.invoice_number ?? "—"}</TableCell>
                  <TableCell className="text-sm">{p.invoices?.customer_name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.reference ?? "—"}</TableCell>
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
