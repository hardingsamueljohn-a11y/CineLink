import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import UserMenu from "./UserMenu"; 

export default async function Header() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url") 
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const buttonStyle: React.CSSProperties = {
    padding: "0 12px",
    height: "36px", 
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#fff",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    color: "#333",
    transition: "all 0.2s",
  };

  return (
    <header
      style={{
        borderBottom: "1px solid #eee",
        padding: "0 24px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link
          href="/home"
          style={{
            textDecoration: "none",
            color: "#333",
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          🎬 CineLink
        </Link>

        <nav>
          {user ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <UserMenu 
                userId={user.id} 
                username={profile?.username || "Guest"} 
                avatarUrl={profile?.avatar_url}
              />
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <Link href="/login" style={{ textDecoration: "none" }}>
                <button style={buttonStyle}>ログイン</button>
              </Link>
              <Link href="/signup" style={{ textDecoration: "none" }}>
                <button
                  style={{
                    ...buttonStyle,
                    background: "#333",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  サインアップ
                </button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}