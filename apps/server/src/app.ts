import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { healthResponseSchema } from "@seriesrenamer/shared";
import fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { serializerCompiler, type ZodTypeProvider, validatorCompiler } from "fastify-type-provider-zod";
import { readEnv } from "./config/env.js";
import { MediaService } from "./services/media-service.js";
import { TvdbClient } from "./services/tvdb-client.js";
import { registerFileRoutes } from "./routes/files.js";
import { registerRenameRoutes } from "./routes/rename.js";
import { registerTvdbRoutes } from "./routes/tvdb.js";

function resolveWebDist(): string | null {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.WEB_DIST_PATH,
    path.resolve(currentDir, "../../web/dist"),
    path.resolve(currentDir, "../../../web/dist"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function buildApp(): Promise<FastifyInstance> {
  const env = readEnv();
  const app = fastify({
    logger: env.NODE_ENV !== "test",
  });
  const api = app.withTypeProvider<ZodTypeProvider>();
  const tvdbClient = new TvdbClient(env.TVDB_API_KEY, env.TVDB_PIN);
  const mediaService = new MediaService(env.MEDIA_ROOT);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: env.NODE_ENV === "development" ? env.CORS_ORIGIN : true,
  });

  api.get(
    "/api/health",
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async () => ({
      ok: true as const,
      mediaRoot: env.MEDIA_ROOT,
    })
  );

  await registerTvdbRoutes(app, tvdbClient);
  await registerFileRoutes(app, mediaService);
  await registerRenameRoutes(app, mediaService);

  const webDist = resolveWebDist();
  if (webDist) {
    await app.register(fastifyStatic, {
      root: webDist,
      prefix: "/",
      wildcard: false,
    });

    app.get("/*", async (_request, reply) => {
      return reply.sendFile("index.html");
    });
  }

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const statusCode = (error as FastifyError).statusCode ?? 500;
    reply.status(statusCode).send({
      message: error instanceof Error ? error.message : "Unknown error",
    });
  });

  return app;
}
