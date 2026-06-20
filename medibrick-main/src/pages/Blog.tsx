import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  created_at: string;
};

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id,title,slug,content,author,created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setPosts((data as Post[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">MediBricks Blog</h1>
        <p className="text-muted-foreground mt-3">Insights on Indian healthcare staffing</p>
      </header>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet. Check back soon.</p>
      ) : (
        <div className="space-y-6">
          {posts.map((p) => {
            const excerpt = p.content.replace(/[#*`>_~\-]/g, "").trim().slice(0, 180);
            return (
              <Link key={p.id} to={`/blog/${p.slug}`} className="block">
                <Card className="p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(p.created_at).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <h2 className="text-2xl font-semibold mb-2">{p.title}</h2>
                  <p className="text-muted-foreground line-clamp-3">{excerpt}…</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
