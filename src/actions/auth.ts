"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

//ログイン
export async function login(email: string, password: string) {
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || email.length > 254 || !password || password.length > 1024) {
    throw new Error("メールアドレスとパスワードを確認してください");
  }
  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error("ログインできませんでした。入力内容を確認してください");
  }
}

//ログアウト
export const logout = async () => {
  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("ログアウトできませんでした");
  }

  redirect("/home");
};
