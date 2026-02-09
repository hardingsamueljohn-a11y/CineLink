"use client";

import { useState } from "react";
import { updateProfile } from "@/actions/profile";

type EditProfileModalProps = {
  profile: {
    id: string;
    username: string | null;
    bio: string | null;
  };
  onClose: () => void;
};

/**
 * プロフィール編集用モーダルコンポーネント
 */
export default function EditProfileModal({ profile, onClose }: EditProfileModalProps) {
  // 入力フォームの状態管理
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [loading, setLoading] = useState(false);

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // サーバーアクションを呼び出してDBを更新
      await updateProfile({
        userId: profile.id,
        username,
        bio,
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
      padding: "20px"
    }}>
      <div style={{
        backgroundColor: "#fff",
        padding: "24px",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
      }}>
        <h2 style={{ marginBottom: "20px", fontSize: "18px", fontWeight: "bold" }}>プロフィールを編集</h2>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* ユーザー名入力フィールド */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" }}
            />
          </div>

          {/* 自己紹介入力フィールド */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
              自己紹介
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", resize: "none" }}
            />
          </div>

          {/* アクションボタン */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ padding: "8px 16px", cursor: "pointer", background: "#f5f5f5", border: "none", borderRadius: "8px", fontSize: "14px" }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                background: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px"
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