'use client'

import React, { useState } from 'react'

interface DebugInfo {
  proofMs?: number // 증명 생성 시간 (ms)
  wasmMs?: number // Wasm 로드 시간 (ms)
  network?: string // 현재 네트워크
}

interface DebugPanelProps {
  // props로 지표를 받습니다. (Phase 4에서 연동)
  info: DebugInfo
}

const DebugPanel: React.FC<DebugPanelProps> = ({ info }) => {
  const [isOpen, setIsOpen] = useState(false) // 패널 토글

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#00FF00',
    padding: '10px',
    borderRadius: '5px',
    zIndex: 9998,
    fontFamily: 'monospace',
    fontSize: '12px',
    border: '1px solid #00FF00',
  }

  const toggleStyle: React.CSSProperties = {
    ...panelStyle,
    cursor: 'pointer',
    padding: '5px 8px',
  }

  if (!isOpen) {
    return (
      <div style={toggleStyle} onClick={() => setIsOpen(true)}>
        DEBUG
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      <button
        onClick={() => setIsOpen(false)}
        style={{
          float: 'right',
          background: 'none',
          border: 'none',
          color: '#00FF00',
          cursor: 'pointer',
        }}
      >
        [닫기]
      </button>
      <div>[DEBUG PANEL]</div>
      <hr style={{ borderColor: '#00FF00' }} />
      <div>Proof Time: {info.proofMs || 'N/A'} ms</div>
      <div>Wasm Load : {info.wasmMs || 'N/A'} ms</div>
      <div>Network : {info.network || 'N/A'}</div>
    </div>
  )
}

// 개발 모드(development)에서만 보이도록 설정
const isDev = process.env.NODE_ENV === 'development'

const DebugPanelWrapper: React.FC<DebugPanelProps> = (props) => {
  // 개발 모드일 때만 패널을 렌더링
  if (!isDev) {
    return null
  }
  return <DebugPanel {...props} />
}

export default DebugPanelWrapper
