'use client'

import React from 'react'

interface DurationSelectorProps {
  useCustomDate: boolean
  durationHours: number
  durationMinutes: number
  endDate: string
  onToggleMode: () => void
  onDurationHoursChange: (hours: number) => void
  onDurationMinutesChange: (minutes: number) => void
  onEndDateChange: (date: string) => void
  inputStyle: React.CSSProperties
  labelStyle: React.CSSProperties
}

export default function DurationSelector({
  useCustomDate,
  durationHours,
  durationMinutes,
  endDate,
  onToggleMode,
  onDurationHoursChange,
  onDurationMinutesChange,
  onEndDateChange,
  inputStyle,
  labelStyle,
}: DurationSelectorProps) {
  const totalMinutes = useCustomDate
    ? endDate
      ? Math.floor(
          (new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60)
        )
      : 0
    : durationHours * 60 + durationMinutes

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={labelStyle}>
        ⏰ 투표 마감 시간 <span style={{ color: '#dc2626' }}>*</span>
      </label>

      {/* 선택 방식 토글 */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
          padding: '8px',
          background: '#f1f5f9',
          borderRadius: '8px',
        }}
      >
        <button
          type="button"
          onClick={onToggleMode}
          style={{
            flex: 1,
            padding: '10px',
            background: !useCustomDate ? '#2563eb' : '#ffffff',
            color: !useCustomDate ? '#ffffff' : '#64748b',
            border: '1px solid',
            borderColor: !useCustomDate ? '#2563eb' : '#e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.2s',
          }}
        >
          ⏱️ 시간으로 설정
        </button>
        <button
          type="button"
          onClick={onToggleMode}
          style={{
            flex: 1,
            padding: '10px',
            background: useCustomDate ? '#2563eb' : '#ffffff',
            color: useCustomDate ? '#ffffff' : '#64748b',
            border: '1px solid',
            borderColor: useCustomDate ? '#2563eb' : '#e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.2s',
          }}
        >
          📅 날짜로 설정
        </button>
      </div>

      {!useCustomDate ? (
        // 시간과 분으로 설정
        <>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                max="720"
                value={durationHours}
                onChange={(e) => {
                  const val = Math.max(
                    0,
                    Math.min(720, Number(e.target.value) || 0)
                  )
                  onDurationHoursChange(val)
                }}
                style={{
                  ...inputStyle,
                  width: '100px',
                  textAlign: 'center',
                }}
                placeholder="24"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb'
                  e.currentTarget.style.background = '#ffffff'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.background = '#f8fafc'
                }}
              />
              <span
                style={{
                  fontSize: '0.95rem',
                  color: '#64748b',
                  fontWeight: 500,
                }}
              >
                시간
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                max="59"
                value={durationMinutes}
                onChange={(e) => {
                  const val = Math.max(
                    0,
                    Math.min(59, Number(e.target.value) || 0)
                  )
                  onDurationMinutesChange(val)
                }}
                style={{
                  ...inputStyle,
                  width: '100px',
                  textAlign: 'center',
                }}
                placeholder="0"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb'
                  e.currentTarget.style.background = '#ffffff'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.background = '#f8fafc'
                }}
              />
              <span
                style={{
                  fontSize: '0.95rem',
                  color: '#64748b',
                  fontWeight: 500,
                }}
              >
                분
              </span>
            </div>
            <span
              style={{
                fontSize: '0.95rem',
                color: '#64748b',
                fontWeight: 500,
              }}
            >
              후 마감
            </span>
          </div>
          <div
            style={{
              marginTop: '6px',
              fontSize: '0.75rem',
              color: '#64748b',
            }}
          >
            💡 최소 10분, 최대 30일(43,200분)까지 설정 가능합니다
            {(durationHours > 0 || durationMinutes > 0) && (
              <span
                style={{ marginLeft: '8px', color: '#16a34a', fontWeight: 600 }}
              >
                (현재: {durationHours * 60 + durationMinutes}분)
              </span>
            )}
          </div>
          {(durationHours > 0 || durationMinutes > 0) && (
            <div
              style={{
                marginTop: '8px',
                padding: '10px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#1e40af',
              }}
            >
              📅 마감 예정 시간:{' '}
              <strong>
                {new Date(
                  Date.now() + 1000 * 60 * (durationHours * 60 + durationMinutes)
                ).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
            </div>
          )}
        </>
      ) : (
        // 날짜로 설정
        <>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => {
                const selectedDate = new Date(e.target.value)
                const now = new Date()
                const maxDate = new Date()
                maxDate.setDate(maxDate.getDate() + 30) // 최대 30일 후

                if (selectedDate < now) {
                  // 과거 날짜는 현재 시간으로 설정
                  onEndDateChange(now.toISOString().slice(0, 16))
                } else if (selectedDate > maxDate) {
                  // 30일 이후는 최대 날짜로 설정
                  onEndDateChange(maxDate.toISOString().slice(0, 16))
                } else {
                  onEndDateChange(e.target.value)
                }
              }}
              min={new Date().toISOString().slice(0, 16)} // 현재 시간 이후만 선택 가능
              max={(() => {
                const maxDate = new Date()
                maxDate.setDate(maxDate.getDate() + 30) // 최대 30일 후
                return maxDate.toISOString().slice(0, 16)
              })()}
              style={{
                ...inputStyle,
                flex: 1,
                cursor: 'pointer',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563eb'
                e.currentTarget.style.background = '#ffffff'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.background = '#f8fafc'
              }}
            />
          </div>
          <div
            style={{
              marginTop: '6px',
              fontSize: '0.75rem',
              color: '#64748b',
            }}
          >
            💡 최소 10분, 최대 30일(43,200분)까지 설정 가능합니다
            {endDate && totalMinutes > 0 && (
              <span
                style={{ marginLeft: '8px', color: '#16a34a', fontWeight: 600 }}
              >
                (현재: {totalMinutes}분)
              </span>
            )}
          </div>
          {endDate && (
            <div
              style={{
                marginTop: '8px',
                padding: '10px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#1e40af',
              }}
            >
              📅 마감 예정 시간:{' '}
              <strong>
                {new Date(endDate).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
            </div>
          )}
        </>
      )}
    </div>
  )
}

