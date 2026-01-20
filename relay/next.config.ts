import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  devIndicators: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_ENV: process.env.NEXT_ENV,
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' http://localhost:5001 http://localhost:5000 https://*.supabase.co https://*.stripe.com https://generativelanguage.googleapis.com https://accounts.google.com; frame-src 'self' https://accounts.google.com;",
          },
        ],
      },
    ];
  },

  // Redirect HTTP to HTTPS in production
  async redirects() {
    return process.env.NEXT_ENV === "production"
      ? [
          {
            source: "/(.*)",
            has: [
              {
                type: "header",
                key: "x-forwarded-proto",
                value: "http",
              },
            ],
            destination: "https://:host/:path*",
            permanent: true,
          },
        ]
      : [];
  },

  webpack: (config) => {
    // Fix for jose library module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
      stream: false,
      util: false,
    };

    // Handle ESM modules properly
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    // Specific fix for jose library
    config.resolve.alias = {
      ...config.resolve.alias,
      jose: require.resolve("jose"),
    };

    return config;
  },
  experimental: {
    esmExternals: true,
  },
  transpilePackages: ["jose"],
};

export default nextConfig;
