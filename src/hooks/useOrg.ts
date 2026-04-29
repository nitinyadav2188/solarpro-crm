import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "owner" | "sales" | "engineer" | "accountant";

export interface OrgContext {
  orgId: string | null;
  orgName: string | null;
  roles: Role[];
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

export function useOrgContext(userId: string | undefined) {
  const [ctx, setCtx] = useState<OrgContext>({ orgId: null, orgName: null, roles: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCtx({ orgId: null, orgName: null, roles: [] });
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data: mem } = await supabase
        .from("memberships")
        .select("org_id, organizations(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!mem) {
        setCtx({ orgId: null, orgName: null, roles: [] });
        setLoading(false);
        return;
      }
      const orgId = mem.org_id as string;
      const orgName = (mem as any).organizations?.name ?? null;

      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("org_id", orgId);

      setCtx({
        orgId,
        orgName,
        roles: (roleRows ?? []).map((r: any) => r.role as Role),
      });
      setLoading(false);
    })();
  }, [userId]);

  return { ctx, loading };
}

export function hasAnyRole(roles: Role[], required: Role[]): boolean {
  if (required.length === 0) return true;
  return roles.some((r) => required.includes(r));
}
