"use client";

import { useRouter } from "next/navigation";

type ProfileBackButtonProps = {
  userId: string;
};

/**
 * HomeBackButtonとデザインを統一したプロフィール戻るボタン
 */
export default function ProfileBackButton({ userId }: ProfileBackButtonProps) {
  const router = useRouter();

  return (
    <div style={{ marginBottom: "20px" }}>
      <button
        onClick={() => router.push(`/profile/${userId}`)}
        style={{
          textDecoration: "underline",
          display: "inline-block",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0",
          fontSize: "16px",
          color: "inherit",
        }}
      >
        ← プロフィールに戻る
      </button>
    </div>
  );
}