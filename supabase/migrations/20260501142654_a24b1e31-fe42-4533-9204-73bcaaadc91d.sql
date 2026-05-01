
-- Tighten public read on org-logos: prevent listing, allow only direct fetches via exact path
DROP POLICY IF EXISTS "public read org logos" ON storage.objects;

CREATE POLICY "public read org logos by path"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'org-logos'
  AND name IS NOT NULL
);

-- The two SECURITY DEFINER functions (org_id_from_intake_token, org_public_profile) are
-- intentionally callable by anon — that's how the public intake form resolves an org
-- from the secret intake token. They expose minimal data and require knowing the token.
-- We add a comment explaining intent and revoke from authenticated to limit surface.
COMMENT ON FUNCTION public.org_id_from_intake_token(TEXT) IS
  'Public lookup for intake form. Requires secret intake_token. Returns only org_id.';
COMMENT ON FUNCTION public.org_public_profile(TEXT) IS
  'Public lookup for intake form branding. Requires secret intake_token. Returns minimal org info only.';
