'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Header: React.FC = () => {
  const pathname = usePathname()
  
  const isActive = (path: string) => pathname === path

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        {/* Logo */}
        <Link href="/" style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="#2563eb"/>
            </svg>
          </div>
          <span style={styles.logoText}>VoteZK</span>
        </Link>

        {/* Navigation */}
        <nav style={styles.nav}>
          <Link 
            href="/vote" 
            style={{
              ...styles.navLink,
              ...(isActive('/vote') ? styles.navLinkActive : {})
            }}
          >
            내 투표 목록
          </Link>
          <Link 
            href="/vote/my-votes" 
            style={{
              ...styles.navLink,
              ...(isActive('/vote/my-votes') ? styles.navLinkActive : {})
            }}
          >
            내 투표 내역
          </Link>
          <Link 
            href="/stats" 
            style={{
              ...styles.navLink,
              ...(isActive('/stats') ? styles.navLinkActive : {})
            }}
          >
            통계
          </Link>
          <Link href="/vote/new" style={styles.createButton}>
            + 투표 만들기
          </Link>
        </nav>
      </div>
    </header>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 50,
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    backdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
  logoIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  navLink: {
    padding: '8px 16px',
    color: '#64748b',
    fontSize: '0.95rem',
    fontWeight: 500,
    textDecoration: 'none',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  navLinkActive: {
    color: '#2563eb',
    background: '#dbeafe',
  },
  createButton: {
    padding: '10px 20px',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: 600,
    textDecoration: 'none',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginLeft: '8px',
  },
}

export default Header
