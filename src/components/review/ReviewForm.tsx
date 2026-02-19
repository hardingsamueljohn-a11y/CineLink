"use client";

import { useState } from "react";
import { createReview, updateReview, deleteReview } from "@/actions/reviews";
import { Review } from "@/types/review";

type ReviewFormProps = {
  tmdbId: number;
  movieTitle?: string;
  existingReview: Review | null; 
};

export default function ReviewForm({
  tmdbId,
  existingReview,
}: ReviewFormProps) {
  const isEditMode = !!existingReview;

  const [rating, setRating] = useState<number>(existingReview?.rating ?? 5);
  const [content, setContent] = useState<string>(existingReview?.content ?? "");
  const [isSpoiler, setIsSpoiler] = useState<boolean>(
    existingReview?.isSpoiler ?? false, 
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    if (!content.trim()) {
      setErrorMessage("レビュー本文を入力してください");
      setIsLoading(false);
      return;
    }

    try {
      if (isEditMode && existingReview) {
        await updateReview({
          reviewId: existingReview.id,
          tmdbId,
          rating,
          content,
          isSpoiler,
        });
      } else {
        await createReview({
          tmdbId,
          rating,
          content,
          isSpoiler,
        });
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "エラーが発生しました");
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview) return;

    const ok = window.confirm("このレビューを削除しますか？");
    if (!ok) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      await deleteReview(existingReview.id, tmdbId);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "エラーが発生しました");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "800px", 
        margin: "20px auto",
        padding: "24px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        background: "#fff",
        boxSizing: "border-box", 
      }}
    >
      <h1 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "16px" }}>
        {isEditMode ? "レビュー編集" : "レビュー投稿"}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>
              評価（1〜5）
            </label>

            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                boxSizing: "border-box", 
                fontSize: "16px", 
                background: "#fff",
              }}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>
              レビュー本文（1000文字以内）
            </label>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="感想を書いてください"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                resize: "vertical",
                boxSizing: "border-box",
                fontSize: "16px", 
                lineHeight: "1.6",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "4px 0" }}>
            <input
              id="spoiler"
              type="checkbox"
              checked={isSpoiler}
              onChange={(e) => setIsSpoiler(e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
            <label htmlFor="spoiler" style={{ fontSize: "14px", cursor: "pointer" }}>
              ネタバレあり
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#333", 
              color: "#fff", 
              fontSize: "16px",
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
              boxSizing: "border-box",
              WebkitAppearance: "none", 
              appearance: "none",
            }}
          >
            {isLoading ? "処理中..." : isEditMode ? "更新を保存する" : "レビューを投稿する"}
          </button>

          {isEditMode ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                background: "#fff",
                color: "#666",
                fontSize: "14px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                boxSizing: "border-box",
                WebkitAppearance: "none",
                appearance: "none",
                marginTop: "4px",
              }}
            >
              削除する
            </button>
          ) : null}

          {errorMessage ? (
            <p style={{ color: "crimson", fontSize: "12px", textAlign: "center" }}>{errorMessage}</p>
          ) : null}
        </div>
      </form>

      <p style={{ marginTop: "16px", fontSize: "12px", color: "#888", textAlign: "center" }}>
        ※ログインしていない場合は投稿できません。
      </p>
    </div>
  );
}
