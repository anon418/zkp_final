'use client'

import React, { useState } from 'react'
import QRCode from 'react-qr-code'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// 배포 / 로컬 자동 감지
// NEXT_PUBLIC_BASE_URL이 없으면 클라이언트에서 window.location.origin 사용
const BASE_URL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// 도메인만 추출 (프로토콜 제거)
const getBaseDomain = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    // URL 파싱 실패 시 원본 반환
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}

export default function QrPage() {
  const params = useParams()
  const pollId = params.pollId as string
  
  // 일반 웹 링크
  const votePageUrl = `${BASE_URL}/vote/${pollId}`
  
  // MetaMask 딥링크 (모바일에서 MetaMask 앱으로 바로 열림)
  const BASE_DOMAIN = getBaseDomain(BASE_URL)
  const metamaskDeepLink = `https://metamask.app.link/dapp/${BASE_DOMAIN}/vote/${pollId}`
  
  // 모바일에서는 MetaMask 딥링크 사용, 데스크톱에서는 일반 링크 사용
  const qrCodeUrl = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    ? metamaskDeepLink
    : votePageUrl

  const [copySuccess, setCopySuccess] = useState(false)

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '20px',
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
  }

  const headerStyle: React.CSSProperties = {
    textAlign: 'center' as const,
    marginBottom: '40px',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '12px',
  }

  const subtitleStyle: React.CSSProperties = {
    fontSize: 'clamp(0.9rem, 3vw, 1rem)',
    color: '#64748b',
  }

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: 'clamp(24px, 5vw, 40px)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px',
  }

  const qrContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  }

  const qrWrapperStyle: React.CSSProperties = {
    padding: '20px',
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    display: 'inline-block',
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: 'clamp(12px, 3vw, 16px)',
    fontSize: 'clamp(0.9rem, 3vw, 1rem)',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  }

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#2563eb',
    color: '#ffffff',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
  }

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#16a34a',
    color: '#ffffff',
    boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.2)',
  }

  const linkButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#f8fafc',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
  }

  const copyToClipboard = async () => {
    try {
      // 모바일에서는 MetaMask 딥링크, 데스크톱에서는 일반 링크 복사
      await navigator.clipboard.writeText(qrCodeUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      alert('복사 실패! 브라우저가 지원하지 않습니다.')
    }
  }

  const downloadQR = () => {
    const svg = document.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    // 모바일에서도 선명한 QR 코드를 위해 고해상도
    const size = 512
    canvas.width = size
    canvas.height = size

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(img, 0, 0, size, size)

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `votezk-qr-${pollId}.png`
            a.click()
            URL.revokeObjectURL(url)
          }
        })
      }
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  // QR 코드 크기 - 화면 크기에 따라 반응형
  const getQRSize = () => {
    if (typeof window === 'undefined') return 200
    const width = window.innerWidth
    if (width < 400) return Math.min(width - 120, 200)
    return 200
  }

  const [qrSize, setQRSize] = React.useState(200)

  React.useEffect(() => {
    const handleResize = () => setQRSize(getQRSize())
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* 헤더 */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>📱 투표 QR 코드</h1>
          <p style={subtitleStyle}>스마트폰으로 스캔하거나 링크를 공유하세요</p>
        </div>

        {/* QR 코드 카드 */}
        <div style={cardStyle}>
          <div style={qrContainerStyle}>
            <div style={qrWrapperStyle}>
              <QRCode value={qrCodeUrl} size={qrSize} />
            </div>
          </div>

          {/* Poll ID */}
          <div
            style={{
              textAlign: 'center' as const,
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                color: '#64748b',
                marginBottom: '4px',
              }}
            >
              Poll ID
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              {pollId}
            </div>
          </div>

          {/* 버튼들 */}
          <button
            onClick={copyToClipboard}
            style={primaryButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1d4ed8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2563eb'
            }}
          >
            <span>{copySuccess ? '✓ 복사됨!' : '📋 링크 복사'}</span>
          </button>

          <button
            onClick={downloadQR}
            style={secondaryButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#15803d'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#16a34a'
            }}
          >
            <span>💾 QR 이미지 저장</span>
          </button>

          <Link href={`/vote/${pollId}`} style={linkButtonStyle}>
            <span>📊 투표 관리 페이지</span>
          </Link>
        </div>

        {/* 안내 메시지 */}
        <div
          style={{
            padding: '16px',
            background: '#dbeafe',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '0.9rem',
              color: '#1e40af',
              lineHeight: 1.6,
            }}
          >
            💡 <strong>사용 방법</strong>
            <br />
            1. QR 코드를 스캔하거나
            <br />
            2. 링크를 복사해서 카톡/단체방에 공유하거나
            <br />
            3. QR 이미지를 저장해서 포스터/PPT에 붙여넣으세요
          </div>
        </div>

        {/* 모바일 MetaMask 안내 */}
        <div
          style={{
            padding: '16px',
            background: '#fef3c7',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #fbbf24',
          }}
        >
          <div
            style={{
              fontSize: '0.9rem',
              color: '#92400e',
              lineHeight: 1.6,
            }}
          >
            📱 <strong>모바일 사용 안내</strong>
            <br />
            스마트폰에서 QR 코드를 스캔하면:
            <br />
            ✅ MetaMask 앱이 자동으로 열립니다 (설치되어 있는 경우)
            <br />
            ✅ MetaMask 앱이 없으면 앱스토어로 이동합니다
            <br />
            <br />
            <strong>필수 사항:</strong>
            <br />
            1. MetaMask 앱 설치 (iOS/Android)
            <br />
            2. 앱에서 Sepolia 테스트넷 추가
            <br />
            3. QR 코드 스캔 후 투표 페이지에서 MetaMask 연결
            <br />
            <br />
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#1e40af',
                textDecoration: 'underline',
                fontWeight: 600,
              }}
            >
              → MetaMask 다운로드
            </a>
          </div>
        </div>

        {/* URL 표시 (모바일에서 터치로 복사) */}
        <div
          style={{
            padding: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#64748b',
            wordBreak: 'break-all',
            textAlign: 'center' as const,
            fontFamily: 'monospace',
          }}
        >
          {qrCodeUrl}
        </div>
        
        {/* 일반 웹 링크도 표시 (참고용) */}
        {qrCodeUrl !== votePageUrl && (
          <div
            style={{
              padding: '12px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#64748b',
              wordBreak: 'break-all',
              textAlign: 'center' as const,
              fontFamily: 'monospace',
              marginTop: '8px',
            }}
          >
            <div style={{ marginBottom: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
              일반 웹 링크:
            </div>
            {votePageUrl}
          </div>
        )}

        {/* 푸터 */}
        <div
          style={{
            textAlign: 'center' as const,
            marginTop: '40px',
            fontSize: '0.85rem',
            color: '#94a3b8',
          }}
        >
          Powered by VoteZK
        </div>
      </div>
    </div>
  )
}
