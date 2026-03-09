import type { MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EpisodeRowProps = {
  label: string;
  aired?: string | null;
  active: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function EpisodeRow({ label, aired, active, onClick }: EpisodeRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition",
        active
          ? "border-primary/40 bg-primary/12 text-foreground"
          : "border-transparent bg-white/65 hover:border-border hover:bg-white"
      )}
    >
      <div className="min-w-0">
        <div className="truncate">{label}</div>
        {aired ? <div className="text-[10px] text-muted-foreground">{aired.slice(0, 10)}</div> : null}
      </div>
      {active ? <Badge>Queued</Badge> : null}
    </button>
  );
}
