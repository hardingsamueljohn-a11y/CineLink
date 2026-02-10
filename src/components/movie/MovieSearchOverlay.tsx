"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getMoviesAction } from "@/actions/movies"; 
import { Movie } from "@/types/movie";

/**
 * 検索結果をオーバーレイ表示する検索窓コンポーネント
 */
export default function MovieSearchOverlay() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 入力値が変わるたびにServer Action経由で検索
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 0) {
        // サーバーアクションを呼び出し
        const movies = await getMoviesAction(query);
        setResults(movies);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300); // デバウンス処理

    return () => clearTimeout(timer);
  }, [query]);

  // 外側をクリックしたら閉じる処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", marginBottom: "24px" }}
    >
      {/* 検索入力欄 */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length > 0 && setIsOpen(true)}
        placeholder="映画を検索（例：スター・ウォーズ）"
        style={{
          width: "100%",
          boxSizing: "border-box", 
          padding: "16px 48px 16px 16px", 
          fontSize: "16px", 
          borderRadius: "10px",
          border: "1px solid #ccc",
          outline: "none",
          boxShadow: isOpen ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
        }}
      />

      {/* 検索結果のオーバーレイ表示 */}
      {isOpen && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "8px",
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            zIndex: 1000,
            maxHeight: "450px",
            overflowY: "auto",
          }}
        >
          <div style={{ padding: "12px" }}>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
              検索結果: {results.length} 件
            </p>
            {results.map((movie) => (
              <Link
                key={movie.id}
                href={`/movie/${movie.id}`}
                onClick={() => {
                  setIsOpen(false);
                  setQuery(""); // 遷移時にクエリをクリア
                }}
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "8px",
                  textDecoration: "none",
                  color: "inherit",
                  borderRadius: "8px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f5f5f5")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                {/* 簡易ポスター画像 */}
                <div
                  style={{
                    width: "40px",
                    height: "60px",
                    backgroundColor: "#eee",
                    borderRadius: "4px",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {movie.posterPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`}
                      alt={movie.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: "8px",
                        textAlign: "center",
                        marginTop: "20px",
                      }}
                    >
                      No Image
                    </div>
                  )}
                </div>
                {/* 映画情報 */}
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                    {movie.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {movie.releaseDate
                      ? movie.releaseDate.substring(0, 4)
                      : "-"}
                    年
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* クリアボタン（入力がある時のみ表示） */}
      {query && (
        <button
          onClick={() => {
            setQuery("");
            setResults([]);
            setIsOpen(false);
          }}
          style={{
            position: "absolute",
            right: "16px",
            top: "16px",
            background: "none",
            border: "none",
            color: "#999",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
