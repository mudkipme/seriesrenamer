import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-input bg-white/70 px-3 py-2 pr-9 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20",
          props.className
        )}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
