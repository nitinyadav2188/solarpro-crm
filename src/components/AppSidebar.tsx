import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FolderKanban, Receipt, Wallet,
  Boxes, FileText, Landmark, BarChart3, Settings, Sun, FileSignature, BookOpen,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import type { Role } from "@/hooks/useOrg";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}

const main: NavItem[] = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard },
  { title: "Leads", url: "/app/leads", icon: Users, roles: ["owner", "sales"] },
  { title: "Projects", url: "/app/projects", icon: FolderKanban },
];

const finance: NavItem[] = [
  { title: "Quotations", url: "/app/quotations", icon: FileSignature, roles: ["owner", "sales", "accountant"] },
  { title: "Invoices", url: "/app/invoices", icon: Receipt, roles: ["owner", "accountant"] },
  { title: "Payments", url: "/app/payments", icon: Wallet, roles: ["owner", "accountant"] },
];

const ops: NavItem[] = [
  { title: "Inventory", url: "/app/inventory", icon: Boxes },
  { title: "Documents", url: "/app/documents", icon: FileText },
  { title: "Compliance", url: "/app/compliance", icon: Landmark, roles: ["owner", "accountant"] },
  { title: "Analytics", url: "/app/analytics", icon: BarChart3, roles: ["owner"] },
];

const bottom: NavItem[] = [
  { title: "Settings", url: "/app/settings", icon: Settings, roles: ["owner"] },
];

function visible(items: NavItem[], roles: Role[]): NavItem[] {
  return items.filter((i) => !i.roles || i.roles.some((r) => roles.includes(r)));
}

export function AppSidebar({ roles, orgName }: { roles: Role[]; orgName: string | null }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (url: string) =>
    url === "/app" ? pathname === "/app" : pathname.startsWith(url);

  const renderGroup = (label: string, items: NavItem[]) => {
    const v = visible(items, roles);
    if (v.length === 0) return null;
    return (
      <SidebarGroup>
        {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/60">{label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {v.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive(item.url)}>
                  <NavLink to={item.url} end={item.url === "/app"}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-foreground shadow-sm shrink-0">
            <Sun className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display text-base leading-tight text-sidebar-foreground">SolarPro</div>
              <div className="truncate text-[11px] uppercase tracking-wider text-sidebar-foreground/60">
                {orgName ?? "Solar Business OS"}
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Main", main)}
        {renderGroup("Finance", finance)}
        {renderGroup("Operations", ops)}
        {renderGroup("Account", bottom)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-3 py-2 text-[11px] text-sidebar-foreground/50">
            v0.1 · Phase 1
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
