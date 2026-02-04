//Supabase全体の型定義 
// 設計書のテーブル構成に基づき作成

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          bio: string | null;
        };
      };
      movies: {
        Row: {
          tmdb_id: number;
          title: string;
          poster_path: string | null;
        };
      };
      wishlists: {
        Row: {
          user_id: string;
          tmdb_id: number;
          status: string | null;
          created_at: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          tmdb_id: number;
          rating: number;
          content: string;
          is_spoiler: boolean;
          created_at: string;
        };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
      };
    };
  };
};