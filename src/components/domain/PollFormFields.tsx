'use client'

import React from 'react'

interface PollFormFieldsProps {
  title: string
  description: string
  optionsText: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onOptionsTextChange: (value: string) => void
  inputStyle: React.CSSProperties
  labelStyle: React.CSSProperties
}

/**
 * 투표 생성 폼의 입력 필드 컴포넌트
 * 
 * 포함 필드:
 * - 제목 (필수)
 * - 설명 (선택사항)
 * - 후보 목록 (필수, 최소 2개)
 */
export default function PollFormFields({
  title,
  description,
  optionsText,
  onTitleChange,
  onDescriptionChange,
  onOptionsTextChange,
  inputStyle,
  labelStyle,
}: PollFormFieldsProps) {
  const candidateCount = optionsText
    .split('\n')
    .filter((v) => v.trim().length > 0).length

  return (
    <>
      {/* 제목 */}
      <div>
        <label style={labelStyle}>
          📝 투표 제목 <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          style={inputStyle}
          placeholder="예: 오늘 점심 메뉴 선택"
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#2563eb'
            e.currentTarget.style.background = '#ffffff'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0'
            e.currentTarget.style.background = '#f8fafc'
          }}
        />
        <div
          style={{
            marginTop: '6px',
            fontSize: '0.8rem',
            color: '#64748b',
          }}
        >
          투표의 제목을 입력하세요
        </div>
      </div>

      {/* 설명 */}
      <div>
        <label style={labelStyle}>
          📄 투표 설명{' '}
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
            (선택사항)
          </span>
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          style={{ ...inputStyle, minHeight: '100px' }}
          placeholder="투표에 대한 추가 설명을 입력하세요 (선택사항)"
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#2563eb'
            e.currentTarget.style.background = '#ffffff'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0'
            e.currentTarget.style.background = '#f8fafc'
          }}
        />
        <div
          style={{
            marginTop: '6px',
            fontSize: '0.8rem',
            color: '#64748b',
          }}
        >
          투표에 대한 상세 설명을 입력할 수 있습니다 (생략 가능)
        </div>
      </div>

      {/* 후보 */}
      <div>
        <label style={labelStyle}>
          🗳️ 후보 목록 <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <textarea
          value={optionsText}
          onChange={(e) => onOptionsTextChange(e.target.value)}
          style={{
            ...inputStyle,
            minHeight: '160px',
            fontFamily: 'monospace',
            fontSize: '0.95rem',
          }}
          placeholder="각 후보를 한 줄씩 입력하세요&#10;&#10;예시:&#10;수학&#10;과학&#10;역사&#10;영어"
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#2563eb'
            e.currentTarget.style.background = '#ffffff'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0'
            e.currentTarget.style.background = '#f8fafc'
          }}
        />
        <div
          style={{
            marginTop: '8px',
            fontSize: '0.8rem',
            color: '#64748b',
          }}
        >
          💡 각 후보를 한 줄씩 입력하세요. 최소 2개 이상의 후보가 필요합니다.
          {optionsText && (
            <span
              style={{ marginLeft: '8px', color: '#16a34a', fontWeight: 600 }}
            >
              현재 {candidateCount}개 후보
            </span>
          )}
        </div>
      </div>
    </>
  )
}

