"use client";

import { useState } from "react";
import WishlistTab from "./WishlistTab"; 
import ReviewsTab from "./ReviewsTab"; 

type WishlistItem = {
  tmdbId: number;
  title: string | null;
  posterPath: string | null;
};

type ReviewItem = {
  id: string;
  tmdbId: number;
  rating: number;
  content: string;
  isSpoiler: boolean;
  createdAt: string;
  movieTitle: string;
};

type TabType = "wishlist" | "reviews";

type ProfileTabsProps = {
  wishlist: WishlistItem[];
  reviews: ReviewItem[]; 
};

export default function ProfileTabs({ wishlist, reviews }: ProfileTabsProps) {
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
          <>
            <p style={{ color: "#666", marginBottom: "12px" }}>
              観たい映画：{wishlist.length} 件
            </p>
            {/* ここで WishlistTab を呼び出す */}
            <WishlistTab wishlist={wishlist} />
          </>
        )}

        {activeTab === "reviews" && (
          <>
            {/* 投稿したレビューを表示 */}
            <p style={{ color: "#666", marginBottom: "12px" }}>
              投稿したレビュー：{reviews.length} 件
            </p>
            <ReviewsTab reviews={reviews} />
          </>
        )}
      </div>
    </section>
  );
}