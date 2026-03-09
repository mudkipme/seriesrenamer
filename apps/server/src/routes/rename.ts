import { renameExecuteRequestSchema, renameExecuteResponseSchema, renamePreviewRequestSchema, renamePreviewResponseSchema } from "@seriesrenamer/shared";
import { FastifyInstance } from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import { MediaService } from "../services/media-service.js";

export async function registerRenameRoutes(app: FastifyInstance, mediaService: MediaService) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.post(
    "/api/rename/preview",
    {
      schema: {
        body: renamePreviewRequestSchema,
        response: {
          200: renamePreviewResponseSchema,
        },
      },
    },
    async (request) => mediaService.createRenamePreview(request.body.episodes, request.body.files)
  );

  api.post(
    "/api/rename/execute",
    {
      schema: {
        body: renameExecuteRequestSchema,
        response: {
          200: renameExecuteResponseSchema,
        },
      },
    },
    async (request) => {
      await mediaService.executeRename(request.body.pairs);
      return {
        success: true as const,
      };
    }
  );
}
