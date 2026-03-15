/** @type {import('next').NextConfig} */
const rawVercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
const vercelOrigin = rawVercelUrl
  ? rawVercelUrl.startsWith("http")
    ? rawVercelUrl
    : `https://${rawVercelUrl}`
  : "";

const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() || "";
const corsOrigin = appOrigin || vercelOrigin || "*";
const allowCredentials = corsOrigin !== "*";
const devLanIp = process.env.DEV_LAN_IP?.trim() || "";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https://drive.google.com https://*.googleusercontent.com https://*.googleapis.com https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://*.googleapis.com https://*.googleusercontent.com https:",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const apiCorsHeaders = [
  { key: "Access-Control-Allow-Origin", value: corsOrigin },
  { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With, Accept, Origin" },
  { key: "Access-Control-Max-Age", value: "86400" },
  { key: "Vary", value: "Origin" },
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
  { key: "Pragma", value: "no-cache" },
  ...(allowCredentials
    ? [{ key: "Access-Control-Allow-Credentials", value: "true" }]
    : []),
];

const authSensitivePageHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
  { key: "Pragma", value: "no-cache" },
  { key: "Vary", value: "Cookie, User-Agent" },
];

const nextConfig = {
  outputFileTracingRoot: process.cwd(),

  // Allow LAN device testing in development (mobile Safari/Chrome).
  // Added 192.168.195.1 for local network access
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.195.1", devLanIp].filter(Boolean),

  // Add Cloudinary image domain for Next.js Image component
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: apiCorsHeaders,
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/login",
        headers: authSensitivePageHeaders,
      },
      {
        source: "/dashboard",
        headers: authSensitivePageHeaders,
      },
      {
        source: "/",
        headers: authSensitivePageHeaders,
      },
      {
        source: "/vehicles/:path*",
        headers: authSensitivePageHeaders,
      },
      {
        source: "/settings/:path*",
        headers: authSensitivePageHeaders,
      },
    ];
  },
};

export default nextConfig;
