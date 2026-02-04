import { Movie } from "@/types/movie";

type TmdbMovieResponse = {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null; 
  overview: string;
  release_date: string;
  vote_average: number;
};

type SearchMoviesResponse = {
  page: number;
  results: TmdbMovieResponse[];
  total_pages: number;
  total_results: number;
};

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * 生のTMDBデータを共通型 Movie にマッピングする
 */
const mapToMovie = (data: TmdbMovieResponse): Movie => ({
  id: data.id,
  title: data.title,
  posterPath: data.poster_path,
  backdropPath: data.backdrop_path, 
  overview: data.overview,
  releaseDate: data.release_date,
  voteAverage: data.vote_average,
});

/**
 * TMDBの映画検索
 */
export const searchMovies = async (query: string): Promise<Movie[]> => {
  if (!query.trim()) return [];

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is missing.");
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
    throw new Error(`TMDB search failed: ${res.status}`);
  }

  const data = (await res.json()) as SearchMoviesResponse;
  return (data.results ?? []).map(mapToMovie);
};

/**
 * TMDBの映画詳細取得
 */
export const getMovieDetail = async (tmdbId: number): Promise<Movie> => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is missing.");
  }

  const url = new URL(`${TMDB_BASE_URL}/movie/${tmdbId}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "ja-JP");

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`TMDB movie detail failed: ${res.status}`);
  }

  const data = (await res.json()) as TmdbMovieResponse;
  return mapToMovie(data);
};