import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type Post = {
  title: string;
  content: string;
  author: string;
  created_at: string;
};

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("title,content,author,created_at")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      setPost(data as Post | null);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="container mx-auto px-4 py-16">Loading…</div>;
  if (!post)
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-4">Post not found</h1>
        <Button asChild>
          <Link to="/blog">Back to blog</Link>
        </Button>
      </div>
    );

  return (
    <article className="container mx-auto max-w-3xl px-4 py-12">
      <Button asChild variant="ghost" className="mb-6">
        <Link to="/blog">
          <ArrowLeft className="h-4 w-4" /> All posts
        </Link>
      </Button>
      <header className="mb-10">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{post.title}</h1>
        <p className="text-sm text-muted-foreground">
          By {post.author} ·{" "}
          {new Date(post.created_at).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>
      <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-strong:text-foreground">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>
    </article>
  );
}
