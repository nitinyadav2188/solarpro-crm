-- Quotations & line items, invoice line items, blog posts, govt schemes

-- ENUM for quotation status
DO $$ BEGIN
  CREATE TYPE public.quotation_status AS ENUM ('draft','sent','accepted','rejected','expired','converted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ QUOTATIONS ============
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  lead_id UUID,
  project_id UUID,
  quotation_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_gstin TEXT,
  customer_address TEXT,
  city TEXT, state TEXT, pincode TEXT,
  capacity_kw NUMERIC NOT NULL DEFAULT 0,
  system_type TEXT, -- on-grid / off-grid / hybrid
  subsidy_amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  cgst NUMERIC NOT NULL DEFAULT 0,
  sgst NUMERIC NOT NULL DEFAULT 0,
  igst NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  gst_type TEXT NOT NULL DEFAULT 'intra', -- intra/inter
  gst_rate NUMERIC NOT NULL DEFAULT 18,
  status public.quotation_status NOT NULL DEFAULT 'draft',
  valid_until DATE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  terms TEXT,
  converted_invoice_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members view quotations" ON public.quotations FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "org members insert quotations" ON public.quotations FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id));
CREATE POLICY "org members update quotations" ON public.quotations FOR UPDATE USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "owners delete quotations" ON public.quotations FOR DELETE USING (has_role(auth.uid(), org_id, 'owner'::app_role));

CREATE TRIGGER trg_quotations_updated_at BEFORE UPDATE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  position INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  hsn_sac TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members view quotation items" ON public.quotation_items FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "org members manage quotation items" ON public.quotation_items FOR ALL USING (is_org_member(auth.uid(), org_id)) WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON public.quotation_items(quotation_id);

-- ============ INVOICE ITEMS ============
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  position INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  hsn_sac TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members view invoice items" ON public.invoice_items FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "org members manage invoice items" ON public.invoice_items FOR ALL
  USING (is_org_member(auth.uid(), org_id)) WITH CHECK (is_org_member(auth.uid(), org_id));

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- Add gst_type/gst_rate to invoices for accurate breakdown
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS gst_type TEXT NOT NULL DEFAULT 'intra',
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quotation_id UUID;

-- ============ BLOG POSTS ============
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_url TEXT,
  category TEXT,
  tags TEXT[],
  author TEXT DEFAULT 'SolarPro Editorial',
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone view published blog posts" ON public.blog_posts FOR SELECT USING (published = true);

CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ GOVERNMENT SCHEMES ============
CREATE TABLE IF NOT EXISTS public.government_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  authority TEXT, -- MNRE, State DISCOM, etc.
  scheme_type TEXT, -- residential, commercial, agricultural
  state TEXT, -- 'central' or specific state
  short_description TEXT,
  description TEXT NOT NULL,
  subsidy_details TEXT,
  eligibility TEXT,
  documents_required TEXT,
  application_process TEXT,
  official_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.government_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone view active schemes" ON public.government_schemes FOR SELECT USING (active = true);

CREATE TRIGGER trg_schemes_updated_at BEFORE UPDATE ON public.government_schemes
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();