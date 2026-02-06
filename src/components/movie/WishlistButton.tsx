"use client";

import { useUser } from "@/hooks/useUser";
import { useWishlist } from "@/hooks/useWishlist";

type WishlistButtonProps = {
  tmdbId: number;
};

export default function WishlistButton({ tmdbId }: WishlistButtonProps) {
  const { userId } = useUser();
  const { isWishlisted, loading, error, toggleWishlist } = useWishlist(userId, tmdbId);

  return (
    <div>
      <button
        onClick={toggleWishlist}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid #333",
          background: isWishlisted ? "#333" : "#fff",
          color: isWishlisted ? "#fff" : "#333",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "処理中..." : isWishlisted ? "観たい解除" : "観たい（追加）"}
      </button>

      {error && (
        <p style={{ marginTop: "8px", color: "crimson", fontSize: "12px" }}>
          {error}
        </p>
      )}
    </div>
  );
}