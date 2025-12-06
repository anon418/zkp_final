/**
 * 컨트랙트 설정 및 ABI
 * 
 * 통합 프로젝트에서 컨트랙트 ABI를 로드합니다.
 */

import path from 'path';
import fs from 'fs';

// 프로젝트 루트는 zkp_final
const projectRoot = process.cwd();

// ABI 파일 경로
const artifactsPath = path.join(projectRoot, 'artifacts', 'contracts');
const verifierAbiPath = path.join(artifactsPath, 'Groth16Verifier.sol', 'Groth16Verifier.json');

/**
 * ABI 파일 로드 함수
 * @param filePath ABI JSON 파일 경로
 * @returns ABI 객체 또는 null (파일이 없거나 파싱 실패 시)
 */
function loadABI(filePath: string): { abi: unknown[] } | null {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      
      if (Array.isArray(parsed)) {
        return { abi: parsed };
      }
      if (parsed.abi && Array.isArray(parsed.abi)) {
        return parsed;
      }
      return parsed;
    }
  } catch (error) {
    console.warn(`[Contracts] Failed to load ABI from ${filePath}:`, error);
  }
  return null;
}

// ABI 로드
export const VerifierABI = loadABI(verifierAbiPath);

// 환경 변수에서 컨트랙트 주소 가져오기
// Note: Voting V1은 더 이상 사용되지 않음. VotingV2를 사용하세요 (@/lib/contractsV2)
export const VERIFIER_CONTRACT_ADDRESS = 
  process.env.VERIFIER_CONTRACT_ADDRESS || 
  process.env.VERIFIER_ADDRESS;
export const CHAIN_ID = parseInt(process.env.CHAIN_ID || '11155111', 10);

// 컨트랙트 주소 검증
export function validateContractAddresses(): {
  verifier: boolean;
} {
  return {
    verifier: !!VERIFIER_CONTRACT_ADDRESS && VERIFIER_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000',
  };
}

// ABI 가져오기
// Note: getVotingABI()는 제거되었습니다. VotingV2를 사용하세요 (@/lib/contractsV2)

export function getVerifierABI() {
  if (!VerifierABI || !VerifierABI.abi) {
    throw new Error('Verifier ABI not loaded. Run: npm run build:blockchain');
  }
  return VerifierABI.abi;
}