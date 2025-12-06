'use client'

import React from 'react'
import Link from 'next/link'

// 호버 효과를 위한 스타일 추가
const hoverStyles = `
  .primary-button:hover {
    background: #1d4ed8 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35) !important;
  }
  .secondary-button:hover {
    background: #eff6ff !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2) !important;
  }
  .cta-primary-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
  }
  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
    border-color: #cbd5e1 !important;
  }
  .use-case-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
    border-color: #cbd5e1 !important;
  }
  .footer-link:hover {
    color: #ffffff !important;
  }
`

export default function Home() {
  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        {/* Hero Section */}
        <section style={styles.hero}>
          <div style={styles.heroContent}>
            <div style={styles.badge}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{ marginRight: '6px' }}
              >
                <path
                  d="M8 0L10.5 5.5L16 8L10.5 10.5L8 16L5.5 10.5L0 8L5.5 5.5L8 0Z"
                  fill="currentColor"
                />
              </svg>
              Zero-Knowledge Proof Technology
            </div>

            <h1 style={styles.title}>
              <span style={styles.titleAccent}>ZKP 기반</span>
              <span> 투표 플랫폼</span>
            </h1>

            <p style={styles.subtitle}>
              Zero-Knowledge Proof로 투표 내용을 비밀로 유지하면서,{' '}
              <strong style={{ color: '#0f172a', fontWeight: 600 }}>
                블록체인에 기록
              </strong>
              되어 누구나 재검증할 수 있는 투명하고 익명적인 투표 시스템입니다.
            </p>

            <div style={styles.ctaButtons}>
              <Link
                href="/vote/new"
                style={styles.primaryButton}
                className="primary-button"
              >
                투표 만들기
              </Link>
              <Link
                href="/vote"
                style={styles.secondaryButton}
                className="secondary-button"
              >
                내 투표 목록
              </Link>
            </div>

            <div style={styles.stats}>
              <div style={styles.statItem}>
                <div style={styles.statNumber}>높은</div>
                <div style={styles.statLabel}>익명성</div>
              </div>
              <div style={styles.statDivider}></div>
              <div style={styles.statItem}>
                <div style={styles.statNumber}>어려운</div>
                <div style={styles.statLabel}>조작</div>
              </div>
              <div style={styles.statDivider}></div>
              <div style={styles.statItem}>
                <div style={styles.statNumber}>영구</div>
                <div style={styles.statLabel}>검증 가능</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={styles.features}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>왜 VoteZK를 사용해야 하나요?</h2>
            <p style={styles.sectionSubtitle}>
              '믿음'이 아닌 '수학적 증명'으로 작동하는 투표 시스템
            </p>
          </div>

          <div style={styles.featureGrid}>
            <div style={styles.featureCard} className="feature-card">
              <div style={styles.featureIcon}>🔒</div>
              <h3 style={styles.featureTitle}>블록체인 기반 투명성</h3>
              <p style={styles.featureDescription}>
                모든 투표는 블록체인에 기록되어 관리자가 결과를 조작하기
                어렵습니다.{' '}
                <strong style={{ color: '#0f172a', fontWeight: 600 }}>
                  수학적 증명
                </strong>
                으로 투표 무결성을 보장합니다.
              </p>
              <div style={styles.featureComparison}>
                <div style={styles.comparisonItem}>
                  <span style={styles.comparisonLabel}>일반 투표:</span>
                  <span style={styles.comparisonBad}>조작 가능 ▲</span>
                </div>
                <div style={styles.comparisonItem}>
                  <span style={styles.comparisonLabel}>VoteZK:</span>
                  <span style={styles.comparisonGood}>조작 어려움 ✓</span>
                </div>
              </div>
            </div>

            <div style={styles.featureCard} className="feature-card">
              <div style={styles.featureIcon}>🎭</div>
              <h3 style={styles.featureTitle}>Zero-Knowledge Proof</h3>
              <p style={styles.featureDescription}>
                ZKP 기술로 투표 내용을 암호화하여 전송합니다. 서버나 관리자도{' '}
                <strong style={{ color: '#0f172a', fontWeight: 600 }}>
                  누가 무엇에 투표했는지 알 수 없습니다
                </strong>
                .
              </p>
              <div style={styles.featureComparison}>
                <div style={styles.comparisonItem}>
                  <span style={styles.comparisonLabel}>일반 투표:</span>
                  <span style={styles.comparisonBad}>IP/로그 남음 ▲</span>
                </div>
                <div style={styles.comparisonItem}>
                  <span style={styles.comparisonLabel}>VoteZK:</span>
                  <span style={styles.comparisonGood}>완전 익명 ✓</span>
                </div>
              </div>
            </div>

            <div style={styles.featureCard} className="feature-card">
              <div style={styles.featureIcon}>⛓️</div>
              <h3 style={styles.featureTitle}>누구나 재검증 가능</h3>
              <p style={styles.featureDescription}>
                발표된 결과를 믿지 않아도 됩니다.{' '}
                <strong style={{ color: '#0f172a', fontWeight: 600 }}>
                  Etherscan에서 직접 확인
                </strong>
                하여 투표 결과를 검증할 수 있습니다.
              </p>
              <div style={styles.featureComparison}>
                <div style={styles.comparisonItem}>
                  <span style={styles.comparisonLabel}>일반 투표:</span>
                  <span style={styles.comparisonBad}>믿어야 함 ▲</span>
                </div>
                <div style={styles.comparisonItem}>
                  <span style={styles.comparisonLabel}>VoteZK:</span>
                  <span style={styles.comparisonGood}>직접 검증 ✓</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section style={styles.useCases}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>어디에 사용하나요?</h2>
            <p style={styles.sectionSubtitle}>
              신뢰가 중요한 모든 투표에 사용하세요
            </p>
          </div>

          <div style={styles.useCaseGrid}>
            <div style={styles.useCaseCard} className="use-case-card">
              <div style={styles.useCaseNumber}>01</div>
              <h4 style={styles.useCaseTitle}>과대표/회장 선거</h4>
              <p style={styles.useCaseText}>
                운영진 조작 의혹을 원천 차단하고, 누구나 Etherscan에서 결과를
                직접 검증할 수 있습니다.
              </p>
            </div>

            <div style={styles.useCaseCard} className="use-case-card">
              <div style={styles.useCaseNumber}>02</div>
              <h4 style={styles.useCaseTitle}>익명 강의평가</h4>
              <p style={styles.useCaseText}>
                관리자가 볼 수 없는 완전 익명 평가. 서버 관리자도 누가
                작성했는지 알 수 없습니다.
              </p>
            </div>

            <div style={styles.useCaseCard} className="use-case-card">
              <div style={styles.useCaseNumber}>03</div>
              <h4 style={styles.useCaseTitle}>DAO/NFT 커뮤니티</h4>
              <p style={styles.useCaseText}>
                온체인 거버넌스가 필요한 Web3 커뮤니티. MetaMask를 사용 중이라면
                바로 시작하세요.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={styles.cta}>
          <div style={styles.ctaContent}>
            <h2 style={styles.ctaTitle}>지금 바로 시작하세요</h2>
            <p style={styles.ctaSubtitle}>
              3분이면 충분합니다. MetaMask 지갑만 있으면 됩니다.
            </p>
            <Link
              href="/vote/new"
              style={styles.ctaPrimaryButton}
              className="cta-primary-button"
            >
              첫 투표 만들기
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <div style={styles.footerBrand}>
              <div style={styles.footerLogo}>VoteZK</div>
              <p style={styles.footerTagline}>
                Zero-Knowledge Proof 기반 투명 투표 플랫폼
              </p>
            </div>
            <div style={styles.footerLinks}>
              <a
                href="https://sepolia.etherscan.io"
                target="_blank"
                rel="noopener"
                style={styles.footerLink}
                className="footer-link"
              >
                Etherscan에서 검증
              </a>
              <Link
                href="/stats"
                style={styles.footerLink}
                className="footer-link"
              >
                통계
              </Link>
            </div>
          </div>
          <div style={styles.footerBottom}>
            <p style={styles.footerCopyright}>
              Powered by Circom, Groth16, Sepolia Testnet
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: '100vh',
    background: '#ffffff',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // Hero Section
  hero: {
    padding: '100px 24px 120px',
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
  },
  heroContent: {
    maxWidth: '900px',
    margin: '0 auto',
    textAlign: 'center' as const,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 14px',
    background: '#eff6ff',
    color: '#2563eb',
    borderRadius: '100px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    marginBottom: '32px',
    letterSpacing: '0.01em',
  },
  title: {
    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
    fontWeight: 800,
    lineHeight: 1.1,
    color: '#0f172a',
    marginBottom: '28px',
    letterSpacing: '-0.02em',
  },
  titleAccent: {
    color: '#2563eb',
    display: 'block',
  },
  subtitle: {
    fontSize: '1.0625rem',
    lineHeight: 1.75,
    color: '#475569',
    marginBottom: '48px',
    maxWidth: '680px',
    margin: '0 auto 48px',
    fontWeight: 400,
  },
  ctaButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    marginBottom: '72px',
  },
  primaryButton: {
    padding: '14px 28px',
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
    textDecoration: 'none',
    display: 'inline-block',
  },
  secondaryButton: {
    padding: '14px 28px',
    background: '#ffffff',
    color: '#2563eb',
    border: '1.5px solid #2563eb',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    display: 'inline-block',
  },
  stats: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '48px',
    padding: '40px 48px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    maxWidth: '600px',
    margin: '0 auto',
    flexWrap: 'wrap' as const,
  },
  statItem: {
    textAlign: 'center' as const,
    flex: 1,
  },
  statNumber: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#2563eb',
    marginBottom: '6px',
    letterSpacing: '-0.01em',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: 500,
  },
  statDivider: {
    width: '1px',
    height: '48px',
    background: '#e2e8f0',
    flexShrink: 0,
  },

  // Features Section
  features: {
    padding: '100px 24px',
    maxWidth: '1200px',
    margin: '0 auto',
    background: '#f8fafc',
  },
  sectionHeader: {
    textAlign: 'center' as const,
    marginBottom: '64px',
  },
  sectionTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.75rem)',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '16px',
    letterSpacing: '-0.02em',
  },
  sectionSubtitle: {
    fontSize: '1.0625rem',
    color: '#64748b',
    lineHeight: 1.6,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
    gap: '32px',
  },
  featureCard: {
    padding: '36px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    transition: 'all 0.3s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  featureIcon: {
    fontSize: '2.75rem',
    marginBottom: '20px',
    lineHeight: 1,
  },
  featureTitle: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '14px',
    letterSpacing: '-0.01em',
  },
  featureDescription: {
    fontSize: '0.9375rem',
    lineHeight: 1.75,
    color: '#475569',
    marginBottom: '24px',
  },
  featureComparison: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    padding: '18px',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  comparisonItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.875rem',
    padding: '4px 0',
  },
  comparisonLabel: {
    color: '#64748b',
    fontWeight: 500,
  },
  comparisonBad: {
    color: '#ea580c',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  comparisonGood: {
    color: '#16a34a',
    fontWeight: 600,
    fontSize: '0.875rem',
  },

  // Use Cases Section
  useCases: {
    padding: '100px 24px',
    background: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
  },
  useCaseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
    gap: '28px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  useCaseCard: {
    padding: '36px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    transition: 'all 0.3s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  useCaseNumber: {
    display: 'inline-block',
    padding: '6px 14px',
    background: '#eff6ff',
    color: '#2563eb',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    fontWeight: 700,
    marginBottom: '18px',
    letterSpacing: '0.02em',
  },
  useCaseTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '14px',
    letterSpacing: '-0.01em',
  },
  useCaseText: {
    fontSize: '0.9375rem',
    lineHeight: 1.75,
    color: '#475569',
  },

  // CTA Section
  cta: {
    padding: '100px 24px',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  },
  ctaContent: {
    maxWidth: '700px',
    margin: '0 auto',
    textAlign: 'center' as const,
  },
  ctaTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.75rem)',
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: '18px',
    letterSpacing: '-0.02em',
  },
  ctaSubtitle: {
    fontSize: '1.0625rem',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: '36px',
    lineHeight: 1.6,
  },
  ctaPrimaryButton: {
    display: 'inline-block',
    padding: '16px 40px',
    background: '#ffffff',
    color: '#2563eb',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.0625rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    textDecoration: 'none',
  },

  // Footer
  footer: {
    padding: '60px 24px 30px',
    background: '#0f172a',
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    gap: '40px',
  },
  footerBrand: {
    maxWidth: '400px',
  },
  footerLogo: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: '12px',
  },
  footerTagline: {
    fontSize: '0.95rem',
    color: '#94a3b8',
    lineHeight: 1.6,
  },
  footerLinks: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap' as const,
  },
  footerLink: {
    color: '#cbd5e1',
    fontSize: '0.95rem',
    transition: 'color 0.2s',
  },
  footerBottom: {
    maxWidth: '1200px',
    margin: '0 auto',
    paddingTop: '24px',
    borderTop: '1px solid #1e293b',
    textAlign: 'center' as const,
  },
  footerCopyright: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
}
