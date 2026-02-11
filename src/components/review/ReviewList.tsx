import ReviewItem from "./ReviewItem";
import { Review } from "@/types/review";

type ReviewListProps = {
  reviews: Review[];
  tmdbId: number;
  currentUserId?: string;
};

export default function ReviewList({ reviews, tmdbId, currentUserId }: ReviewListProps) {
  if (reviews.length === 0) {
    return <p style={{ color: "#666" }}>まだレビューがありません。</p>;
  }

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          tmdbId={tmdbId}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}