"use client";

import Image from "next/image";
import Link from "next/link"; // 追加
type WishlistItem = {
  tmdbId: number;
  title: string | null;
  posterPath: string | null;
};

type WishlistTabProps = {
  wishlist: WishlistItem[];
};

export default function WishlistTab({ wishlist }: WishlistTabProps) {
  if (!wishlist.length) {
    return <p style={{ color: "#666" }}>まだ映画が登録されていません。</p>;
  }

  // TMDBの画像ベースURL（w500はサイズです）
  const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: "12px",
      }}
    >
      {wishlist.map((item) => {
        const imageUrl = item.posterPath
          ? `${TMDB_IMAGE_BASE_URL}${item.posterPath}`
          : null;

        return (
          <Link
            key={item.tmdbId}
            href={`/movie/${item.tmdbId}`} // ここで映画詳細ページに遷移
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "120px",
                  height: "180px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  position: "relative",
                  background: "#eee",
                }}
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={item.title ?? "No title"}
                    fill
                    sizes="120px"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: "12px", color: "#999" }}>NO IMAGE</span>
                )}
              </div>
              <p
                style={{
                  marginTop: "6px",
                  fontSize: "12px",
                  textAlign: "center",
                  color: "#333",
                  wordBreak: "break-word",
                }}
              >
                {item.title ?? "タイトル不明"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
