'use client'

import React from 'react'
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
  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}
    >
      <div style={{ fontSize: '2rem' }}>
        {isReVote ? '🔄' : '✅'}
      </div>
      <div style={{ flex: 1 }}>
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: isReVote ? '#3b82f6' : '#22c55e',
            marginBottom: '8px',
          }}
        >
          {isReVote
            ? '재투표 완료! 마지막 투표만 유효합니다'
            : '투표 완료! ZKP 증명이 수학적으로 검증되었습니다'}
        </h3>
        {isReVote && (
          <div
            style={{
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.9)',
              marginBottom: '12px',
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '8px',
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>
              🔄 <strong>재투표 완료!</strong>
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem' }}>
              ✅ <strong>마지막 투표만 집계됩니다</strong>
              <br />
              • 이전 투표는 자동으로 무효화되었습니다
              <br />
              • 투표 결과에서 이번 선택만 반영됩니다
              <br />
              • 총 투표 수는 증가하지 않습니다 (재투표이므로)
            </p>
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.7)',
                paddingTop: '8px',
                borderTop: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              💡 <strong>확인 방법:</strong> Etherscan의 <code>VoteCast</code> 이벤트에서{' '}
              <code>isUpdate: True</code>를 확인하세요. 같은 <code>nullifier</code>로 여러 번
              투표해도 마지막 것만 유효합니다.
            </p>
          </div>
        )}
        <p
          style={{
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.9)',
            marginBottom: '16px',
          }}
        >
          <strong>Verifier 컨트랙트</strong>가 당신의 Groth16 ZKP 증명을
          검증했습니다.
        </p>

        {/* Public Signals 표시 */}
        {publicSignals && publicSignals.length >= 4 && (
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#60a5fa',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              🔐 ZKP Public Signals (검증 가능한 정보)
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: '4px',
                  }}
                >
                  Merkle Root (유권자 목록 증명):
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#a5b4fc',
                    wordBreak: 'break-all',
                  }}
                >
                  {publicSignals[0]}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: '4px',
                  }}
                >
                  Poll ID:
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#a5b4fc',
                  }}
                >
                  {publicSignals[1]}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: '4px',
                  }}
                >
                  Nullifier (중복 방지 증명):
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#a5b4fc',
                    wordBreak: 'break-all',
                  }}
                >
                  {publicSignals[2]}
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: '4px',
                  }}
                >
                  ⚠️ 이 값으로 중복 투표가 방지되지만, 투표 내용은 알 수
                  없습니다
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: '4px',
                  }}
                >
                  Vote Commitment (투표 암호화):
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#a5b4fc',
                    wordBreak: 'break-all',
                  }}
                >
                  {publicSignals[3]}
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: '4px',
                  }}
                >
                  🔒 이 값은 투표 내용을 암호화한 것이며, 원본 투표는
                  복원할 수 없습니다
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 트랜잭션 해시 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '6px',
            }}
          >
            트랜잭션 해시:
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#00f2fe',
              textDecoration: 'underline',
              wordBreak: 'break-all',
              fontSize: '0.85rem',
              fontFamily: 'monospace',
            }}
          >
            {txHash}
          </a>
        </div>

        {/* Etherscan 링크 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
            🔍 Etherscan에서 ZKP 검증 확인
          </a>
          <a
            href={`https://sepolia.etherscan.io/address/${VERIFIER_ADDRESS}#code`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.75rem',
              padding: '8px 16px',
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
              borderRadius: '20px',
              textDecoration: 'none',
              fontWeight: 600,
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            📜 Verifier 컨트랙트 보기
          </a>
        </div>

        {/* ZKP 검증 가이드 */}
        <ZKPVerificationGuide />
      </div>
    </div>
  )
}

