import { supabaseServer } from "@/lib/supabase/server";
import MovieCard from "@/components/movie/Card";
import MovieGrid from "@/components/movie/Grid";
import MovieSearchOverlay from "@/components/movie/MovieSearchOverlay";
import MovieHero from "@/components/movie/Hero";
import { Review } from "@/types/review";
import { Database } from "@/types/supabase";
import { getNowPlayingMovies, getHeroMovies } from "@/lib/tmdb/api";
import ActivityTimeline from "@/components/home/ActivityTimeline";
import { ActivityItem } from "@/types/activity";

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
  profiles: { username: string | null; avatar_url: string | null } | null;
  movies: { title: string | null; poster_path: string | null } | null;
}

type ReviewWithDetails = Omit<Review, "profiles"> & {
  profiles?: { username: string | null; avatar_url: string | null } | null;
  movies?: { title: string | null; poster_path: string | null } | null;
};

type WishlistWithDetails = Database["public"]["Tables"]["wishlists"]["Row"] & {
  profiles?: { username: string | null; avatar_url: string | null } | null;
  movies?: { title: string | null; poster_path: string | null } | null;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  // ============================================================
  // 映画検索セクション (TMDB API)
  // ------------------------------------------------------------
  // 入力に合わせて結果を動的に表示するオーバーレイ検索を採用。
  // APIキー保護のため Server Actions を介した設計にしています。
  // ===========================================================
  await searchParams;

  // =========================
  // 公開中の映画取得
  // =========================
  const nowPlayingMovies = await getNowPlayingMovies();

  // =========================
  // 高評価映画の取得 (Hero用)
  // =========================
  const trendingMovies = await getHeroMovies();

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
            profiles ( username, avatar_url ),
            movies ( title, poster_path )
          `,
          )
          .in("user_id", followingIds)
          .order("created_at", { ascending: false })
          .limit(20);

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
            profiles ( username, avatar_url ),
            movies ( title, poster_path )
          `,
          )
          .in("user_id", followingIds)
          .order("created_at", { ascending: false })
          .limit(20);

        if (wishlistsData) {
          timelineWishlists = wishlistsData as unknown as WishlistWithDetails[];
        }
      }
    }
  }

  // タイムライン表示用にレビューとウィッシュリストを統合し、降順（最新順）で整列
  const allActivities: ActivityItem[] = [
    ...timelineReviews.map((r) => ({
      type: "review" as const,
      id: r.id,
      tmdbId: r.tmdbId,
      rating: r.rating,
      content: r.content,
      isSpoiler: r.isSpoiler,
      createdAt: r.createdAt,
      username: r.profiles?.username || "名無しユーザー",
      avatarUrl: r.profiles?.avatar_url || null,
      movieTitle: r.movies?.title || "タイトル不明",
      posterPath: r.movies?.poster_path || null,
    })),
    ...timelineWishlists.map((w) => ({
      type: "wishlist" as const,
      id: `${w.user_id}-${w.tmdb_id}-${w.created_at}`,
      tmdbId: w.tmdb_id,
      createdAt: w.created_at,
      username: w.profiles?.username || "名無しユーザー",
      avatarUrl: w.profiles?.avatar_url || null,
      movieTitle: w.movies?.title || "タイトル不明",
      posterPath: w.movies?.poster_path || null,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

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
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>Home</h1>
      </div>

      {/* 検索セクション：インタラクティブなオーバーレイ検索コンポーネント */}
      <MovieSearchOverlay />

      {/* =========================
          Heroセクション
      ========================= */}
      <MovieHero movies={trendingMovies} />

      {/* =========================
          公開中の映画セクション
      ========================= */}
      <section style={{ marginBottom: "40px", marginTop: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>
          公開中の映画
        </h2>
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            gap: "16px",
            paddingBottom: "12px",
            scrollbarWidth: "thin",
            msOverflowStyle: "none",
          }}
        >
          {nowPlayingMovies.slice(0, 15).map((movie) => (
            <div key={movie.id} style={{ flex: "0 0 160px" }}>
              <MovieCard
                id={movie.id}
                title={movie.title}
                posterPath={movie.posterPath}
              />
            </div>
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
        ) : allActivities.length === 0 ? (
          <p style={{ color: "#666" }}>まだアクティビティがありません。</p>
        ) : (
          <ActivityTimeline initialActivities={allActivities} />
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
