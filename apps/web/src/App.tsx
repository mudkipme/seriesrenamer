import { useEffect, useState } from "react";
import { LoaderCircle, Search, Sparkles, Tv, WandSparkles } from "lucide-react";
import { FilePickerDialog } from "@/components/file-picker-dialog";
import { EpisodeRow } from "@/components/episode-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export default function App() {
  const {
    browser,
    clearEpisodes,
    clearFiles,
    error,
    executeRename,
    language,
    languages,
    loadLanguages,
    loading,
    previewRename,
    query,
    renamePreview,
    searchResults,
    searchShows,
    selectedEpisodes,
    selectedFiles,
    selectedShow,
    setLanguage,
    setQuery,
    showDetail,
    browse,
    removeFile,
    setFiles,
    selectShow,
    toggleEpisode,
  } = useAppStore();
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);

  const orderedEpisodes = showDetail ? showDetail.seasons.flatMap((season) => season.episodes) : [];

  function openFilePicker() {
    setIsFilePickerOpen(true);
    void browse(browser?.currentPath ?? "");
  }

  useEffect(() => {
    void loadLanguages();
  }, [loadLanguages]);

  return (
    <main className="app-shell mx-auto flex h-[100dvh] max-w-[1600px] flex-col gap-3 overflow-hidden px-4 py-5 md:px-6 lg:px-8">
        <header className="glass-border flex-none rounded-[1.1rem] border border-white/70 bg-card/80 px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-foreground">
              <Tv className="size-4 text-muted-foreground" />
              <h1 className="text-[1.35rem] font-semibold tracking-tight">Series Renamer</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-4 text-primary" />
              <span>Metadata provided by TheTVDB</span>
            </div>
          </div>
        </header>

        {error ? (
          <div className="flex-none rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        ) : null}

        <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1.1fr_1.15fr_0.9fr_1.2fr]">
          <Panel title="TV Shows">
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="grid flex-none gap-2">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search for a TV series"
                />
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Select value={language} onChange={(event) => setLanguage(event.target.value)}>
                    {languages.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    onClick={() => void searchShows()}
                    disabled={loading.search}
                  >
                    {loading.search ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
                    Search
                  </Button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-1 xl:grid-rows-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div className="scroll-panel min-h-0 space-y-1.5 overflow-y-auto rounded-[0.9rem] border border-border/70 bg-white/55 p-1.5">
                  {searchResults.length === 0 ? <p className="p-2 text-xs text-muted-foreground">No shows loaded yet.</p> : null}
                  {searchResults.map((show) => (
                    <button
                      key={show.id}
                      type="button"
                      onClick={() => void selectShow(show)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-2.5 py-1.5 text-left transition",
                        selectedShow?.id === show.id
                          ? "border-primary/40 bg-primary text-primary-foreground"
                          : "border-transparent bg-card hover:border-border hover:bg-white"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <div className="min-w-0 truncate text-sm font-medium">{show.name}</div>
                          <div
                            className={cn(
                              "shrink-0 text-[11px]",
                              selectedShow?.id === show.id ? "text-primary-foreground/80" : "text-muted-foreground"
                            )}
                          >
                            {show.year ?? "Unknown year"}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="min-h-0 overflow-y-auto rounded-[0.9rem] border border-border/70 bg-white/55 p-2.5">
                  {showDetail ? (
                    <div className="flex h-full flex-col gap-2">
                      {showDetail.imageUrl ? (
                        <div className="overflow-hidden rounded-[0.8rem] border border-border/70">
                          <img src={showDetail.imageUrl} alt={showDetail.name} className="h-20 w-full object-cover" />
                        </div>
                      ) : null}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{showDetail.name}</h3>
                          {showDetail.year ? (
                            <Badge className="shrink-0">{showDetail.year}</Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                          {showDetail.firstAired ? <span>First aired {showDetail.firstAired.slice(0, 10)}</span> : null}
                          {showDetail.network ? <span>{showDetail.network}</span> : null}
                          {showDetail.status ? <span>{showDetail.status}</span> : null}
                        </div>
                      </div>
                      <p className="flex-1 overflow-y-auto text-[11px] leading-4 text-muted-foreground">{showDetail.overview ?? "No overview available."}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Pick a show to load seasons and episodes.</p>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Episodes">
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="flex flex-none items-center justify-between rounded-[0.9rem] border border-border/70 bg-white/55 px-3 py-2 text-xs">
                <span className="text-muted-foreground">{showDetail ? `${showDetail.seasons.length} seasons loaded` : "No series selected"}</span>
                {loading.show ? <LoaderCircle className="size-4 animate-spin text-primary" /> : null}
              </div>
              <div className="scroll-panel min-h-0 flex-1 space-y-4 overflow-y-auto rounded-[0.9rem] border border-border/70 bg-white/55 p-2.5">
                {showDetail?.seasons.map((season) => (
                  <div key={season.seasonNumber}>
                    <div className="mb-2 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground">{season.label}</div>
                    <div className="space-y-1.5">
                      {season.episodes.map((episode) => (
                        <EpisodeRow
                          key={episode.id}
                          label={`${String(episode.episodeNumber).padStart(2, "0")}  ${episode.title}`}
                          aired={episode.aired}
                          active={selectedEpisodes.some((selected) => selected.id === episode.id)}
                          onClick={(event) => toggleEpisode(episode, orderedEpisodes, event.shiftKey)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {!showDetail ? (
                  <p className="p-2 text-xs text-muted-foreground">
                    Episode data will appear here after you select a series.
                  </p>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel title="Selected Episodes">
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="flex flex-none items-center justify-between">
                <Badge>{selectedEpisodes.length} queued</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearEpisodes}
                  disabled={selectedEpisodes.length === 0}
                >
                  Clear
                </Button>
              </div>
              <div className="scroll-panel min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-[0.9rem] border border-border/70 bg-white/55 p-1.5">
                {selectedEpisodes.length === 0 ? <p className="p-2 text-xs text-muted-foreground">Choose episodes from the season list.</p> : null}
                {selectedEpisodes
                  .slice()
                  .sort((left, right) => left.seasonNumber - right.seasonNumber || left.episodeNumber - right.episodeNumber)
                  .map((episode) => (
                    <div key={episode.id} className="rounded-lg border border-transparent bg-white px-2.5 py-1.5">
                      <div className="text-xs font-medium">{`S${String(episode.seasonNumber).padStart(2, "0")}E${String(episode.episodeNumber).padStart(2, "0")}`}</div>
                      <div className="text-xs text-muted-foreground">{episode.title}</div>
                    </div>
                  ))}
              </div>
            </div>
          </Panel>

          <Panel title="Selected Files">
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="flex flex-none items-center justify-between gap-2 rounded-[0.9rem] border border-border/70 bg-white/55 p-2.5">
                <div>
                  <div className="text-xs font-medium">Choose primary video files</div>
                </div>
                <Button variant="secondary" size="sm" onClick={openFilePicker}>
                  Choose Files
                </Button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2.5 rounded-[0.9rem] border border-border/70 bg-white/55 p-2.5">
                <div className="flex items-center justify-between">
                  <Badge>{selectedFiles.length} files</Badge>
                  <Button variant="ghost" size="sm" onClick={clearFiles} disabled={selectedFiles.length === 0}>
                    Clear
                  </Button>
                </div>
                <div className="scroll-panel min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                  {selectedFiles.length === 0 ? (
                    <p className="p-1 text-xs text-muted-foreground">No files selected yet.</p>
                  ) : null}
                  {selectedFiles.map((file) => (
                    <button
                      key={file.relativePath}
                      type="button"
                      onClick={() => removeFile(file.relativePath)}
                      className="block w-full rounded-lg border border-transparent bg-white px-2.5 py-1.5 text-left transition hover:border-danger/20 hover:bg-danger/5"
                    >
                      <div className="truncate text-sm font-medium">{file.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{file.relativePath}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </section>

        <Panel
          className="h-[11rem] flex-none"
          title="Rename Plan"
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void previewRename()}
                disabled={loading.preview || selectedEpisodes.length === 0 || selectedFiles.length === 0}
              >
                {loading.preview ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                Preview Rename
              </Button>
              <Button
                size="sm"
                onClick={() => void executeRename()}
                disabled={loading.rename || !renamePreview?.ready}
              >
                {loading.rename ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Apply Rename
              </Button>
            </>
          }
        >
          <div className="flex h-full min-h-0 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {renamePreview?.warnings.map((warning) => (
                <Badge key={warning} className="bg-danger/10 text-foreground">
                  {warning}
                </Badge>
              ))}
              {!renamePreview?.warnings.length && renamePreview ? (
                <Badge className="bg-primary/12 text-foreground">Ready to rename</Badge>
              ) : null}
            </div>

            <div className="scroll-panel min-h-0 flex-1 overflow-y-auto rounded-[0.9rem] border border-border/70 bg-white/55 p-2">
              {!renamePreview?.pairs.length ? (
                <p className="text-xs text-muted-foreground">Build a preview once you have matching episode and file selections.</p>
              ) : (
                <div className="space-y-3">
                  {renamePreview.pairs.map((pair) => (
                    <div
                      key={`${pair.episode.id}-${pair.primaryFile.relativePath}`}
                      className="rounded-[0.9rem] border border-border/70 bg-white p-3"
                    >
                      <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-sm font-semibold">
                            {`S${String(pair.episode.seasonNumber).padStart(2, "0")}E${String(pair.episode.episodeNumber).padStart(2, "0")} - ${pair.episode.title}`}
                          </div>
                          <div className="text-xs text-muted-foreground">{pair.primaryFile.relativePath}</div>
                        </div>
                        <Badge>{pair.operations.length} operations</Badge>
                      </div>
                      <div className="mt-2.5 space-y-1.5">
                        {pair.operations.map((operation) => (
                          <div
                            key={`${operation.from}->${operation.to}`}
                            className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 text-xs"
                          >
                            <div className="font-medium">{operation.to.split("/").at(-1)}</div>
                            <div className="text-[11px] text-muted-foreground">{operation.from} {"->"} {operation.to}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
      <FilePickerDialog
        open={isFilePickerOpen}
        browser={browser}
        loading={loading.files}
        selectedFiles={selectedFiles}
        onBrowse={(path) => void browse(path)}
        onClose={() => setIsFilePickerOpen(false)}
        onApply={(files) => {
          setFiles(files);
          setIsFilePickerOpen(false);
        }}
      />
    </main>
  );
}
