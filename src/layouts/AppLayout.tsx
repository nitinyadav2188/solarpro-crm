import { Outlet, useNavigate, Navigate } from "react-router-dom";
import { useAuth, useOrgContext } from "@/hooks/useOrg";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const { ctx, loading: orgLoading } = useOrgContext(user?.id);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const primaryRole = ctx.roles[0] ?? "owner";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar roles={ctx.roles} orgName={ctx.orgName} />

        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-card/80 px-4 backdrop-blur">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground truncate">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{ctx.orgName ?? "—"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="capitalize border-primary/30 text-primary">
                {primaryRole}
              </Badge>
              <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[180px]">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1.5" /> Sign out
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
            {orgLoading ? <Skeleton className="h-64 w-full" /> : <Outlet context={ctx} />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
