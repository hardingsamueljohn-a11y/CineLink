"use client";

import { useState } from "react";
import Link from "next/link"; 
import FollowButton from "@/components/profile/FollowButton";
import EditProfileModal from "@/components/profile/EditProfileModal";
import { Profile } from "@/types/profile";

type ProfileHeaderProps = {
  userId: string;
  username: Profile["username"];
  avatarUrl: Profile["avatar_url"];
  bio: Profile["bio"];
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
  const [isModalOpen, setIsModalOpen] = useState(false); // モーダル状態管理

  return (
    <section
      style={{
        border: "1px solid #ddd",
        borderRadius: "16px",
        padding: "24px", 
        background: "#fff",
      }}
    >
      <div style={{ 
        display: "flex", 
        gap: "24px", 
        alignItems: "flex-start", 
        flexWrap: "wrap",
        justifyContent: "flex-start" 
      }}>
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            overflow: "hidden",
            background: "#eee",
            flexShrink: 0,
            border: "1px solid #eee",
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
                fontSize: "14px",
              }}
            >
              NO IMAGE
            </div>
          )}
        </div>

        {/* User Info */}
        <div style={{ 
          flex: "1 1 300px", 
          minWidth: "0" 
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px", 
            flexWrap: "wrap",
            marginBottom: "8px" 
          }}>
            <h1 style={{ 
              fontSize: "24px", 
              fontWeight: 800, 
              margin: 0,
              wordBreak: "break-word", 
              overflowWrap: "anywhere",
              lineHeight: "1.2"
            }}>
              {username || "Unknown User"}
            </h1>

            {/* 自分のプロフィールの時だけ編集ボタンを表示 */}
            {isMyProfile && (
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  padding: "6px 16px",
                  fontSize: "13px",
                  cursor: "pointer",
                  borderRadius: "20px",
                  border: "1px solid #ccc",
                  background: "#fff",
                  fontWeight: 600,
                  whiteSpace: "nowrap"
                }}
              >
                編集
              </button>
            )}
          </div>

          <p
            style={{
              marginTop: "10px",
              fontSize: "15px",
              color: "#555",
              whiteSpace: "pre-wrap",
              lineHeight: "1.5",
              wordBreak: "break-word"
            }}
          >
            {bio || "自己紹介はまだありません。"}
          </p>

          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "16px",
              fontSize: "14px",
              color: "#333",
              flexWrap: "wrap" 
            }}
          >
            {/* フォロー数へのリンク */}
            <Link 
              href={`/profile/${userId}/following`}
              style={{ textDecoration: "none", color: "inherit" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <span style={{ fontWeight: "bold", fontSize: "16px" }}>{followingCount}</span> フォロー
            </Link>

            {/* フォロワー数へのリンク */}
            <Link 
              href={`/profile/${userId}/followers`}
              style={{ textDecoration: "none", color: "inherit" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <span style={{ fontWeight: "bold", fontSize: "16px" }}>{followerCount}</span> フォロワー
            </Link>
          </div>
        </div>

        {/* Follow Button */}
        {!isMyProfile && currentUserId && (
          <div style={{ marginLeft: "auto", alignSelf: "flex-start" }}>
            <FollowButton
              followerId={currentUserId}
              followingId={userId}
              initialIsFollowing={initialIsFollowing}
            />
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      {isModalOpen && (
        <EditProfileModal
          profile={{
            id: userId,
            username,
            bio,
            avatar_url: avatarUrl, 
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </section>
  );
}