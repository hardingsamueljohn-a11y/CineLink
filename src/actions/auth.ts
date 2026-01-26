"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

//ログイン
export async function login(email: string, password: string) {
  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Login error:", error.message);
    throw error;
  }
}

//ログアウト
export const logout = async () => {
  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }

  redirect("/home");
};
