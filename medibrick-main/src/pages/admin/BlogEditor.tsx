import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Eye, Save } from "lucide-react";
import { slugify } from "@/lib/slugify";

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("Medibrick Team");
  const [published, setPublished] = useState(false);
  const slugTouched = useRef(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setTitle(data.title);
        setSlug(data.slug);
        setContent(data.content ?? "");
        setAuthor(data.author);
        setPublished(data.status === "published");
        slugTouched.current = true;
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!slugTouched.current && title) setSlug(slugify(title));
  }, [title]);

  const save = async () => {
    if (!title.trim()) return toast.error("Title is required");
    if (!slug.trim()) return toast.error("Slug is required");
    setSaving(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({
        title: title.trim(),
        slug: slugify(slug),
        content,
        author: author.trim() || "Medibrick Team",
        status: published ? "published" : "draft",
      })
      .eq("id", id!);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  if (loading) return <div className="container mx-auto px-4 py-10">Loading…</div>;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate("/admin/blog")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/blog/${slug}`} target="_blank">
              <Eye className="h-4 w-4" /> Preview
            </Link>
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-5">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
        </div>

        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              slugTouched.current = true;
              setSlug(e.target.value);
            }}
            placeholder="url-friendly-slug"
          />
          <p className="text-xs text-muted-foreground mt-1">URL: /blog/{slug || "your-slug"}</p>
        </div>

        <div>
          <Label htmlFor="author">Author</Label>
          <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="content">Content (Markdown)</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Heading&#10;&#10;Write in markdown…"
            className="min-h-[400px] font-mono text-sm"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-glass-border bg-glass p-4">
          <div>
            <Label htmlFor="published" className="text-base">
              {published ? "Published" : "Draft"}
            </Label>
            <p className="text-xs text-muted-foreground">
              {published ? "Visible on /blog" : "Only visible in CMS"}
            </p>
          </div>
          <Switch id="published" checked={published} onCheckedChange={setPublished} />
        </div>
      </Card>
    </div>
  );
}
