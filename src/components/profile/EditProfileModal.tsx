"use client";

import { useState, useRef } from "react"; 
import { updateProfile } from "@/actions/profile";
import { supabase } from "@/lib/supabase/client"; 

type EditProfileModalProps = {
  profile: {
    id: string;
    username: string | null;
    bio: string | null;
    avatar_url: string | null;
  };
  onClose: () => void;
};

/**
 * プロフィール編集用モーダルコンポーネント
 */
export default function EditProfileModal({ profile, onClose }: EditProfileModalProps) {
  // ファイル入力の参照
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 入力フォームの状態管理
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [loading, setLoading] = useState(false);

  // 画像プレビュー・アップロード用の状態管理
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile.avatar_url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  /**
   * 画像が選択された時の処理
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // 表示用のプレビューURLを作成
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalAvatarUrl = profile.avatar_url;

      // 新しい画像が選択されている場合はStorageへアップロード
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        // ファイル名を重複させないためのランダムな名前
        const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
        const filePath = `${profile.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) throw uploadError;

        // 公開URLを取得
        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        
        finalAvatarUrl = publicUrl;
      }

      // サーバーアクションを呼び出してDBを更新
      await updateProfile({
        userId: profile.id,
        username,
        bio,
        avatarUrl: finalAvatarUrl,
      });

      // 成功したらモーダルを閉じる
      onClose();
    } catch (error) {
      alert("更新に失敗しました");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px", 
      boxSizing: "border-box"
    }}>
      <div style={{
        backgroundColor: "#fff",
        padding: "24px",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "400px", 
        boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
        boxSizing: "border-box",
        margin: "auto", 
      }}>
        <h2 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: "bold", textAlign: "center" }}>プロフィールを編集</h2>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* プロフィール画像編集部分 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "100px", 
              height: "100px",
              borderRadius: "50%",
              overflow: "hidden",
              background: "#eee",
              flexShrink: 0,
              border: "1px solid #ddd"
            }}>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={previewUrl} 
                  alt="preview" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
              ) : (
                <div style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                  fontSize: "12px"
                }}>
                  NO IMAGE
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: "14px", color: "#0070f3", cursor: "pointer", background: "none", border: "none", fontWeight: 600 }}
            >
              画像を変更
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />
          </div>

          {/* ユーザー名入力フィールド */}
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ 
                width: "100%", 
                padding: "12px", 
                borderRadius: "8px", 
                border: "1px solid #ccc", 
                fontSize: "16px", 
                boxSizing: "border-box",
                outlineColor: "#000"
              }}
            />
          </div>

          {/* 自己紹介入力フィールド */}
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
              自己紹介
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              style={{ 
                width: "100%", 
                padding: "12px", 
                borderRadius: "8px", 
                border: "1px solid #ccc", 
                fontSize: "16px", 
                resize: "none",
                boxSizing: "border-box",
                outlineColor: "#000"
              }}
            />
          </div>

          {/* アクションボタン */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "stretch", marginTop: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1, padding: "12px", cursor: "pointer", background: "#f5f5f5", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600 }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px",
                cursor: "pointer",
                background: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600
              }}
            >
              {loading ? "保存中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}