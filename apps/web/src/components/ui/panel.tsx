import type * as React from "react";
import { cn } from "@/lib/utils";

type PanelProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function Panel({ className, title, subtitle, actions, children, ...props }: PanelProps) {
  return (
    <section className={cn("glass-border flex min-h-0 flex-col overflow-hidden rounded-[1.1rem] border border-white/60 bg-card/80 p-3 shadow-panel backdrop-blur-sm", className)} {...props}>
      <header className="mb-1.5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{title}</h2>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
