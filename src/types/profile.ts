//ユーザープロフィールの基本型

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

// フォロー状態と関連カウントの型

export type FollowState = {
  isFollowing: boolean;
  followingCount: number;
  followerCount: number;
};