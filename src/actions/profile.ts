"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isRecord, MAX_BIO_LENGTH, MAX_USERNAME_LENGTH } from "@/lib/security/validation";
import { safeAvatarUrl } from "@/lib/security/urls";

/** Search is available only to signed-in users under the chosen visibility policy. */
export async function searchUsers(query: string) {
  if (typeof query !== "string" || query.length > 80) return [];
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return [];

  // Escape LIKE metacharacters so input is treated as literal text.
  const pattern = normalizedQuery.replace(/[\\%_]/g, "\\$&");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", `%${pattern}%`)
    .limit(10);

  if (error) {
    console.error("User search failed:", error.code);
    return [];
  }

  return data ?? [];
}

/** Update only the caller's editable profile fields; the user ID is session-derived. */
export async function updateProfile(input: {
  username: string;
  bio: string;
  avatarUrl?: string | null;
}) {
  if (!isRecord(input) || typeof input.username !== "string" || typeof input.bio !== "string") {
    throw new Error("プロフィールの入力が不正です");
  }
  const { username, bio, avatarUrl } = input;
  if (username.length > MAX_USERNAME_LENGTH || bio.length > MAX_BIO_LENGTH) {
    throw new Error("ユーザー名は80文字、自己紹介は1000文字以内にしてください");
  }
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("ログインが必要です");
  }

  const updateData: {
    username: string;
    bio: string;
    avatar_url?: string | null;
  } = {
    username: username.trim(),
    bio: bio.trim(),
  };

  if (avatarUrl !== undefined) {
    const safeUrl = safeAvatarUrl(avatarUrl, process.env.NEXT_PUBLIC_SUPABASE_URL, user.id);
    if (avatarUrl !== null && !safeUrl) throw new Error("プロフィール画像のURLが不正です");
    updateData.avatar_url = safeUrl;
  }

  if (!updateData.username) {
    throw new Error("ユーザー名を入力してください");
  }

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Profile update failed:", error.code);
    throw new Error("プロフィールを更新できませんでした");
  }
  if (!updatedProfile) {
    throw new Error("プロフィールが見つからないため更新できませんでした");
  }

  revalidatePath(`/profile/${user.id}`);
}
