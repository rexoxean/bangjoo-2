CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL,
  message TEXT NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('safety','search','dev')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.posts TO anon;
GRANT SELECT, INSERT ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read posts" ON public.posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create posts" ON public.posts FOR INSERT TO anon, authenticated WITH CHECK (char_length(nickname) BETWEEN 1 AND 20 AND char_length(message) BETWEEN 1 AND 30);