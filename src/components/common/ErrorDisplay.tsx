import React from 'react'

interface ErrorDisplayProps {
  message: string
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  const style: React.CSSProperties = {
    padding: '20px',
    textAlign: 'center',
    fontSize: '16px',
    color: 'red', // 에러는 빨간색으로
    backgroundColor: '#fff0f0',
    border: '1px solid red',
    borderRadius: '8px',
  }

  return (
    <div style={style}>
      <strong>오류 발생:</strong> {message || '알 수 없는 오류가 발생했습니다.'}
    </div>
  )
}

export default ErrorDisplay
