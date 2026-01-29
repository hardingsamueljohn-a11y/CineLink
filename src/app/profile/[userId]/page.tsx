import { supabaseServer } from "@/lib/supabase/server";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";

type ProfilePageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  // params は Promise
  const { userId } = await params;

  const supabase = await supabaseServer();

  // --- ログインユーザー取得 ---
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- プロフィール取得 ---
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return (
      <main style={{ padding: "24px" }}>
        <p>ユーザーが見つかりません。</p>
      </main>
    );
  }

  // --- フォロー数 ---
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  // --- フォロワー数 ---
  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);

  // --- 自分のプロフィールか ---
  const isMyProfile = user ? user.id === userId : false;

  // --- Wishlist 取得（movies テーブルと join） ---
  const { data: wishlistData } = await supabase
    .from("wishlists")
    .select(
      `
        tmdb_id,
        movies (
          title,
          poster_path
        )
      `,
    )
    .eq("user_id", userId);

  const wishlist = (wishlistData ?? []).map((row) => {
    const movie = Array.isArray(row.movies) ? row.movies[0] : row.movies;

    return {
      tmdbId: row.tmdb_id,
      title: movie?.title ?? "タイトル不明",
      posterPath: movie?.poster_path ?? null,
    };
  });

  // --- Reviews 取得（movies テーブルと join） ---
  const { data: reviewsData } = await supabase
    .from("reviews")
    .select(`
      id,
      tmdb_id,
      rating,
      content,
      is_spoiler,
      created_at,
      movies ( 
        title 
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const reviews = (reviewsData ?? []).map((row) => {
    const movie = Array.isArray(row.movies) ? row.movies[0] : row.movies;
    return {
      id: row.id,
      tmdbId: row.tmdb_id,
      rating: row.rating,
      content: row.content,
      isSpoiler: row.is_spoiler,
      createdAt: row.created_at,
      movieTitle: movie?.title ?? "タイトル不明",
    };
  });

  return (
    <main style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <ProfileHeader
        userId={profile.id}
        username={profile.username}
        avatarUrl={profile.avatar_url}
        bio={profile.bio}
        followingCount={followingCount ?? 0}
        followerCount={followerCount ?? 0}
        isMyProfile={isMyProfile}
      />
      <ProfileTabs wishlist={wishlist} reviews={reviews} />
    </main>
  );
}