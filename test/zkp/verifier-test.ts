/**
 * Groth16Verifier 실제 ZKP 증명 검증 테스트
 *
 * 검증 내용:
 * - 실제 Groth16Verifier 컨트랙트가 실제 ZKP 증명을 검증할 수 있는지 확인
 * - 테스트 실행 시 자동으로 input.json, proof.json, public.json, calldata.txt 생성
 *
 * 특징:
 * - 실제 암호학적 검증 수행 (느림, 약 15-30초 소요)
 * - 배포 전 최종 검증용
 * - 모든 파일 자동 생성 (수동 작업 불필요)
 *
 * 참고:
 *   - voting-v2.test.js는 Mock Verifier로 빠르게 로직만 검증
 *   - 이 테스트는 실제 Verifier로 실제 증명을 검증
 *   - test/ 폴더: 자동화된 테스트 (테스트 프레임워크로 실행)
 *   - scripts/ 폴더: 수동 실행 유틸리티 (빌드, 배포 등)
 *
 * 실행 방법:
 *   npx hardhat test test/zkp/verifier-test.ts
 */

import { expect } from 'chai'
import hre from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'
import { groth16 } from 'snarkjs'

// Hardhat ethers 타입 확장
const { ethers } = hre as any

// 파일 경로
const WASM_PATH = path.join(process.cwd(), 'build/v1.2/vote_js/vote.wasm')
const ZKEY_PATH = path.join(process.cwd(), 'build/v1.2/vote_final.zkey')
const INPUT_JSON_PATH = path.join(process.cwd(), 'input.json')
const PROOF_JSON_PATH = path.join(process.cwd(), 'proof.json')
const PUBLIC_JSON_PATH = path.join(process.cwd(), 'public.json')
const CALLDATA_TXT_PATH = path.join(process.cwd(), 'calldata.txt')

// ethers v6는 BigNumber 대신 bigint 사용
// 문자열(0xhex 또는 10진 문자열)을 bigint로 변환
const toBN = (v: string) => BigInt(v)

/**
 * 테스트용 간단한 input.json 생성
 * 실제 앱에서는 src/lib/zkp.ts의 generateVoteProof()가 동적으로 생성합니다.
 */
function generateTestInput() {
  const vote = 0
  const pollId = 1
  const nullifierSecret = BigInt('12345678901234567890')
  const salt = BigInt('98765432109876543210')

  // 테스트용: 간단한 merkle proof (모두 0으로 설정)
  // 실제 사용 시에는 실제 Merkle tree에서 생성한 proof를 사용해야 합니다.
  const pathElements = Array(14).fill('0') // 머클트리 깊이 14
  const pathIndex = Array(14).fill(0)

  return {
    vote,
    voteBit0: vote & 1,
    voteBit1: (vote >> 1) & 1,
    voteBit2: (vote >> 2) & 1,
    salt: salt.toString(),
    nullifierSecret: nullifierSecret.toString(),
    pathElements,
    pathIndex,
    pollId: pollId.toString(),
  }
}

/**
 * snarkjs exportSolidityCallData 형식의 한 줄을 파싱
 */
function parseCalldata(calldataRaw: string) {
  // 줄바꿈 및 공백 제거
  const s = calldataRaw.trim()

  // 형식 체크
  if (!s.includes('],[')) {
    throw new Error(
      'calldata 형식이 잘못됐습니다. snarkjs 출력 그대로를 사용하세요.'
    )
  }

  // [a0,a1],[ [b00,b01],[b10,b11] ],[c0,c1],[input...]
  const argv = s.replace(/["\[\]\s]/g, '').split(',')
  if (argv.length < 8) {
    throw new Error(
      `calldata 파싱 실패: 최소 8개 요소 필요, 실제=${argv.length}`
    )
  }

  const a: [any, any] = [toBN(argv[0]), toBN(argv[1])]
  const b: [[any, any], [any, any]] = [
    [toBN(argv[2]), toBN(argv[3])],
    [toBN(argv[4]), toBN(argv[5])],
  ]
  const c: [any, any] = [toBN(argv[6]), toBN(argv[7])]

  // 나머지는 공개 신호 (pubSignals)
  const input = argv.slice(8).map(toBN)
  if (input.length === 0) {
    throw new Error('pubSignals 파싱 실패: 최소 1개 이상이어야 합니다.')
  }

  return { a, b, c, input }
}

describe('Groth16Verifier 실제 ZKP 증명 검증', function () {
  // 타임아웃 증가 (증명 생성에 시간이 걸림)
  this.timeout(60000) // 60초

  before(async function () {
    // 필요한 파일 확인
    if (!fs.existsSync(WASM_PATH)) {
      throw new Error(
        `WASM 파일을 찾을 수 없습니다: ${WASM_PATH}\n` +
          '먼저 npm run build:zkp를 실행하세요.'
      )
    }

    if (!fs.existsSync(ZKEY_PATH)) {
      throw new Error(
        `ZKEY 파일을 찾을 수 없습니다: ${ZKEY_PATH}\n` +
          '먼저 npm run build:zkp를 실행하세요.'
      )
    }

    // 1. input.json 생성 (없으면)
    if (!fs.existsSync(INPUT_JSON_PATH)) {
      console.log('[Test] input.json 생성 중...')
      const input = generateTestInput()
      fs.writeFileSync(INPUT_JSON_PATH, JSON.stringify(input, null, 2))
      console.log('[Test] ✅ input.json 생성 완료')
    }

    // 2. proof.json, public.json 생성 (없으면)
    if (!fs.existsSync(PROOF_JSON_PATH) || !fs.existsSync(PUBLIC_JSON_PATH)) {
      console.log('[Test] 증명 생성 중... (15-30초 소요될 수 있습니다)')
      const input = JSON.parse(fs.readFileSync(INPUT_JSON_PATH, 'utf8'))
      const { proof, publicSignals } = await groth16.fullProve(
        input,
        WASM_PATH,
        ZKEY_PATH
      )
      fs.writeFileSync(PROOF_JSON_PATH, JSON.stringify(proof, null, 2))
      fs.writeFileSync(PUBLIC_JSON_PATH, JSON.stringify(publicSignals, null, 2))
      console.log('[Test] ✅ 증명 생성 완료')
    }

    // 3. calldata.txt 생성 (없으면)
    if (!fs.existsSync(CALLDATA_TXT_PATH)) {
      console.log('[Test] calldata.txt 생성 중...')
      const proof = JSON.parse(fs.readFileSync(PROOF_JSON_PATH, 'utf8'))
      const publicSignals = JSON.parse(
        fs.readFileSync(PUBLIC_JSON_PATH, 'utf8')
      )
      const calldata = await groth16.exportSolidityCallData(
        proof,
        publicSignals
      )
      fs.writeFileSync(CALLDATA_TXT_PATH, calldata)
      console.log('[Test] ✅ calldata.txt 생성 완료')
    }
  })

  it('실제 Groth16Verifier로 증명 검증', async function () {
    const Verifier = await ethers.getContractFactory('Groth16Verifier')
    const verifier = await Verifier.deploy()
    await verifier.waitForDeployment()

    // calldata.txt 읽기
    const calldata = fs.readFileSync(CALLDATA_TXT_PATH, 'utf8')
    const { a, b, c, input } = parseCalldata(calldata)

    // on-chain 검증
    const ok: boolean = await verifier.verifyProof(a, b, c, input)
    expect(ok).to.eq(true)
  })
})
