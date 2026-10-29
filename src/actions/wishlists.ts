"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ensureMovieRecord } from "@/lib/movies/ensure-movie-record";
import { isTmdbId } from "@/lib/security/validation";

export const addToWishlist = async (tmdbId: number) => {
  if (!isTmdbId(tmdbId)) throw new Error("不正な映画IDです");
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("ログインが必要です");
  }

  await ensureMovieRecord(supabase, tmdbId);

  // wishlists は本人のセッションで追加し、RLSでも所有者を検証する。
  const { error } = await supabase.from("wishlists").insert({
    user_id: user.id,
    tmdb_id: tmdbId,
    status: "want",
  });

  if (error) {
    throw new Error("ウィッシュリストに追加できませんでした");
  }

  revalidatePath(`/movie/${tmdbId}`);
};

export const removeFromWishlist = async (tmdbId: number) => {
  if (!isTmdbId(tmdbId)) throw new Error("不正な映画IDです");
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("ログインが必要です");
  }

  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId);

  if (error) {
    throw new Error("ウィッシュリストから削除できませんでした");
  }

  revalidatePath(`/movie/${tmdbId}`);
};
