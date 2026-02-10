import { Movie } from "@/types/movie";

/**
 * TMDB APIからの生のレスポンス型定義
 */
type TmdbMovieResponse = {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
};

/**
 * TMDB APIのリスト系エンドポイントの共通レスポンス型
 */
type MovieListResponse = {
  page: number;
  results: TmdbMovieResponse[];
  total_pages: number;
  total_results: number;
};

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * APIレスポンス（スネークケース）をアプリケーション内部のMovie型（キャメルケース）に変換するマッパー
 * @param data TMDB APIから取得した生の映画データ
 * @returns アプリケーション共通の Movie オブジェクト
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
 * APIキーの検証と取得を行う内部関数
 */
const getApiKey = (): string => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("Internal Server Error: TMDB_API_KEY is not configured.");
  }
  return apiKey;
};

/**
 * 指定されたキーワードで映画を検索する
 * @param query 検索クエリ文字列
 */
export const searchMovies = async (query: string): Promise<Movie[]> => {
  if (!query.trim()) return [];

  const url = new URL(`${TMDB_BASE_URL}/search/movie`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("query", query);
  url.searchParams.set("language", "ja-JP");
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store", // 検索結果は常に最新を保つ
  });

  if (!res.ok) {
    throw new Error(`TMDB search failed: ${res.status}`);
  }

  const data = (await res.json()) as MovieListResponse;
  return (data.results ?? []).map(mapToMovie);
};

/**
 * 特定の映画の詳細情報を取得する
 * @param tmdbId TMDB ID
 */
export const getMovieDetail = async (tmdbId: number): Promise<Movie> => {
  const url = new URL(`${TMDB_BASE_URL}/movie/${tmdbId}`);
  url.searchParams.set("api_key", getApiKey());
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

/**
 * 国内で公開中の映画一覧を取得する（日本の地域情報を優先）
 */
export const getNowPlayingMovies = async (): Promise<Movie[]> => {
  const url = new URL(`${TMDB_BASE_URL}/movie/now_playing`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("language", "ja-JP");
  url.searchParams.set("region", "JP");

  const res = await fetch(url.toString(), {
    method: "GET",
    next: { revalidate: 3600 }, // 1時間キャッシュ
  });

  if (!res.ok) {
    throw new Error(`TMDB now playing failed: ${res.status}`);
  }

  const data = (await res.json()) as MovieListResponse;
  return (data.results ?? []).map(mapToMovie);
};

/**
 * 歴代のユーザー評価が高い映画一覧を取得する
 */
export const getTopRatedMovies = async (): Promise<Movie[]> => {
  const url = new URL(`${TMDB_BASE_URL}/movie/top_rated`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("language", "ja-JP");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), {
    method: "GET",
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`TMDB top rated failed: ${res.status}`);
  }

  const data = (await res.json()) as MovieListResponse;
  return (data.results ?? []).map(mapToMovie);
};

/**
 * Heroセクション用：2020年以降のモダンな高評価・人気作を取得する
 */
export const getHeroMovies = async (): Promise<Movie[]> => {
  const url = new URL(`${TMDB_BASE_URL}/discover/movie`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("language", "ja-JP");
  url.searchParams.set("region", "JP");
  
  // 2020年1月1日以降
  url.searchParams.set("primary_release_date.gte", "2020-01-01");
  // 2026年現在の今日までの日付（未来すぎないように）
  url.searchParams.set("primary_release_date.lte", "2026-02-10");
  // 評価が7.0以上
  url.searchParams.set("vote_average.gte", "7.0");
  // 評価数が一定以上（信頼性のある人気作）
  url.searchParams.set("vote_count.gte", "500");
  // 評価数が多い順（みんなが知っているメジャー作）
  url.searchParams.set("sort_by", "vote_count.desc");

  const res = await fetch(url.toString(), {
    method: "GET",
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`TMDB discover failed: ${res.status}`);
  }

  const data = (await res.json()) as MovieListResponse;
  
  return (data.results ?? [])
    .map(mapToMovie)
    // あらすじがちゃんとあり、かつ長すぎない・短すぎないものに絞る
    .filter((movie) => movie.overview && movie.overview.trim().length > 20);
};