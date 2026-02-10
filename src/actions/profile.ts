"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Profile } from "@/types/profile";

/**
 * ユーザー名でプロフィールを検索する（ilikeによる部分一致）
 */
export async function searchUsers(query: string) {
  // 空文字の場合は空配列を返す
  if (!query.trim()) return [];

  const supabase = await supabaseServer();

  // usernameに対して部分一致（%...%）かつ大文字小文字を区別せず（ilike）検索
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", `%${query}%`)
    .limit(10); // 最大10件程度に制限

  if (error) {
    console.error("User search error:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * プロフィール情報を更新する
 */
export async function updateProfile({
  userId,
  username,
  bio,
  avatarUrl, 
}: {
  userId: string;
  username: string;
  bio: string;
  avatarUrl?: string | null; 
}) {
  const supabase = await supabaseServer();

  // 更新する値をオブジェクトとして定義（Partial<Profile>を使うことで安全に）
  const updateData: Partial<Profile> = {
    username,
    bio,
  };

  // avatarUrlが渡された場合のみ更新対象に含める
  if (avatarUrl !== undefined) {
    updateData.avatar_url = avatarUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    console.error("Profile update error:", error.message);
    throw new Error(error.message);
  }

  // 変更を反映させるためにキャッシュを更新
  revalidatePath(`/profile/${userId}`);
}