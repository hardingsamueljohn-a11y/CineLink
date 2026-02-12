import { Profile } from "./profile";

// レビュー情報の基本型
export type Review = {
  id: string;
  userId: string;
  tmdbId: number;
  rating: number;
  content: string;
  isSpoiler: boolean;
  createdAt: string;
  profiles?: Profile;
  movieTitle?: string;
  moviePosterPath?: string | null; 
};