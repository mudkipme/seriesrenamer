import {
  fileBrowserResponseSchema,
  languageOptionSchema,
  renamePreviewResponseSchema,
  showDetailSchema,
  showSummarySchema,
  type LanguageOption,
  type RenamePair,
  type RenamePreviewRequest,
  type SelectedFile,
  LANGUAGE_OPTIONS,
} from "@seriesrenamer/shared";

async function fetchJson<T>(input: RequestInfo, init: RequestInit, parser: (value: unknown) => T): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return parser(await response.json());
}

export const api = {
  async getLanguages(): Promise<LanguageOption[]> {
    try {
      return await fetchJson("/api/languages", {}, (value) => languageOptionSchema.array().parse(value));
    } catch {
      return LANGUAGE_OPTIONS;
    }
  },
  async searchShows(query: string, language: string) {
    return fetchJson(`/api/tvdb/search?query=${encodeURIComponent(query)}&language=${language}`, {}, (value) => showSummarySchema.array().parse(value));
  },
  async getShow(id: number, language: string) {
    return fetchJson(`/api/tvdb/series/${id}?language=${language}`, {}, (value) => showDetailSchema.parse(value));
  },
  async browse(path = "") {
    return fetchJson(`/api/files?path=${encodeURIComponent(path)}`, {}, (value) => fileBrowserResponseSchema.parse(value));
  },
  async previewRename(payload: RenamePreviewRequest) {
    return fetchJson("/api/rename/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }, (value) => renamePreviewResponseSchema.parse(value));
  },
  async executeRename(pairs: RenamePair[]) {
    await fetchJson("/api/rename/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pairs }),
    }, (value) => value as { success: true });
  }
};

export function toSelectedFile(file: SelectedFile | { name: string; relativePath: string; extension?: string }) {
  const name = file.name;
  const lastDotIndex = name.lastIndexOf(".");
  const extension = file.extension ?? (lastDotIndex >= 0 ? name.slice(lastDotIndex) : "");
  return {
    name,
    relativePath: file.relativePath,
    extension,
  };
}
