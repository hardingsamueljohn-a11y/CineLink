"use client";

import FollowButton from "@/components/profile/FollowButton"; 

type ProfileHeaderProps = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followingCount: number;
  followerCount: number;
  isMyProfile: boolean;
  currentUserId?: string;
  initialIsFollowing: boolean;
};

export default function ProfileHeader({
  userId, // 相手のID
  username,
  avatarUrl,
  bio,
  followingCount,
  followerCount,
  isMyProfile,
  currentUserId, // 自分のID
  initialIsFollowing,
}: ProfileHeaderProps) {
  return (
    <section
      style={{
        border: "1px solid #ddd",
        borderRadius: "16px",
        padding: "20px",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        {/* Avatar */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            overflow: "hidden",
            background: "#eee",
            flexShrink: 0,
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#999",
                fontSize: "12px",
              }}
            >
              NO IMAGE
            </div>
          )}
        </div>

        {/* User Info */}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "20px", fontWeight: 800 }}>
            {username || "Unknown User"}
          </h1>

          <p style={{ marginTop: "6px", fontSize: "14px", color: "#666" }}>
            {bio || "自己紹介はまだありません。"}
          </p>

          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "10px",
              fontSize: "13px",
              color: "#333",
            }}
          >
            <span>フォロー {followingCount}</span>
            <span>フォロワー {followerCount}</span>
          </div>
        </div>

        {/* Follow Button */}
        {!isMyProfile && currentUserId && (
          <FollowButton
            followerId={currentUserId}
            followingId={userId}
            initialIsFollowing={initialIsFollowing}
          />
        )}
      </div>
    </section>
  );
}