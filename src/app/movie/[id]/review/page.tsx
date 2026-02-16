import MovieBackButton from "@/components/movie/MovieBackButton";
import ReviewForm from "@/components/review/ReviewForm";
import { supabaseServer } from "@/lib/supabase/server";
import { Review } from "@/types/review";

type ReviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const tmdbId = Number(id);

  if (Number.isNaN(tmdbId)) {
    return (
      <main style={{ padding: "24px" }}>
        <p>不正な映画IDです。</p>
        <MovieBackButton tmdbId={0} />
      </main>
    );
  }

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let existingReview: Review | null = null;

  //✅ ログインしている場合だけ、自分のレビューがあるか探す
  if (user) {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, user_id, tmdb_id, rating, content, is_spoiler, created_at")
      .eq("tmdb_id", tmdbId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      existingReview = {
        id: data.id,
        userId: data.user_id,
        tmdbId: data.tmdb_id,
        rating: data.rating,
        content: data.content,
        isSpoiler: data.is_spoiler,
        createdAt: data.created_at,
      };
    }
  }

  return (
    <main style={{ padding: "24px" }}>
      <div
        style={{ maxWidth: "800px", margin: "0 auto", marginBottom: "16px" }}
      >
        <MovieBackButton tmdbId={tmdbId} />
      </div>

      <ReviewForm tmdbId={tmdbId} existingReview={existingReview} />
    </main>
  );
}
