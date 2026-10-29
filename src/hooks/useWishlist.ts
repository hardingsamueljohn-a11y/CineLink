import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { addToWishlist, removeFromWishlist } from "@/actions/wishlists";

/** Keep async results tied to both the authenticated user and the movie. */
export const useWishlist = (userId: string | null, tmdbId: number) => {
  const key = userId ? `${userId}:${tmdbId}` : null;
  const [snapshot, setSnapshot] = useState<{ key: string; value: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const requestKey = `${userId}:${tmdbId}`;
    const load = async () => {
      try {
        const { data, error } = await supabase.from("wishlists").select("id")
          .eq("user_id", userId).eq("tmdb_id", tmdbId).maybeSingle();
        if (!active) return;
        if (error) {
          console.error("Wishlist lookup failed:", error.code);
          setFailure({ key: requestKey, message: "お気に入りの状態を取得できませんでした" });
        }
        setSnapshot({ key: requestKey, value: !error && !!data });
      } catch {
        if (active) {
          setFailure({ key: requestKey, message: "お気に入りの状態を取得できませんでした" });
          setSnapshot({ key: requestKey, value: false });
        }
      }
    };
    void load();
    return () => { active = false; };
  }, [userId, tmdbId]);

  const isWishlisted = key !== null && snapshot?.key === key && snapshot.value;
  const loading = pending || (key !== null && snapshot?.key !== key);
  const error = failure?.key === key ? failure?.message ?? null : null;

  const toggleWishlist = async () => {
    if (!key) {
      // This message also works before a session has loaded.
      setFailure({ key: "", message: "ログインが必要です" });
      return;
    }
    if (loading) return;
    setFailure(null);
    setPending(true);
    const previousState = isWishlisted;
    setSnapshot({ key, value: !previousState });
    try {
      if (previousState) await removeFromWishlist(tmdbId);
      else await addToWishlist(tmdbId);
    } catch {
      setSnapshot((current) => current?.key === key ? { key, value: previousState } : current);
      setFailure({ key, message: "お気に入りの更新に失敗しました" });
    } finally {
      setPending(false);
    }
  };

  return { isWishlisted, loading, error: key === null && failure?.key === "" ? failure.message : error, toggleWishlist };
};
