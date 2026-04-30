import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PublicNav, PublicFooter } from "@/components/GovHeader";
import { Calendar, ArrowLeft, Tag } from "lucide-react";
import { formatDate } from "@/lib/format";

interface Post {
  id: string; slug: string; title: string; excerpt: string | null;
  content: string; category: string | null; tags: string[] | null;
  author: string | null; published_at: string;
}

export default function Blog() {
  const { slug } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (slug) {
        const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
        setPost(data as Post | null);
      } else {
        const { data } = await supabase.from("blog_posts").select("*").eq("published", true).order("published_at", { ascending: false });
        setPosts((data ?? []) as Post[]);
      }
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />
      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        {slug ? (
          <article>
            <Link to="/blog" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-6">
              <ArrowLeft className="h-3.5 w-3.5" /> All articles
            </Link>
            {loading ? <div className="text-muted-foreground">Loading…</div> : !post ? (
              <div className="gov-card p-10 text-center text-muted-foreground">Article not found.</div>
            ) : (
              <>
                {post.category && <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">{post.category}</div>}
                <h1 className="font-display text-3xl sm:text-4xl">{post.title}</h1>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(post.published_at)}</span>
                  <span>· {post.author}</span>
                </div>
                <div className="prose prose-sm sm:prose mt-6 max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-primary prose-table:text-sm">
                  <Markdown content={post.content} />
                </div>
              </>
            )}
          </article>
        ) : (
          <>
            <div className="mb-8 border-b pb-6">
              <div className="text-xs uppercase tracking-widest text-primary font-semibold">SolarPro Editorial</div>
              <h1 className="font-display text-3xl sm:text-4xl mt-1">Blog & Industry Guides</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Practical, India-specific guides on rooftop solar, government subsidies, GST compliance,
                and field sales — written for installers, EPCs, and homeowners.
              </p>
            </div>
            {loading ? <div className="text-muted-foreground">Loading…</div> : (
              <div className="grid sm:grid-cols-2 gap-5">
                {posts.map(p => (
                  <Link key={p.id} to={`/blog/${p.slug}`} className="gov-card p-5 hover:shadow-md transition group">
                    {p.category && <div className="text-[10px] uppercase tracking-widest text-primary font-semibold">{p.category}</div>}
                    <h2 className="font-display text-xl mt-1 group-hover:text-primary">{p.title}</h2>
                    {p.excerpt && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.excerpt}</p>}
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(p.published_at)}</span>
                      {p.tags?.slice(0, 2).map(t => (
                        <span key={t} className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {t}</span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

// Tiny markdown-ish renderer (headings, lists, tables, paragraphs, bold)
function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const out: JSX.Element[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith("## ")) { out.push(<h2 key={i}>{l.slice(3)}</h2>); i++; continue; }
    if (l.startsWith("# ")) { out.push(<h1 key={i}>{l.slice(2)}</h1>); i++; continue; }
    if (l.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) { tableLines.push(lines[i]); i++; }
      const rows = tableLines.filter(r => !/^\|[\s\-:|]+\|$/.test(r))
        .map(r => r.split("|").slice(1, -1).map(c => c.trim()));
      out.push(
        <table key={`t${i}`}><thead><tr>{rows[0].map((c, k) => <th key={k}>{c}</th>)}</tr></thead>
          <tbody>{rows.slice(1).map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table>
      );
      continue;
    }
    if (/^\d+\.\s/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, "")); i++; }
      out.push(<ol key={`o${i}`}>{items.map((it, k) => <li key={k} dangerouslySetInnerHTML={{ __html: inline(it) }} />)}</ol>);
      continue;
    }
    if (l.startsWith("- ") || l.startsWith("• ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("• "))) { items.push(lines[i].slice(2)); i++; }
      out.push(<ul key={`u${i}`}>{items.map((it, k) => <li key={k} dangerouslySetInnerHTML={{ __html: inline(it) }} />)}</ul>);
      continue;
    }
    if (l.trim() === "") { i++; continue; }
    out.push(<p key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />);
    i++;
  }
  return <>{out}</>;
}
function inline(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
