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
  const [successMessage, setSuccessMessage] = useState("");

  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // 本番環境でのlocalhost遷移バグを防ぐため
        // リダイレクト先を現在の環境のURLに基づいて動的に指定
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (!data.session) {
        setSuccessMessage("確認メールを送信しました。メール内のリンクから登録を完了してください。");
        return;
      }

      // profiles は Auth のDB triggerで作成する。認証前のanon INSERTは行わない。
      router.push("/home");
      router.refresh();
    } catch {
      setErrorMessage(isLogin ? "ログインできませんでした。入力内容を確認してください。" : "登録できませんでした。入力内容を確認して再度お試しください。");
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
              required
              maxLength={254}
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
              required
              maxLength={1024}
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
          {successMessage ? <p role="status" style={{ fontSize: "13px" }}>{successMessage}</p> : null}
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
