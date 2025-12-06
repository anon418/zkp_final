'use client'

import React, { useEffect } from 'react'
import { useUiStore } from '@/store/uiStore' // 2-3에서 만든 스토어

// 인라인 스타일 객체
const styles: { [key: string]: React.CSSProperties } = {
  bannerBase: {
    position: 'fixed',
    top: '20px', // Header 아래쪽
    left: '50%',
    // transform: 'translate(-50%, -20px)', // [기존]
    transform: 'translate(-50%, -20px)' as React.CSSProperties['transform'],
    padding: '12px 20px',
    borderRadius: '8px',
    zIndex: 9999,
    color: 'white',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
    opacity: 0,
    visibility: 'hidden',
  },
  bannerVisible: {
    opacity: 1,
    visibility: 'visible',
    // transform: 'translate(-50%, 0)', // [기존]
    transform: 'translate(-50%, 0)' as React.CSSProperties['transform'],
  },
  error: { backgroundColor: '#D32F2F' }, // 빨간색
  success: { backgroundColor: '#4CAF50' }, // 초록색
  warning: { backgroundColor: '#FFA000' }, // 주황색
  info: { backgroundColor: '#1976D2' }, // 파란색
  closeButton: {
    marginLeft: '15px',
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: '1',
  },
}

const NotificationBanner: React.FC = () => {
  // uiStore에서 현재 상태와 닫기 함수를 가져옵니다.
  const { notification, hideNotification } = useUiStore()
  const { isOpen, message, type } = notification

  // UX 개선: 5초 뒤에 자동으로 닫히도록 설정
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isOpen) {
      timer = setTimeout(() => {
        hideNotification()
      }, 5000) // 5초
    }
    return () => clearTimeout(timer) // 컴포넌트가 사라지면 타이머도 정리
  }, [isOpen, hideNotification])

  // 스타일 조합
  const bannerStyle = {
    ...styles.bannerBase,
    ...styles[type], // 타입별 색상 적용
    ...(isOpen ? styles.bannerVisible : {}), // 보일 때 애니메이션
  }

  return (
    <div style={bannerStyle}>
      <span>{message}</span>
      <button onClick={hideNotification} style={styles.closeButton}>
        &times; {/* 닫기 (x) 버튼 */}
      </button>
    </div>
  )
}

export default NotificationBanner
