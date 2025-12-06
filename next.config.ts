import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // output: 'standalone', // Docker/Render용 (Vercel은 불필요)
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // MongoDB OpenTelemetry 에러 해결
      config.externals = config.externals || []
      config.externals.push({
        '@opentelemetry/api': 'commonjs @opentelemetry/api',
        '@opentelemetry/instrumentation':
          'commonjs @opentelemetry/instrumentation',
        '@opentelemetry/sdk-trace-base':
          'commonjs @opentelemetry/sdk-trace-base',
      })
    } else {
      // 클라이언트 사이드에서 circomlibjs 제외 (서버 전용)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  // 서버 컴포넌트에서만 사용할 패키지
  serverExternalPackages: ['circomlibjs'],
  // Next.js 15에서는 serverComponentsExternalPackages 대신 다른 방식 사용
  // webpack externals로 처리 (위에서 이미 처리됨)
}

export default nextConfig
