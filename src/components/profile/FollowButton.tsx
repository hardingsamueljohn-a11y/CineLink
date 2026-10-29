"use client";

import { useState } from "react";
import { followUser, unfollowUser } from "@/actions/follows";
import { FollowState } from "@/types/profile";

type FollowButtonProps = {
  followingId: string; // 相手のID
  initialIsFollowing: FollowState["isFollowing"];
};

export default function FollowButton({
  followingId,
  initialIsFollowing,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォロー・フォロー解除の切り替え処理
  const handleFollow = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const result = isFollowing
        ? await unfollowUser(followingId)
        : await followUser(followingId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setIsFollowing(!isFollowing);
    } catch {
      setError("フォロー状態を更新できませんでした");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
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
        {loading
          ? "読み込み中..."
          : isFollowing
            ? "フォロー解除"
            : "フォローする"}
      </button>
      {error && (
        <p role="alert" style={{ marginTop: "8px", color: "crimson", fontSize: "12px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
