import path from "node:path";

export const VIDEO_EXTENSIONS = new Set([
  ".mkv",
  ".mp4",
  ".m4v",
  ".avi",
  ".mov",
  ".webm",
  ".mpg",
  ".mpeg",
  ".wmv",
  ".ts",
  ".m2ts",
  ".mts"
]);

export const SIDECAR_FINAL_EXTENSIONS = new Set([
  ".ass",
  ".ssa",
  ".srt",
  ".sub",
  ".idx",
  ".sup",
  ".vtt"
]);

const WINDOWS_RESERVED = /[<>:"/\\|?*]/g;

export function normalizeRelativePath(relativePath: string | undefined): string {
  const cleaned = (relativePath ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
  return cleaned === "." ? "" : cleaned;
}

export function resolveMediaPath(mediaRoot: string, relativePath: string | undefined): string {
  const root = path.resolve(mediaRoot);
  const resolved = path.resolve(root, normalizeRelativePath(relativePath));

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Path escapes media root.");
  }

  return resolved;
}

export function toRelativeMediaPath(mediaRoot: string, absolutePath: string): string {
  return path.relative(path.resolve(mediaRoot), absolutePath).replaceAll(path.sep, "/");
}

export function isVideoFile(fileName: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

export function isSidecarFile(stem: string, fileName: string): boolean {
  const parsed = path.parse(fileName);

  if (parsed.name === stem) {
    return SIDECAR_FINAL_EXTENSIONS.has(parsed.ext.toLowerCase());
  }

  return fileName.startsWith(`${stem}.`) && [...SIDECAR_FINAL_EXTENSIONS].some((extension) => fileName.endsWith(extension));
}

export function sanitizeEpisodeTitle(title: string): string {
  return title
    .normalize("NFKC")
    .split("")
    .map((character) => {
      if (character.charCodeAt(0) < 32) {
        return " ";
      }

      return character;
    })
    .join("")
    .replace(WINDOWS_RESERVED, " ")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .trim();
}

export function formatEpisodeCode(seasonNumber: number, episodeNumber: number): string {
  return `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
}
