"use client";

import Link from "next/link";
import { SearchUser } from "@/types/profile";

type UserListProps = {
  users: SearchUser[];
  emptyMessage: string;
};

/**
 * フォロー・フォロワーなどのユーザー一覧を表示する共通コンポーネント
 */
export default function UserList({ users, emptyMessage }: UserListProps) {
  // ユーザーがいない場合の表示
  if (users.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "#666" }}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/profile/${user.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px",
            textDecoration: "none",
            color: "inherit",
            borderBottom: "1px solid #eee",
            transition: "background 0.2s",
          }}
          // ホバー時の背景色変更（簡易的なインラインスタイル）
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9f9f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {/* アバター画像部分 */}
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              overflow: "hidden",
              background: "#eee",
              flexShrink: 0,
            }}
          >
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.username || "user"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                  fontSize: "12px",
                }}
              >
                NO IMG
              </div>
            )}
          </div>

          {/* ユーザー名 */}
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: "bold", fontSize: "15px" }}>
              {user.username || "不明なユーザー"}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}