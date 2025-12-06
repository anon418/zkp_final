/**
 * VotingV2 컨트랙트 연동 (다중 투표 지원)
 *
 * 주요 기능:
 * - createElection() - 새 투표 생성 (온체인)
 * - vote() - 투표 제출
 * - getElection() - 투표 정보 조회
 * - getCandidates() - 후보 목록 조회
 * - hasVoted() - 투표 여부 확인
 */

import { ethers } from 'ethers'
import VotingV2ABI from './abis/VotingV2.json'

// VotingV2 주소 (환경 변수 또는 기본값)
// 서버 사이드: VOTING_V2_ADDRESS, VOTING_V2_CONTRACT_ADDRESS
// 클라이언트 사이드: NEXT_PUBLIC_VOTING_V2_ADDRESS
export const VOTING_V2_ADDRESS =
  process.env.VOTING_V2_ADDRESS ||
  process.env.VOTING_V2_CONTRACT_ADDRESS ||
  process.env.NEXT_PUBLIC_VOTING_V2_ADDRESS ||
  '0xE4B4219eb5a12825859104601Fd8d94fFEF1e3d9' // VotingV2 최신 주소

export const VERIFIER_ADDRESS =
  process.env.VERIFIER_ADDRESS ||
  process.env.VERIFIER_CONTRACT_ADDRESS ||
  process.env.NEXT_PUBLIC_VERIFIER_ADDRESS ||
  '0x6A49b069Eaf2A53ab31723d93bd758310bFeb345' // Verifier 최신 주소

export const CHAIN_ID = 11155111 // Sepolia
export const SEPOLIA_CHAIN_ID = 11155111 // Sepolia (별칭)

// VotingV2 ABI (정적 import로 로드 - 클라이언트/서버 모두에서 작동)
// ABI 파일은 배열 형식으로 저장됨
export const VOTING_V2_ABI = VotingV2ABI as ethers.InterfaceAbi

/**
 * RPC Provider 가져오기
 */
export function getRpcProvider(): ethers.JsonRpcProvider {
  const rpcUrl =
    process.env.INFURA_URL ||
    process.env.ALCHEMY_URL ||
    'https://sepolia.infura.io/v3/'

  return new ethers.JsonRpcProvider(rpcUrl)
}

/**
 * VotingV2 컨트랙트 인스턴스 (읽기 전용)
 */
export function getVotingV2Contract(): ethers.Contract {
  const provider = getRpcProvider()
  return new ethers.Contract(VOTING_V2_ADDRESS, VOTING_V2_ABI, provider)
}

/**
 * VotingV2 컨트랙트 인스턴스 (쓰기 가능 - Signer 필요)
 */
export async function getVotingV2ContractWithSigner(
  signer: ethers.Signer
): Promise<ethers.Contract> {
  return new ethers.Contract(VOTING_V2_ADDRESS, VOTING_V2_ABI, signer)
}

/**
 * 새 투표 생성 (온체인)
 *
 * @param pollId 투표 ID (숫자)
 * @param merkleRoot 유권자 Merkle Root
 * @param startTime 시작 시간 (Unix timestamp)
 * @param endTime 종료 시간 (Unix timestamp)
 * @param candidates 후보 목록
 * @param signer Wallet Signer
 * @returns 트랜잭션 해시
 */
export async function createElectionOnChain(
  pollId: number,
  merkleRoot: string,
  startTime: number,
  endTime: number,
  candidates: string[],
  signer: ethers.Signer
): Promise<string> {
  const contract = await getVotingV2ContractWithSigner(signer)

  const tx = await contract.createElection(
    pollId,
    merkleRoot,
    startTime,
    endTime,
    candidates
  )

  const receipt = await tx.wait()
  return receipt.hash
}

/**
 * 투표 제출 (VotingV2)
 *
 * @param pollId 투표 ID
 * @param proposalId 후보 ID
 * @param proof ZKP Proof
 * @param publicSignals Public Signals
 * @param signer Wallet Signer
 * @returns 트랜잭션 해시
 */
export async function submitVoteV2(
  pollId: number,
  proposalId: number,
  proof: {
    a: [string, string]
    b: [[string, string], [string, string]]
    c: [string, string]
  },
  publicSignals: string[],
  signer: ethers.Signer
): Promise<string> {
  const contract = await getVotingV2ContractWithSigner(signer)

  const tx = await contract.vote(
    pollId,
    proposalId,
    proof.a,
    proof.b,
    proof.c,
    publicSignals
  )

  const receipt = await tx.wait(2) // conf=2
  return receipt.hash
}

/**
 * 투표 정보 조회
 */
export async function getElectionInfo(pollId: number) {
  const contract = getVotingV2Contract()

  const [merkleRoot, startTime, endTime, creator, candidatesCount, totalVotes] =
    await contract.getElection(pollId)

  return {
    merkleRoot,
    startTime: Number(startTime),
    endTime: Number(endTime),
    creator,
    candidatesCount: Number(candidatesCount),
    totalVotes: Number(totalVotes),
  }
}

/**
 * 후보 목록 조회
 */
export async function getCandidates(pollId: number): Promise<string[]> {
  const contract = getVotingV2Contract()
  return await contract.getCandidates(pollId)
}

/**
 * 투표 여부 확인
 */
export async function hasVoted(
  pollId: number,
  nullifier: string
): Promise<boolean> {
  const contract = getVotingV2Contract()
  return await contract.hasVoted(pollId, nullifier)
}

/**
 * 투표 존재 여부 확인
 */
export async function electionExists(pollId: number): Promise<boolean> {
  const contract = getVotingV2Contract()
  return await contract.electionExists(pollId)
}

/**
 * 네트워크 체크 및 전환 유틸리티 (클라이언트 사이드)
 * 
 * 주의: 이 함수들은 브라우저 환경에서만 작동합니다.
 * 
 * 참고: Window.ethereum 타입은 src/global.d.ts에 정의되어 있습니다.
 */

/**
 * 현재 네트워크가 Sepolia인지 확인
 */
export async function isSepoliaNetwork(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return false
  }

  try {
    const chainIdHex = (await window.ethereum.request({
      method: 'eth_chainId',
    })) as string
    const chainId = parseInt(chainIdHex, 16)
    return chainId === SEPOLIA_CHAIN_ID
  } catch {
    return false
  }
}

/**
 * Sepolia 네트워크로 전환
 */
export async function switchToSepolia(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return false
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
    })
    return true
  } catch (switchError: unknown) {
    // 사용자가 거부하거나 체인이 없는 경우
    const err = switchError as { code?: number }
    
    // 4902: 체인이 MetaMask에 추가되지 않음
    if (err.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
              chainName: 'Sepolia',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        })
        return true
      } catch {
        return false
      }
    }
    
    return false
  }
}
