"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureMovieRecord } from "@/lib/movies/ensure-movie-record";
import { isTmdbId, isUuid, validateReview } from "@/lib/security/validation";

type CreateReviewInput = { tmdbId: number; rating: number; content: string; isSpoiler: boolean };
type UpdateReviewInput = CreateReviewInput & { reviewId: string };

async function authenticatedClient() {
  const supabase = await supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("ログインが必要です");
  return { supabase, user };
}

export const createReview = async (input: CreateReviewInput) => {
  const { supabase, user } = await authenticatedClient();
  const review = validateReview(input);
  const { data: existing, error: readError } = await supabase
    .from("reviews").select("id").eq("user_id", user.id).eq("tmdb_id", review.tmdbId).maybeSingle();
  if (readError) throw new Error("レビューを確認できませんでした");
  if (existing) throw new Error("この映画にはすでにレビューを投稿しています");

  await ensureMovieRecord(supabase, review.tmdbId);
  const { error } = await supabase.from("reviews").insert({
    user_id: user.id, tmdb_id: review.tmdbId, rating: review.rating,
    content: review.content, is_spoiler: review.isSpoiler,
  });
  if (error) throw new Error(error.code === "23505" ? "この映画にはすでにレビューを投稿しています" : "レビューを保存できませんでした");
  revalidatePath(`/movie/${review.tmdbId}`);
  revalidatePath("/home");
  redirect(`/movie/${review.tmdbId}`);
};

export const updateReview = async (input: UpdateReviewInput) => {
  const { supabase, user } = await authenticatedClient();
  const review = validateReview(input);
  if (!isUuid(input.reviewId)) throw new Error("不正なレビューIDです");
  const { data, error } = await supabase.from("reviews")
    .update({ rating: review.rating, content: review.content, is_spoiler: review.isSpoiler })
    .eq("id", input.reviewId).eq("user_id", user.id).eq("tmdb_id", review.tmdbId)
    .select("id").maybeSingle();
  if (error || !data) throw new Error("レビューを更新できませんでした");
  revalidatePath(`/movie/${review.tmdbId}`);
  revalidatePath("/home");
  redirect(`/movie/${review.tmdbId}`);
};

export const deleteReview = async (reviewId: string, tmdbId: number) => {
  const { supabase, user } = await authenticatedClient();
  if (!isUuid(reviewId) || !isTmdbId(tmdbId)) throw new Error("レビューまたは映画IDが不正です");
  const { data, error } = await supabase.from("reviews").delete()
    .eq("id", reviewId).eq("user_id", user.id).eq("tmdb_id", tmdbId)
    .select("id").maybeSingle();
  if (error || !data) throw new Error("レビューを削除できませんでした");
  revalidatePath(`/movie/${tmdbId}`);
  revalidatePath("/home");
  redirect(`/movie/${tmdbId}`);
};
