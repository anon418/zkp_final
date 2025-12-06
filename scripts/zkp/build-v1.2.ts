/**
 * ZKP v1.2 회로 전체 빌드 스크립트
 *
 * 목적: Circom 회로를 컴파일하고, Trusted Setup을 수행하며,
 *       Solidity Verifier 컨트랙트를 생성하는 전체 파이프라인
 *
 * 실행: npm run build:v1.2
 *
 * 생성 파일:
 *   - build/v1.2/vote.r1cs (회로 제약 조건)
 *   - build/v1.2/vote_js/vote.wasm (WASM 바이너리)
 *   - build/v1.2/vote_final.zkey (최종 zkey)
 *   - build/v1.2/verification_key.json (검증 키)
 *   - contracts/VerifierV1_2.sol (Solidity Verifier)
 */

import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import crypto from 'crypto'

/**
 * 파일의 SHA256 해시 계산
 * 용도: 빌드 산출물의 무결성 검증 및 버전 락에 기록
 */
const sha256 = (filePath: string): string => {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex')
    .toUpperCase()
}

const BUILD_DIR = 'build/v1.2'
const CIRCUIT = 'contracts/zkp/v1.2/vote.circom' // ✅ 수정: circuits/ → contracts/zkp/
const R1CS = `${BUILD_DIR}/vote.r1cs`
const WASM_DIR = `${BUILD_DIR}/vote_js`
const WASM = `${WASM_DIR}/vote.wasm`
const ZKEY_0000 = `${BUILD_DIR}/vote_0000.zkey`
const ZKEY_FINAL = `${BUILD_DIR}/vote_final.zkey`
const VKEY = `${BUILD_DIR}/verification_key.json`
const VERIFIER_SOL = `contracts/solidity/Groth16Verifier.sol` // ✅ 수정: 실제 파일명

console.log('[build-v1.2] Starting v1.2 circuit build...\n')

// 1. Build directory
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true })
}

/**
 * [1/6] 회로 컴파일
 * - Circom 회로를 R1CS(제약 조건)와 WASM으로 컴파일
 * - R1CS: 회로의 수학적 제약 조건 표현
 * - WASM: 브라우저/서버에서 증명 생성에 사용
 */
console.log('[1/6] Compiling circuit...')
try {
  // 시스템 PATH의 circom 사용 (Windows에서는 circom.exe, Linux/Mac에서는 circom)
  const circomCmd = 'circom'
  execSync(
    `${circomCmd} ${CIRCUIT} --r1cs --wasm -o ${BUILD_DIR} -l node_modules`,
    {
      stdio: 'inherit',
      cwd: process.cwd(),
    }
  )
  console.log('✅ Circuit compiled\n')
} catch (err) {
  console.error('❌ Circuit compilation failed:', err)
  process.exit(1)
}

/**
 * [2/6] Trusted Setup (Phase 1)
 * - pot14_final.ptau: 신뢰할 수 있는 파라미터 파일 (14단계)
 * - zkey_0000: 초기 zkey 생성 (아직 contribution 없음)
 * - 중요: 이 단계는 신뢰할 수 있는 파라미터를 사용해야 함
 */
console.log('[2/6] Running trusted setup (phase 1)...')
try {
  execSync(`npx snarkjs groth16 setup ${R1CS} pot14_final.ptau ${ZKEY_0000}`, {
    stdio: 'inherit',
  })
  console.log('✅ Setup complete\n')
} catch (err) {
  console.error('❌ Setup failed:', err)
  process.exit(1)
}

/**
 * [3/6] zkey Contribution
 * - zkey_0000에 랜덤성(entropy) 추가
 * - 이 과정으로 zkey의 보안성이 강화됨
 * - 최종 zkey는 증명 생성에 사용됨
 */
console.log('[3/6] Contributing to zkey...')
try {
  execSync(
    `npx snarkjs zkey contribute ${ZKEY_0000} ${ZKEY_FINAL} --name=zkpa --entropy=codex --verbose`,
    { stdio: 'inherit' }
  )
  console.log('✅ Contribution complete\n')
} catch (err) {
  console.error('❌ Contribution failed:', err)
  process.exit(1)
}

/**
 * [4/6] Verification Key 추출
 * - zkey에서 검증에 필요한 공개 키만 추출
 * - 이 키는 증명 검증에만 사용 (증명 생성에는 불필요)
 */
