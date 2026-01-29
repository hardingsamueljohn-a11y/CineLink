"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth"; 

type ReviewButtonProps = {
  tmdbId: number;
};

export default function ReviewButton({
  tmdbId,
}: ReviewButtonProps) {
  const { isLoggedIn, loading } = useAuth(); 
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleClick = () => {
    setErrorMessage("");

    if (loading) return;

    if (!isLoggedIn) {
      setErrorMessage("ログインが必要です");
      return;
    }

    setIsLoading(true);
    router.push(`/movie/${tmdbId}/review`);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isLoading || loading} 
        style={{
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid #333",
          background: "#fff",
          cursor: (isLoading || loading) ? "not-allowed" : "pointer",
          opacity: (isLoading || loading) ? 0.6 : 1,
        }}
      >
        {loading ? "確認中..." : "レビューする"}
      </button>

      {errorMessage ? (
        <p style={{ marginTop: "8px", color: "crimson", fontSize: "12px" }}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}