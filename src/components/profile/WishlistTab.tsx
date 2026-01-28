"use client";

type WishlistMovie = {
  tmdbId: number;
  title: string | null;
  posterPath: string | null;
};

type WishlistTabProps = {
  wishlist: WishlistMovie[];
};

export default function WishlistTab({ wishlist }: WishlistTabProps) {
  if (wishlist.length === 0) {
    return <p style={{ color: "#666" }}>観たい映画はまだありません。</p>;
  }

  return (
    <ul>
      {wishlist.map((movie) => (
        <li key={movie.tmdbId}>
          {movie.title ?? "No title"}
        </li>
      ))}
    </ul>
  );
}
