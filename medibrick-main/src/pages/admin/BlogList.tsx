import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Eye } from "lucide-react";

type Post = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  author: string;
  updated_at: string;
};

export default function BlogList() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,title,slug,status,author,updated_at")
        .order("updated_at", { ascending: false });
      if (error) toast.error(error.message);
      setPosts((data as Post[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const createNew = async () => {
    const slug = `untitled-${Date.now()}`;
    const { data, error } = await supabase
      .from("blog_posts")
      .insert({ title: "Untitled", slug, content: "", author: "Medibrick Team", status: "draft" })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    navigate(`/admin/blog/edit/${data.id}`);
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Blog CMS</h1>
          <p className="text-muted-foreground mt-1">Manage MediBricks blog posts</p>
        </div>
        <Button onClick={createNew}>
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : posts.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No posts yet. Create your first one.</Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{p.title}</h3>
                  <Badge
                    variant="outline"
                    className={
                      p.status === "published"
                        ? "bg-green-500/10 text-green-700 border-green-500/30"
                        : "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  /{p.slug} · by {p.author} · {new Date(p.updated_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/blog/${p.slug}`} target="_blank">
                    <Eye className="h-4 w-4" /> Preview
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={`/admin/blog/edit/${p.id}`}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
