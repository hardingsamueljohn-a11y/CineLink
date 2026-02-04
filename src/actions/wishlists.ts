"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getMovieDetail } from "@/lib/tmdb/api";

export const addToWishlist = async (tmdbId: number) => {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("ログインが必要です");
  }

  // ✅ 1) まず movies テーブルに存在するか確認
  const { data: existingMovie, error: movieSelectError } = await supabase
    .from("movies")
    .select("tmdb_id")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (movieSelectError) {
    throw new Error(movieSelectError.message);
  }

  // ✅ 2) 無ければ TMDB から情報を取って movies に保存
  if (!existingMovie) {
    const movieDetail = await getMovieDetail(tmdbId);

    const { error: movieInsertError } = await supabase.from("movies").upsert({
      tmdb_id: movieDetail.id,
      title: movieDetail.title,
      poster_path: movieDetail.posterPath,
    });

    if (movieInsertError) {
      throw new Error(`movies保存に失敗: ${movieInsertError.message}`);
    }
  }

  // ✅ 3) wishlists に追加（外部キーを満たすので成功する）
  const { error } = await supabase.from("wishlists").insert({
    user_id: user.id,
    tmdb_id: tmdbId,
    status: "want",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/movie/${tmdbId}`);
};

export const removeFromWishlist = async (tmdbId: number) => {
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
    throw new Error(error.message);
  }

  revalidatePath(`/movie/${tmdbId}`);
};
