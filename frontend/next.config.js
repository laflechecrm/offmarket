/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" output is used by the Docker build.
  // On Netlify it is not needed (Netlify plugin handles SSR natively).
  ...(process.env.NETLIFY ? {} : { output: "standalone" }),
};

module.exports = nextConfig;
