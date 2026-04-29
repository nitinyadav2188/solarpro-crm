import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { OrgContext } from "@/hooks/useOrg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, formatNumber, formatDate } from "@/lib/format";
import {
  TrendingUp, IndianRupee, FolderKanban, Users, AlertTriangle,
  CheckCircle2, Clock, PackageX, Sun,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

interface Kpi {
  revenueMonth: number;
  revenueYear: number;
  outstanding: number;
  activeProjects: number;
  completed: number;
  totalLeads: number;
  conversionRate: number;
}

interface Alert {
  type: "delay" | "overdue" | "low_stock";
  title: string;
  detail: string;
  date?: string;
}

const C = {
  primary: "hsl(158 78% 17%)",
  glow: "hsl(158 55% 32%)",
  gold: "hsl(43 55% 54%)",
  warn: "hsl(38 90% 48%)",
  danger: "hsl(0 70% 45%)",
  muted: "hsl(150 18% 80%)",
};

export default function Dashboard() {
  const ctx = useOutletContext<OrgContext>();
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [revenueSeries, setRevenueSeries] = useState<{ month: string; revenue: number }[]>([]);
  const [pipeline, setPipeline] = useState<{ stage: string; count: number }[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ctx.orgId) return;
    (async () => {
      setLoading(true);
      const orgId = ctx.orgId!;
      const now = new Date();
      const yStart = new Date(now.getFullYear(), 0, 1).toISOString();
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthsBack = 6;
      const seriesStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

      const [paymentsRes, invoicesRes, projectsRes, leadsRes, inventoryRes] = await Promise.all([
        supabase.from("payments").select("amount, paid_at").eq("org_id", orgId)
          .gte("paid_at", seriesStart.toISOString().slice(0, 10)),
        supabase.from("invoices").select("total, amount_paid, status, due_date").eq("org_id", orgId),
        supabase.from("projects").select("id, status, scheduled_end_date, customer_name, actual_completion_date").eq("org_id", orgId),
        supabase.from("leads").select("id, stage, name, created_at").eq("org_id", orgId),
        supabase.from("inventory_items").select("name, quantity, reorder_level").eq("org_id", orgId),
      ]);

      const payments = paymentsRes.data ?? [];
      const invoices = invoicesRes.data ?? [];
      const projects = projectsRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const inventory = inventoryRes.data ?? [];

      // KPIs
      const revMonth = payments
        .filter((p) => new Date(p.paid_at) >= new Date(mStart))
        .reduce((s, p) => s + Number(p.amount), 0);
      const revYear = payments
        .filter((p) => new Date(p.paid_at) >= new Date(yStart))
        .reduce((s, p) => s + Number(p.amount), 0);
      const outstanding = invoices.reduce(
        (s, i) => s + (Number(i.total) - Number(i.amount_paid)),
        0,
      );
      const activeProjects = projects.filter((p) =>
        ["planning", "survey", "approved", "in_progress"].includes(p.status as string),
      ).length;
      const completed = projects.filter((p) =>
        ["installed", "commissioned"].includes(p.status as string),
      ).length;
      const totalLeads = leads.length;
      const wonLeads = leads.filter((l) => l.stage === "won").length;
      const closedLeads = leads.filter((l) => ["won", "lost"].includes(l.stage as string)).length;
      const conversionRate = closedLeads > 0 ? (wonLeads / closedLeads) * 100 : 0;

      setKpi({
        revenueMonth: revMonth, revenueYear: revYear, outstanding,
        activeProjects, completed, totalLeads, conversionRate,
      });

      // Revenue series
      const series: { month: string; revenue: number }[] = [];
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const sum = payments
          .filter((p) => {
            const pd = new Date(p.paid_at);
            return pd >= d && pd < next;
          })
          .reduce((s, p) => s + Number(p.amount), 0);
        series.push({
          month: d.toLocaleString("en-IN", { month: "short" }),
          revenue: sum,
        });
      }
      setRevenueSeries(series);

      // Pipeline by stage
      const stages = ["new", "contacted", "qualified", "quoted", "won", "lost"] as const;
      setPipeline(stages.map((s) => ({
        stage: s.charAt(0).toUpperCase() + s.slice(1),
        count: leads.filter((l) => l.stage === s).length,
      })));

      // Project status breakdown
      const statusGroups: Record<string, number> = {};
      projects.forEach((p) => {
        const k = (p.status as string) ?? "planning";
        statusGroups[k] = (statusGroups[k] ?? 0) + 1;
      });
      setStatusBreakdown(Object.entries(statusGroups).map(([name, value]) => ({
        name: name.replace("_", " "), value,
      })));

      // Alerts
      const today = new Date();
      const a: Alert[] = [];
      projects
        .filter((p) =>
          p.scheduled_end_date &&
          !p.actual_completion_date &&
          new Date(p.scheduled_end_date) < today &&
          !["installed", "commissioned", "cancelled"].includes(p.status as string),
        )
        .slice(0, 5)
        .forEach((p) => a.push({
          type: "delay",
          title: `Project delayed: ${p.customer_name}`,
          detail: `Was due ${formatDate(p.scheduled_end_date)}`,
          date: p.scheduled_end_date as string,
        }));
      invoices
        .filter((i) =>
          i.due_date && Number(i.amount_paid) < Number(i.total) &&
          new Date(i.due_date) < today && i.status !== "cancelled",
        )
        .slice(0, 5)
        .forEach((i) => a.push({
          type: "overdue",
          title: "Overdue invoice",
          detail: `${formatINR(Number(i.total) - Number(i.amount_paid))} pending · due ${formatDate(i.due_date)}`,
          date: i.due_date as string,
        }));
      inventory
        .filter((it) => Number(it.quantity) <= Number(it.reorder_level))
        .slice(0, 5)
        .forEach((it) => a.push({
          type: "low_stock",
          title: `Low stock: ${it.name}`,
          detail: `${formatNumber(Number(it.quantity))} remaining (reorder at ${formatNumber(Number(it.reorder_level))})`,
        }));
      setAlerts(a);

      setLoading(false);
    })();
  }, [ctx.orgId]);

  if (!ctx.orgId) return <p className="text-muted-foreground">Setting up your workspace…</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Owner Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time view of {ctx.orgName ?? "your business"}.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 border-accent/40 text-accent-foreground bg-accent/10">
          <Sun className="h-3.5 w-3.5" /> Live
        </Badge>
      </header>

      {/* KPI grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={IndianRupee} label="Revenue (this month)"
          value={loading ? null : formatINR(kpi?.revenueMonth ?? 0, { compact: true })}
          hint={`Year: ${formatINR(kpi?.revenueYear ?? 0, { compact: true })}`}
        />
        <KpiCard
          icon={Clock} label="Outstanding payments"
          value={loading ? null : formatINR(kpi?.outstanding ?? 0, { compact: true })}
          tone="warning" hint="From all unpaid invoices"
        />
        <KpiCard
          icon={FolderKanban} label="Active projects"
          value={loading ? null : formatNumber(kpi?.activeProjects ?? 0)}
          hint={`${kpi?.completed ?? 0} completed`}
        />
        <KpiCard
          icon={TrendingUp} label="Lead conversion"
          value={loading ? null : `${(kpi?.conversionRate ?? 0).toFixed(1)}%`}
          hint={`${kpi?.totalLeads ?? 0} total leads`}
        />
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="gov-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue trend (6 months)</CardTitle>
            <CardDescription>Payments received per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? <Skeleton className="h-full w-full" /> : (
                <ResponsiveContainer>
                  <AreaChart data={revenueSeries}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.primary} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(150 18% 88%)" />
                    <XAxis dataKey="month" stroke="hsl(158 12% 38%)" fontSize={12} />
                    <YAxis stroke="hsl(158 12% 38%)" fontSize={12}
                      tickFormatter={(v) => formatINR(v, { compact: true })} />
                    <Tooltip
                      contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(150 18% 88%)", borderRadius: 6 }}
                      formatter={(v: any) => formatINR(Number(v))} />
                    <Area type="monotone" dataKey="revenue" stroke={C.primary} strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="gov-card">
          <CardHeader>
            <CardTitle className="text-base">Project status</CardTitle>
            <CardDescription>Distribution across stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? <Skeleton className="h-full w-full" /> :
                statusBreakdown.length === 0 ? (
                  <EmptyHint icon={FolderKanban} text="No projects yet" />
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                        {statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={[C.primary, C.glow, C.gold, C.warn, C.muted, C.danger][i % 6]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="gov-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sales pipeline</CardTitle>
            <CardDescription>Leads by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {loading ? <Skeleton className="h-full w-full" /> : (
                <ResponsiveContainer>
                  <BarChart data={pipeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(150 18% 88%)" />
                    <XAxis dataKey="stage" stroke="hsl(158 12% 38%)" fontSize={12} />
                    <YAxis stroke="hsl(158 12% 38%)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(150 18% 88%)", borderRadius: 6 }} />
                    <Bar dataKey="count" fill={C.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="gov-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Alerts
            </CardTitle>
            <CardDescription>Things needing your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-32 w-full" /> : alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> All clear. Nothing overdue.
              </div>
            ) : (
              <ul className="space-y-3">
                {alerts.map((a, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <div className={`mt-0.5 grid h-7 w-7 place-items-center rounded-md shrink-0 ${
                      a.type === "delay" ? "bg-warning/15 text-warning" :
                      a.type === "overdue" ? "bg-destructive/15 text-destructive" :
                      "bg-info/15 text-info"
                    }`}>
                      {a.type === "delay" ? <Clock className="h-3.5 w-3.5" /> :
                       a.type === "overdue" ? <IndianRupee className="h-3.5 w-3.5" /> :
                       <PackageX className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium leading-tight">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, hint, tone = "default",
}: {
  icon: typeof IndianRupee; label: string; value: string | null;
  hint?: string; tone?: "default" | "warning";
}) {
  return (
    <Card className="gov-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="stat-label">{label}</div>
            <div className="mt-2 stat-value tabular-nums">
              {value === null ? <Skeleton className="h-8 w-24" /> : value}
            </div>
            {hint && <div className="mt-1 text-xs text-muted-foreground truncate">{hint}</div>}
          </div>
          <div className={`grid h-10 w-10 place-items-center rounded-md shrink-0 ${
            tone === "warning" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"
          }`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyHint({ icon: Icon, text }: { icon: typeof FolderKanban; text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
      <Icon className="h-8 w-8 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
