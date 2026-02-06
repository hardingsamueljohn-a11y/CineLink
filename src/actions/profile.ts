"use server";

import { supabaseServer } from "@/lib/supabase/server";

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