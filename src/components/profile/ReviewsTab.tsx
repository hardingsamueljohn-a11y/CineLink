"use client";

import Link from "next/link";
import Image from "next/image"; 
import { Review } from "@/types/review";
import StarRating from "@/components/ui/StarRating"; 

type ReviewsTabProps = {
  reviews: Review[];
};

export default function ReviewsTab({ reviews }: ReviewsTabProps) {
  if (reviews.length === 0) {
    return <p style={{ color: "#666" }}>まだレビューがありません。</p>;
  }

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {reviews.map((review) => (
        <div
          key={review.id}
          style={{
            padding: "16px",
            border: "1px solid #ddd",
            borderRadius: "12px",
            background: "#fff",
            display: "flex", 
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          {/* 左側：ポスター画像 */}
          <div style={{ 
            flex: "0 0 70px", 
            position: "relative", 
            height: "105px", 
            borderRadius: "8px", 
            overflow: "hidden", 
            backgroundColor: "#f3f4f6" 
          }}>
            {review.moviePosterPath ? (
              <Image
                src={`https://image.tmdb.org/t/p/w92${review.moviePosterPath}`}
                alt={review.movieTitle || "poster"}
                fill
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "11px", color: "#999" }}>No Img</div>
            )}
          </div>

          {/* 右側：コンテンツ */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* ヘッダー部分：タイトルと評価 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
                flexWrap: "wrap", // モバイルでの星突き出し防止
                gap: "8px",
              }}
            >
              <Link
                href={`/movie/${review.tmdbId}`}
                style={{
                  fontSize: "17px", 
                  fontWeight: 800,
                  color: "#333",
                  textDecoration: "none",
                  flex: "1 1 200px",
                  marginRight: "8px",
                }}
              >
                『{review.movieTitle}』
              </Link>
              
              <div style={{ flexShrink: 0 }}>
                <StarRating rating={review.rating} />
              </div>
            </div>

            {/* 本文部分 */}
            <div style={{ fontSize: "14px", color: "#333", lineHeight: "1.6" }}>
              {review.isSpoiler ? (
                <details>
                  <summary
                    style={{
                      color: "crimson",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    ネタバレあり（クリックで表示）
                  </summary>
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "12px",
                      background: "#f9f9f9",
                      borderRadius: "8px",
                      whiteSpace: "pre-wrap",
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
                    margin: 0,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {review.content}
                </p>
              )}
            </div>

            {/* フッター部分：日付 */}
            <div
              style={{
                marginTop: "12px",
                paddingTop: "8px",
                borderTop: "1px solid #eee",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <span style={{ fontSize: "12px", color: "#999" }}>
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}