import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    SCAN_WORKER_URL:
      process.env.NODE_ENV === "production"
        ? "https://fortify-1b9n.onrender.com"
        : process.env.SCAN_WORKER_URL || "http://localhost:8000",
  },
  
  // Optimizations to prevent memory issues and tab discarding
  experimental: {
    // Optimize memory usage
    optimizePackageImports: ['three'],
    // Reduce client-side bundle size
    optimizeCss: true,
  },
  
  // Production optimizations
  swcMinify: true,
  poweredByHeader: false,
  
  // Webpack configuration for better memory management
  webpack: (config, { isServer, dev }) => {
    if (dev && !isServer) {
      // Development optimizations to reduce memory usage
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          three: {
            test: /[\\/]node_modules[\\/]three[\\/]/,
            name: 'three',
            chunks: 'all',
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;
