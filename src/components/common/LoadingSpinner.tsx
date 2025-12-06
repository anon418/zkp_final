import React from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  text?: string
  color?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text,
  color = '#4facfe',
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 64,
  }

  const spinnerSize = sizeMap[size]

  const spinnerStyle: React.CSSProperties = {
    width: `${spinnerSize}px`,
    height: `${spinnerSize}px`,
    border: `4px solid rgba(${
      color === '#4facfe' ? '79, 172, 254' : '255, 255, 255'
    }, 0.2)`,
    borderTop: `4px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '20px',
  }

  const textStyle: React.CSSProperties = {
    fontSize: size === 'small' ? '14px' : size === 'medium' ? '16px' : '18px',
    color: color === '#4facfe' ? '#666' : '#fff',
    textAlign: 'center',
  }

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={containerStyle}>
        <div style={spinnerStyle} />
        {text && <div style={textStyle}>{text}</div>}
      </div>
    </>
  )
}

export default LoadingSpinner
