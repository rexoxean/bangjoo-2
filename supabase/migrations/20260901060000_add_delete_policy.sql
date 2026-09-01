-- Allow deleting posts (needed for the /manage admin page).
-- Note: RLS can't distinguish "the hardcoded admin login" from any other
-- caller holding the public anon key, so this technically allows anyone
-- with the anon key to delete posts via direct API calls, not just through
-- the /manage UI. The /manage login is a UI-level gate only, not real
-- server-side auth.
GRANT DELETE ON public.posts TO anon;
GRANT DELETE ON public.posts TO authenticated;
CREATE POLICY "Anyone can delete posts" ON public.posts FOR DELETE TO anon, authenticated USING (true);
