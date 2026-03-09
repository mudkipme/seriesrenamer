import { z } from "zod";

export const languageOptionSchema = z.object({
  code: z.string(),
  label: z.string(),
});

export const showSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string().nullish(),
  imageUrl: z.string().nullish(),
  overview: z.string().nullish(),
  firstAired: z.string().nullish(),
  year: z.number().nullish(),
  status: z.string().nullish(),
  network: z.string().nullish(),
});

export const episodeSchema = z.object({
  id: z.number(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  title: z.string(),
  overview: z.string().nullish(),
  aired: z.string().nullish(),
});

export const seasonGroupSchema = z.object({
  seasonNumber: z.number(),
  label: z.string(),
  episodes: z.array(episodeSchema),
});

export const showDetailSchema = showSummarySchema.extend({
  seasons: z.array(seasonGroupSchema),
});

export const fileEntrySchema = z.object({
  name: z.string(),
  relativePath: z.string(),
  kind: z.enum(["directory", "file"]),
  size: z.number().nullish(),
  modifiedAt: z.string().nullish(),
});

export const selectedFileSchema = z.object({
  name: z.string(),
  relativePath: z.string(),
  extension: z.string(),
});

export const fileBrowserResponseSchema = z.object({
  currentPath: z.string(),
  parentPath: z.string().nullable(),
  entries: z.array(fileEntrySchema),
});

export const renameOperationSchema = z.object({
  kind: z.enum(["primary", "sidecar"]),
  from: z.string(),
  to: z.string(),
});

export const renamePairSchema = z.object({
  episode: episodeSchema,
  primaryFile: selectedFileSchema,
  operations: z.array(renameOperationSchema),
});

export const renamePreviewRequestSchema = z.object({
  episodes: z.array(episodeSchema).min(1),
  files: z.array(selectedFileSchema).min(1),
});

export const renamePreviewResponseSchema = z.object({
  pairs: z.array(renamePairSchema),
  warnings: z.array(z.string()),
  ready: z.boolean(),
});

export const renameExecuteRequestSchema = z.object({
  pairs: z.array(renamePairSchema).min(1),
});

export const renameExecuteResponseSchema = z.object({
  success: z.literal(true),
});

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  mediaRoot: z.string(),
});

export type LanguageOption = z.infer<typeof languageOptionSchema>;
export type ShowSummary = z.infer<typeof showSummarySchema>;
export type Episode = z.infer<typeof episodeSchema>;
export type SeasonGroup = z.infer<typeof seasonGroupSchema>;
export type ShowDetail = z.infer<typeof showDetailSchema>;
export type FileEntry = z.infer<typeof fileEntrySchema>;
export type SelectedFile = z.infer<typeof selectedFileSchema>;
export type FileBrowserResponse = z.infer<typeof fileBrowserResponseSchema>;
export type RenameOperation = z.infer<typeof renameOperationSchema>;
export type RenamePair = z.infer<typeof renamePairSchema>;
export type RenamePreviewRequest = z.infer<typeof renamePreviewRequestSchema>;
export type RenamePreviewResponse = z.infer<typeof renamePreviewResponseSchema>;
export type RenameExecuteRequest = z.infer<typeof renameExecuteRequestSchema>;
export type RenameExecuteResponse = z.infer<typeof renameExecuteResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "eng", label: "English" },
  { code: "deu", label: "Deutsch" },
  { code: "fra", label: "Francais" },
  { code: "spa", label: "Espanol" },
  { code: "ita", label: "Italiano" },
  { code: "jpn", label: "Japanese" },
  { code: "kor", label: "Korean" },
  { code: "zho", label: "Chinese" },
  { code: "por", label: "Portugues" },
  { code: "nld", label: "Nederlands" }
];
