import Image from "next/image";
import {
  getMovieDetail,
  getMovieCredits,
  getMovieVideos,
} from "@/lib/tmdb/api";
import WishlistButton from "@/components/movie/WishlistButton";
import ReviewButton from "@/components/movie/ReviewButton";
import ShareButton from "@/components/movie/ShareButton";
import { supabaseServer } from "@/lib/supabase/server";
import MovieHeader from "@/components/movie/Header";
import HomeBackButton from "@/components/movie/HomeBackButton";
import { Review } from "@/types/review";
import { Profile } from "@/types/profile";
import ReviewList from "@/components/review/ReviewList";

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
  profiles: Profile | Profile[] | null;
}

export default async function MovieDetailPage({
  params,
}: MovieDetailPageProps) {
  const { id } = await params;
  const tmdbId = Number(id);

  if (Number.isNaN(tmdbId)) {
    return (
      <main style={{ padding: "24px" }}>
        <p>不正な映画IDです。</p>
        <HomeBackButton />
      </main>
    );
  }

  // 並列でデータを取得（動画情報も追加）
  const [movie, credits, videos] = await Promise.all([
    getMovieDetail(tmdbId),
    getMovieCredits(tmdbId),
    getMovieVideos(tmdbId),
  ]);

  // 最初の予告編を1つ選出（なければ null）
  const trailer = videos.find((v) => v.type === "Trailer") || videos[0] || null;

  // --- Supabase ---
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- レビュー一覧 ---
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
        id,
        username,
        avatar_url,
        bio
      )
    `,
    )
    .eq("tmdb_id", tmdbId)
    .order("created_at", { ascending: false });

  const rawReviews = (reviewsData as unknown as DbReviewResponse[]) || [];

  const reviews: Review[] =
    !reviewsError && rawReviews.length > 0
      ? rawReviews.map((r) => {
          const profileData = Array.isArray(r.profiles)
            ? r.profiles[0]
            : r.profiles;

          return {
            id: r.id,
            userId: r.user_id,
            tmdbId: r.tmdb_id,
            rating: r.rating,
            content: r.content,
            isSpoiler: r.is_spoiler,
            createdAt: r.created_at,
            profiles: profileData ?? undefined,
            movieTitle: movie.title,
          };
        })
      : [];

  return (
    <main style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "8px" }}>
        <HomeBackButton />
      </div>

      {/* =========================
          映画情報
      ========================= */}

      <MovieHeader movie={movie}>
        {/* 監督情報の表示 */}
        {credits.director && (
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
            監督:{" "}
            <span style={{ color: "#000", fontWeight: 600 }}>
              {credits.director.name}
            </span>
          </p>
        )}

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
          予告編（動画）セクション
      ========================= */}
      <section style={{ marginTop: "32px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>
            予告編
          </h2>
          {/* YouTubeで探すリンク */}
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + " 予告編")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "12px",
              color: "#666",
              textDecoration: "underline",
            }}
          >
            YouTubeで探す
          </a>
        </div>

        {trailer ? (
          <div
            style={{
              position: "relative",
              width: "100%",
              paddingTop: "56.25%",
              backgroundColor: "#000",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <iframe
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
              src={`https://www.youtube.com/embed/${trailer.key}`}
              title="Movie Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        ) : (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              background: "#f5f5f5",
              borderRadius: "12px",
              color: "#999",
            }}
          >
            予告編映像が登録されていません
          </div>
        )}
      </section>

      {/* =========================
          レビュー一覧
      ========================= */}
      <section style={{ marginTop: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "12px" }}>
          レビュー一覧
        </h2>
        <ReviewList 
          reviews={reviews} 
          tmdbId={tmdbId} 
          currentUserId={user?.id} 
        />
      </section>

      {/* =========================
          キャスト一覧
      ========================= */}
      <section style={{ marginTop: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "16px" }}>
          主な出演者
        </h2>
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            gap: "16px",
            paddingBottom: "16px",
            scrollbarWidth: "thin",
          }}
        >
          {credits.cast.map((person) => (
            <div
              key={person.id}
              style={{
                flex: "0 0 100px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  backgroundColor: "#eee",
                  position: "relative",
                  marginBottom: "8px",
                }}
              >
                {person.profilePath ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w185${person.profilePath}`}
                    alt={person.name}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{ padding: "20px", fontSize: "10px", color: "#999" }}
                  >
                    No Image
                  </div>
                )}
              </div>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: "1.2",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {person.name}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "#666",
                  margin: "4px 0 0 0",
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {person.character}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
