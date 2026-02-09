import { supabaseServer } from "@/lib/supabase/server";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import HomeBackButton from "@/components/movie/HomeBackButton";
import { Profile } from "@/types/profile";
import { Review } from "@/types/review";
import { searchUsers } from "@/actions/profile";
import Link from "next/link";

type ProfilePageProps = {
  params: Promise<{
    userId: string;
  }>;

  searchParams: Promise<{
    user_q?: string;
  }>;
};

export default async function ProfilePage({
  params,
  searchParams,
}: ProfilePageProps) {
  const { userId } = await params;
  const { user_q } = await searchParams; // 検索クエリを取得

  const supabase = await supabaseServer();

  // --- ログインユーザー取得 ---
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- ユーザー検索の実行 (自分のプロフィールの時のみ有効) ---
  const foundUsers = user_q ? await searchUsers(user_q) : [];

  // --- プロフィール取得 ---
  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .eq("id", userId)
    .single();

  const profile = data as Profile | null;

  if (profileError || !profile) {
    return (
      <main style={{ padding: "24px" }}>
        <HomeBackButton />
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

  // --- フォロー状態の取得 ---
  let isFollowing = false;
  if (user && !isMyProfile) {
    const { data: followData } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle();
    isFollowing = !!followData;
  }

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
    .select(
      `
      id,
      tmdb_id,
      rating,
      content,
      is_spoiler,
      created_at,
      movies ( 
        title 
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const reviews: Review[] = (reviewsData ?? []).map((row) => {
    const movie = Array.isArray(row.movies) ? row.movies[0] : row.movies;
    return {
      id: row.id,
      userId: userId,
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
      <div style={{ marginBottom: "20px" }}>
        <HomeBackButton />
      </div>

      <ProfileHeader
        userId={profile.id}
        username={profile.username}
        avatarUrl={profile.avatar_url}
        bio={profile.bio}
        followingCount={followingCount ?? 0}
        followerCount={followerCount ?? 0}
        isMyProfile={isMyProfile}
        currentUserId={user?.id}
        initialIsFollowing={isFollowing}
      />

      {/* 自分のプロフィールの時のみ「友人検索」を表示 */}
      {isMyProfile && (
        <section
          style={{
            margin: "32px 0",
            padding: "20px",
            border: "1px solid #eee",
            borderRadius: "12px",
            background: "#fcfcfc",
          }}
        >
          <h3
            style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}
          >
            友人を検索
          </h3>
          <form
            action={`/profile/${userId}`}
            method="GET"
            style={{ display: "flex", gap: "8px" }}
          >
            <input
              name="user_q"
              defaultValue={user_q}
              placeholder="ユーザー名を入力..."
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px 16px",
                background: "#333",
                color: "#fff",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              検索
            </button>
          </form>

          {/* 検索結果 */}
          {user_q && (
            <div style={{ marginTop: "16px" }}>
              {foundUsers.length === 0 ? (
                <p style={{ fontSize: "14px", color: "#666" }}>
                  見つかりませんでした
                </p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {foundUsers.map((u) => (
                    <Link
                      key={u.id}
                      href={`/profile/${u.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <div
                        style={{
                          padding: "8px 12px",
                          background: "#fff",
                          border: "1px solid #ddd",
                          borderRadius: "20px",
                          fontSize: "13px",
                          color: "#333",
                        }}
                      >
                        @{u.username}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <ProfileTabs wishlist={wishlist} reviews={reviews} />
    </main>
  );
}
