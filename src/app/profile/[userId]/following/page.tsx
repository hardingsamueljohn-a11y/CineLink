import { supabaseServer } from "@/lib/supabase/server";
import UserList from "@/components/profile/UserList";
import Link from "next/link"; 
import { SearchUser, Profile } from "@/types/profile";
import ProfileBackButton from "@/components/profile/ProfileBackButton";

type FollowingPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

/**
 * フォロー中ユーザー一覧ページ
 */
export default async function FollowingPage({ params }: FollowingPageProps) {
  const { userId } = await params;
  const supabase = await supabaseServer();

  // プロフィール情報の取得
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();

  // フォローしているユーザーの取得
  const { data: followingData } = await supabase
    .from("follows")
    .select(
      `
      profiles!follows_following_id_fkey (
        id,
        username,
        avatar_url
      )
    `,
    )
    .eq("follower_id", userId);

  // 型安全に整形
  const followingUsers: SearchUser[] = (followingData ?? [])
    .map((row) => {
      const p = row.profiles as unknown as Profile;

      if (p && p.id) {
        return {
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
        };
      }
      return null;
    })
    .filter((user): user is SearchUser => user !== null);

  return (
    <main style={{ padding: "24px", maxWidth: "600px", margin: "0 auto" }}>
      <ProfileBackButton userId={userId} />

      <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "4px" }}>
        {profile?.username || "ユーザー"}
      </h1>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "24px" }}>
        @{profile?.username}
      </p>

      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #eee",
          marginBottom: "10px",
        }}
      >
        <Link
          href={`/profile/${userId}/following`}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "12px",
            textDecoration: "none",
            color: "#000",
            fontWeight: "bold",
            borderBottom: "2px solid #000",
          }}
        >
          フォロー中
        </Link>
        <Link
          href={`/profile/${userId}/followers`}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "12px",
            textDecoration: "none",
            color: "#666",
          }}
        >
          フォロワー
        </Link>
      </div>

      <UserList
        users={followingUsers}
        emptyMessage="フォロー中のユーザーはいません"
      />
    </main>
  );
}
