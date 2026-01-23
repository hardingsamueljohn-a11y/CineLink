type TmdbMovie = {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
};

type SearchMoviesResponse = {
  page: number;
  results: TmdbMovie[];
  total_pages: number;
  total_results: number;
};

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * TMDBの映画検索（/search/movie）
 * @param query 検索キーワード
 */
export const searchMovies = async (query: string): Promise<TmdbMovie[]> => {
  if (!query.trim()) return [];

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is missing. Please set it in .env.local");
  }

  const url = new URL(`${TMDB_BASE_URL}/search/movie`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "ja-JP");
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`TMDB search failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as SearchMoviesResponse;
  return data.results ?? [];
};

/**
 * TMDBの映画詳細取得（/movie/{movie_id}）
 * @param tmdbId TMDBの映画ID
 */
export const getMovieDetail = async (tmdbId: number): Promise<TmdbMovie> => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is missing. Please set it in .env.local");
  }

  const url = new URL(`${TMDB_BASE_URL}/movie/${tmdbId}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "ja-JP");

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `TMDB movie detail failed: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as TmdbMovie;
  return data;
};
