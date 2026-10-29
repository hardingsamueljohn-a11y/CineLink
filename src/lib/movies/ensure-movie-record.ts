import "server-only";

import { getMovieDetail } from "@/lib/tmdb/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { isTmdbId } from "@/lib/security/validation";

type UserSupabaseClient = Awaited<ReturnType<typeof supabaseServer>>;

/**
 * Ensure the movie row needed by a review/wishlist foreign key exists.
 * The user client performs the public read; only this server-only helper can
 * write the small, TMDB-derived movie projection using the secret-key client.
 */
export async function ensureMovieRecord(
  userClient: UserSupabaseClient,
  tmdbId: number,
) {
  if (!isTmdbId(tmdbId)) {
    throw new Error("不正な映画IDです");
  }

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    throw new Error("ログインが必要です");
  }

  const { data: existingMovie, error: readError } = await userClient
    .from("movies")
    .select("tmdb_id")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (readError) {
    throw new Error("映画情報を確認できませんでした");
  }
  if (existingMovie) return;

  const movie = await getMovieDetail(tmdbId);
  if (movie.id !== tmdbId || typeof movie.title !== "string" || !movie.title.trim()) {
    throw new Error("外部映画情報を検証できませんでした");
  }

  const adminClient = createSupabaseAdminClient();
  const { error: writeError } = await adminClient.from("movies").upsert(
    {
      tmdb_id: movie.id,
      title: movie.title,
      poster_path: movie.posterPath,
    },
    { onConflict: "tmdb_id", ignoreDuplicates: true },
  );

  if (writeError) {
    console.error("Trusted movie upsert failed:", writeError.code);
    throw new Error("映画情報を保存できませんでした");
  }
}
