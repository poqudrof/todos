// The site is a static export served from the root of its custom domain.
// A fork hosted below a subfolder can set NEXT_PUBLIC_BASE_PATH at build time.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
