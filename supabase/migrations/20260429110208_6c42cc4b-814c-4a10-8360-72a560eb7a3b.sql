
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('owner', 'sales', 'engineer', 'accountant');
CREATE TYPE public.lead_stage AS ENUM ('new', 'contacted', 'qualified', 'quoted', 'won', 'lost');
CREATE TYPE public.lead_source AS ENUM ('website', 'referral', 'google_ads', 'meta_ads', 'walk_in', 'whatsapp', 'other');
CREATE TYPE public.project_status AS ENUM ('planning', 'survey', 'approved', 'in_progress', 'installed', 'commissioned', 'on_hold', 'cancelled');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'upi', 'bank_transfer', 'cheque', 'razorpay', 'other');
CREATE TYPE public.subscription_plan AS ENUM ('basic', 'pro', 'enterprise');

-- ============ ORGANIZATIONS ============
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gstin TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  logo_url TEXT,
  plan public.subscription_plan NOT NULL DEFAULT 'basic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ MEMBERSHIPS ============
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_org ON public.memberships(org_id);

-- ============ USER ROLES (separate table — security best practice) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- ============ SECURITY DEFINER HELPERS (avoid RLS recursion) ============
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = _user_id AND org_id = _org_id);
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND org_id = _org_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_org_ids()
RETURNS SETOF UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.memberships WHERE user_id = auth.uid();
$$;

-- ============ LEADS ============
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  source public.lead_source NOT NULL DEFAULT 'other',
  stage public.lead_stage NOT NULL DEFAULT 'new',
  expected_capacity_kw NUMERIC(10,2),
  expected_value NUMERIC(12,2),
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  next_followup_at TIMESTAMPTZ,
  converted_project_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_leads_org ON public.leads(org_id);
CREATE INDEX idx_leads_stage ON public.leads(org_id, stage);

-- ============ PROJECTS ============
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  capacity_kw NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.project_status NOT NULL DEFAULT 'planning',
  scheduled_start_date DATE,
  scheduled_end_date DATE,
  actual_completion_date DATE,
  assigned_engineer UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_projects_org ON public.projects(org_id);
CREATE INDEX idx_projects_status ON public.projects(org_id, status);

-- ============ INVOICES ============
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_gstin TEXT,
  customer_address TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  igst NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, invoice_number)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invoices_org ON public.invoices(org_id);

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  method public.payment_method NOT NULL DEFAULT 'cash',
  reference TEXT,
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payments_org ON public.payments(org_id);

-- ============ INVENTORY ============
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  unit TEXT DEFAULT 'pcs',
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_inventory_org ON public.inventory_items(org_id);

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT,
  entity_id UUID,
  doc_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_documents_org ON public.documents(org_id);

-- ============ ACTIVITY LOG ============
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_activity_org ON public.activity_logs(org_id, created_at DESC);

-- ============ RLS POLICIES ============

-- profiles: user manages own
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "org members view org profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.memberships m1
          JOIN public.memberships m2 ON m1.org_id = m2.org_id
          WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id)
);

-- organizations
CREATE POLICY "members view org" ON public.organizations FOR SELECT USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "owners update org" ON public.organizations FOR UPDATE USING (public.has_role(auth.uid(), id, 'owner'));
CREATE POLICY "anyone authenticated insert org" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);

-- memberships
CREATE POLICY "members view org memberships" ON public.memberships FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "owners insert memberships" ON public.memberships FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), org_id, 'owner') OR user_id = auth.uid()
);
CREATE POLICY "owners delete memberships" ON public.memberships FOR DELETE USING (public.has_role(auth.uid(), org_id, 'owner'));

-- user_roles
CREATE POLICY "members view org roles" ON public.user_roles FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "owners manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), org_id, 'owner'))
  WITH CHECK (public.has_role(auth.uid(), org_id, 'owner'));
CREATE POLICY "self insert role on signup" ON public.user_roles FOR INSERT WITH CHECK (user_id = auth.uid());

-- Generic org-scoped policy generator pattern (manual per table for clarity)
-- LEADS
CREATE POLICY "org members view leads" ON public.leads FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "org members insert leads" ON public.leads FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "org members update leads" ON public.leads FOR UPDATE USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "owners delete leads" ON public.leads FOR DELETE USING (public.has_role(auth.uid(), org_id, 'owner'));

-- PROJECTS
CREATE POLICY "org members view projects" ON public.projects FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "org members insert projects" ON public.projects FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "org members update projects" ON public.projects FOR UPDATE USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "owners delete projects" ON public.projects FOR DELETE USING (public.has_role(auth.uid(), org_id, 'owner'));

-- INVOICES
CREATE POLICY "org members view invoices" ON public.invoices FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "accountants and owners insert invoices" ON public.invoices FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), org_id, 'owner') OR public.has_role(auth.uid(), org_id, 'accountant')
);
CREATE POLICY "accountants and owners update invoices" ON public.invoices FOR UPDATE USING (
  public.has_role(auth.uid(), org_id, 'owner') OR public.has_role(auth.uid(), org_id, 'accountant')
);
CREATE POLICY "owners delete invoices" ON public.invoices FOR DELETE USING (public.has_role(auth.uid(), org_id, 'owner'));

-- PAYMENTS
CREATE POLICY "org members view payments" ON public.payments FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "accountants and owners insert payments" ON public.payments FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), org_id, 'owner') OR public.has_role(auth.uid(), org_id, 'accountant')
);
CREATE POLICY "owners delete payments" ON public.payments FOR DELETE USING (public.has_role(auth.uid(), org_id, 'owner'));

-- INVENTORY
CREATE POLICY "org members view inventory" ON public.inventory_items FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "org members manage inventory" ON public.inventory_items FOR ALL USING (public.is_org_member(auth.uid(), org_id))
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

-- DOCUMENTS
CREATE POLICY "org members view documents" ON public.documents FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "org members insert documents" ON public.documents FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "owners delete documents" ON public.documents FOR DELETE USING (public.has_role(auth.uid(), org_id, 'owner'));

-- ACTIVITY LOG
CREATE POLICY "org members view activity" ON public.activity_logs FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "org members insert activity" ON public.activity_logs FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id));

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- New user → profile + organization + owner role + membership
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'phone');

  org_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Solar Company');
  INSERT INTO public.organizations (name) VALUES (org_name) RETURNING id INTO new_org_id;

  INSERT INTO public.memberships (user_id, org_id) VALUES (NEW.id, new_org_id);
  INSERT INTO public.user_roles (user_id, org_id, role) VALUES (NEW.id, new_org_id, 'owner');

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
