
-- 1. Organization intake token (public form link) + a couple of optional branding fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS intake_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS pan TEXT;

-- Backfill any nulls
UPDATE public.organizations SET intake_token = encode(gen_random_bytes(12), 'hex') WHERE intake_token IS NULL;

-- Public lookup function: resolve org by intake token (so anonymous users can find org_id without exposing org table)
CREATE OR REPLACE FUNCTION public.org_id_from_intake_token(_token TEXT)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.organizations WHERE intake_token = _token LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.org_public_profile(_token TEXT)
RETURNS TABLE(id UUID, name TEXT, logo_url TEXT, city TEXT, state TEXT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, logo_url, city, state FROM public.organizations WHERE intake_token = _token LIMIT 1;
$$;

-- 2. Lead submissions table (raw public submissions; converted to leads by owner/sales)
CREATE TABLE IF NOT EXISTS public.lead_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  intake_token TEXT NOT NULL,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  annual_gross_income NUMERIC,
  annual_net_income NUMERIC,
  aadhaar_path TEXT,
  pan_path TEXT,
  electricity_bill_path TEXT,
  house_tax_path TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | reviewed | converted | spam
  converted_lead_id UUID,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_submissions_org ON public.lead_submissions(org_id, status, created_at DESC);

ALTER TABLE public.lead_submissions ENABLE ROW LEVEL SECURITY;

-- Anonymous users can insert ONLY if intake_token resolves to the org_id they're inserting under
CREATE POLICY "anyone can submit via intake token"
ON public.lead_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (org_id = public.org_id_from_intake_token(intake_token));

CREATE POLICY "org members view submissions"
ON public.lead_submissions
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "owners and sales update submissions"
ON public.lead_submissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), org_id, 'owner') OR public.has_role(auth.uid(), org_id, 'sales'));

CREATE POLICY "owners delete submissions"
ON public.lead_submissions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), org_id, 'owner'));

CREATE TRIGGER trg_lead_submissions_updated
BEFORE UPDATE ON public.lead_submissions
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-documents', 'lead-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS
-- Lead documents: anonymous users can upload to {org_id}/intake/{filename}; org members can read
CREATE POLICY "anyone upload to intake folder"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'lead-documents'
  AND (storage.foldername(name))[2] = 'intake'
);

CREATE POLICY "org members read lead documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lead-documents'
  AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "owners delete lead documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lead-documents'
  AND public.has_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'owner')
);

-- Org logos: public read, owners can upload/update/delete to their org folder
CREATE POLICY "public read org logos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'org-logos');

CREATE POLICY "owners upload org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-logos'
  AND public.has_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'owner')
);

CREATE POLICY "owners update org logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND public.has_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'owner')
);

CREATE POLICY "owners delete org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND public.has_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'owner')
);
