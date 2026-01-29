import Link from "next/link";
import { searchMovies } from "@/lib/tmdb/api";
import { supabaseServer } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import MovieCard from "@/components/movie/Card";

type HomePageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

type ActivityReview = {
  id: string;
  user_id: string;
  tmdb_id: number;
  rating: number;
  content: string;
  is_spoiler: boolean;
  created_at: string;
};

type ActivityWishlist = {
  user_id: string;
  tmdb_id: number;
  status: string;
  created_at: string;
};

// wishlists の生データ（自分の観たい一覧用）
type MyWishlistRow = {
  tmdb_id: number;
  status: string;
  created_at: string;
};

// movies テーブルの表示用データ
type MovieRow = {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
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
  let timelineReviews: ActivityReview[] = [];
  let timelineWishlists: ActivityWishlist[] = [];

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
            "id, user_id, tmdb_id, rating, content, is_spoiler, created_at",
          )
          .in("user_id", followingIds)
          .order("created_at", { ascending: false })
          .limit(10);

        timelineReviews = (reviewsData ?? []) as ActivityReview[];

        const { data: wishlistsData } = await supabase
          .from("wishlists")
          .select("user_id, tmdb_id, status, created_at")
          .in("user_id", followingIds)
          .order("created_at", { ascending: false })
          .limit(10);

        timelineWishlists = (wishlistsData ?? []) as ActivityWishlist[];
      }
    }
  }

  // =========================
  // 自分の観たい一覧（JOINに依存しない安全版）
  // =========================
  let myWishlistRows: MyWishlistRow[] = [];
  let myWishlistMovies: MovieRow[] = [];

  if (user) {
    // ① 自分の wishlists を取得
    const { data: wishlistData, error: wishlistError } = await supabase
      .from("wishlists")
      .select("tmdb_id, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!wishlistError) {
      myWishlistRows = (wishlistData ?? []) as MyWishlistRow[];

      // ② tmdb_id の一覧を作る
      const tmdbIds = myWishlistRows.map((w) => w.tmdb_id);

      // ③ movies テーブルをまとめて取得
      if (tmdbIds.length > 0) {
        const { data: moviesData, error: moviesError } = await supabase
          .from("movies")
          .select("tmdb_id, title, poster_path")
          .in("tmdb_id", tmdbIds);

        if (!moviesError) {
          myWishlistMovies = (moviesData ?? []) as MovieRow[];
        }
      }
    }
  }

  // tmdb_id → MovieRow の辞書にして表示を簡単にする
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

            {/* --- マイプロフィールボタン --- */}
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

        {query && movies.length === 0 ? (
          <p style={{ color: "#666" }}>該当する映画が見つかりませんでした。</p>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              id={movie.id}
              title={movie.title}
              posterPath={movie.poster_path}
              releaseDate={movie.release_date}
              voteAverage={movie.vote_average}
            />
          ))}
        </div>
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
              <p style={{ color: "#666" }}>
                まだアクティビティがありません（フォローしてみよう！）
              </p>
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
                <p style={{ fontWeight: 700, marginBottom: "6px" }}>
                  レビュー（ユーザー: {review.user_id.slice(0, 8)}...）
                </p>

                <p style={{ fontSize: "12px", color: "#666" }}>
                  tmdb_id: {review.tmdb_id} / 評価: {review.rating}
                </p>

                <p style={{ marginTop: "8px", whiteSpace: "pre-wrap" }}>
                  {review.is_spoiler
                    ? "※ネタバレあり（内容は隠しています）"
                    : review.content}
                </p>

                <div style={{ marginTop: "8px" }}>
                  <Link
                    href={`/movie/${review.tmdb_id}`}
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
                <p style={{ fontWeight: 700, marginBottom: "6px" }}>
                  観たい追加（ユーザー: {wish.user_id.slice(0, 8)}...）
                </p>

                <p style={{ fontSize: "12px", color: "#666" }}>
                  tmdb_id: {wish.tmdb_id} / status: {wish.status}
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
          <p style={{ color: "#666" }}>
            まだ「観たい」がありません。映画詳細ページから追加してみよう！
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            {myWishlistRows.map((item) => {
              const movie = movieMap.get(item.tmdb_id);

              return (
                <Link
                  key={`${item.tmdb_id}-${item.created_at}`}
                  href={`/movie/${item.tmdb_id}`}
                  style={{
                    display: "block",
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                    overflow: "hidden",
                    textDecoration: "none",
                    color: "inherit",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "2 / 3",
                      background: "#f2f2f2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      color: "#777",
                    }}
                  >
                    {movie?.poster_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                        alt={movie.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span>NO IMAGE</span>
                    )}
                  </div>

                  <div style={{ padding: "10px" }}>
                    <p style={{ fontWeight: 700, marginBottom: "6px" }}>
                      {movie?.title ?? "タイトル不明"}
                    </p>

                    <p style={{ fontSize: "12px", color: "#666" }}>
                      status：{item.status}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
