-- Enum for status
CREATE TYPE public.blog_post_status AS ENUM ('draft', 'published');

-- Table
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT 'Medibrick Team',
  status public.blog_post_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published
CREATE POLICY "Public can view published posts"
ON public.blog_posts FOR SELECT
USING (status = 'published');

-- Internal CMS (no auth) — open read/write for drafts as requested.
-- WARNING: open to anyone on the internet. Lock down before launch.
CREATE POLICY "CMS can view all posts"
ON public.blog_posts FOR SELECT
USING (true);

CREATE POLICY "CMS can insert posts"
ON public.blog_posts FOR INSERT
WITH CHECK (true);

CREATE POLICY "CMS can update posts"
ON public.blog_posts FOR UPDATE
USING (true);

CREATE POLICY "CMS can delete posts"
ON public.blog_posts FOR DELETE
USING (true);

-- updated_at trigger
CREATE TRIGGER trg_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed first post
INSERT INTO public.blog_posts (title, slug, content, author, status)
VALUES (
  'The Hidden Cost of Understaffed Hospitals: Why Indian Healthcare Needs Smarter Staffing Solutions',
  'hidden-cost-understaffed-hospitals',
  E'# The Hidden Cost of Understaffed Hospitals\n\nIndia''s healthcare system is under unprecedented strain. Behind every overwhelmed emergency room and delayed surgery lies a quieter crisis: chronic understaffing.\n\n## The Real Cost\n\nUnderstaffed hospitals don''t just hurt patients — they burn out the doctors and nurses we rely on, increase medical errors, and quietly inflate operational costs through overtime, attrition, and lost revenue from canceled procedures.\n\n## Why Traditional Staffing Falls Short\n\n- **Slow agency turnaround** — vacancies take days, not hours\n- **Opaque pricing** — hidden margins erode hospital budgets\n- **Limited talent pools** — local networks only reach so far\n\n## A Smarter Path Forward\n\nOn-demand staffing platforms like **MediBricks** connect verified healthcare professionals to hospitals in real time. Transparent rates, instant matching, and a vetted network mean fewer empty shifts and better patient outcomes.\n\n*This is just the beginning. More to come.*',
  'Medibrick Team',
  'draft'
);