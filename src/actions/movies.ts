"use server";

import { searchMovies as tmdbSearchMovies } from "@/lib/tmdb/api";

/**
 * TMDB APIを用いた映画検索 (Server Action)
 * APIキーをサーバーサイドで保持し、安全に検索結果を返却します。
 */
export async function getMoviesAction(query: string) {
  if (!query || query.trim().length === 0) return [];

  try {
    const results = await tmdbSearchMovies(query);
    return results;
  } catch (error) {
    console.error("TMDB Search Error:", error);
    return [];
  }
}