console.log('[4/6] Exporting verification key...')
try {
  execSync(`npx snarkjs zkey export verificationkey ${ZKEY_FINAL} ${VKEY}`, {
    stdio: 'inherit',
  })
  console.log('✅ Verification key exported\n')
} catch (err) {
  console.error('❌ Export failed:', err)
  process.exit(1)
}

/**
 * [5/6] Solidity Verifier 컨트랙트 생성
 * - 블록체인에서 증명을 검증할 수 있는 Solidity 코드 생성
 * - 이 컨트랙트는 castVote() 함수에서 호출됨
 */
console.log('[5/6] Exporting Solidity verifier...')
try {
  execSync(
    `npx snarkjs zkey export solidityverifier ${ZKEY_FINAL} ${VERIFIER_SOL}`,
    {
      stdio: 'inherit',
    }
  )
  console.log('✅ Verifier contract exported\n')
} catch (err) {
  console.error('❌ Verifier export failed:', err)
  process.exit(1)
}

/**
 * [6/6] 해시 계산
 * - 모든 빌드 산출물의 SHA256 해시 계산
 * - zkp-version.lock에 기록하여 버전 관리 및 무결성 검증에 사용
 */
console.log('[6/6] Calculating hashes...')
const hashes = {
  circuit: sha256(CIRCUIT),
  r1cs: sha256(R1CS),
  wasm: sha256(WASM),
  zkey: sha256(ZKEY_FINAL),
  verifier: fs.existsSync(VERIFIER_SOL) ? sha256(VERIFIER_SOL) : 'N/A',
}

// Get zkey circuit hash
let circuitHash = 'N/A'
try {
  const zkeyInfo = execSync(`npx snarkjs zkey inspect ${ZKEY_FINAL}`, {
    encoding: 'utf8',
  })
  const match = zkeyInfo.match(/Circuit Hash:\s*([a-f0-9]+)/i)
  if (match) {
    circuitHash = match[1]
  }
} catch (err) {
  console.warn('⚠️  Could not extract circuit hash from zkey')
}

console.log('\n📦 Build Summary:')
console.log('Circuit:', CIRCUIT)
console.log('R1CS:', R1CS)
console.log('WASM:', WASM)
console.log('ZKEY:', ZKEY_FINAL)
console.log('Verifier:', VERIFIER_SOL)
console.log('\n🔐 Hashes:')
console.log('Circuit SHA256:', hashes.circuit)
console.log('R1CS SHA256:', hashes.r1cs)
console.log('WASM SHA256:', hashes.wasm)
console.log('ZKEY SHA256:', hashes.zkey)
console.log('Circuit Hash (from zkey):', circuitHash)
console.log('Verifier SHA256:', hashes.verifier)

/**
 * [7/7] Public 폴더로 파일 복사 (배포용)
 * - build/v1.2의 WASM과 ZKEY를 public/zkp/v1.2로 복사
 * - Next.js는 public 폴더의 파일을 정적 자산으로 제공
 */
console.log('[7/7] Copying files to public folder...')
try {
  const PUBLIC_DIR = 'public/zkp/v1.2'
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true })
  }

  // WASM 파일 복사
  if (fs.existsSync(WASM)) {
    fs.copyFileSync(WASM, path.join(PUBLIC_DIR, 'vote.wasm'))
    console.log('✅ WASM copied to public/zkp/v1.2/vote.wasm')
  }

  // ZKEY 파일 복사
  if (fs.existsSync(ZKEY_FINAL)) {
    fs.copyFileSync(ZKEY_FINAL, path.join(PUBLIC_DIR, 'vote_final.zkey'))
    console.log('✅ ZKEY copied to public/zkp/v1.2/vote_final.zkey')
  }

  // Verification key 복사 (선택사항)
  if (fs.existsSync(VKEY)) {
    fs.copyFileSync(VKEY, path.join(PUBLIC_DIR, 'verification_key.json'))
    console.log('✅ Verification key copied to public/zkp/v1.2/verification_key.json')
  }

  console.log('✅ Files copied to public folder\n')
} catch (err) {
  console.error('❌ Copy to public folder failed:', err)
  // 복사 실패해도 빌드는 계속 진행 (로컬에서는 이미 있을 수 있음)
  console.warn('⚠️  Continuing without copying to public folder')
}

console.log('\n✅ v1.2 build complete!')
console.log('\nNext steps:')
console.log('  1. Test with: npm run test:v1.2')
console.log('  2. Update zkp-version.lock: npm run lock:v1.2')
