'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUiStore } from '@/store/uiStore'
import { ethers } from 'ethers'
import { getTemplate } from '@/lib/pollTemplates'
import { debug, info, error } from '@/lib/logger'
import PollTemplateSelector from '@/components/domain/PollTemplateSelector'
import DurationSelector from '@/components/domain/DurationSelector'
import PollFormFields from '@/components/domain/PollFormFields'
import { getApiUrl } from '@/lib/api-utils'

// Vercel 배포 시: NEXT_PUBLIC_API_URL이 없으면 상대 경로 사용 (같은 도메인)
// 로컬 개발 시: 상대 경로 사용
const CREATE_POLL_URL = getApiUrl('/api/vote')

export default function NewPollPage() {
  debug('🎨 NewPollPage 렌더링됨!')

  const router = useRouter()
  const { notify, notifyError } = useUiStore()

  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [optionsText, setOptionsText] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [durationHours, setDurationHours] = useState(1) // 기본 1시간
  const [durationMinutes, setDurationMinutes] = useState(0) // 기본 0분
  const [useCustomDate, setUseCustomDate] = useState(false) // 달력 사용 여부
  const [endDate, setEndDate] = useState('') // 직접 날짜 선택

  // 컴포넌트 마운트 시 확인
  React.useEffect(() => {
    debug('✅ NewPollPage 마운트 완료!')
  }, [])

  // 템플릿 적용
  const applyTemplate = (templateId: string) => {
    const template = getTemplate(templateId)
    if (!template) return

    if (templateId === 'custom') {
      setTitle('')
      setDescription('')
      setOptionsText('')
    } else {
      setTitle(template.title)
      setDescription(template.description)
      setOptionsText(template.candidates.join('\n'))
    }

    setShowTemplates(false)
  }

  // DurationSelector 핸들러
  const handleToggleMode = () => {
    setUseCustomDate(!useCustomDate)
  }

  // 🔥 투표 생성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    debug('🔥 [1] 투표 생성 시작!')

    if (isLoading) {
      debug('⚠️ 이미 로딩 중...')
      return
    }

    const candidates = optionsText
      .split('\n')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)

    debug('📝 [2] 입력 데이터:', { title, candidates })

    if (!title || candidates.length < 2) {
      debug('❌ [3] 검증 실패: 제목 또는 후보 부족')
      notifyError('제목과 후보 2개 이상 입력해주세요.')
      return
    }

    // 최대 후보 개수 제한 (8개)
    if (candidates.length > 8) {
      debug('❌ [3] 검증 실패: 후보 개수 초과')
      notifyError('후보는 최대 8개까지 입력할 수 있습니다.')
      return
    }

    // 마감 시간 검증
    const now = new Date()
    const minDate = new Date(now.getTime() + 10 * 60 * 1000) // 최소 10분 후
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30) // 최대 30일 후

    const endTimeDate = useCustomDate && endDate
      ? new Date(endDate)
      : new Date(Date.now() + 1000 * 60 * (durationHours * 60 + durationMinutes))

    if (endTimeDate < minDate) {
      notifyError('마감 시간은 최소 10분 후여야 합니다.')
      return
    }

    if (endTimeDate > maxDate) {
      notifyError('마감 시간은 최대 30일 후까지 설정 가능합니다.')
      return
    }

    if (useCustomDate && !endDate) {
      notifyError('날짜를 선택해주세요.')
      return
    }

    // 총 시간(분) 계산
    const totalMinutes = durationHours * 60 + durationMinutes
    
    if (totalMinutes < 10) {
      notifyError('마감 시간은 최소 10분 이상이어야 합니다.')
      return
    }
    
    if (totalMinutes > 30 * 24 * 60) {
      notifyError('마감 시간은 최대 30일(43,200분) 이하여야 합니다.')
      return
    }

    debug('✅ [3] 검증 통과!')

    // 🦊 지갑 주소 가져오기
    debug('🦊 [4] MetaMask 연결 시도...')
    let creatorWallet = ''
    try {
      if (!window.ethereum) {
        debug('❌ [4] MetaMask가 설치되지 않았습니다!')
        alert(
          'MetaMask를 설치해주세요!\n\n1. Chrome/Edge에서 MetaMask 확장 프로그램 설치\n2. 페이지 새로고침'
        )
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      creatorWallet = accounts[0]
      info('✅ [4] 지갑 연결 성공:', creatorWallet)
    } catch (err) {
      error('❌ [4] MetaMask 연결 실패:', err)
      notifyError('메타마스크 연결에 실패했습니다.')
      return
    }

    const body = {
      creatorWallet,
      title,
      description,
      candidates: candidates.map((name, idx) => ({
        id: `opt${idx}`, // 0부터 시작 (ZKP 회로와 일치)
        label: name,
      })),
      startTime: new Date().toISOString(),
      endTime: useCustomDate && endDate
        ? new Date(endDate).toISOString() // 직접 선택한 날짜
        : new Date(
            Date.now() + 1000 * 60 * (durationHours * 60 + durationMinutes)
          ).toISOString(), // 사용자 설정 시간/분 뒤 종료
      merkleRoot: '0x' + '0'.repeat(64), // 기본 Merkle Root (모든 유권자 허용)
      chainId: 11155111,
    }

    setIsLoading(true)
    notify('투표 생성 중...', 'info')

    debug('📡 [5] API 호출 시작')
    debug('   URL:', CREATE_POLL_URL)
    debug('   Body:', JSON.stringify(body, null, 2))

    try {
      const res = await fetch(CREATE_POLL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      debug('📡 [6] API 응답 받음:', res.status, res.statusText)
      debug('📡 [6.5] Content-Type:', res.headers.get('content-type'))

      // 응답이 JSON인지 확인
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        // HTML 응답인 경우 (404 페이지 등)
        const text = await res.text()
        error('❌ [6.5] JSON이 아닌 응답 받음:', text.substring(0, 200))
        throw new Error(
          `API가 JSON을 반환하지 않았습니다. (상태: ${res.status}, URL: ${CREATE_POLL_URL})`
        )
      }

      const json = await res.json()
      debug('📡 [7] JSON 파싱:', json)

      if (!res.ok || !json.success) {
        error('❌ [8] API 오류:', json.message || json.error)
        throw new Error(
          json.message || json.error || `API 오류 (${res.status})`
        )
      }

      const newPollId = json.pollId || json.data?.pollId
      console.log('✅ [8] 투표 생성 완료! pollId:', newPollId)
      console.log('🚀 [8.5] 페이지 이동 시작:', `/vote/${newPollId}`)

      if (!newPollId) {
        console.error('❌ pollId가 없습니다! 응답:', json)
        throw new Error('pollId를 받지 못했습니다')
      }

      notify('투표 생성 완료!', 'success')

      // 페이지 이동
      const targetUrl = `/vote/${newPollId}`
      console.log('🚀 [9] router.push 호출:', targetUrl)
      router.push(targetUrl)

      // 또는 강제 이동 (router 실패 시 백업)
      setTimeout(() => {
        console.log('🚀 [9.5] 2초 후에도 안 움직이면 강제 이동')
        if (window.location.pathname === '/vote/new') {
          window.location.href = targetUrl
        }
      }, 2000)
    } catch (err: unknown) {
      const error = err as { message?: string }
      const { error: logError } = await import('@/lib/logger')
      logError('❌ [ERROR] 투표 생성 실패:', error)
      logError('   메시지:', error.message)
      logError('   상세:', error)
      notifyError(error.message || '투표 생성 실패')
    } finally {
      setIsLoading(false)
      console.log('🏁 [9] 투표 생성 프로세스 종료')
    }
  }

  // 🎨 스타일
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  }

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '600px',
    padding: '40px',
    borderRadius: '12px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: 800,
    textAlign: 'center',
    marginBottom: '10px',
    color: '#0f172a',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '8px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    fontSize: '1rem',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#0f172a',
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '18px',
    marginTop: '20px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#fff',
    background: isLoading
      ? '#333'
      : 'linear-gradient(135deg, #4facfe, #00f2fe)',
    border: 'none',
    borderRadius: '12px',
    cursor: isLoading ? 'not-allowed' : 'pointer',
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>새 투표 생성</h1>

        {/* 공정성 안내 */}
        <div
          style={{
            padding: '16px',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            color: '#856404',
          }}
        >
          <strong>⚠️ 공정한 투표를 위한 약속</strong>
          <ul
            style={{ marginTop: '8px', marginLeft: '20px', lineHeight: '1.6' }}
          >
            <li>
              중복 계정 생성은 <strong>부정행위</strong>입니다
            </li>
            <li>발각 시 투표 무효 및 징계 대상이 될 수 있습니다</li>
            <li>참여자 모두의 정직성을 신뢰합니다</li>
          </ul>
        </div>

        {/* 템플릿 선택 */}
        <PollTemplateSelector
          showTemplates={showTemplates}
          onToggle={() => setShowTemplates(!showTemplates)}
          onSelectTemplate={applyTemplate}
        />

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          {/* 폼 필드 (제목, 설명, 후보) */}
          <PollFormFields
            title={title}
            description={description}
            optionsText={optionsText}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onOptionsTextChange={setOptionsText}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
          />

          {/* 마감 시간 설정 */}
          <DurationSelector
            useCustomDate={useCustomDate}
            durationHours={durationHours}
            durationMinutes={durationMinutes}
            endDate={endDate}
            onToggleMode={handleToggleMode}
            onDurationHoursChange={setDurationHours}
            onDurationMinutesChange={setDurationMinutes}
            onEndDateChange={setEndDate}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
          />

          <button
            type="submit"
            disabled={(() => {
              // 기본 검증
              if (isLoading || !title.trim()) return true
              const candidateCount = optionsText.split('\n').filter((v) => v.trim().length > 0).length
              if (candidateCount < 2) return true
              if (candidateCount > 8) return true // 최대 8개 제한
              
              // 시간 검증
              let totalMinutes = 0
              if (useCustomDate) {
                if (!endDate) return true
                const selectedDate = new Date(endDate)
                const now = new Date()
                const diffMs = selectedDate.getTime() - now.getTime()
                totalMinutes = Math.floor(diffMs / (1000 * 60))
              } else {
                totalMinutes = durationHours * 60 + durationMinutes
              }
              
              // 10분 미만 또는 43200분(30일) 이상이면 비활성화
              if (totalMinutes < 10 || totalMinutes >= 43200) return true
              
              return false
            })()}
            style={{
              ...buttonStyle,
              opacity: (() => {
                if (isLoading || !title.trim()) return 0.5
                if (optionsText.split('\n').filter((v) => v.trim().length > 0).length < 2) return 0.5
                
                let totalMinutes = 0
                if (useCustomDate) {
                  if (!endDate) return 0.5
                  const selectedDate = new Date(endDate)
                  const now = new Date()
                  const diffMs = selectedDate.getTime() - now.getTime()
                  totalMinutes = Math.floor(diffMs / (1000 * 60))
                } else {
                  totalMinutes = durationHours * 60 + durationMinutes
                }
                
                if (totalMinutes < 10 || totalMinutes >= 43200) return 0.5
                return 1
              })(),
              cursor: (() => {
                if (isLoading || !title.trim()) return 'not-allowed'
                if (optionsText.split('\n').filter((v) => v.trim().length > 0).length < 2) return 'not-allowed'
                
                let totalMinutes = 0
                if (useCustomDate) {
                  if (!endDate) return 'not-allowed'
                  const selectedDate = new Date(endDate)
                  const now = new Date()
                  const diffMs = selectedDate.getTime() - now.getTime()
                  totalMinutes = Math.floor(diffMs / (1000 * 60))
                } else {
                  totalMinutes = durationHours * 60 + durationMinutes
                }
                
                if (totalMinutes < 10 || totalMinutes >= 43200) return 'not-allowed'
                return 'pointer'
              })(),
            }}
            onClick={() => console.log('🖱️ 버튼 클릭됨!')}
          >
            {(() => {
              if (isLoading) return '투표 생성 중...'
              if (!title.trim()) return '제목을 입력하세요'
              const candidateCount = optionsText.split('\n').filter((v) => v.trim().length > 0).length
              if (candidateCount < 2) return '후보를 2개 이상 입력하세요'
              if (candidateCount > 8) return '후보는 최대 8개까지 입력할 수 있습니다'
              
              let totalMinutes = 0
              if (useCustomDate) {
                if (!endDate) return '마감 날짜를 선택하세요'
                const selectedDate = new Date(endDate)
                const now = new Date()
                const diffMs = selectedDate.getTime() - now.getTime()
                totalMinutes = Math.floor(diffMs / (1000 * 60))
              } else {
                totalMinutes = durationHours * 60 + durationMinutes
              }
              
              if (totalMinutes < 10) return '마감 시간은 최소 10분 이상이어야 합니다'
              if (totalMinutes >= 43200) return '마감 시간은 최대 30일(43,200분) 이하여야 합니다'
              if (!useCustomDate && durationHours === 0 && durationMinutes === 0) return '마감 시간을 설정하세요'
              
              return '투표 생성하기 🚀'
            })()}
          </button>
        </form>
      </div>
    </div>
  )
}
