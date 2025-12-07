'use client'

import React, { useState } from 'react'
import { VERIFIER_ADDRESS } from '@/lib/contractsV2'

interface VoteReceiptProps {
  txHash: string
  publicSignals: string[] | null
  isReVote: boolean
}

export default function VoteReceipt({
  txHash,
  publicSignals,
  isReVote,
}: VoteReceiptProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showPublicSignals, setShowPublicSignals] = useState(false)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
      <div style={{ fontSize: '2rem' }}>{isReVote ? '🔄' : '✅'}</div>
      <div style={{ flex: 1 }}>
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: isReVote ? '#3b82f6' : '#22c55e',
            marginBottom: '12px',
          }}
        >
          {isReVote
            ? '재투표 완료! 마지막 투표만 유효합니다'
            : '투표 완료! 영지식 증명(ZKP)으로 검증되었습니다'}
        </h3>
        
        {/* ZKP 설명 */}
        <div
          style={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.9)',
            marginBottom: '16px',
            padding: '14px',
            background: isReVote 
              ? 'rgba(59, 130, 246, 0.1)' 
              : 'rgba(34, 197, 94, 0.1)',
            border: `1px solid ${isReVote 
              ? 'rgba(59, 130, 246, 0.3)' 
              : 'rgba(34, 197, 94, 0.3)'}`,
            borderRadius: '8px',
          }}
        >
          {isReVote ? (
            <>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 600 }}>
                🔄 <strong>재투표도 ZKP로 검증되었습니다</strong>
              </p>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', lineHeight: '1.6' }}>
                재투표도 동일한 <strong>영지식 증명(ZKP)</strong>으로 검증되었습니다.
                <br />당신이 선택한 후보는 여전히 비공개이며, <strong>마지막 투표만 최종 집계</strong>됩니다.
              </p>
              <div style={{ 
                padding: '10px', 
                background: 'rgba(59, 130, 246, 0.15)', 
                borderRadius: '6px',
                fontSize: '0.8rem',
                lineHeight: '1.6',
              }}>
                <strong style={{ color: '#3b82f6' }}>✅ 재투표 영수증이 증명하는 것:</strong>
                <br />• 동일한 Nullifier로 재투표했지만 중복 투표가 아닙니다
                <br />• 이전 투표는 무효화되고 <strong>마지막 투표만 유효</strong>합니다
                <br />• 재투표도 올바른 형식으로 검증되었습니다
                <br />
                <br />
                <strong style={{ color: '#fbbf24' }}>🔒 여전히 보호되는 것:</strong>
                <br />• 당신이 선택한 후보는 <strong>절대 공개되지 않습니다</strong>
                <br />• 이전 투표와 재투표 모두 익명으로 보호됩니다
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 600 }}>
                🎯 <strong>영지식 증명(ZKP)이란?</strong>
              </p>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', lineHeight: '1.6' }}>
                <strong>당신이 누구를 선택했는지는 비공개</strong>이지만,{' '}
                <strong>유효한 1인 1표 투표를 했다는 사실은 수학적으로 증명</strong>되었습니다.
              </p>
              <div style={{ 
                padding: '10px', 
                background: 'rgba(34, 197, 94, 0.15)', 
                borderRadius: '6px',
                fontSize: '0.8rem',
                lineHeight: '1.6',
              }}>
                <strong style={{ color: '#22c55e' }}>✅ 이 영수증이 증명하는 것:</strong>
                <br />• 당신은 유효한 유권자입니다
                <br />• 중복 투표를 하지 않았습니다 (Nullifier로 확인)
                <br />• 투표는 올바른 형식입니다
                <br />
                <br />
                <strong style={{ color: '#fbbf24' }}>🔒 보호되는 것:</strong>
                <br />• 당신이 선택한 후보는 <strong>절대 공개되지 않습니다</strong>
                <br />• 서버도, 블록체인도, 누구도 알 수 없습니다
              </div>
            </>
          )}
        </div>

        {/* 간소화된 안내 */}
        <div
          style={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.9)',
            marginBottom: '16px',
            padding: '12px',
            background: isReVote 
              ? 'rgba(59, 130, 246, 0.15)' 
              : 'rgba(59, 130, 246, 0.15)',
            border: `1px solid ${isReVote 
              ? 'rgba(59, 130, 246, 0.4)' 
              : 'rgba(59, 130, 246, 0.4)'}`,
            borderRadius: '8px',
          }}
        >
          {isReVote ? (
            <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
              ✅ <strong>마지막 투표만 집계됩니다</strong> • 이전 투표는 자동으로 무효화되었습니다
            </p>
          ) : (
            <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>
              ✅ <strong>블록체인에서 검증 완료</strong> • Verifier 컨트랙트가 당신의 증명을 확인했습니다
            </p>
          )}
          <p style={{ margin: '0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            💡 <strong>직접 확인하기:</strong> Etherscan에서 Topics 섹션의 <code>pollId</code>와 <code>nullifier</code> 확인 (Data 섹션은 디코딩 오류 가능)
          </p>
        </div>

        {/* Public Signals 표시 (접기/펼치기) */}
        {publicSignals && publicSignals.length >= 4 && (
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <button
              onClick={() => setShowPublicSignals(!showPublicSignals)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'transparent',
                border: 'none',
                color: '#60a5fa',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <span>🔐 ZKP Public Signals {showPublicSignals ? '▼' : '▶'}</span>
            </button>
            {showPublicSignals && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '12px',
                  fontSize: '0.75rem',
                }}
              >
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                    Poll ID: <span style={{ fontFamily: 'monospace', color: '#a5b4fc' }}>{publicSignals[1]}</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                    Nullifier: <span style={{ fontFamily: 'monospace', color: '#a5b4fc', wordBreak: 'break-all' }}>{publicSignals[2]}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.6' }}>
                    🔒 <strong>익명성 보장:</strong> 이 값들은 투표 내용을 암호화한 것이며, 원본 투표(어떤 후보를 선택했는지)는 복원할 수 없습니다.
                    <br />💡 <strong>Nullifier:</strong> 중복 투표 방지용 고유 식별자입니다. 같은 Nullifier로는 한 번만 투표할 수 있습니다.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Etherscan 링크 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}#eventlog`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.75rem',
              padding: '8px 16px',
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              borderRadius: '20px',
              textDecoration: 'none',
              fontWeight: 600,
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            🔍 Etherscan에서 확인
          </a>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.75rem',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              borderRadius: '20px',
              textDecoration: 'none',
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.2)',
              fontFamily: 'monospace',
            }}
          >
            {txHash.substring(0, 10)}...
          </a>
        </div>

        {/* 상세 가이드 (접기/펼치기) */}
        <div
          style={{
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'transparent',
              border: 'none',
              color: '#fbbf24',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            <span>📋 Etherscan 확인 가이드 {showDetails ? '▼' : '▶'}</span>
          </button>
          {showDetails && (
            <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#60a5fa' }}>1단계:</strong> Etherscan 페이지에서 <strong>"Logs" 탭</strong> 클릭
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#60a5fa' }}>2단계:</strong> <code>VoteCast</code> 이벤트 찾기
              </div>
              <div style={{ marginBottom: '8px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px' }}>
                <strong style={{ color: '#22c55e' }}>✅ 확인 사항:</strong>
                <br />• <strong>Topics 섹션</strong>에서 <code>pollId</code>와 <code>nullifier</code> 확인 (가장 정확)
                <br />• <strong>Data 섹션</strong>에서 <code>isUpdate</code> 확인 (첫 투표: <code>false</code>, 재투표: <code>true</code>)
                <br />• Data 섹션의 <code>pollId</code>와 <code>nullifier</code>는 디코딩 오류 가능
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                📖 자세한 내용은 <code>docs/ETHERSCAN_GUIDE.md</code> 참고
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

