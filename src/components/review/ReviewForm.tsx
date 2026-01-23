"use client";

import { useState } from "react";
import { createReview, updateReview, deleteReview } from "@/actions/reviews";

type ExistingReview = {
  id: string;
  rating: number;
  content: string;
  is_spoiler: boolean;
};

type ReviewFormProps = {
  tmdbId: number;
  existingReview: ExistingReview | null;
};

export default function ReviewForm({ tmdbId, existingReview }: ReviewFormProps) {
  const isEditMode = !!existingReview;

  const [rating, setRating] = useState<number>(existingReview?.rating ?? 5);
  const [content, setContent] = useState<string>(existingReview?.content ?? "");
  const [isSpoiler, setIsSpoiler] = useState<boolean>(
    existingReview?.is_spoiler ?? false
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (isEditMode) {
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
      // redirect がサーバー側で走るので、ここには基本戻ってこない
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
      // redirect がサーバー側で走るので、ここには基本戻ってこない
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "エラーが発生しました");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "0 auto",
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        background: "#fff",
      }}
    >
      <h1 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "12px" }}>
        {isEditMode ? "レビュー編集" : "レビュー投稿"}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px" }}>
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
            <label style={{ display: "block", fontSize: "12px" }}>
              レビュー本文（1000文字以内）
            </label>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="感想を書いてください"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              id="spoiler"
              type="checkbox"
              checked={isSpoiler}
              onChange={(e) => setIsSpoiler(e.target.checked)}
            />
            <label htmlFor="spoiler" style={{ fontSize: "12px" }}>
              ネタバレあり
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#fff",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading
              ? "処理中..."
              : isEditMode
              ? "更新する"
              : "投稿する"}
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
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              削除する
            </button>
          ) : null}

          {errorMessage ? (
            <p style={{ color: "crimson", fontSize: "12px" }}>
              {errorMessage}
            </p>
          ) : null}
        </div>
      </form>

      <p style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
        ※ログインしていない場合は投稿できません。
      </p>
    </div>
  );
}
