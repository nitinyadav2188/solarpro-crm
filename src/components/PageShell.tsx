import { ReactNode } from "react";
import { Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title, description, action, icon: Icon = Sun,
}: {
  title: string; description?: string; action?: ReactNode;
  icon?: typeof Sun;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div className="flex items-start gap-3 min-w-0">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}

export function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: typeof Sun; title: string; description: string; action?: ReactNode;
}) {
  return (
    <div className="gov-card p-12 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground mb-4">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ComingSoon({ feature }: { feature: string }) {
  return (
    <EmptyState
      icon={Sun}
      title={`${feature} — coming in Phase 2`}
      description="The schema and access control are already in place. The full UI for this module will land in the next phase, alongside Razorpay, WhatsApp, and AI features."
    />
  );
}
