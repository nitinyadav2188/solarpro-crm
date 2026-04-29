import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useOrg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Loader2, ShieldCheck, BarChart3, Zap } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Enter your name").max(100),
  companyName: z.string().trim().min(2, "Enter company name").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // sign in fields
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  // sign up fields
  const [suFullName, setSuFullName] = useState("");
  const [suCompany, setSuCompany] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");

  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email: siEmail, password: siPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/app", { replace: true });
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({
      email: suEmail, password: suPassword,
      fullName: suFullName, companyName: suCompany, phone: suPhone,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name: parsed.data.fullName,
          company_name: parsed.data.companyName,
          phone: parsed.data.phone || null,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. Welcome to SolarPro.");
    navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 text-primary-foreground overflow-hidden"
        style={{ background: "var(--gradient-brand)" }}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-accent text-accent-foreground shadow-md">
              <Sun className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-2xl leading-none">SolarPro</div>
              <div className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70 mt-1">
                Solar Business Operating System
              </div>
            </div>
          </div>
        </div>

        <div className="relative space-y-8 max-w-md">
          <h1 className="font-display text-4xl leading-tight">
            Run your entire solar business from one government-grade dashboard.
          </h1>
          <p className="text-primary-foreground/80 leading-relaxed">
            Replace Excel and WhatsApp chaos with leads, projects, GST invoices,
            inventory, and team — all in one secure system built for India.
          </p>
          <div className="space-y-3 pt-4">
            {[
              { i: BarChart3, t: "Owner dashboard with real-time KPIs" },
              { i: ShieldCheck, t: "Multi-tenant isolation. Bank-grade security." },
              { i: Zap, t: "GST-ready invoices, Razorpay, WhatsApp" },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3 text-sm">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-primary-foreground/10">
                  <f.i className="h-4 w-4" />
                </div>
                <span>{f.t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} SolarPro · Made for India ·  ₹ INR · GST-ready
        </div>
      </div>

      {/* Right: forms */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md gov-card">
          <CardHeader>
            <div className="lg:hidden flex items-center gap-2 mb-2">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <Sun className="h-5 w-5" />
              </div>
              <span className="font-display text-xl">SolarPro</span>
            </div>
            <CardTitle className="font-display text-2xl">Welcome</CardTitle>
            <CardDescription>Sign in or create a new company workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full mb-5">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create company</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" autoComplete="email" required
                      value={siEmail} onChange={(e) => setSiEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="si-password">Password</Label>
                    <Input id="si-password" type="password" autoComplete="current-password" required
                      value={siPassword} onChange={(e) => setSiPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={onSignUp} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="su-name">Your name</Label>
                      <Input id="su-name" required value={suFullName} onChange={(e) => setSuFullName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-phone">Phone</Label>
                      <Input id="su-phone" value={suPhone} onChange={(e) => setSuPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-company">Company name</Label>
                    <Input id="su-company" required value={suCompany} onChange={(e) => setSuCompany(e.target.value)}
                      placeholder="e.g. Solaris Energy Pvt Ltd" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-email">Work email</Label>
                    <Input id="su-email" type="email" autoComplete="email" required
                      value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-password">Password</Label>
                    <Input id="su-password" type="password" autoComplete="new-password" required minLength={6}
                      value={suPassword} onChange={(e) => setSuPassword(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">Min 6 characters. Checked against breached-password database.</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create my company workspace
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
