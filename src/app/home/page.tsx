import Link from "next/link";
import { searchMovies } from "@/lib/tmdb/api";
import { supabaseServer } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import MovieCard from "@/components/movie/Card";
import MovieGrid from "@/components/movie/Grid";
import { Review } from "@/types/review";
import { Database } from "@/types/supabase";

type HomePageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

// ==========================================
// 型定義
// ==========================================
interface ReviewRawResponse {
  id: string;
  user_id: string;
  tmdb_id: number;
  rating: number;
  content: string;
  is_spoiler: boolean;
  created_at: string;
  profiles: { username: string | null } | null;
  movies: { title: string | null } | null;
}

type ReviewWithDetails = Omit<Review, "profiles"> & {
  profiles?: { username: string | null } | null;
  movies?: { title: string | null } | null;
};

type WishlistWithDetails = Database["public"]["Tables"]["wishlists"]["Row"] & {
  profiles?: { username: string | null } | null;
  movies?: { title: string | null } | null;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  // =========================
  // 検索（TMDB）
  // =========================
  const params = await searchParams;
  const query = params?.q ?? "";
  const movies = query ? await searchMovies(query) : [];

  // =========================
  // Supabase
  // =========================
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // =========================
  // アクティビティ（タイムライン）
  // =========================
  let timelineReviews: ReviewWithDetails[] = [];
  let timelineWishlists: WishlistWithDetails[] = [];

  if (user) {
    const { data: followsData, error: followsError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (!followsError) {
      const followingIds = (followsData ?? []).map((f) => f.following_id);

      if (followingIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select(
            `
            id, user_id, tmdb_id, rating, content, is_spoiler, created_at,
            profiles ( username ),
            movies ( title )
          `,
          )
          .in("user_id", followingIds)
          .order("created_at", { ascending: false })
          .limit(10);

        if (reviewsData) {
          const rawReviews = reviewsData as unknown as ReviewRawResponse[];
          timelineReviews = rawReviews.map((r) => ({
            id: r.id,
            userId: r.user_id,
            tmdbId: r.tmdb_id,
            rating: r.rating,
            content: r.content,
            isSpoiler: r.is_spoiler,
            createdAt: r.created_at,
            profiles: r.profiles,
            movies: r.movies,
          }));
        }

        const { data: wishlistsData } = await supabase
          .from("wishlists")
          .select(
            `
            *,
            profiles ( username ),
            movies ( title )
          `,
          )
          .in("user_id", followingIds)
          .order("created_at", { ascending: false })
          .limit(10);

        if (wishlistsData) {
          timelineWishlists = wishlistsData as unknown as WishlistWithDetails[];
        }
      }
    }
  }

  // =========================
  // 自分の観たい一覧
  // =========================
  type WishlistRow = Database["public"]["Tables"]["wishlists"]["Row"];
  type MovieRow = Database["public"]["Tables"]["movies"]["Row"];

  let myWishlistRows: WishlistRow[] = [];
  let myWishlistMovies: MovieRow[] = [];

  if (user) {
    const { data: wishlistData, error: wishlistError } = await supabase
      .from("wishlists")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!wishlistError) {
      myWishlistRows = wishlistData ?? [];
      const tmdbIds = myWishlistRows.map((w) => w.tmdb_id);

      if (tmdbIds.length > 0) {
        const { data: moviesData, error: moviesError } = await supabase
          .from("movies")
          .select("*")
          .in("tmdb_id", tmdbIds);

        if (!moviesError) {
          myWishlistMovies = moviesData ?? [];
        }
      }
    }
  }

  const movieMap = new Map<number, MovieRow>();
  myWishlistMovies.forEach((m) => movieMap.set(m.tmdb_id, m));

  return (
    <main style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* ヘッダー */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ fontSize: "28px", fontWeight: 700 }}>Home</h1>

        {user ? (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#666" }}>ログイン中</span>
            <Link
              href={`/profile/${user.id}`}
              style={{ textDecoration: "none" }}
              passHref
            >
              <button
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid #333",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                マイプロフィール
              </button>
            </Link>

            <form action={logout}>
              <button
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid #333",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                ログアウト
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px" }}>
            <Link href="/login">
              <button>ログイン</button>
            </Link>
            <Link href="/signup">
              <button>サインアップ</button>
            </Link>
          </div>
        )}
      </div>

      {/* =========================
          検索セクション
      ========================= */}
      <section style={{ marginBottom: "24px" }}>
        <form action="/home" method="GET">
          <input
            name="q"
            defaultValue={query}
            placeholder="映画を検索（例：スター・ウォーズ）"
            style={{
              width: "100%",
              padding: "16px",
              fontSize: "18px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              outline: "none",
            }}
          />

          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <button
              type="submit"
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #333",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              検索
            </button>

            {query ? (
              <Link
                href="/home"
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  textDecoration: "none",
                  color: "#333",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                クリア
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section style={{ marginBottom: "40px" }}>
        {query ? (
          <p style={{ marginBottom: "12px" }}>
            「<strong>{query}</strong>」の検索結果：{movies.length} 件
          </p>
        ) : (
          <p style={{ marginBottom: "12px", color: "#666" }}>
            上の検索窓で映画を検索できます。
          </p>
        )}

        <MovieGrid>
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              id={movie.id}
              title={movie.title}
              posterPath={movie.posterPath}
              releaseDate={movie.releaseDate}
              voteAverage={movie.voteAverage}
            />
          ))}
        </MovieGrid>
      </section>

      {/* =========================
          アクティビティ（タイムライン）
      ========================= */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>
          アクティビティ
        </h2>

        {!user ? (
          <p style={{ color: "#666" }}>
            タイムラインを見るにはログインが必要です。
          </p>
        ) : (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}
          >
            {timelineReviews.length === 0 && timelineWishlists.length === 0 ? (
              <p style={{ color: "#666" }}>まだアクティビティがありません。</p>
            ) : null}

            {/* レビュー */}
            {timelineReviews.map((review) => (
              <div
                key={review.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "12px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "6px",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 700 }}>
                      レビュー: {review.profiles?.username || "名無しユーザー"}{" "}
                      さん
                    </p>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#333",
                        marginTop: "2px",
                      }}
                    >
                      『{review.movies?.title || "タイトル不明"}』
                    </p>
                  </div>

                  <div
                    style={{
                      color: "#f59e0b",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    評価: {review.rating} / 5
                  </div>
                </div>

                <p
                  style={{
                    marginTop: "8px",
                    whiteSpace: "pre-wrap",
                    fontSize: "14px",
                  }}
                >
                  {review.isSpoiler
                    ? "※ネタバレあり（内容は隠しています）"
                    : review.content}
                </p>

                <div style={{ marginTop: "8px" }}>
                  <Link
                    href={`/movie/${review.tmdbId}`}
                    style={{
                      textDecoration: "underline",
                      fontSize: "12px",
                      color: "#333",
                    }}
                  >
                    映画ページへ
                  </Link>
                </div>
              </div>
            ))}

            {/* ウィッシュ */}
            {timelineWishlists.map((wish, index) => (
              <div
                key={`${wish.user_id}-${wish.tmdb_id}-${index}`}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "12px",
                  background: "#fff",
                }}
              >
                <p style={{ fontWeight: 700, marginBottom: "4px" }}>
                  観たい追加: {wish.profiles?.username || "名無しユーザー"} さん
                </p>

                <p style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>
                  『{wish.movies?.title || "タイトル不明"}』
                </p>

                <div style={{ marginTop: "8px" }}>
                  <Link
                    href={`/movie/${wish.tmdb_id}`}
                    style={{
                      textDecoration: "underline",
                      fontSize: "12px",
                      color: "#333",
                    }}
                  >
                    映画ページへ
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =========================
          自分の観たい一覧
      ========================= */}
      <section>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>
          自分の観たい一覧
        </h2>

        {!user ? (
          <p style={{ color: "#666" }}>
            観たい一覧を見るにはログインが必要です。
          </p>
        ) : myWishlistRows.length === 0 ? (
          <p style={{ color: "#666" }}>まだ「観たい」がありません。</p>
        ) : (
          <MovieGrid>
            {myWishlistRows.map((item) => {
              const movie = movieMap.get(item.tmdb_id);
              return (
                <MovieCard
                  key={`${item.tmdb_id}-${item.created_at}`}
                  id={item.tmdb_id}
                  title={movie?.title ?? "タイトル不明"}
                  posterPath={movie?.poster_path ?? null}
                />
              );
            })}
          </MovieGrid>
        )}
      </section>
    </main>
  );
}
