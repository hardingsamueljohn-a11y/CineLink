"use client";

import Link from "next/link";

type MovieCardProps = {
  id: number;
  title: string;
  posterPath: string | null;
  releaseDate?: string; 
  voteAverage?: number;
};

export default function MovieCard({
  id,
  title,
  posterPath,
  releaseDate,
  voteAverage,
}: MovieCardProps) {
  const imageUrl = posterPath
    ? `https://image.tmdb.org/t/p/w342${posterPath}`
    : null;

  return (
    <Link href={`/movie/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#fff",
          transition: "transform 0.2s",
          cursor: "pointer",
          height: "100%", 
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <div style={{ aspectRatio: "2/3", background: "#f2f2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "12px", color: "#999" }}>NO IMAGE</span>
          )}
        </div>

        <div style={{ padding: "12px" }}>
          <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {title}
          </p>
          
          {releaseDate && (
            <p style={{ fontSize: "12px", color: "#666", margin: "2px 0" }}>
              公開日：{releaseDate || "不明"}
            </p>
          )}
          
          {voteAverage !== undefined && (
            <p style={{ fontSize: "12px", color: "#666", margin: "2px 0" }}>
              TMDBスコア：{voteAverage?.toFixed(1) ?? "—"}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}