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
      <ProfileTabs />
    </main>
  );
}
