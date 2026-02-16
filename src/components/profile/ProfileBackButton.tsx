"use client";

import { useRouter } from "next/navigation";

type ProfileBackButtonProps = {
  userId: string;
};

export default function ProfileBackButton({ userId }: ProfileBackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/profile/${userId}`)} // userIdを使って特定のプロフィールに戻る
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        fontSize: "14px",
        fontWeight: 600,
        color: "#555",
        backgroundColor: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#000";
        e.currentTarget.style.color = "#000";
        e.currentTarget.style.backgroundColor = "#f9f9f9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e0e0e0";
        e.currentTarget.style.color = "#555";
        e.currentTarget.style.backgroundColor = "#fff";
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      プロフィールへ戻る
    </button>
  );
}