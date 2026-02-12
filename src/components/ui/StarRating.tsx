"use client";

type StarRatingProps = {
  rating: number; 
};

export default function StarRating({ rating }: StarRatingProps) {
  // 数値分だけ「★」を、残り（5-数値）を「☆」にする
  const fullStars = "★".repeat(Math.max(0, Math.min(5, rating)));
  const emptyStars = "☆".repeat(Math.max(0, Math.min(5, 5 - rating)));

  return (
    <span 
      style={{ 
        color: "#f59e0b", 
        fontSize: "14px", 
        fontWeight: "bold",
        letterSpacing: "2px" 
      }}
      aria-label={`評価: ${rating}`}
    >
      {fullStars}
      <span style={{ color: "#ccc" }}>{emptyStars}</span>
    </span>
  );
}