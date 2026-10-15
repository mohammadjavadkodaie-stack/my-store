import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy every /api/* call to the NestJS backend so the browser only ever
  // talks to this origin: no CORS preflight and the httpOnly auth cookie is
  // sent to the same host/port. This is the ONLY place the backend URL lives.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/:path*",
      },
    ];
  },
  // next/image only serves the qualities listed here (Next 16 defaults to
  // [75]). 100 is allow-listed for the crisp brand logo used by the header
  // and the footer.
  images: {
    qualities: [75, 100],
  },
};

export default nextConfig;
