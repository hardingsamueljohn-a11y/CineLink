"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/security/validation";

type FollowActionResult = { success: true } | { success: false; error: string };

async function getAuthenticatedUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("ログインが必要です");
  }

  return { supabase, user };
}

export async function followUser(followingId: string): Promise<FollowActionResult> {
  if (!isUuid(followingId)) {
    return { success: false, error: "対象ユーザーが不正です" };
  }
  followingId = followingId.toLowerCase();

  const { supabase, user } = await getAuthenticatedUser();
  if (followingId === user.id) {
    return { success: false, error: "自分自身はフォローできません" };
  }

  const { error } = await supabase.from("follows").insert({
    follower_id: user.id,
    following_id: followingId,
  });

  if (error) {
    console.error("Follow failed:", error.code);
    return { success: false, error: "フォローできませんでした" };
  }

  revalidatePath(`/profile/${followingId}`);
  return { success: true };
}

export async function unfollowUser(followingId: string): Promise<FollowActionResult> {
  if (!isUuid(followingId)) {
    return { success: false, error: "対象ユーザーが不正です" };
  }
  followingId = followingId.toLowerCase();

  const { supabase, user } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", followingId);

  if (error) {
    console.error("Unfollow failed:", error.code);
    return { success: false, error: "フォロー解除できませんでした" };
  }

  revalidatePath(`/profile/${followingId}`);
  return { success: true };
}
