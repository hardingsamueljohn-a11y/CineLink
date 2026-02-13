import { Movie } from "@/types/movie";

type MovieHeaderProps = {
  movie: Movie;
  children?: React.ReactNode;
};

export default function MovieHeader({ movie, children }: MovieHeaderProps) {
  return (
    <div 
      style={{ 
        display: "flex", 
        gap: "32px", 
        marginTop: "16px",
        flexWrap: "wrap", 
      }}
    >
      {/* --- ポスターエリア --- */}
      <div
        style={{
          flex: "0 0 280px", 
          maxWidth: "100%",  
          margin: "0 auto",  
          borderRadius: "16px",
          overflow: "hidden",
          background: "#f2f2f2",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        {movie.posterPath ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
            alt={movie.title}
            style={{ 
              width: "100%", 
              height: "auto", 
              display: "block",
              aspectRatio: "2/3", 
              objectFit: "cover" 
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              aspectRatio: "2/3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
              fontSize: "14px",
            }}
          >
            NO IMAGE
          </div>
        )}
      </div>

      {/* --- テキスト情報エリア --- */}
      <div style={{ 
        flex: "1 1 400px", 
        minWidth: "300px"  
      }}>
        <h1 style={{ 
          fontSize: "clamp(24px, 4vw, 32px)", 
          fontWeight: 900,
          lineHeight: "1.2",
          margin: 0
        }}>
          {movie.title}
        </h1>

        <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
          <p style={{ color: "#666", fontSize: "14px" }}>
            公開日：<span style={{ color: "#333", fontWeight: 600 }}>{movie.releaseDate || "不明"}</span>
          </p>
          <p style={{ color: "#666", fontSize: "14px" }}>
            スコア：<span style={{ color: "#333", fontWeight: 600 }}>{movie.voteAverage?.toFixed(1) ?? "—"}</span>
          </p>
        </div>

        <p style={{ 
          marginTop: "20px", 
          lineHeight: 1.8, 
          fontSize: "15px", 
          color: "#444",
          textAlign: "justify" 
        }}>
          {movie.overview || "あらすじがありません。"}
        </p>

        {/* ボタン類を表示する場所 */}
        <div style={{ marginTop: "24px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
