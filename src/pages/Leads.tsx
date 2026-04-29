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
import { Users, Plus, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { formatINR, formatDate } from "@/lib/format";

const STAGES = ["new", "contacted", "qualified", "quoted", "won", "lost"] as const;
const SOURCES = ["website", "referral", "google_ads", "meta_ads", "walk_in", "whatsapp", "other"] as const;

const stageColor: Record<string, string> = {
  new: "bg-info/15 text-info border-info/30",
  contacted: "bg-secondary text-secondary-foreground",
  qualified: "bg-primary/15 text-primary border-primary/30",
  quoted: "bg-accent/20 text-accent-foreground border-accent/40",
  won: "bg-success/15 text-success border-success/30",
  lost: "bg-destructive/15 text-destructive border-destructive/30",
};

const leadSchema = z.object({
  name: z.string().trim().min(2, "Name required").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  source: z.enum(SOURCES),
  stage: z.enum(STAGES),
  expected_capacity_kw: z.string().optional(),
  expected_value: z.string().optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

interface Lead {
  id: string;
  name: string; phone: string | null; email: string | null;
  city: string | null; state: string | null;
  stage: string; source: string;
  expected_capacity_kw: number | null;
  expected_value: number | null;
  created_at: string;
}

export default function Leads() {
  const ctx = useOutletContext<OrgContext>();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const [form, setForm] = useState({
    name: "", phone: "", email: "", city: "", state: "",
    source: "other", stage: "new",
    expected_capacity_kw: "", expected_value: "", notes: "",
  });

  const load = async () => {
    if (!ctx.orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, phone, email, city, state, stage, source, expected_capacity_kw, expected_value, created_at")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setLeads((data ?? []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ctx.orgId]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!ctx.orgId) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("leads").insert({
      org_id: ctx.orgId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      source: parsed.data.source as any,
      stage: parsed.data.stage as any,
      expected_capacity_kw: parsed.data.expected_capacity_kw ? Number(parsed.data.expected_capacity_kw) : null,
      expected_value: parsed.data.expected_value ? Number(parsed.data.expected_value) : null,
      notes: parsed.data.notes || null,
      created_by: u.user?.id,
      assigned_to: u.user?.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lead added");
    setOpen(false);
    setForm({ name: "", phone: "", email: "", city: "", state: "",
      source: "other", stage: "new", expected_capacity_kw: "", expected_value: "", notes: "" });
    load();
  };

  const updateStage = async (id: string, stage: string) => {
    const { error } = await supabase.from("leads").update({ stage: stage as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
  };

  const filtered = leads.filter((l) => {
    if (stageFilter !== "all" && l.stage !== stageFilter) return false;
    if (q && !(`${l.name} ${l.phone ?? ""} ${l.city ?? ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        icon={Users} title="Leads"
        description="Capture, qualify, and convert solar leads."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1.5" /> New lead</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Add new lead</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name *"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                  <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                </div>
                <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
                  <Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Source">
                    <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Stage">
                    <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Capacity (kW)"><Input type="number" step="0.1" value={form.expected_capacity_kw} onChange={(e) => setForm({ ...form, expected_capacity_kw: e.target.value })} /></Field>
                  <Field label="Expected value (₹)"><Input type="number" value={form.expected_value} onChange={(e) => setForm({ ...form, expected_value: e.target.value })} /></Field>
                </div>
                <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save lead</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="gov-card p-12 text-center text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No leads yet"
          description="Click 'New lead' to add your first one. Leads are isolated to your company — nobody else can see them." />
      ) : (
        <div className="gov-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="data-table-header">Name</TableHead>
                <TableHead className="data-table-header">Contact</TableHead>
                <TableHead className="data-table-header">Location</TableHead>
                <TableHead className="data-table-header">kW</TableHead>
                <TableHead className="data-table-header">Value</TableHead>
                <TableHead className="data-table-header">Stage</TableHead>
                <TableHead className="data-table-header">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-sm">
                    <div>{l.phone ?? "—"}</div>
                    {l.email && <div className="text-xs text-muted-foreground">{l.email}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{[l.city, l.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell className="tabular-nums">{l.expected_capacity_kw ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{l.expected_value ? formatINR(l.expected_value, { compact: true }) : "—"}</TableCell>
                  <TableCell>
                    <Select value={l.stage} onValueChange={(v) => updateStage(l.id, v)}>
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <Badge variant="outline" className={`capitalize ${stageColor[l.stage] ?? ""}`}>{l.stage}</Badge>
                      </SelectTrigger>
                      <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(l.created_at)}</TableCell>
                </TableRow>
              ))}
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
