import { Movie } from "@/types/movie";

type MovieHeaderProps = {
movie: Movie;
  children?: React.ReactNode;
};

export default function MovieHeader({ movie, children }: MovieHeaderProps) {
  return (
    <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
      {/* --- ポスターエリア --- */}
      <div
        style={{
          width: "220px",
          flexShrink: 0,
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #ddd",
          background: "#f2f2f2",
        }}
      >
        {movie.posterPath ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
            alt={movie.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "330px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#777",
              fontSize: "12px",
            }}
          >
            NO IMAGE
          </div>
        )}
      </div>

      {/* --- テキスト情報エリア --- */}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: "26px", fontWeight: 800 }}>{movie.title}</h1>

        <p style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}>
          公開日：{movie.releaseDate || "不明"}
        </p>

        <p style={{ marginTop: "6px", color: "#666", fontSize: "14px" }}>
          TMDBスコア：{movie.voteAverage?.toFixed(1) ?? "—"}
        </p>

        <p style={{ marginTop: "16px", lineHeight: 1.7 }}>
          {movie.overview || "あらすじがありません。"}
        </p>

        {/* ボタン類を表示する場所 */}
        <div style={{ marginTop: "20px" }}>{children}</div>
      </div>
    </div>
  );
}
