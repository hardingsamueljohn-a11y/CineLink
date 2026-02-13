import { supabaseServer } from "@/lib/supabase/server";
import UserList from "@/components/profile/UserList";
import Link from "next/link"; 
import { SearchUser, Profile } from "@/types/profile";
import ProfileBackButton from "@/components/profile/ProfileBackButton";

type FollowersPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

/**
 * フォロワー一覧ページ
 */
export default async function FollowersPage({ params }: FollowersPageProps) {
  const { userId } = await params;
  const supabase = await supabaseServer();

  // プロフィール情報の取得
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();

  // フォロワーの取得
  const { data: followersData } = await supabase
    .from("follows")
    .select(
      `
      profiles!follows_follower_id_fkey (
        id,
        username,
        avatar_url
      )
    `,
    )
    .eq("following_id", userId);

  // 型安全に整形
  const followerUsers: SearchUser[] = (followersData ?? [])
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
    <main style={{ padding: "20px 16px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "16px" }}>
        <ProfileBackButton userId={userId} />
      </div>

      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "4px" }}>
        {profile?.username || "ユーザー"}
      </h1>
      <p style={{ fontSize: "15px", color: "#666", marginBottom: "32px" }}>
        @{profile?.username}
      </p>

      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #eee",
          marginBottom: "16px",
        }}
      >
        <Link
          href={`/profile/${userId}/following`}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "14px",
            textDecoration: "none",
            color: "#666",
            fontSize: "16px",
          }}
        >
          フォロー中
        </Link>
        <Link
          href={`/profile/${userId}/followers`}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "14px",
            textDecoration: "none",
            color: "#000",
            fontWeight: "bold",
            fontSize: "16px",
            borderBottom: "2px solid #000",
          }}
        >
          フォロワー
        </Link>
      </div>

      <UserList users={followerUsers} emptyMessage="フォロワーはいません" />
    </main>
  );
}
