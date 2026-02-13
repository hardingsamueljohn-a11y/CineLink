"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (!email.trim() || !password.trim()) {
        setErrorMessage("メールアドレスとパスワードを入力してください");
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push("/home");
        router.refresh();
        return;
      }

      // ---------------------------
      // signup（ここが今回の本題）
      // ---------------------------
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      const user = data.user;
      if (!user) {
        throw new Error("ユーザー作成に失敗しました");
      }

      // ✅ profiles に初期レコード作成（外部キー制約対策）
      // usernameは仮で emailの@前を入れておく（後で編集できる想定）
      const defaultUsername = email.split("@")[0];

      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        username: defaultUsername,
        avatar_url: null,
        bio: null,
      });

      if (profileError) {
        throw new Error(`profiles作成に失敗: ${profileError.message}`);
      }

      router.push("/home");
      router.refresh();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        padding: "24px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        background: "#fff",
        boxSizing: "border-box", 
      }}
    >
      <h1 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "16px" }}>
        {isLogin ? "ログイン" : "新規登録"}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: "10px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px" }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                boxSizing: "border-box", // パディングではみ出さないように修正
                fontSize: "16px", // iOSの自動ズーム防止
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px" }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                boxSizing: "border-box", // パディングではみ出さないように修正
                fontSize: "16px", // iOSの自動ズーム防止
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: "6px",
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#333", 
              color: "#fff",      
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
              WebkitAppearance: "none", 
              appearance: "none",
            }}
          >
            {isLoading ? "処理中..." : isLogin ? "ログイン" : "登録"}
          </button>

          {errorMessage ? (
            <p style={{ color: "crimson", fontSize: "12px" }}>
              {errorMessage}
            </p>
          ) : null}
        </div>
      </form>

      <div style={{ marginTop: "14px", fontSize: "12px", color: "#333" }}>
        {isLogin ? (
          <p>
            はじめての方は{" "}
            <Link href="/signup" style={{ textDecoration: "underline" }}>
              新規登録
            </Link>
          </p>
        ) : (
          <p>
            すでにアカウントを持っている方は{" "}
            <Link href="/login" style={{ textDecoration: "underline" }}>
              ログイン
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
