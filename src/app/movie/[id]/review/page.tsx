import Link from "next/link";
import ReviewForm from "@/components/review/ReviewForm";
import { supabaseServer } from "@/lib/supabase/server";

type ReviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ExistingReview = {
  id: string;
  rating: number;
  content: string;
  is_spoiler: boolean;
};

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const tmdbId = Number(id);

  if (Number.isNaN(tmdbId)) {
    return (
      <main style={{ padding: "24px" }}>
        <p>不正な映画IDです。</p>
        <Link href="/home" style={{ textDecoration: "underline" }}>
          /homeへ戻る
        </Link>
      </main>
    );
  }

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let existingReview: ExistingReview | null = null;

  // ✅ ログインしている場合だけ、自分のレビューがあるか探す
  if (user) {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, content, is_spoiler")
      .eq("tmdb_id", tmdbId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      existingReview = data as ExistingReview;
    }
  }

  return (
    <main style={{ padding: "24px" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto", marginBottom: "12px" }}>
        <Link
          href={`/movie/${tmdbId}`}
          style={{ textDecoration: "underline", fontSize: "12px" }}
        >
          ← 映画詳細へ戻る
        </Link>
      </div>

      <ReviewForm tmdbId={tmdbId} existingReview={existingReview} />
    </main>
  );
}
