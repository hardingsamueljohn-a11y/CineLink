export type ActivityItem = {
  type: "review" | "wishlist";
  id: string;
  tmdbId: number;
  rating?: number;
  content?: string;
  isSpoiler?: boolean;
  createdAt: string;
  username: string;
  movieTitle: string;
  posterPath: string | null;
};