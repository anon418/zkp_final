import React, { ReactNode } from 'react'
import Header from './Header' // 방금 만든 헤더 import

interface LayoutProps {
  children: ReactNode // 페이지의 본문 내용
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // 메인 컨텐츠 영역 스타일
  const mainStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '20px auto', // 중앙 정렬
    padding: '0 24px',
    fontFamily: 'sans-serif', // 기본 폰트
  }

  return (
    <div>
      <Header />
      <main style={mainStyle}>
        {children} {/* 이 부분이 각 페이지의 내용으로 교체 */}
      </main>
      {/* Footer가 필요하다면 여기에 추가합니다.
        <Footer /> 
      */}
    </div>
  )
}

export default Layout
