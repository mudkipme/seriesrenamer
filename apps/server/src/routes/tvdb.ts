import { languageOptionSchema, showDetailSchema, showSummarySchema } from "@seriesrenamer/shared";
import { FastifyInstance } from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { TvdbClient } from "../services/tvdb-client.js";

const searchQuerySchema = z.object({
  query: z.string().min(1),
  language: z.string().default("eng"),
});

const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const languageQuerySchema = z.object({
  language: z.string().default("eng"),
});

export async function registerTvdbRoutes(app: FastifyInstance, tvdbClient: TvdbClient) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get(
    "/api/languages",
    {
      schema: {
        response: {
          200: z.array(languageOptionSchema),
        },
      },
    },
    async () => tvdbClient.getLanguages()
  );

  api.get(
    "/api/tvdb/search",
    {
      schema: {
        querystring: searchQuerySchema,
        response: {
          200: z.array(showSummarySchema),
        },
      },
    },
    async (request) => tvdbClient.searchSeries(request.query.query, request.query.language)
  );

  api.get(
    "/api/tvdb/series/:id",
    {
      schema: {
        params: idParamsSchema,
        querystring: languageQuerySchema,
        response: {
          200: showDetailSchema,
        },
      },
    },
    async (request) => tvdbClient.getSeriesDetail(request.params.id, request.query.language)
  );
}