function ZKPVerificationGuide() {
  return (
    <div
      style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(255, 193, 7, 0.1)',
        border: '1px solid rgba(255, 193, 7, 0.3)',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.8)',
        lineHeight: '1.6',
      }}
    >
      <strong style={{ color: '#fbbf24' }}>
        ✅ ZKP 검증 성공 확인 체크리스트:
      </strong>
      <div
        style={{
          marginTop: '12px',
          padding: '12px',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        }}
      >
        <div
          style={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: '1.8',
            marginBottom: '8px',
          }}
        >
          <strong style={{ color: '#22c55e' }}>
            📋 Etherscan에서 확인하는 방법:
          </strong>
        </div>
        <div
          style={{
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.9)',
            marginBottom: '12px',
            padding: '12px',
            background: 'rgba(59, 130, 246, 0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#60a5fa' }}>1단계:</strong>{' '}
            Etherscan 페이지에서 <strong>"Logs" 탭</strong>을 클릭하세요
          </div>
          <div>
            <strong style={{ color: '#60a5fa' }}>2단계:</strong>{' '}
            <code>VoteCast</code> 이벤트를 찾으세요 (디코딩되어 보입니다)
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.8rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <span style={{ color: '#22c55e', fontSize: '1.2rem' }}>✓</span>
            <div>
              <strong style={{ color: '#60a5fa' }}>
                1. VoteCast 이벤트 (필수 확인) ✅
              </strong>
              <br />
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                → <strong>Logs 탭</strong>에서 <code>VoteCast</code> 이벤트가{' '}
                <strong style={{ color: '#22c55e' }}>
                  디코딩되어 보이면 성공
                </strong>
                입니다!
                <br />→ Decoded 데이터에서 <code>pollId</code>,{' '}
                <code>nullifier</code>, <code>isUpdate</code>를 확인할 수
                있습니다
                <br />→ <code>isUpdate: False</code> = 첫 투표,{' '}
                <code>isUpdate: True</code> = 재투표
                <br />
                <br />
                <strong style={{ color: '#fbbf24' }}>💡 재투표 시나리오:</strong>
                <br />• 마감 시간 전까지 재투표 가능
                <br />• 같은 계정으로 다른 후보 선택 시{' '}
                <code>isUpdate: True</code>로 표시
                <br />• <strong>마지막 투표만 유효</strong>하며, 이전 투표는
                덮어씌워집니다
                <br />• 총 투표 수는 증가하지 않습니다 (재투표이므로)
              </span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <span style={{ color: '#22c55e', fontSize: '1.2rem' }}>✓</span>
            <div>
              <strong style={{ color: '#60a5fa' }}>
                2. ProofVerified 이벤트 (선택 확인)
              </strong>
              <br />
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                → <strong>Logs 탭</strong>에서 디코딩되지 않은 이벤트가 있을 수
                있습니다
                <br />→ 이것이 <code>ProofVerified</code> 이벤트일 수 있습니다
                (디코딩되지 않아도 정상)
                <br />→ <code>VoteCast</code> 이벤트가 있으면 ZKP 검증이 성공한
                것입니다
              </span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <span style={{ color: '#22c55e', fontSize: '1.2rem' }}>✓</span>
            <div>
              <strong style={{ color: '#60a5fa' }}>
                3. 트랜잭션 Status: Success (Overview 탭)
              </strong>
              <br />
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                → <strong>Overview 탭</strong>에서 Status가{' '}
                <strong style={{ color: '#22c55e' }}>Success</strong> (녹색 체크)인지
                확인
                <br />→ 이는 트랜잭션이 블록체인에 성공적으로 기록되었음을
                의미합니다
              </span>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: '12px',
          padding: '12px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <div
          style={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: '1.8',
          }}
        >
          <strong style={{ color: '#60a5fa' }}>🔍 추가 확인 사항:</strong>
          <ul
            style={{
              marginTop: '8px',
              paddingLeft: '20px',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <li>
              <strong>Public Signals</strong> (위에 표시된 값들)가 Event Logs의
              값과 일치하는지 확인
            </li>
            <li>
              <strong>Nullifier</strong>가 위에 표시된 값과 일치하는지 확인
              (중복 방지)
            </li>
            <li>
              <strong>VoteCast 이벤트의 isUpdate</strong> 필드 확인: 재투표인
              경우 <code>True</code>, 첫 투표인 경우 <code>False</code>
            </li>
          </ul>
        </div>
      </div>
      <div
        style={{
          marginTop: '12px',
          padding: '12px',
          background: 'rgba(255, 193, 7, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 193, 7, 0.3)',
        }}
      >
        <div
          style={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: '1.8',
          }}
        >
          <strong style={{ color: '#fbbf24' }}>⚠️ 영지식 증명의 핵심:</strong>
          <ul
            style={{
              marginTop: '8px',
              paddingLeft: '20px',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <li>
              투표 내용(선택한 후보)은 <strong>공개되지 않습니다</strong>
            </li>
            <li>
              하지만 <strong>유효한 투표임을 수학적으로 증명</strong> 했습니다
            </li>
            <li>
              Nullifier로 중복 투표 방지 가능하지만, 투표 내용은 알 수 없습니다
            </li>
            <li>
              Vote Commitment는 암호화된 값이며 원본 복원 불가능합니다
            </li>
          </ul>
        </div>
      </div>
      <div
        style={{
          marginTop: '12px',
          padding: '10px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: '#4ade80',
        }}
      >
        ✅ <strong>재투표 정책:</strong> 마감 시간 전까지 재투표 가능하며,{' '}
        <strong>마지막 투표만 최종 집계에 반영</strong> 됩니다.
      </div>
    </div>
  )
}

