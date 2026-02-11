"use client";

import Link from "next/link";
import { Review } from "@/types/review";

type ReviewItemProps = {
  review: Review;
  tmdbId: number;
  currentUserId?: string;
};

export default function ReviewItem({ review, tmdbId, currentUserId }: ReviewItemProps) {
  const username = review.profiles?.username ?? "Unknown";
  const isMyReview = currentUserId === review.userId;

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "12px",
        padding: "16px",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <p style={{ fontWeight: 700, margin: 0 }}>
          ユーザー：{username} / 評価：{review.rating}
        </p>

        {isMyReview && (
          <Link
            href={`/movie/${tmdbId}/review`}
            style={{
              fontSize: "12px",
              textDecoration: "underline",
              color: "#333",
            }}
          >
            編集
          </Link>
        )}
      </div>

      <p style={{ fontSize: "12px", color: "#666", marginBottom: "12px" }}>
        投稿日：{new Date(review.createdAt).toLocaleString("ja-JP")}
      </p>

      <div style={{ fontSize: "14px", color: "#333", lineHeight: "1.6" }}>
        {review.isSpoiler ? (
          <details>
            <summary
              style={{
                color: "crimson",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                outline: "none",
              }}
            >
              ネタバレあり（クリックで表示）
            </summary>
            <div
              style={{
                marginTop: "10px",
                padding: "12px",
                background: "#f9f9f9",
                borderRadius: "8px",
                whiteSpace: "pre-wrap",
                // --- レイアウト崩れ防止 ---
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {review.content}
            </div>
          </details>
        ) : (
          <p
            style={{
              whiteSpace: "pre-wrap",
              // --- レイアウト崩れ防止 ---
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              margin: 0,
            }}
          >
            {review.content}
          </p>
        )}
      </div>
    </div>
  );
}