"use server";

import { searchMovies as tmdbSearchMovies } from "@/lib/tmdb/api";
import { MAX_SEARCH_LENGTH } from "@/lib/security/validation";

/**
 * TMDB APIを用いた映画検索 (Server Action)
 * APIキーをサーバーサイドで保持し、安全に検索結果を返却します。
 */
export async function getMoviesAction(query: string) {
  if (typeof query !== "string" || query.length > MAX_SEARCH_LENGTH || !query.trim()) return [];

  try {
    const results = await tmdbSearchMovies(query);
    return results;
  } catch {
    console.error("TMDB search failed");
    return [];
  }
}
