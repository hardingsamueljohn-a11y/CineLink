"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Movie } from "@/types/movie";

type HeroProps = {
  movies: Movie[];
};

export default function MovieHero({ movies }: HeroProps) {
  const [movie, setMovie] = useState<Movie | null>(null);

  useEffect(() => {
    if (!movies || movies.length === 0) return;

    // requestAnimationFrame を使うことで
    // 「ブラウザが描画を終えた直後の次のフレーム」で実行されます。
    // これにより、React 19 の「同期的な更新」という警告を完全に回避できます。
    const handle = requestAnimationFrame(() => {
      const randomIndex = Math.floor(Math.random() * movies.length);
      setMovie(movies[randomIndex]);
    });

    return () => cancelAnimationFrame(handle);
  }, [movies]);

  // マウント直後の「ハイドレーション不一致」を防ぐため、
  // 最初は何も出さない（またはスケルトン）という挙動は維持
  if (!movie) {
    return (
      <div
        style={{
          width: "100%",
          height: "320px",
          borderRadius: "16px",
          marginBottom: "32px",
          backgroundColor: "#111",
        }}
      />
    );
  }

  // 高解像度かつ最適化された "w1280" を指定
  const imageUrl = `https://image.tmdb.org/t/p/w1280${movie.backdropPath}`;

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "320px", 
        borderRadius: "16px",
        overflow: "hidden",
        marginBottom: "32px",
        backgroundColor: "#111",
      }}
    >
      <Image
        src={imageUrl}
        alt={movie.title}
        fill
        priority
        style={{
          objectFit: "cover",
          objectPosition: "center 30%",
        }}
        sizes="100vw"
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "24px 32px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            zIndex: 1,
          }}
        >
          <div style={{ flex: 1, marginRight: "16px" }}>
            <span
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "bold",
                padding: "4px 10px",
                borderRadius: "6px",
                display: "inline-block",
                marginBottom: "8px",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                letterSpacing: "0.5px",
              }}
            >
              🔥 TRENDING
            </span>

            <h2
              style={{
                fontSize: "30px",
                fontWeight: 800,
                color: "#fff",
                margin: 0,
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
              }}
            >
              {movie.title}
            </h2>
          </div>

          <Link href={`/movie/${movie.id}`} style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "10px 22px",
                background: "#fff",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "13px",
                whiteSpace: "nowrap",
                transition: "transform 0.2s",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              詳細を見る
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}