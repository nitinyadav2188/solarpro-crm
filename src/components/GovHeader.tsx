// Government-style tricolor strip used across public pages
import { Sun } from "lucide-react";
import { Link } from "react-router-dom";

export function GovStrip() {
  return (
    <div className="h-1 w-full flex">
      <div className="flex-1 bg-[hsl(28_90%_55%)]" />
      <div className="flex-1 bg-white border-y border-border" />
      <div className="flex-1 bg-[hsl(140_60%_30%)]" />
    </div>
  );
}

export function PublicNav() {
  return (
    <>
      <GovStrip />
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-between text-[11px] uppercase tracking-wider">
          <span>भारत सरकार | Government of India · MNRE Aligned</span>
          <span className="hidden sm:inline">Last updated: {new Date().toLocaleDateString("en-IN")}</span>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Sun className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg">SolarPro</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Solar Business Operating System
              </div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/" className="text-foreground/80 hover:text-primary">Home</Link>
            <Link to="/schemes" className="text-foreground/80 hover:text-primary">Govt. Schemes</Link>
            <Link to="/blog" className="text-foreground/80 hover:text-primary">Blog</Link>
            <Link to="/auth" className="text-foreground/80 hover:text-primary">Sign in</Link>
          </nav>
          <Link to="/auth" className="md:hidden text-sm text-primary font-medium">Sign in</Link>
        </div>
      </header>
    </>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t bg-secondary/30 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-10 grid sm:grid-cols-3 gap-6 text-sm">
        <div>
          <div className="font-display text-base mb-2">SolarPro</div>
          <p className="text-muted-foreground">
            India's solar business operating system — GST-ready invoicing, government scheme tracking, and project execution in one place.
          </p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Resources</div>
          <ul className="space-y-1.5">
            <li><Link to="/schemes" className="hover:text-primary">Government Schemes</Link></li>
            <li><Link to="/blog" className="hover:text-primary">Blog & Guides</Link></li>
            <li><a href="https://pmsuryaghar.gov.in" target="_blank" rel="noreferrer" className="hover:text-primary">PM Surya Ghar Portal ↗</a></li>
            <li><a href="https://mnre.gov.in" target="_blank" rel="noreferrer" className="hover:text-primary">MNRE Official ↗</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Legal</div>
          <p className="text-muted-foreground text-xs">
            SolarPro is a private SaaS platform and is not a Government of India entity. Scheme information is curated from public sources for reference; always verify on the official portal.
          </p>
        </div>
      </div>
      <GovStrip />
    </footer>
  );
}
