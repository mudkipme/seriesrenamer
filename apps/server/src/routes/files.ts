import { fileBrowserResponseSchema } from "@seriesrenamer/shared";
import { FastifyInstance } from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { MediaService } from "../services/media-service.js";

const browseQuerySchema = z.object({
  path: z.string().optional().default(""),
});

export async function registerFileRoutes(app: FastifyInstance, mediaService: MediaService) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get(
    "/api/files",
    {
      schema: {
        querystring: browseQuerySchema,
        response: {
          200: fileBrowserResponseSchema,
        },
      },
    },
    async (request) => mediaService.browse(request.query.path)
  );
}
