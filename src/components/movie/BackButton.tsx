"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
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
      ← 戻る
    </button>
  );
}