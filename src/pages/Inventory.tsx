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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Boxes, Plus, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatNumber } from "@/lib/format";

interface Item {
  id: string; name: string; sku: string | null; category: string | null;
  unit: string | null; quantity: number; reorder_level: number;
  unit_cost: number; supplier: string | null;
}

export default function Inventory() {
  const ctx = useOutletContext<OrgContext>();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", sku: "", category: "", unit: "pcs",
    quantity: "0", reorder_level: "0", unit_cost: "0", supplier: "",
  });

  const load = async () => {
    if (!ctx.orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, name, sku, category, unit, quantity, reorder_level, unit_cost, supplier")
      .eq("org_id", ctx.orgId).order("name");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ctx.orgId]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctx.orgId || !form.name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("inventory_items").insert({
      org_id: ctx.orgId,
      name: form.name,
      sku: form.sku || null,
      category: form.category || null,
      unit: form.unit || "pcs",
      quantity: Number(form.quantity) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      unit_cost: Number(form.unit_cost) || 0,
      supplier: form.supplier || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Item added");
    setOpen(false);
    setForm({ name: "", sku: "", category: "", unit: "pcs", quantity: "0", reorder_level: "0", unit_cost: "0", supplier: "" });
    load();
  };

  return (
    <div>
      <PageHeader
        icon={Boxes} title="Inventory"
        description="Track panels, inverters, batteries, cables — and get reorder alerts."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Add item</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Add inventory item</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-3">
                <F label="Name *"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></F>
                <div className="grid grid-cols-2 gap-3">
                  <F label="SKU"><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></F>
                  <F label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Panel, Inverter…" /></F>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <F label="Unit"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></F>
                  <F label="Quantity"><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></F>
                  <F label="Reorder at"><Input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} /></F>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Unit cost (₹)"><Input type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></F>
                  <F label="Supplier"><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></F>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="gov-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Boxes} title="No inventory yet"
          description="Add panels, inverters, and other components to track stock and get low-stock alerts on the dashboard." />
      ) : (
        <div className="gov-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="data-table-header">Item</TableHead>
              <TableHead className="data-table-header">SKU</TableHead>
              <TableHead className="data-table-header">Category</TableHead>
              <TableHead className="data-table-header">Stock</TableHead>
              <TableHead className="data-table-header">Reorder</TableHead>
              <TableHead className="data-table-header">Unit cost</TableHead>
              <TableHead className="data-table-header">Stock value</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((it) => {
                const low = Number(it.quantity) <= Number(it.reorder_level);
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {it.name}
                        {low && <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 gap-1"><AlertTriangle className="h-3 w-3" /> Low</Badge>}
                      </div>
                      {it.supplier && <div className="text-xs text-muted-foreground">{it.supplier}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{it.sku ?? "—"}</TableCell>
                    <TableCell className="text-sm">{it.category ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{formatNumber(it.quantity)} {it.unit}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{formatNumber(it.reorder_level)}</TableCell>
                    <TableCell className="tabular-nums">{formatINR(it.unit_cost)}</TableCell>
                    <TableCell className="tabular-nums font-medium">{formatINR(Number(it.quantity) * Number(it.unit_cost), { compact: true })}</TableCell>
                  </TableRow>
                );
              })}
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
