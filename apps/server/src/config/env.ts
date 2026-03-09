import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  TVDB_API_KEY: z.string().min(1, "TVDB_API_KEY is required"),
  TVDB_PIN: z.string().optional().default(""),
  MEDIA_ROOT: z.string().min(1).default("/media"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnvFileIfPresent(path: string) {
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}

function loadEnvFiles() {
  const configDir = dirname(fileURLToPath(import.meta.url));
  const packageRoot = resolve(configDir, "../..");
  const workspaceRoot = resolve(packageRoot, "../..");

  loadEnvFileIfPresent(resolve(workspaceRoot, ".env"));
  loadEnvFileIfPresent(resolve(packageRoot, ".env"));
}

export function readEnv(): Env {
  loadEnvFiles();
  return envSchema.parse(process.env);
}
