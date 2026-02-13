"use client";

import Image from "next/image";
import Link from "next/link";

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
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
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
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.02)")
              }
              onMouseLeave={(e) => (
                (e.currentTarget.style.opacity = "1"),
                (e.currentTarget.style.transform = "scale(1)")
              )}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "2 / 3",
                  borderRadius: "12px",
                  overflow: "hidden",
                  position: "relative",
                  background: "#eee",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={item.title ?? "No title"}
                    fill
                    sizes="(max-width: 768px) 150px, 200px"
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
                    }}
                  >
                    NO IMAGE
                  </div>
                )}
              </div>
              <p
                style={{
                  marginTop: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  textAlign: "center",
                  color: "#333",
                  wordBreak: "break-word",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
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
