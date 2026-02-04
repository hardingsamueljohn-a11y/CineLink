import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client'; 
import { Profile } from '@/types/profile';

export const useUser = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        // 1. ログインユーザーの情報を取得
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          setUserId(null);
          setProfile(null);
          return;
        }

        setUserId(user.id);

        // 2. profilesテーブルから詳細情報を取得
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileError && profileData) {
          // 型安全にプロフィール情報をセット
          setProfile(profileData as Profile);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []); 

  return { userId, profile, loading };
};