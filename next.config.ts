/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org", 
        port: "",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "epbuemtjykvnrwvsuqfn.supabase.co", 
        port: "",
        pathname: "/storage/v1/object/public/**", 
      },
    ],
  },
};

module.exports = nextConfig;
