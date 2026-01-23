"use client";

import { useState } from "react";
import { addToWishlist, removeFromWishlist } from "@/actions/wishlists";

type WishlistButtonProps = {
  tmdbId: number;
  initialIsWished: boolean;
};

export default function WishlistButton({
  tmdbId,
  initialIsWished,
}: WishlistButtonProps) {
  const [isWished, setIsWished] = useState(initialIsWished);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleClick = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (isWished) {
        await removeFromWishlist(tmdbId);
        setIsWished(false);
      } else {
        await addToWishlist(tmdbId);
        setIsWished(true);
      }
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "エラーが発生しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isLoading}
        style={{
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid #333",
          background: "#fff",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading
          ? "処理中..."
          : isWished
          ? "観たい解除"
          : "観たい（追加）"}
      </button>

      {errorMessage ? (
        <p style={{ marginTop: "8px", color: "crimson", fontSize: "12px" }}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
