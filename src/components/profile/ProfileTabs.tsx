"use client";

import { useState } from "react";

type TabType = "wishlist" | "reviews";

export default function ProfileTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("wishlist");

  return (
    <section style={{ marginTop: "24px" }}>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid #ddd",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={() => setActiveTab("wishlist")}
          style={{
            padding: "8px 14px",
            borderRadius: "10px 10px 0 0",
            border: "1px solid #ddd",
            borderBottom: "none",
            background: activeTab === "wishlist" ? "#fff" : "#f5f5f5",
            cursor: "pointer",
            fontWeight: activeTab === "wishlist" ? 700 : 400,
          }}
        >
          観たい映画
        </button>

        <button
          onClick={() => setActiveTab("reviews")}
          style={{
            padding: "8px 14px",
            borderRadius: "10px 10px 0 0",
            border: "1px solid #ddd",
            borderBottom: "none",
            background: activeTab === "reviews" ? "#fff" : "#f5f5f5",
            cursor: "pointer",
            fontWeight: activeTab === "reviews" ? 700 : 400,
          }}
        >
          投稿したレビュー
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "0 16px 16px 16px",
          padding: "16px",
          background: "#fff",
        }}
      >
        {activeTab === "wishlist" && (
          <p style={{ color: "#666" }}>
            観たい映画の一覧がここに表示されます。
          </p>
        )}

        {activeTab === "reviews" && (
          <p style={{ color: "#666" }}>
            投稿したレビューの一覧がここに表示されます。
          </p>
        )}
      </div>
    </section>
  );
}
