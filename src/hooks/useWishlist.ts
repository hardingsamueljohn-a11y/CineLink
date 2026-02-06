import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { addToWishlist, removeFromWishlist } from '@/actions/wishlists';

/**
 * 特定の映画のお気に入り状態を管理するフック
 * @param userId ログインユーザーのID
 * @param tmdbId 対象の映画のTMDB ID
 */
export const useWishlist = (userId: string | null, tmdbId: number) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);

  // お気に入り状態を取得する関数
  const fetchWishlistStatus = useCallback(async () => {
    if (!userId) {
      setIsWishlisted(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userId)
        .eq('tmdb_id', tmdbId)
        .maybeSingle();

      if (error) {
        console.error('Wishlist check error:', error.message);
      }
      
      // データが存在すれば登録済み
      setIsWishlisted(!!data);
    } catch (err) {
      console.error('Unexpected error fetching wishlist status:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, tmdbId]);

  // マウント時およびID変更時に状態を確認
  useEffect(() => {
    fetchWishlistStatus();
  }, [fetchWishlistStatus]);

  // 追加・削除を切り替える関数
  const toggleWishlist = async () => {
    if (!userId) {
      alert("ログインが必要です");
      return;
    }

    // 楽観的アップデート（先に表示を切り替える）
    const previousState = isWishlisted;
    setIsWishlisted(!previousState);

    try {
      if (previousState) {
        // 登録済みの場合は削除
        await removeFromWishlist(tmdbId);
      } else {
        // 未登録の場合は追加
        await addToWishlist(tmdbId);
      }
    } catch (error) {
      // 失敗した場合は元の状態に戻す
      setIsWishlisted(previousState);
      console.error('Wishlist toggle failed:', error);
      alert("お気に入りの更新に失敗しました");
    }
  };

  return { isWishlisted, loading, toggleWishlist };
};