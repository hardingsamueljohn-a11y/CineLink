"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMovieDetail } from "@/lib/tmdb/api";

type CreateReviewInput = {
  tmdbId: number;
  rating: number;
  content: string;
  isSpoiler: boolean;
};

type UpdateReviewInput = {
  reviewId: string;
  tmdbId: number;
  rating: number;
  content: string;
  isSpoiler: boolean;
};

export const createReview = async (input: CreateReviewInput) => {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("ログインが必要です");
  }

  // --- バリデーション ---
  if (!input.tmdbId || Number.isNaN(input.tmdbId)) {
    throw new Error("不正な映画IDです");
  }

  if (![1, 2, 3, 4, 5].includes(input.rating)) {
    throw new Error("評価は1〜5で入力してください");
  }

  const trimmed = input.content.trim();
  if (trimmed.length === 0) {
    throw new Error("レビュー本文を入力してください");
  }

  if (trimmed.length > 1000) {
    throw new Error("レビュー本文は1000文字以内にしてください");
  }

  // ✅ 重複チェック
  const { data: existingReview, error: reviewCheckError } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq("tmdb_id", input.tmdbId)
    .maybeSingle();

  if (reviewCheckError) {
    throw new Error(reviewCheckError.message);
  }

  if (existingReview) {
    throw new Error("この映画にはすでにレビューを投稿しています");
  }

  // ✅ 外部キー対策
  const { data: existingMovie, error: movieSelectError } = await supabase
    .from("movies")
    .select("tmdb_id")
    .eq("tmdb_id", input.tmdbId)
    .maybeSingle();

  if (movieSelectError) {
    throw new Error(movieSelectError.message);
  }

  if (!existingMovie) {
    const movieDetail = await getMovieDetail(input.tmdbId);

    const { error: movieUpsertError } = await supabase.from("movies").upsert({
      tmdb_id: movieDetail.id,
      title: movieDetail.title,
      poster_path: movieDetail.posterPath, 
    });

    if (movieUpsertError) {
      throw new Error(`movies保存に失敗: ${movieUpsertError.message}`);
    }
  }

  // ✅ reviews に保存
  const { error: insertError } = await supabase.from("reviews").insert({
    user_id: user.id,
    tmdb_id: input.tmdbId,
    rating: input.rating,
    content: trimmed,
    is_spoiler: input.isSpoiler,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath(`/movie/${input.tmdbId}`);
  revalidatePath(`/home`);

  redirect(`/movie/${input.tmdbId}`);
};

export const updateReview = async (input: UpdateReviewInput) => {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("ログインが必要です");
  }

  if (!input.reviewId) {
    throw new Error("不正なレビューIDです");
  }

  if (!input.tmdbId || Number.isNaN(input.tmdbId)) {
    throw new Error("不正な映画IDです");
  }

  if (![1, 2, 3, 4, 5].includes(input.rating)) {
    throw new Error("評価は1〜5で入力してください");
  }

  const trimmed = input.content.trim();
  if (trimmed.length === 0) {
    throw new Error("レビュー本文を入力してください");
  }

  if (trimmed.length > 1000) {
    throw new Error("レビュー本文は1000文字以内にしてください");
  }

 // ✅ 自分のレビューだけ更新できるように user_id も条件に入れる
  const { error: updateError } = await supabase
    .from("reviews")
    .update({
      rating: input.rating,
      content: trimmed,
      is_spoiler: input.isSpoiler,
    })
    .eq("id", input.reviewId)
    .eq("user_id", user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(`/movie/${input.tmdbId}`);
  revalidatePath(`/home`);

  redirect(`/movie/${input.tmdbId}`);
};

export const deleteReview = async (reviewId: string, tmdbId: number) => {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("ログインが必要です");
  }

  if (!reviewId) {
    throw new Error("不正なレビューIDです");
  }

    // ✅ 自分のレビューだけ削除できるように user_id も条件に入れる
  const { error: deleteError } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath(`/movie/${tmdbId}`);
  revalidatePath(`/home`);

  redirect(`/movie/${tmdbId}`);
};
