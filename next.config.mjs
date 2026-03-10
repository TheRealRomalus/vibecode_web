/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Google profile photos (used for user avatars from OAuth)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Placeholder avatars used in dev seed data only
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
};

export default nextConfig;
