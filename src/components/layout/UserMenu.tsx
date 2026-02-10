"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "@/actions/auth";
import { User } from "lucide-react";

type UserMenuProps = {
  userId: string;
  username: string;
  avatarUrl?: string | null;
};

export default function UserMenu({ userId, username, avatarUrl }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          overflow: "hidden",
          padding: 0,
        }}
      >
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={avatarUrl} 
            alt={username} 
            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
          />
        ) : (
          <User size={20} color="#333" />
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "50px",
            right: 0,
            width: "180px",
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "12px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
            padding: "8px 0",
          }}
        >
          <div style={{ padding: "8px 16px", fontSize: "12px", color: "#999", borderBottom: "1px solid #f9f9f9" }}>
            {username}
          </div>
          
          <Link
            href={`/profile/${userId}`}
            onClick={() => setIsOpen(false)}
            style={{
              display: "block",
              padding: "10px 16px",
              fontSize: "14px",
              color: "#333",
              textDecoration: "none",
            }}
          >
            プロフィール
          </Link>
          
          <form action={logout} style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 16px",
                fontSize: "14px",
                color: "#ff4d4f",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              ログアウト
            </button>
          </form>
        </div>
      )}
    </div>
  );
}