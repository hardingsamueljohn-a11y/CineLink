"use client";

import { useState } from "react";
import { ActivityItem } from "@/types/activity";
import Link from "next/link";
import Image from "next/image";
import StarRating from "@/components/ui/StarRating";

type ActivityTimelineProps = {
  initialActivities: ActivityItem[];
};

export default function ActivityTimeline({
  initialActivities,
}: ActivityTimelineProps) {
  const [displayCount, setDisplayCount] = useState(5);

  // 表示する分だけ切り出し
  const visibleActivities = initialActivities.slice(0, displayCount);
  const hasMore = initialActivities.length > displayCount;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
      {visibleActivities.map((item, index) => (
        <div
          key={`${item.id}-${index}`}
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "12px",
            background: "#fff",
            display: "flex",
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          {/* 画像セクション */}
          <div
            style={{
              flex: "0 0 56px",
              position: "relative",
              height: "85px",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "#f3f4f6",
            }}
          >
            {item.posterPath ? (
              <Image
                src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
                alt={item.movieTitle}
                fill
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: "10px",
                  color: "#999",
                }}
              >
                No Img
              </div>
            )}
          </div>

          {/* テキストセクション */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "4px",
              }}
            >
              <div>
                {/* ユーザー情報 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <p style={{ fontWeight: 700, fontSize: "15px", margin: 0 }}>
                    {item.type === "review" ? "レビュー" : "観たい追加"}:{" "}
                    {item.username} さん
                  </p>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      position: "relative",
                      backgroundColor: "#e5e7eb",
                      flexShrink: 0,
                    }}
                  >
                    {item.avatarUrl ? (
                      <Image
                        src={item.avatarUrl}
                        alt={item.username}
                        fill
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          fontSize: "12px",
                          color: "#999",
                          fontWeight: "bold",
                        }}
                      >
                        {item.username[0]}
                      </div>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: "14px", fontWeight: 600, color: "#555" }}>
                  『{item.movieTitle}』
                </p>
              </div>
              {item.type === "review" && item.rating !== undefined && (
                <StarRating rating={item.rating} />
              )}
            </div>

            {item.type === "review" && (
              <p
                style={{
                  marginTop: "6px",
                  whiteSpace: "pre-wrap",
                  fontSize: "14px",
                  color: "#333",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {item.isSpoiler ? "※ネタバレあり" : item.content}
              </p>
            )}

            <div style={{ marginTop: "8px" }}>
              <Link
                href={`/movie/${item.tmdbId}`}
                style={{
                  textDecoration: "underline",
                  fontSize: "12px",
                  color: "#666",
                }}
              >
                映画ページへ
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* もっと見るボタン */}
      {hasMore && (
        <button
          onClick={() => setDisplayCount((prev) => prev + 5)}
          style={{
            marginTop: "12px",
            padding: "10px",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
            color: "#333",
            transition: "background 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#f9f9f9")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
        >
          もっと見る（残り {initialActivities.length - displayCount} 件）
        </button>
      )}
    </div>
  );
}