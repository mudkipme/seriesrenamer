import { useMemo, useState, type MouseEvent } from "react";
import { Check, Folder, FolderUp, X } from "lucide-react";
import { type FileBrowserResponse, type FileEntry, type SelectedFile } from "@seriesrenamer/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toSelectedFile } from "@/lib/api";
import { cn } from "@/lib/utils";

type FilePickerDialogProps = {
  browser: FileBrowserResponse | null;
  loading: boolean;
  selectedFiles: SelectedFile[];
  onBrowse: (path?: string) => void;
  onClose: () => void;
  onApply: (files: SelectedFile[]) => void;
};

function FilePickerRow({
  entry,
  selected,
  onClick,
}: {
  entry: FileEntry;
  selected: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const isDirectory = entry.kind === "directory";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition",
        selected
          ? "border-primary/40 bg-primary/12"
          : "border-transparent bg-white hover:border-border hover:bg-background/80"
      )}
    >
      <div className={cn("flex size-8 items-center justify-center rounded-md", isDirectory ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground")}>
        {selected && !isDirectory ? <Check className="size-4" /> : isDirectory ? <Folder className="size-4" /> : <span className="text-[10px] font-semibold uppercase">VID</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{entry.name}</div>
        <div className="truncate text-[11px] text-muted-foreground">
          {isDirectory ? entry.relativePath || "/" : entry.relativePath}
        </div>
      </div>
      {isDirectory ? <Badge className="bg-white">Open</Badge> : selected ? <Badge>Selected</Badge> : null}
    </button>
  );
}

export function FilePickerDialog({
  browser,
  loading,
  selectedFiles,
  onBrowse,
  onClose,
  onApply,
}: FilePickerDialogProps) {
  const [pendingFiles, setPendingFiles] = useState<SelectedFile[]>(() => selectedFiles);
  const [lastPendingFilePath, setLastPendingFilePath] = useState<string | null>(null);

  const selectableBrowserFiles = useMemo(
    () => browser?.entries.filter((entry: FileEntry) => entry.kind === "file") ?? [],
    [browser]
  );

  function togglePendingFile(entry: FileEntry, useRange: boolean) {
    setPendingFiles((current) => {
      if (useRange && lastPendingFilePath) {
        const anchorIndex = selectableBrowserFiles.findIndex((item: FileEntry) => item.relativePath === lastPendingFilePath);
        const targetIndex = selectableBrowserFiles.findIndex((item: FileEntry) => item.relativePath === entry.relativePath);

        if (anchorIndex >= 0 && targetIndex >= 0) {
          const startIndex = Math.min(anchorIndex, targetIndex);
          const endIndex = Math.max(anchorIndex, targetIndex);
          const rangeFiles = selectableBrowserFiles.slice(startIndex, endIndex + 1);
          const selectedByPath = new Map(current.map((item: SelectedFile) => [item.relativePath, item]));

          for (const file of rangeFiles) {
            selectedByPath.set(file.relativePath, toSelectedFile(file));
          }

          return [...selectedByPath.values()];
        }
      }

      const exists = current.some((item) => item.relativePath === entry.relativePath);
      if (exists) {
        return current.filter((item) => item.relativePath !== entry.relativePath);
      }

      return [...current, toSelectedFile(entry)];
    });
    setLastPendingFilePath(entry.relativePath);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="glass-border flex h-[min(78vh,48rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.1rem] border border-white/70 bg-card/95 shadow-panel">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">Choose Files</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Navigate folders like a desktop file picker. Use Shift-click to select a range of files in the current folder.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <Button variant="secondary" size="sm" onClick={() => onBrowse(browser?.parentPath ?? "")} disabled={!browser?.parentPath && browser?.parentPath !== ""}>
            <FolderUp className="size-4" />
            Up
          </Button>
          <div className="min-w-0 flex-1 rounded-md bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            /{browser?.currentPath || ""}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
          <div className="scroll-panel min-h-0 space-y-1.5 overflow-y-auto rounded-[0.9rem] border border-border/70 bg-white/55 p-1.5">
            {loading ? <p className="p-2 text-xs text-muted-foreground">Loading files...</p> : null}
            {!loading && browser?.entries.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">No files or folders found here.</p>
            ) : null}
            {browser?.entries.map((entry: FileEntry) => (
              <FilePickerRow
                key={entry.relativePath}
                entry={entry}
                selected={pendingFiles.some((file) => file.relativePath === entry.relativePath)}
                onClick={(event) => {
                  if (entry.kind === "directory") {
                    onBrowse(entry.relativePath);
                    return;
                  }

                  togglePendingFile(entry, event.shiftKey);
                }}
              />
            ))}
          </div>

          <div className="flex min-h-0 flex-col gap-2.5 rounded-[0.9rem] border border-border/70 bg-white/55 p-2.5">
            <div className="flex items-center justify-between">
              <Badge>{pendingFiles.length} selected</Badge>
              <Button variant="ghost" size="sm" onClick={() => setPendingFiles([])} disabled={pendingFiles.length === 0}>
                Clear
              </Button>
            </div>
            <div className="scroll-panel min-h-0 flex-1 space-y-1.5 overflow-y-auto">
              {pendingFiles.length === 0 ? <p className="p-1 text-xs text-muted-foreground">Selected files will appear here before applying them.</p> : null}
              {pendingFiles.map((file) => (
                <button
                  key={file.relativePath}
                  type="button"
                  onClick={() => setPendingFiles((current) => current.filter((item: SelectedFile) => item.relativePath !== file.relativePath))}
                  className="block w-full rounded-lg border border-transparent bg-white px-2.5 py-1.5 text-left transition hover:border-danger/20 hover:bg-danger/5"
                >
                  <div className="truncate text-sm font-medium">{file.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{file.relativePath}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/70 px-4 py-3">
          <p className="text-[11px] text-muted-foreground">Matching subtitle sidecars are still renamed automatically with the selected primary video files.</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onApply(pendingFiles)}>
              Apply Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
