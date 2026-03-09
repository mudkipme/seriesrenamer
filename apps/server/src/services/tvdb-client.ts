import { LANGUAGE_OPTIONS, type Episode, type ShowDetail, type ShowSummary } from "@seriesrenamer/shared";

const TVDB_API_URL = "https://api4.thetvdb.com/v4";
const DEFAULT_EPISODE_LANGUAGE = "eng";

type TokenState = {
  token: string;
  expiresAt: number;
};

type FetchOptions = {
  method?: string;
  body?: unknown;
  searchParams?: URLSearchParams;
};

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export class TvdbClient {
  private tokenState: TokenState | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly pin: string
  ) {}

  async searchSeries(query: string, language: string): Promise<ShowSummary[]> {
    const payload = await this.fetchJson("/search", {
      searchParams: new URLSearchParams({
        query,
        type: "series",
        language,
      }),
    });

    return toArray<Record<string, unknown>>(asRecord(payload).data)
      .map((item) => this.mapShowSummary(item))
      .filter((item): item is ShowSummary => item !== null);
  }

  async getSeriesDetail(id: number, language: string): Promise<ShowDetail> {
    const [seriesPayload, episodesPayload] = await Promise.all([
      this.fetchJson(`/series/${id}/extended`, {
        searchParams: new URLSearchParams({
          short: "true",
          meta: "translations",
          language,
        }),
      }),
      this.fetchMergedEpisodes(id, language),
    ]);

    const seriesData = asRecord(asRecord(seriesPayload).data);
    const summary = this.mapShowSummary(seriesData, id);
    if (!summary) {
      throw new Error(`TheTVDB series ${id} did not return a valid identifier.`);
    }

    const seasons = new Map<number, Episode[]>();

    for (const episode of episodesPayload) {
      if (!seasons.has(episode.seasonNumber)) {
        seasons.set(episode.seasonNumber, []);
      }

      seasons.get(episode.seasonNumber)?.push(episode);
    }

    return {
      ...summary,
      seasons: [...seasons.entries()]
        .sort((left, right) => left[0] - right[0])
        .map(([seasonNumber, episodes]) => ({
          seasonNumber,
          label: seasonNumber === 0 ? "Specials" : `Season ${String(seasonNumber).padStart(2, "0")}`,
          episodes: episodes.sort((left, right) => left.episodeNumber - right.episodeNumber),
        })),
    };
  }

  getLanguages() {
    return LANGUAGE_OPTIONS;
  }

  private async fetchMergedEpisodes(id: number, language: string): Promise<Episode[]> {
    const defaultEpisodes = await this.fetchEpisodesForLanguage(id, DEFAULT_EPISODE_LANGUAGE);
    if (language === DEFAULT_EPISODE_LANGUAGE) {
      return defaultEpisodes;
    }

    try {
      const localizedEpisodes = await this.fetchEpisodesForLanguage(id, language);
      const localizedById = new Map(localizedEpisodes.map((episode) => [episode.id, episode]));
      const localizedByOrderKey = new Map(
        localizedEpisodes.map((episode) => [`${episode.seasonNumber}:${episode.episodeNumber}`, episode])
      );

      return defaultEpisodes.map((episode) => {
        const localizedEpisode = localizedById.get(episode.id) ?? localizedByOrderKey.get(`${episode.seasonNumber}:${episode.episodeNumber}`);

        if (!localizedEpisode) {
          return episode;
        }

        return {
          ...episode,
          title: localizedEpisode.title || episode.title,
          overview: localizedEpisode.overview ?? episode.overview,
          aired: localizedEpisode.aired ?? episode.aired,
        };
      });
    } catch {
      return defaultEpisodes;
    }
  }

  private async fetchEpisodesForLanguage(id: number, language: string): Promise<Episode[]> {
    const episodes: Episode[] = [];
    let page = 0;
    let hasNextPage = true;

    while (hasNextPage) {
      const payload = await this.fetchJson(`/series/${id}/episodes/official/${language}`, {
        searchParams: new URLSearchParams({
          page: String(page),
        }),
      });

      const data = asRecord(payload);
      const pageData = asRecord(data.data);
      const items = toArray<Record<string, unknown>>(pageData.episodes);
      episodes.push(...items.map((item) => this.mapEpisode(item)).filter(Boolean) as Episode[]);

      const links = asRecord(data.links);
      hasNextPage = links.next !== null && links.next !== undefined;
      page += 1;
    }

    return episodes;
  }

  private async fetchJson(pathname: string, options: FetchOptions = {}): Promise<unknown> {
    const token = await this.getToken();
    const url = new URL(`${TVDB_API_URL}${pathname}`);
    if (options.searchParams) {
      url.search = options.searchParams.toString();
    }

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`TheTVDB request failed (${response.status}): ${message}`);
    }

    return response.json();
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenState && this.tokenState.expiresAt > now) {
      return this.tokenState.token;
    }

    const response = await fetch(`${TVDB_API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apikey: this.apiKey,
        ...(this.pin ? { pin: this.pin } : {}),
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`TheTVDB login failed (${response.status}): ${message}`);
    }

    const payload = asRecord(await response.json());
    const token = asString(asRecord(payload.data).token);
    if (!token) {
      throw new Error("TheTVDB login did not return a token.");
    }

    this.tokenState = {
      token,
      expiresAt: now + (23 * 60 * 60 * 1000),
    };

    return token;
  }

  private mapShowSummary(item: Record<string, unknown>, fallbackId?: number): ShowSummary | null {
    const id = asNumber(item.tvdb_id) ?? asNumber(item.id) ?? fallbackId;
    if (id === undefined || id <= 0) {
      return null;
    }

    const year = asNumber(item.year) ?? (() => {
      const firstAired = asString(item.first_air_time) ?? asString(item.firstAired);
      if (!firstAired) {
        return undefined;
      }

      const parsedYear = Number(firstAired.slice(0, 4));
      return Number.isFinite(parsedYear) ? parsedYear : undefined;
    })();

    return {
      id,
      name: asString(item.name) ?? "Unknown Series",
      slug: asString(item.slug),
      imageUrl: asString(item.image_url) ?? asString(item.image),
      overview: asString(item.overview),
      firstAired: asString(item.first_air_time) ?? asString(item.firstAired),
      year,
      status: asString(item.status) ?? asString(asRecord(item.status).name),
      network: asString(item.network) ?? asString(asRecord(item.latestNetwork).name),
    };
  }

  private mapEpisode(item: Record<string, unknown>): Episode | null {
    const seasonNumber = asNumber(item.seasonNumber) ?? asNumber(item.seasonNumberDefault);
    const episodeNumber = asNumber(item.number) ?? asNumber(item.episodeNumber);
    const id = asNumber(item.id);
    const title = asString(item.name);

    if (seasonNumber === undefined || episodeNumber === undefined || id === undefined || !title) {
      return null;
    }

    return {
      id,
      seasonNumber,
      episodeNumber,
      title,
      overview: asString(item.overview),
      aired: asString(item.aired) ?? asString(item.airDate),
    };
  }
}
