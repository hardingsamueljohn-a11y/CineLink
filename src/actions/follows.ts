"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

//ユーザーをフォローする
 
export async function followUser(followerId: string, followingId: string) {
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("follows")
    .insert([{ follower_id: followerId, following_id: followingId }]);

  if (error) {
    console.error("Follow Error:", error.message);
    return { success: false, error: error.message };
  }

  // プロフィール画面の数値を即時反映させる
  revalidatePath(`/profile/${followingId}`);
  return { success: true };
}

//フォローを解除する
 
export async function unfollowUser(followerId: string, followingId: string) {
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) {
    console.error("Unfollow Error:", error.message);
    return { success: false, error: error.message };
  }

  // 表示を更新
  revalidatePath(`/profile/${followingId}`);
  return { success: true };
}