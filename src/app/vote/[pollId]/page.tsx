'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useUiStore } from '@/store/uiStore'
import { getPollPublic, PollPublic } from '@/lib/api'
import { useWallet } from '@/contexts/WalletContext'
import { ensureRegistered } from '@/lib/voter'
import StatusBadge, { type VoteStatus } from '@/components/domain/StatusBadge'
import RelayerToggle from '@/components/RelayerToggle'
import ConnectWalletButton from '@/components/ConnectWalletButton'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import VoteReceipt from '@/components/domain/VoteReceipt'
import VoteResults from '@/components/domain/VoteResults'
import PollHeader from '@/components/domain/PollHeader'
import PollInfo from '@/components/domain/PollInfo'
import CandidateSelector from '@/components/domain/CandidateSelector'
import VoteActionButtons from '@/components/domain/VoteActionButtons'
import { usePollData } from '@/hooks/usePollData'
import { usePollResults } from '@/hooks/usePollResults'
import { useCountdown } from '@/hooks/useCountdown'
import { useMyVote } from '@/hooks/useMyVote'
import { useZKPPreload } from '@/hooks/useZKPPreload'
import { generateProofInWorker } from '@/lib/proofWorker'
import { submitVote } from '@/lib/voteSubmission'

type StatusType =
  | 'idle'
  | 'connecting'
  | 'registering'
  | 'generating-proof'
  | 'submitting'
  | 'confirming'
  | 'confirmed'
  | 'error'
  | 'duplicate'

const mapStatusToVoteStatus = (s: StatusType): VoteStatus => {
  if (s === 'generating-proof') return 'generating_proof'
  if (s === 'confirming') return 'validating'
  if (s === 'error') return 'failed'
  if (s === 'connecting' || s === 'registering') return 'idle'
  return s as VoteStatus
}

