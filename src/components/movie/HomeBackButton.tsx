"use client";

import { useRouter } from "next/navigation";

export default function HomeBackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/home")}
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
      ← ホームへ戻る
    </button>
  );
}