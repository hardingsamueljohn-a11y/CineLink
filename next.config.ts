import type { NextConfig } from "next";

const remotePatterns: { protocol: "https" | "http"; hostname: string; port: string; pathname: string; search: string }[] = [
  { protocol: "https", hostname: "image.tmdb.org", port: "", pathname: "/t/p/**", search: "" },
];

// Use the selected environment's project, rather than hard-coding production.
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol === "https:" || (loopback && url.protocol === "http:")) {
    remotePatterns.push({
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname, port: url.port,
      pathname: "/storage/v1/object/public/avatars/**", search: "",
    });
  }
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }];
  },
};

export default nextConfig;