export default function PollDetailPage() {
  const params = useParams()
  const pollId = params.pollId as string

  const { notify, notifyError } = useUiStore()
  const { isConnected, address } = useWallet()

  // 커스텀 훅 사용
  const { pollData, loading } = usePollData(pollId)
  const { participantCount, voteResults, showResults, setShowResults } =
    usePollResults(pollId, pollData)
  const timeLeft = useCountdown(pollData?.endTime || null)
  const { txHash, publicSignals, previousCandidate, isReVote: isReVoteFromHook, setTxHash, setPublicSignals, setIsReVote: setIsReVoteFromHook } =
    useMyVote(pollId)
  
  // ZKP 파일 프리로딩 (성능 최적화)
  const { isPreloaded } = useZKPPreload()

  // 이전 선택지가 있으면 초기값으로 설정
  const [selectedOption, setSelectedOption] = useState<string | null>(previousCandidate || null)
  
  // previousCandidate가 변경되면 selectedOption 업데이트
  useEffect(() => {
    if (previousCandidate && !selectedOption) {
      setSelectedOption(previousCandidate)
    }
  }, [previousCandidate, selectedOption])
  const [copySuccess, setCopySuccess] = useState(false)

  // 투표 상태
  const [voting, setVoting] = useState(false)
  const [voteStatus, setVoteStatus] = useState<StatusType>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [relayerEnabled, setRelayerEnabled] = useState(true)

  // 재투표 여부 상태 (useMyVote에서 가져온 값으로 초기화)
  const [isReVote, setIsReVote] = useState(isReVoteFromHook || false)
  
  // 영수증 표시/숨김 상태
  // 초기값: txHash가 있으면 영수증 표시 (새로고침 후에도 유지)
  const [showReceipt, setShowReceipt] = useState(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return false
    // 로컬 스토리지에서 txHash 확인
    const storedTxHash = localStorage.getItem(`vote_${pollId}_txHash`)
    return !!storedTxHash
  })
  
  // useMyVote에서 가져온 재투표 여부가 변경되면 동기화
  useEffect(() => {
    if (isReVoteFromHook !== undefined) {
      setIsReVote(isReVoteFromHook)
      console.log(`[PollDetail] isReVoteFromHook 변경: ${isReVoteFromHook}`)
    }
  }, [isReVoteFromHook])
  
  // txHash가 로드되면 영수증 자동 표시 (새로고침 후에도 유지)
  useEffect(() => {
    if (txHash && !showReceipt) {
      console.log(`[PollDetail] txHash 로드됨 - 영수증 자동 표시 (isReVote: ${isReVote})`)
      setShowReceipt(true)
    }
  }, [txHash, showReceipt, isReVote])

  // 🔗 링크 복사
  const handleCopyLink = () => {
    const url = `${window.location.origin}/vote/${pollId}`
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopySuccess(true)
        notify('링크가 복사되었습니다!', 'success')
        setTimeout(() => setCopySuccess(false), 2000)
      })
      .catch(() => {
        notifyError('링크 복사 실패')
      })
  }

  // 투표 상태 계산
  const getStatusInfo = () => {
    if (!pollData) return { badge: '❓', text: '알 수 없음', color: '#888' }

    const now = new Date()
    const start = new Date(pollData.startTime)
    const end = new Date(pollData.endTime)

    if (now < start) {
      return { badge: '🟡', text: '대기 중', color: '#fbbf24' }
    } else if (now > end) {
      return { badge: '🔴', text: '종료됨', color: '#ef4444' }
    } else {
      return { badge: '🟢', text: '진행 중', color: '#22c55e' }
    }
  }

  /**
   * 투표 버튼 클릭 시 실행되는 핸들러
   *
   * 전체 흐름:
   * 1. 지갑 연결 및 후보 선택 확인
   * 2. 공정성 약속 확인 (confirm)
   * 3. submitVote() 호출하여 ZKP 증명 생성 및 블록체인 제출
   * 4. 성공 시 영수증 표시 및 로컬 스토리지 저장
   * 5. 재투표인 경우 DB에서 최신 정보 갱신
   */
  const handleVoteClick = async () => {
    if (!isConnected || !address) {
      notifyError(
        '투표를 하려면 MetaMask 지갑 연결이 필요합니다. 위의 "MetaMask 연결하기" 버튼을 클릭해주세요.'
      )
      return
    }

    if (!selectedOption) {
      alert('선택지를 선택해주세요!')
      return
    }

    // 공정성 확인
    const confirmed = confirm(
      '⚠️ 공정한 투표를 위한 약속\n\n' +
        '✅ 1인 1표를 지킬 것을 약속합니다\n' +
        '✅ 중복 계정을 생성하지 않았습니다\n' +
        '✅ 부정행위 시 책임을 인정합니다\n\n' +
        '위 사항에 동의하고 투표하시겠습니까?'
    )

    if (!confirmed) {
      return
    }

    try {
      setVoting(true)
      setVoteStatus('registering')
      setStatusMessage('투표자 등록 중...')

      const result = await submitVote({
        pollId,
        selectedOption,
        pollData,
        address,
        relayerEnabled,
        generateProofInWorker,
        onStatusChange: (status, message) => {
          setVoteStatus(status as StatusType)
          setStatusMessage(message)
        },
        onProgress: (message) => {
          setStatusMessage(message)
        },
      })

      if (!result.success) {
        throw new Error(result.error || '투표 제출 실패')
      }

      // 성공 처리
      setIsReVote(result.isReVote || false)
      setTxHash(result.txHash || null)

      if (result.publicSignals && Array.isArray(result.publicSignals)) {
        setPublicSignals(result.publicSignals as string[])
      }

      setVoteStatus('confirmed')

      // 사용자 친화적인 메시지
      const candidateLabel =
        pollData?.candidates.find((c) => c.id === selectedOption)?.label ||
        '선택한 후보'

      if (result.isReVote) {
        setStatusMessage(
          `🔄 재투표 완료! "${candidateLabel}"로 변경되었습니다. 마지막 투표만 유효합니다. 트랜잭션: ${result.txHash?.substring(
            0,
            10
          )}...`
        )
        notify('재투표가 완료되었습니다. 마지막 투표만 유효합니다.', 'info')
      } else {
        setStatusMessage(
          `✅ "${candidateLabel}" 투표 완료! 트랜잭션: ${result.txHash?.substring(
            0,
            10
          )}...`
        )
      }

      // 로컬 스토리지 저장
      if (
        result.publicSignals &&
        Array.isArray(result.publicSignals) &&
        result.publicSignals.length >= 3
      ) {
        const nullifierHash = result.publicSignals[2] as string
        try {
          localStorage.setItem(`vote_${pollId}_nullifier`, nullifierHash)
          localStorage.setItem(`vote_${pollId}_txHash`, result.txHash || '')
          localStorage.setItem(`vote_${pollId}_candidate`, selectedOption || '')
          localStorage.setItem(
            `vote_${pollId}_timestamp`,
            new Date().toISOString()
          )
          // 재투표 여부 저장 (새로고침 후에도 유지)
          localStorage.setItem(`vote_${pollId}_isReVote`, String(result.isReVote === true))

          // 재투표 시 영수증 갱신 (새로운 txHash로 업데이트)
          if (result.isReVote && address) {
            // 재투표 시 새로운 txHash가 이미 result.txHash에 있으므로 즉시 업데이트
            if (result.txHash) {
              setTxHash(result.txHash)
              console.log(`[PollDetail] 재투표 완료 - 새로운 txHash: ${result.txHash.substring(0, 10)}...`)
            }
            
            // 서버에서 최신 정보 확인 (선택적, 백그라운드)
            setTimeout(async () => {
              try {
                const { getApiUrl } = await import('@/lib/api-utils')
                const myVoteUrl = getApiUrl(
                  `/api/vote/${pollId}/my-vote?address=${encodeURIComponent(
                    address
                  )}`
                )
                const myVoteRes = await fetch(myVoteUrl)
                if (myVoteRes.ok) {
                  const myVoteData = await myVoteRes.json()
                  if (
                    myVoteData.success &&
                    myVoteData.hasVoted &&
                    myVoteData.vote
                  ) {
                    // 재투표 시 새로운 txHash와 isReVote로 업데이트 (서버에서 확인한 최신 값)
                    if (myVoteData.vote.txHash && myVoteData.vote.txHash !== result.txHash) {
                      console.log(`[PollDetail] 서버에서 최신 txHash 확인: ${myVoteData.vote.txHash.substring(0, 10)}...`)
                      setTxHash(myVoteData.vote.txHash)
                    }
                    // 재투표 여부도 서버에서 확인한 값으로 업데이트
                    if (myVoteData.isReVote !== undefined) {
                      setIsReVote(myVoteData.isReVote)
                      console.log(`[PollDetail] 서버에서 재투표 여부 확인: isReVote=${myVoteData.isReVote}`)
                    }
                    if (myVoteData.vote.nullifierHash) {
                      setPublicSignals([
                        myVoteData.vote.merkleRoot || '0x' + '0'.repeat(64),
                        pollId,
                        myVoteData.vote.nullifierHash,
                        myVoteData.vote.voteCommitment || '0x' + '0'.repeat(64),
                      ])
                    }
                  }
                }
              } catch (err) {
                console.warn('[Vote] 영수증 갱신 실패:', err)
              }
            }, 2000)
          }
        } catch (storageError) {
          console.warn('[Vote] 로컬 스토리지 저장 실패:', storageError)
        }
      }
    } catch (err: unknown) {
      const error = err as { message?: string; name?: string }
      const { error: logError } = await import('@/lib/logger')
      logError('[Vote] Error:', error)

      let userMessage = '알 수 없는 오류가 발생했습니다.'

      if (
        error.message?.includes('시간이 초과') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Timeout') ||
        error.name === 'AbortError'
      ) {
        userMessage =
          '요청 시간이 초과되었습니다. 트랜잭션이 전송되었을 수 있으니 잠시 후 결과를 확인해주세요.'
      } else if (
        error.message?.includes('네트워크') ||
        error.message?.includes('network') ||
        error.message?.includes('fetch')
      ) {
        userMessage =
          '네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.'
      } else if (error.message) {
        userMessage = error.message
      }

      setVoteStatus('error')
      setStatusMessage(userMessage)
      notifyError(userMessage)
    } finally {
      setVoting(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: 40,
        }}
      >
        <LoadingSpinner
          size="large"
          text="투표 정보를 불러오는 중..."
          color="#4facfe"
        />
      </div>
    )
  }

  if (!pollData) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: 40,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '20px' }}>❌</div>
          <h2 style={{ marginBottom: '10px' }}>투표를 찾을 수 없습니다</h2>
          <p style={{ opacity: 0.8, marginBottom: '20px' }}>
            투표 ID: {pollId}
          </p>
          <Link
            href="/vote"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
              borderRadius: '8px',
              color: 'white',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            투표 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  // ---------------------- UI 스타일 ----------------------
  const container: React.CSSProperties = {
    minHeight: '100vh',
    background: 'radial-gradient(circle at 50% -20%, #1a1f35, #09090b 80%)',
    color: '#fff',
    padding: '40px 20px',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px',
  }

  const navButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  }

  const navContainerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '800px',
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  }

  const card: React.CSSProperties = {
    width: '100%',
    maxWidth: '720px',
    padding: '40px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px)',
  }

  // -------------------------------------------------------

  const statusInfo = getStatusInfo()

  return (
    <div style={container}>
      {/* 네비게이션 버튼 */}
      <div style={navContainerStyle}>
        <Link
          href="/"
          style={navButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          🏠 홈으로
        </Link>
        <Link
          href="/vote"
          style={navButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          📋 투표 목록
        </Link>
      </div>

      <div style={card}>
        {/* 마감 시간 경과 시 안내 */}
        {pollData && new Date() > new Date(pollData.endTime) && (
          <div
            style={{
              padding: '16px',
              background: '#fee2e2',
              border: '1px solid #dc2626',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 600,
                color: '#dc2626',
              }}
            >
              ⏰ 이 투표는 마감되었습니다
            </p>
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '0.9rem',
                color: '#991b1b',
              }}
            >
              마감 시간: {new Date(pollData.endTime).toLocaleString('ko-KR')}
            </p>
          </div>
        )}

        {/* 상태 배지 & 참여자 수 & 마감 시간 */}
        <PollHeader
          statusInfo={statusInfo}
          participantCount={participantCount}
          timeLeft={timeLeft}
        />

        {/* 투표 정보 */}
        <PollInfo title={pollData.title} description={pollData.description} />

        {/* 후보 선택 */}
        <CandidateSelector
          candidates={pollData.candidates}
          selectedOption={selectedOption}
          onSelect={setSelectedOption}
          disabled={pollData ? new Date() > new Date(pollData.endTime) : false}
        />

        {/* 지갑 연결 안내 (연결 전에만 표시) */}
        {!isConnected && (
          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
            }}
          >
            <p
              style={{
                margin: '0 0 12px 0',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#1e40af',
              }}
            >
              🔐 투표를 하려면 MetaMask 지갑 연결이 필요합니다
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '0.85rem',
                color: '#1e3a8a',
                lineHeight: '1.5',
              }}
            >
              • MetaMask를 통해 본인의 지갑 주소로 인증합니다
              <br />
              • 지갑 주소는 투표 내용과 연결되지 않습니다 (완전 익명)
              <br />• 가스비는 Relayer가 대납하므로 비용이 들지 않습니다
            </p>
          </div>
        )}

        {/* 지갑 연결 버튼 */}
        <div style={{ marginTop: '20px' }}>
          <ConnectWalletButton />
        </div>

        {/* 상태 배지 */}
        {voteStatus !== 'idle' && (
          <div style={{ marginTop: '20px' }}>
            <StatusBadge status={mapStatusToVoteStatus(voteStatus)} />
          </div>
        )}

        {/* Relayer 토글 */}
        <div style={{ marginTop: '20px' }}>
          <RelayerToggle
            enabled={relayerEnabled}
            onToggle={setRelayerEnabled}
            disabled={voting}
          />
        </div>

        {/* 투표 버튼 - 바로 여기서 투표 */}
        <button
          onClick={handleVoteClick}
          disabled={
            !selectedOption ||
            !isConnected ||
            voting ||
            (pollData ? new Date() > new Date(pollData.endTime) : false)
          }
          style={{
            width: '100%',
            padding: 16,
            marginTop: 26,
            borderRadius: 12,
            border: 'none',
            background:
              !selectedOption ||
              !isConnected ||
              voting ||
              (pollData ? new Date() > new Date(pollData.endTime) : false)
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(135deg, #4facfe, #00f2fe)',
            color: '#fff',
            cursor:
              !selectedOption ||
              !isConnected ||
              voting ||
              (pollData ? new Date() > new Date(pollData.endTime) : false)
                ? 'not-allowed'
                : 'pointer',
            fontWeight: 600,
            fontSize: '1.1rem',
            opacity:
              !selectedOption ||
              !isConnected ||
              voting ||
              (pollData ? new Date() > new Date(pollData.endTime) : false)
                ? 0.5
                : 1,
          }}
        >
          {voting
            ? statusMessage || '처리 중...'
            : selectedOption
            ? txHash
              ? '🔄 재투표하기 (ZKP 생성)'
              : '✅ 투표하기 (ZKP 생성)'
            : '🔒 지갑 연결 후 투표하기'}
        </button>

        {/* 투표 완료 메시지 */}
        {txHash && (
          <div
            style={{
              marginTop: '24px',
              padding: '24px',
              background: isReVote
                ? 'rgba(59, 130, 246, 0.1)'
                : 'rgba(34, 197, 94, 0.1)',
              border: `2px solid ${
                isReVote ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'
              }`,
              borderRadius: '12px',
            }}
          >
            {/* 디버깅: 재투표 여부 확인 */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                [DEBUG] isReVote: {String(isReVote)}, isReVoteFromHook: {String(isReVoteFromHook)}, txHash: {txHash?.substring(0, 10)}...
              </div>
            )}
            {/* 영수증 토글 버튼 (왼쪽 상단) */}
            <div style={{ marginBottom: '16px', textAlign: 'left' }}>
              <button
                onClick={() => setShowReceipt(!showReceipt)}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {showReceipt ? '📄 영수증 숨기기' : '📄 영수증 보기'}
              </button>
            </div>

            {/* 영수증 내용 (토글) */}
            {showReceipt && txHash && (
              <VoteReceipt
                txHash={txHash}
                publicSignals={publicSignals}
                isReVote={isReVote}
              />
            )}
          </div>
        )}
      </div>

      {/* 투표 결과 표시 (마감된 경우 또는 결과 보기 버튼 클릭 시) */}
      {pollData && (new Date() > new Date(pollData.endTime) || showResults) && (
        <VoteResults
          voteResults={voteResults}
          participantCount={participantCount}
          isPollEnded={new Date() > new Date(pollData.endTime)}
          onClose={() => setShowResults(false)}
        />
      )}

      {/* 하단 액션 버튼들 */}
      <VoteActionButtons
        pollId={pollId}
        pollData={pollData}
        showResults={showResults}
        copySuccess={copySuccess}
        onToggleResults={() => setShowResults(!showResults)}
        onCopyLink={handleCopyLink}
      />
    </div>
  )
}
