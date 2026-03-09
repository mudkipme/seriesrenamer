import { promises as fs } from "node:fs";
import path from "node:path";
import {
  type Episode,
  type FileBrowserResponse,
  type FileEntry,
  type RenameOperation,
  type RenamePair,
  type SelectedFile,
} from "@seriesrenamer/shared";
import {
  formatEpisodeCode,
  isSidecarFile,
  isVideoFile,
  resolveMediaPath,
  sanitizeEpisodeTitle,
  toRelativeMediaPath,
} from "../lib/path-utils.js";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export class MediaService {
  constructor(private readonly mediaRoot: string) {}

  async browse(relativePath: string): Promise<FileBrowserResponse> {
    const absolutePath = resolveMediaPath(this.mediaRoot, relativePath);
    const mappedEntries = await this.readDirectoryEntries(absolutePath);

    mappedEntries.sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === "directory" ? -1 : 1;
      }

      return collator.compare(left.name, right.name);
    });

    const currentPath = toRelativeMediaPath(this.mediaRoot, absolutePath);
    const parentPath = currentPath ? path.posix.dirname(currentPath) : null;

    return {
      currentPath,
      parentPath: parentPath === "." ? "" : parentPath,
      entries: mappedEntries,
    };
  }

  private async readDirectoryEntries(absolutePath: string): Promise<FileEntry[]> {
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });

    return Promise.all(
      entries
        .filter((entry) => entry.isDirectory() || (entry.isFile() && isVideoFile(entry.name)))
        .map(async (entry) => {
          const fullPath = path.join(absolutePath, entry.name);
          const stats = await fs.stat(fullPath);
          return {
            name: entry.name,
            relativePath: toRelativeMediaPath(this.mediaRoot, fullPath),
            kind: entry.isDirectory() ? "directory" : "file",
            size: entry.isFile() ? stats.size : undefined,
            modifiedAt: stats.mtime.toISOString(),
          } satisfies FileEntry;
        })
    );
  }

  async createRenamePreview(episodes: Episode[], files: SelectedFile[]): Promise<{ pairs: RenamePair[]; warnings: string[]; ready: boolean }> {
    const orderedEpisodes = [...episodes].sort((left, right) => {
      if (left.seasonNumber !== right.seasonNumber) {
        return left.seasonNumber - right.seasonNumber;
      }

      return left.episodeNumber - right.episodeNumber;
    });

    const orderedFiles = [...files].sort((left, right) => collator.compare(left.relativePath, right.relativePath));

    const warnings: string[] = [];
    if (orderedEpisodes.length !== orderedFiles.length) {
      warnings.push(`Selected episodes (${orderedEpisodes.length}) and files (${orderedFiles.length}) do not match.`);
    }

    const pairCount = Math.min(orderedEpisodes.length, orderedFiles.length);
    const pairs: RenamePair[] = [];

    for (let index = 0; index < pairCount; index += 1) {
      const episode = orderedEpisodes[index];
      const primaryFile = orderedFiles[index];

      if (!episode || !primaryFile) {
        continue;
      }

      const absolutePrimaryPath = resolveMediaPath(this.mediaRoot, primaryFile.relativePath);
      const directory = path.dirname(absolutePrimaryPath);
      const fileName = path.basename(absolutePrimaryPath);
      const extension = path.extname(fileName);
      const stem = path.basename(fileName, extension);
      const targetBaseName = `${formatEpisodeCode(episode.seasonNumber, episode.episodeNumber)} - ${sanitizeEpisodeTitle(episode.title)}`;
      const operations: RenameOperation[] = [
        {
          kind: "primary",
          from: primaryFile.relativePath,
          to: toRelativeMediaPath(this.mediaRoot, path.join(directory, `${targetBaseName}${extension}`)),
        }
      ];

      const siblings = await fs.readdir(directory, { withFileTypes: true });
      for (const sibling of siblings) {
        if (!sibling.isFile() || sibling.name === fileName || !isSidecarFile(stem, sibling.name)) {
          continue;
        }

        operations.push({
          kind: "sidecar",
          from: toRelativeMediaPath(this.mediaRoot, path.join(directory, sibling.name)),
          to: toRelativeMediaPath(this.mediaRoot, path.join(directory, `${targetBaseName}${sibling.name.slice(stem.length)}`)),
        });
      }

      operations.sort((left, right) => left.kind.localeCompare(right.kind));
      pairs.push({
        episode,
        primaryFile,
        operations,
      });
    }

    return {
      pairs,
      warnings,
      ready: warnings.length === 0 && pairs.length > 0,
    };
  }

  async executeRename(pairs: RenamePair[]): Promise<void> {
    const operations = pairs.flatMap((pair) => pair.operations);
    const tempMoves = new Map<string, string>();
    const sourceSet = new Set(operations.map((operation) => operation.from));
    const targetSet = new Set<string>();

    for (const operation of operations) {
      if (targetSet.has(operation.to)) {
        throw new Error(`Duplicate target path detected: ${operation.to}`);
      }

      targetSet.add(operation.to);
      const sourcePath = resolveMediaPath(this.mediaRoot, operation.from);
      const targetPath = resolveMediaPath(this.mediaRoot, operation.to);

      await fs.access(sourcePath);
      if (!sourceSet.has(operation.to)) {
        try {
          await fs.access(targetPath);
          throw new Error(`Target already exists: ${operation.to}`);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
          }
        }
      }
    }

    for (const operation of operations) {
      const sourcePath = resolveMediaPath(this.mediaRoot, operation.from);
      const directory = path.dirname(sourcePath);
      const tempName = `.seriesrenamer-${Date.now()}-${Math.random().toString(36).slice(2)}-${path.basename(sourcePath)}`;
      const tempPath = path.join(directory, tempName);
      await fs.rename(sourcePath, tempPath);
      tempMoves.set(operation.from, tempPath);
    }

    try {
      for (const operation of operations) {
        const tempPath = tempMoves.get(operation.from);
        if (!tempPath) {
          throw new Error(`Temporary move missing for ${operation.from}`);
        }

        const targetPath = resolveMediaPath(this.mediaRoot, operation.to);
        await fs.rename(tempPath, targetPath);
      }
    } catch (error) {
      await Promise.all(
        [...tempMoves.entries()].map(async ([from, tempPath]) => {
          const originalPath = resolveMediaPath(this.mediaRoot, from);
          try {
            await fs.rename(tempPath, originalPath);
          } catch {
            // Best effort rollback.
          }
        })
      );
      throw error;
    }
  }
}
