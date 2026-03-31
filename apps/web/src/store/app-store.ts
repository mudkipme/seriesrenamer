import { type Episode, type FileBrowserResponse, type FileEntry, type LanguageOption, type RenamePreviewResponse, type SelectedFile, type ShowDetail, type ShowSummary, LANGUAGE_OPTIONS } from "@seriesrenamer/shared";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api, toSelectedFile } from "@/lib/api";

type AppState = {
  languages: LanguageOption[];
  language: string;
  query: string;
  searchResults: ShowSummary[];
  selectedShow: ShowSummary | null;
  showDetail: ShowDetail | null;
  selectedEpisodes: Episode[];
  lastEpisodeSelectionId: number | null;
  browser: FileBrowserResponse | null;
  selectedFiles: SelectedFile[];
  renamePreview: RenamePreviewResponse | null;
  loading: {
    search: boolean;
    show: boolean;
    files: boolean;
    preview: boolean;
    rename: boolean;
  };
  error: string | null;
  setLanguage: (language: string) => void;
  setQuery: (query: string) => void;
  loadLanguages: () => Promise<void>;
  searchShows: () => Promise<void>;
  selectShow: (show: ShowSummary) => Promise<void>;
  toggleEpisode: (episode: Episode, episodeOrder?: Episode[], useRange?: boolean) => void;
  browse: (path?: string) => Promise<void>;
  addFile: (entry: FileEntry) => void;
  setFiles: (files: SelectedFile[]) => void;
  removeFile: (relativePath: string) => void;
  clearEpisodes: () => void;
  clearFiles: () => void;
  previewRename: () => Promise<void>;
  executeRename: () => Promise<void>;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      languages: LANGUAGE_OPTIONS,
      language: "eng",
      query: "",
      searchResults: [],
      selectedShow: null,
      showDetail: null,
      selectedEpisodes: [],
      lastEpisodeSelectionId: null,
      browser: null,
      selectedFiles: [],
      renamePreview: null,
      loading: {
        search: false,
        show: false,
        files: false,
        preview: false,
        rename: false,
      },
      error: null,
      setLanguage: (language) => set({ language }),
      setQuery: (query) => set({ query }),
      async loadLanguages() {
        try {
          const languages = await api.getLanguages();
          set({ languages, error: null });
        } catch (error) {
          set({
            languages: LANGUAGE_OPTIONS,
            error: error instanceof Error ? error.message : "Failed to load language list.",
          });
        }
      },
      async searchShows() {
        const { query, language } = get();
        if (!query.trim()) {
          return;
        }

        set((state) => ({ loading: { ...state.loading, search: true }, error: null }));
        try {
          const searchResults = await api.searchShows(query, language);
          set((state) => ({
            searchResults,
            selectedShow: searchResults[0] ?? null,
            loading: { ...state.loading, search: false },
          }));
          if (searchResults[0]) {
            await get().selectShow(searchResults[0]);
          }
        } catch (error) {
          set((state) => ({
            error: error instanceof Error ? error.message : "Search failed.",
            loading: { ...state.loading, search: false },
          }));
        }
      },
      async selectShow(show) {
        set((state) => ({
          selectedShow: show,
          selectedEpisodes: [],
          lastEpisodeSelectionId: null,
          renamePreview: null,
          loading: { ...state.loading, show: true },
          error: null,
        }));

        try {
          const showDetail = await api.getShow(show.id, get().language);
          set((state) => ({
            showDetail,
            loading: { ...state.loading, show: false },
          }));
        } catch (error) {
          set((state) => ({
            error: error instanceof Error ? error.message : "Failed to load show details.",
            loading: { ...state.loading, show: false },
          }));
        }
      },
      toggleEpisode(episode, episodeOrder, useRange = false) {
        set((state) => {
          if (useRange && state.lastEpisodeSelectionId !== null && episodeOrder?.length) {
            const anchorIndex = episodeOrder.findIndex((item) => item.id === state.lastEpisodeSelectionId);
            const targetIndex = episodeOrder.findIndex((item) => item.id === episode.id);

            if (anchorIndex >= 0 && targetIndex >= 0) {
              const startIndex = Math.min(anchorIndex, targetIndex);
              const endIndex = Math.max(anchorIndex, targetIndex);
              const rangeEpisodes = episodeOrder.slice(startIndex, endIndex + 1);
              const selectedById = new Map(state.selectedEpisodes.map((item) => [item.id, item]));

              for (const item of rangeEpisodes) {
                selectedById.set(item.id, item);
              }

              return {
                selectedEpisodes: [...selectedById.values()],
                lastEpisodeSelectionId: episode.id,
                renamePreview: null,
              };
            }
          }

          const exists = state.selectedEpisodes.some((selected) => selected.id === episode.id);
          return {
            selectedEpisodes: exists
              ? state.selectedEpisodes.filter((selected) => selected.id !== episode.id)
              : [...state.selectedEpisodes, episode],
            lastEpisodeSelectionId: episode.id,
            renamePreview: null,
          };
        });
      },
      async browse(path = "") {
        set((state) => ({ loading: { ...state.loading, files: true }, error: null }));
        try {
          const browser = await api.browse(path);
          set((state) => ({
            browser,
            loading: { ...state.loading, files: false },
          }));
        } catch (error) {
          set((state) => ({
            error: error instanceof Error ? error.message : "Failed to browse files.",
            loading: { ...state.loading, files: false },
          }));
        }
      },
      addFile(entry) {
        if (entry.kind !== "file") {
          return;
        }

        set((state) => {
          if (state.selectedFiles.some((file) => file.relativePath === entry.relativePath)) {
            return state;
          }

          return {
            selectedFiles: [...state.selectedFiles, toSelectedFile(entry)],
            renamePreview: null,
          };
        });
      },
      setFiles(files) {
        set({
          selectedFiles: files,
          renamePreview: null,
        });
      },
      removeFile(relativePath) {
        set((state) => ({
          selectedFiles: state.selectedFiles.filter((file) => file.relativePath !== relativePath),
          renamePreview: null,
        }));
      },
      clearEpisodes() {
        set({ selectedEpisodes: [], lastEpisodeSelectionId: null, renamePreview: null });
      },
      clearFiles() {
        set({ selectedFiles: [], renamePreview: null });
      },
      async previewRename() {
        const { selectedEpisodes, selectedFiles } = get();
        if (
          selectedEpisodes.length === 0 ||
          selectedFiles.length === 0 ||
          selectedEpisodes.length !== selectedFiles.length
        ) {
          return;
        }

        set((state) => ({ loading: { ...state.loading, preview: true }, error: null }));
        try {
          const renamePreview = await api.previewRename({
            episodes: selectedEpisodes,
            files: selectedFiles,
          });
          set((state) => ({
            renamePreview,
            loading: { ...state.loading, preview: false },
          }));
        } catch (error) {
          set((state) => ({
            error: error instanceof Error ? error.message : "Failed to build rename preview.",
            loading: { ...state.loading, preview: false },
          }));
        }
      },
      async executeRename() {
        const { renamePreview } = get();
        if (!renamePreview?.ready || renamePreview.pairs.length === 0) {
          return;
        }

        set((state) => ({ loading: { ...state.loading, rename: true }, error: null }));
        try {
          await api.executeRename(renamePreview.pairs);
          set((state) => ({
            selectedFiles: [],
            renamePreview: null,
            loading: { ...state.loading, rename: false },
          }));
          await get().browse(get().browser?.currentPath ?? "");
        } catch (error) {
          set((state) => ({
            error: error instanceof Error ? error.message : "Rename failed.",
            loading: { ...state.loading, rename: false },
          }));
        }
      }
    }),
    {
      name: "seriesrenamer-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
      }),
    }
  )
);
