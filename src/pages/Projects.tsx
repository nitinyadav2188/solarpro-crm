import { useEffect, useState } from "react";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FolderKanban, Plus, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { formatINR, formatDate } from "@/lib/format";

const STATUSES = ["planning", "survey", "approved", "in_progress", "installed", "commissioned", "on_hold", "cancelled"] as const;

const statusColor: Record<string, string> = {
  planning: "bg-info/15 text-info border-info/30",
  survey: "bg-secondary text-secondary-foreground",
  approved: "bg-primary/15 text-primary border-primary/30",
  in_progress: "bg-accent/20 text-accent-foreground border-accent/40",
  installed: "bg-success/15 text-success border-success/30",
  commissioned: "bg-success/25 text-success border-success/40",
  on_hold: "bg-warning/20 text-warning border-warning/40",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const projectSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  customer_phone: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  capacity_kw: z.string(),
  total_value: z.string(),
  status: z.enum(STATUSES),
  scheduled_start_date: z.string().optional().or(z.literal("")),
  scheduled_end_date: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

interface Project {
  id: string; customer_name: string; customer_phone: string | null;
  city: string | null; state: string | null;
  capacity_kw: number; total_value: number; status: string;
  scheduled_start_date: string | null; scheduled_end_date: string | null;
  actual_completion_date: string | null;
}

export default function Projects() {
  const ctx = useOutletContext<OrgContext>();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", city: "", state: "",
    capacity_kw: "", total_value: "",
    status: "planning",
    scheduled_start_date: "", scheduled_end_date: "", notes: "",
  });

  const load = async () => {
    if (!ctx.orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("id, customer_name, customer_phone, city, state, capacity_kw, total_value, status, scheduled_start_date, scheduled_end_date, actual_completion_date")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Project[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ctx.orgId]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = projectSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!ctx.orgId) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("projects").insert({
      org_id: ctx.orgId,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      capacity_kw: parsed.data.capacity_kw ? Number(parsed.data.capacity_kw) : 0,
      total_value: parsed.data.total_value ? Number(parsed.data.total_value) : 0,
      status: parsed.data.status as any,
      scheduled_start_date: parsed.data.scheduled_start_date || null,
      scheduled_end_date: parsed.data.scheduled_end_date || null,
      notes: parsed.data.notes || null,
      created_by: u.user?.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Project created");
    setOpen(false);
    setForm({ customer_name: "", customer_phone: "", city: "", state: "",
      capacity_kw: "", total_value: "", status: "planning",
      scheduled_start_date: "", scheduled_end_date: "", notes: "" });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (["installed", "commissioned"].includes(status)) {
      patch.actual_completion_date = new Date().toISOString().slice(0, 10);
    }
    const { error } = await supabase.from("projects").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const filtered = items.filter((p) => statusFilter === "all" || p.status === statusFilter);
  const today = new Date();

  return (
    <div>
      <PageHeader
        icon={FolderKanban} title="Projects & Installations"
        description="Track every solar installation from planning to commissioning."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> New project</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New installation project</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Customer *"><Input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></Field>
                  <Field label="Phone"><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
                  <Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Capacity (kW)"><Input type="number" step="0.1" value={form.capacity_kw} onChange={(e) => setForm({ ...form, capacity_kw: e.target.value })} /></Field>
                  <Field label="Total value (₹)"><Input type="number" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value })} /></Field>
                </div>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start date"><Input type="date" value={form.scheduled_start_date} onChange={(e) => setForm({ ...form, scheduled_start_date: e.target.value })} /></Field>
                  <Field label="Target end date"><Input type="date" value={form.scheduled_end_date} onChange={(e) => setForm({ ...form, scheduled_end_date: e.target.value })} /></Field>
                </div>
                <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create project</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="gov-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet"
          description="Convert a lead or add a project directly to start tracking installations." />
      ) : (
        <div className="gov-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="data-table-header">Customer</TableHead>
                <TableHead className="data-table-header">Location</TableHead>
                <TableHead className="data-table-header">kW</TableHead>
                <TableHead className="data-table-header">Value</TableHead>
                <TableHead className="data-table-header">Status</TableHead>
                <TableHead className="data-table-header">Target end</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const overdue = p.scheduled_end_date && !p.actual_completion_date &&
                  new Date(p.scheduled_end_date) < today &&
                  !["installed", "commissioned", "cancelled"].includes(p.status);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div>{p.customer_name}</div>
                      {p.customer_phone && <div className="text-xs text-muted-foreground">{p.customer_phone}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{[p.city, p.state].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell className="tabular-nums">{p.capacity_kw}</TableCell>
                    <TableCell className="tabular-nums">{formatINR(p.total_value, { compact: true })}</TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <Badge variant="outline" className={`capitalize ${statusColor[p.status] ?? ""}`}>{p.status.replace("_", " ")}</Badge>
                        </SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5">
                        {overdue && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                        <span className={overdue ? "text-warning font-medium" : ""}>{formatDate(p.scheduled_end_date)}</span>
                      </div>
                    </TableCell>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
