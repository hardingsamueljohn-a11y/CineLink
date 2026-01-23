"use server";

import { supabaseServer } from "@/lib/supabase/server";

export async function login(email: string, password: string) {
  // ここに await を追加します
  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Login error:", error.message);
    throw error;
  }
}
