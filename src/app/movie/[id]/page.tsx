import Link from "next/link";
import { getMovieDetail } from "@/lib/tmdb/api";
import WishlistButton from "@/components/movie/WishlistButton";
import ReviewButton from "@/components/movie/ReviewButton";
import ShareButton from "@/components/movie/ShareButton";
import { supabaseServer } from "@/lib/supabase/server";
import MovieHeader from "@/components/movie/Header";
import BackButton from "@/components/movie/BackButton";

type MovieDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// 内部用：DBから取得される生の型
interface DbReviewResponse {
  id: string;
  user_id: string;
  tmdb_id: number;
  rating: number;
  content: string;
  is_spoiler: boolean;
  created_at: string;
  profiles:
    | {
        username: string | null;
      }
    | {
        username: string | null;
      }[]
    | null;
}

// 内部用：画面で使用する結合型（Review型との競合を避けるため独立して定義）
type ReviewWithProfile = {
  id: string;
  userId: string;
  tmdbId: number;
  rating: number;
  content: string;
  isSpoiler: boolean;
  createdAt: string;
  profiles: {
    username: string | null;
  } | null;
};

export default async function MovieDetailPage({
  params,
}: MovieDetailPageProps) {
  const { id } = await params;
  const tmdbId = Number(id);

  if (Number.isNaN(tmdbId)) {
    return (
      <main style={{ padding: "24px" }}>
        <p>不正な映画IDです。</p>
        <BackButton />
      </main>
    );
  }

  const movie = await getMovieDetail(tmdbId);

  // --- Supabase ---
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- レビュー一覧（profiles.username を一緒に取得） ---
  const { data: reviewsData, error: reviewsError } = await supabase
    .from("reviews")
    .select(
      `
      id,
      user_id,
      tmdb_id,
      rating,
      content,
      is_spoiler,
      created_at,
      profiles (
        username
      )
    `,
    )
    .eq("tmdb_id", tmdbId)
    .order("created_at", { ascending: false });

  const reviews: ReviewWithProfile[] =
    !reviewsError && reviewsData
      ? (reviewsData as unknown as DbReviewResponse[]).map((r) => ({
          id: r.id,
          userId: r.user_id,
          tmdbId: r.tmdb_id,
          rating: r.rating,
          content: r.content,
          isSpoiler: r.is_spoiler,
          createdAt: r.created_at,
          profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
        }))
      : [];

  return (
    <main style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "8px" }}>
        <BackButton />
      </div>

      {/* =========================
          映画情報
      ========================= */}

      <MovieHeader movie={movie}>
        <div style={{ display: "flex", gap: "10px" }}>
          <WishlistButton tmdbId={tmdbId} />
          <ReviewButton tmdbId={tmdbId} />
          <ShareButton tmdbId={tmdbId} />
        </div>
        {!user && (
          <p style={{ marginTop: "12px", color: "#666", fontSize: "12px" }}>
            ※観たい機能とレビュー機能を使うにはログインが必要です
          </p>
        )}
      </MovieHeader>

      {/* =========================
          レビュー一覧
      ========================= */}
      <section style={{ marginTop: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "12px" }}>
          レビュー一覧
        </h2>

        {reviews.length === 0 ? (
          <p style={{ color: "#666" }}>まだレビューがありません。</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {reviews.map((review) => {
              const profileData = review.profiles;
              const username = profileData?.username ?? "Unknown";
              const isMyReview = user ? review.userId === user.id : false;

              return (
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
                      gap: "12px",
                      alignItems: "center",
                    }}
                  >
                    <p style={{ fontWeight: 700, marginBottom: "6px" }}>
                      ユーザー：{username} / 評価：{review.rating}
                    </p>

                    {isMyReview ? (
                      <Link
                        href={`/movie/${tmdbId}/review`}
                        style={{
                          fontSize: "12px",
                          textDecoration: "underline",
                          color: "#333",
                        }}
                      >
                        編集
                      </Link>
                    ) : null}
                  </div>

                  <p style={{ fontSize: "12px", color: "#666" }}>
                    投稿日：
                    {new Date(review.createdAt).toLocaleString("ja-JP")}
                  </p>

                  <p
                    style={{
                      marginTop: "10px",
                      whiteSpace: "pre-wrap",
                      // --- レイアウト崩れ防止 ---
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {review.isSpoiler
                      ? "※ネタバレあり（内容は非表示）"
                      : review.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
