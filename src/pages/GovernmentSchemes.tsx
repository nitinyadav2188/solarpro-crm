import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PublicNav, PublicFooter } from "@/components/GovHeader";
import { Landmark, ArrowLeft, ExternalLink, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Scheme {
  id: string; slug: string; name: string; authority: string | null;
  scheme_type: string | null; state: string | null;
  short_description: string | null; description: string;
  subsidy_details: string | null; eligibility: string | null;
  documents_required: string | null; application_process: string | null;
  official_url: string | null;
}

export default function GovernmentSchemes() {
  const { slug } = useParams();
  const [items, setItems] = useState<Scheme[]>([]);
  const [active, setActive] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (slug) {
        const { data } = await supabase.from("government_schemes").select("*").eq("slug", slug).maybeSingle();
        setActive(data as Scheme | null);
      } else {
        const { data } = await supabase.from("government_schemes").select("*").eq("active", true).order("name");
        setItems((data ?? []) as Scheme[]);
      }
      setLoading(false);
    })();
  }, [slug]);

  const states = useMemo(() => Array.from(new Set(items.map(i => i.state).filter(Boolean))) as string[], [items]);
  const filtered = items.filter(i =>
    (stateFilter === "all" || i.state === stateFilter) &&
    (q === "" || i.name.toLowerCase().includes(q.toLowerCase()) || (i.short_description ?? "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        {slug ? (
          <SchemeDetail scheme={active} loading={loading} />
        ) : (
          <>
            <div className="mb-8 border-b pb-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary font-semibold">
                <Landmark className="h-3.5 w-3.5" /> Government of India · MNRE & State Schemes
              </div>
              <h1 className="font-display text-3xl sm:text-4xl mt-2">Solar Subsidy & Scheme Directory</h1>
              <p className="text-muted-foreground mt-2 max-w-3xl">
                Curated list of central and state-level solar schemes — PM Surya Ghar, KUSUM, rooftop CFA, and state top-ups.
                Eligibility, subsidy amounts, documents, and step-by-step application links — all in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 mb-6 items-center">
              <Input placeholder="Search schemes…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-[200px]"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states + Central</SelectItem>
                  {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground ml-auto">{filtered.length} schemes</span>
            </div>

            {loading ? <div className="text-muted-foreground">Loading…</div> : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map(s => (
                  <Link key={s.id} to={`/schemes/${s.slug}`} className="gov-card p-5 hover:shadow-md transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary shrink-0">
                        <Landmark className="h-5 w-5" />
                      </div>
                      {s.state && (
                        <span className="text-[10px] uppercase tracking-widest border border-border px-2 py-0.5 rounded-full">
                          {s.state}
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-lg mt-3 group-hover:text-primary">{s.name}</h2>
                    {s.authority && <div className="text-xs text-muted-foreground mt-1">{s.authority}</div>}
                    {s.short_description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{s.short_description}</p>}
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

function SchemeDetail({ scheme, loading }: { scheme: Scheme | null; loading: boolean }) {
  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!scheme) return <div className="gov-card p-10 text-center text-muted-foreground">Scheme not found.</div>;
  return (
    <article>
      <Link to="/schemes" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> All schemes
      </Link>
      <div className="flex flex-wrap items-start gap-3 mb-2">
        <span className="text-[10px] uppercase tracking-widest border border-border px-2 py-0.5 rounded-full">{scheme.state ?? "Central"}</span>
        {scheme.scheme_type && <span className="text-[10px] uppercase tracking-widest bg-accent/15 text-accent-foreground px-2 py-0.5 rounded-full">{scheme.scheme_type}</span>}
      </div>
      <h1 className="font-display text-3xl sm:text-4xl">{scheme.name}</h1>
      {scheme.authority && <div className="text-sm text-muted-foreground mt-1">By {scheme.authority}</div>}

      <p className="mt-5 text-base leading-relaxed text-foreground/90">{scheme.description}</p>

      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        <Section title="Subsidy Details" body={scheme.subsidy_details} />
        <Section title="Eligibility" body={scheme.eligibility} />
        <Section title="Documents Required" body={scheme.documents_required} />
        <Section title="Application Process" body={scheme.application_process} />
      </div>

      {scheme.official_url && (
        <a href={scheme.official_url} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 mt-8 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-medium hover:bg-primary/90">
          Visit Official Portal <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </article>
  );
}

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div className="gov-card p-5">
      <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">{title}</div>
      <div className="text-sm whitespace-pre-line text-foreground/90">{body}</div>
    </div>
  );
}
