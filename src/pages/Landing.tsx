import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sun, ArrowRight, ShieldCheck, BarChart3, Receipt, Users,
  FolderKanban, Boxes, Zap, IndianRupee,
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground"><Sun className="h-4 w-4" /></div>
            <span className="font-display text-lg">SolarPro</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5 rounded ml-1 hidden sm:inline">CRM</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#why" className="hover:text-foreground">Why SolarPro</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm">Start free</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center relative">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 text-accent-foreground px-3 py-1 text-xs font-medium mb-5">
              <Sun className="h-3.5 w-3.5" /> Built for Indian solar businesses
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-foreground">
              The operating system for your <span className="text-primary">solar business</span>.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Replace Excel + WhatsApp + manual work. Manage leads, projects, GST invoices,
              payments, and inventory — all from one government-grade dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth"><Button size="lg" className="shadow-md">Start free <ArrowRight className="h-4 w-4 ml-1.5" /></Button></Link>
              <Link to="/auth"><Button size="lg" variant="outline">Sign in</Button></Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-6 max-w-md">
              {[
                { k: "₹100Cr+", v: "Pipeline tracked" },
                { k: "1,000+", v: "Installations" },
                { k: "GST-ready", v: "From day one" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="font-display text-2xl text-foreground">{s.k}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero card mock */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl opacity-30 blur-3xl"
              style={{ background: "var(--gradient-brand)" }} />
            <div className="relative gov-card p-6 shadow-lg">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Owner Dashboard</div>
                  <div className="font-display text-xl">Solaris Energy Pvt Ltd</div>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-foreground"><Sun className="h-5 w-5" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { l: "Revenue (Mo)", v: "₹42.5 L", i: IndianRupee },
                  { l: "Active projects", v: "27", i: FolderKanban },
                  { l: "Conversion", v: "38.4%", i: BarChart3 },
                  { l: "Outstanding", v: "₹18.2 L", i: Receipt },
                ].map((k) => (
                  <div key={k.l} className="rounded-md border border-border p-3 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                      <k.i className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="mt-1 font-display text-xl">{k.v}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-md border border-border p-3 bg-card">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Revenue trend</div>
                <svg viewBox="0 0 200 50" className="w-full h-12">
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(158 78% 17%)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="hsl(158 78% 17%)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 40 L33 32 L66 35 L99 22 L132 25 L165 12 L200 8 L200 50 L0 50 Z" fill="url(#g)" />
                  <path d="M0 40 L33 32 L66 35 L99 22 L132 25 L165 12 L200 8" fill="none" stroke="hsl(158 78% 17%)" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-secondary/40 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Modules</div>
            <h2 className="font-display text-3xl sm:text-4xl">Everything to run a solar company</h2>
            <p className="text-muted-foreground mt-3">Built specifically for Indian solar — GST, subsidies, net metering, ₹ formatting, all native.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { i: Users, t: "Leads & Pipeline", d: "Capture leads from any source, track them through stages, assign to sales reps." },
              { i: FolderKanban, t: "Project Tracking", d: "Plan, install, commission. Engineer assignment. Delay alerts on the dashboard." },
              { i: Receipt, t: "GST Invoicing", d: "CGST/SGST or IGST split, auto-numbered, ₹ formatting, ready for filing." },
              { i: IndianRupee, t: "Payments & Reconciliation", d: "Cash, UPI, bank, Razorpay. Auto-update invoice status on partial/full payment." },
              { i: Boxes, t: "Inventory & Reorder", d: "Track panels, inverters, batteries. Get low-stock alerts before you run out." },
              { i: ShieldCheck, t: "Multi-Tenant + RBAC", d: "Owner/Sales/Engineer/Accountant roles. Data isolated per company. Audit-ready." },
            ].map((f) => (
              <div key={f.t} className="gov-card p-5">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary mb-3"><f.i className="h-5 w-5" /></div>
                <div className="font-medium">{f.t}</div>
                <p className="text-sm text-muted-foreground mt-1.5">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Built for owners</div>
          <h2 className="font-display text-3xl sm:text-4xl">Stop running your business in spreadsheets.</h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            One dashboard for revenue, pipeline, projects, and payments. Real-time. Mobile-friendly.
            No more chasing teams on WhatsApp for status updates.
          </p>
          <div className="mt-10">
            <Link to="/auth"><Button size="lg">Create your free workspace <ArrowRight className="h-4 w-4 ml-1.5" /></Button></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground"><Sun className="h-3.5 w-3.5" /></div>
            <span className="font-display text-base text-foreground">SolarPro</span>
          </div>
          <div>© {new Date().getFullYear()} SolarPro · Made for India · ₹ INR · GST-ready</div>
        </div>
      </footer>
    </div>
  );
}
