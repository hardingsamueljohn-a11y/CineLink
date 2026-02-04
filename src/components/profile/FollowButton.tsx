"use client";

import { useState } from "react";
import { followUser, unfollowUser } from "@/actions/follows";

type FollowButtonProps = {
  followerId: string;    // 自分のID
  followingId: string;   // 相手のID
  initialIsFollowing: boolean;
};

export default function FollowButton({
  followerId,
  followingId,
  initialIsFollowing,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  // フォロー・フォロー解除の切り替え処理
  const handleFollow = async () => {
    if (loading) return;
    setLoading(true);

    if (isFollowing) {
      // フォロー解除
      await unfollowUser(followerId, followingId);
      setIsFollowing(false);
    } else {
      // フォロー実行
      await followUser(followerId, followingId);
      setIsFollowing(true);
    }
    
    setLoading(false);
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      style={{
        padding: "8px 16px",
        borderRadius: "20px",
        fontWeight: "bold",
        cursor: loading ? "not-allowed" : "pointer",
        backgroundColor: isFollowing ? "#fff" : "#000",
        color: isFollowing ? "#000" : "#fff",
        border: "1px solid #000",
      }}
    >
      {loading ? "読み込み中..." : isFollowing ? "フォロー解除" : "フォローする"}
    </button>
  );
}