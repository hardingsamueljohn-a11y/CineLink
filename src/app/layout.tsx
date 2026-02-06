import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "MovieApp - 映画レビューSNS",
  description: "お気に入りの映画を記録しよう",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "sans-serif",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          backgroundColor: "#fafafa",
          color: "#333",
        }}
      >
        <Header />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}