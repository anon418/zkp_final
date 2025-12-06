import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/contexts/WalletContext'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'VoteZK - 운영자도 조작할 수 없는 투명 투표 플랫폼',
  description:
    'Zero-Knowledge Proof 기반 완전 익명 투표 시스템. 블록체인에 영구 기록되어 누구나 재검증 가능하면서, 투표 내용은 끝까지 비밀입니다.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  )
}
