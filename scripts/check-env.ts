/**
 * 환경 변수 검증 스크립트
 *
 * 실행: npm run check:env
 *
 * 검증 항목:
 * 1. 필수 환경 변수 존재 여부
 * 2. 값의 형식 검증 (지갑 주소, URL, MongoDB URI 등)
 * 3. 상호 의존성 확인 (예: INFURA_URL 또는 ALCHEMY_URL 중 하나)
 */

import * as fs from 'fs'
import * as path from 'path'

// 색상 출력 (터미널)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// 환경 변수 타입 정의
interface EnvVar {
  key: string
  required: boolean
  description: string
  validator?: (value: string) => { valid: boolean; error?: string }
  dependsOn?: string[] // 다른 변수가 있어야 하는 경우
  conflictsWith?: string[] // 다른 변수와 충돌하는 경우
}

// 검증 함수들
const validators = {
  // Ethereum 주소 검증 (0x로 시작, 42자)
  ethereumAddress: (value: string): { valid: boolean; error?: string } => {
    if (!value.startsWith('0x')) {
      return { valid: false, error: '지갑 주소는 0x로 시작해야 합니다' }
    }
    if (value.length !== 42) {
      return { valid: false, error: '지갑 주소는 42자여야 합니다' }
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      return { valid: false, error: '지갑 주소 형식이 올바르지 않습니다' }
    }
    return { valid: true }
  },

  // MongoDB URI 검증
  mongodbUri: (value: string): { valid: boolean; error?: string } => {
    if (
      !value.startsWith('mongodb://') &&
      !value.startsWith('mongodb+srv://')
    ) {
      return {
        valid: false,
        error: 'MongoDB URI는 mongodb:// 또는 mongodb+srv://로 시작해야 합니다',
      }
    }
    if (
      value.includes('<username>') ||
      value.includes('<password>') ||
      value.includes('xxxxx')
    ) {
      return {
        valid: false,
        error: '실제 MongoDB URI를 입력해주세요 (예제 값이 아닌)',
      }
    }
    return { valid: true }
  },

  // URL 검증
  url: (value: string): { valid: boolean; error?: string } => {
    try {
      const url = new URL(value)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return {
          valid: false,
          error: 'URL은 http:// 또는 https://로 시작해야 합니다',
        }
      }
      return { valid: true }
    } catch {
      return { valid: false, error: '올바른 URL 형식이 아닙니다' }
    }
  },

  // 숫자 검증
  number: (value: string): { valid: boolean; error?: string } => {
    if (isNaN(Number(value))) {
      return { valid: false, error: '숫자여야 합니다' }
    }
    return { valid: true }
  },

  // 불린 검증
  boolean: (value: string): { valid: boolean; error?: string } => {
    if (value !== 'true' && value !== 'false') {
      return { valid: false, error: 'true 또는 false여야 합니다' }
    }
    return { valid: true }
  },

  // 개인키 검증 (0x로 시작, 66자)
  privateKey: (value: string): { valid: boolean; error?: string } => {
    if (!value.startsWith('0x')) {
      return { valid: false, error: '개인키는 0x로 시작해야 합니다' }
    }
    if (value.length !== 66) {
      return { valid: false, error: '개인키는 66자여야 합니다 (0x 포함)' }
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
      return { valid: false, error: '개인키 형식이 올바르지 않습니다' }
    }
    if (value.includes('YOUR_PRIVATE_KEY') || value.includes('YOUR_KEY')) {
      return {
        valid: false,
        error: '실제 개인키를 입력해주세요 (예제 값이 아닌)',
      }
    }
    return { valid: true }
  },
}

// 환경 변수 정의
const envVars: EnvVar[] = [
  // 필수 변수
  {
    key: 'MONGODB_URI',
    required: true,
    description: 'MongoDB Atlas 연결 문자열',
    validator: validators.mongodbUri,
  },
  {
    key: 'RELAYER_PRIVATE_KEY',
    required: true,
    description: '가스 대납용 지갑 개인키',
    validator: validators.privateKey,
  },
  {
    key: 'CHAIN_ID',
    required: true,
    description: '블록체인 네트워크 ID (Sepolia: 11155111)',
    validator: validators.number,
  },
  {
    key: 'VOTING_V2_ADDRESS',
    required: true,
    description: 'VotingV2 컨트랙트 주소',
    validator: validators.ethereumAddress,
  },
  {
    key: 'VERIFIER_ADDRESS',
    required: true,
    description: 'Groth16Verifier 컨트랙트 주소',
    validator: validators.ethereumAddress,
  },
  {
    key: 'USE_VOTING_V2',
    required: true,
    description: 'VotingV2 사용 여부',
    validator: validators.boolean,
  },
  {
    key: 'ENABLE_RELAYER',
    required: true,
    description: 'Relayer 기능 활성화',
    validator: validators.boolean,
  },

  // RPC URL (둘 중 하나는 필수)
  {
    key: 'INFURA_URL',
    required: false,
    description: 'Infura Sepolia RPC URL',
    validator: validators.url,
    conflictsWith: ['ALCHEMY_URL'],
  },
  {
    key: 'ALCHEMY_URL',
    required: false,
    description: 'Alchemy Sepolia RPC URL',
    validator: validators.url,
    conflictsWith: ['INFURA_URL'],
  },

  // 프론트엔드 변수 (모두 선택적 - 없어도 작동)
  {
    key: 'NEXT_PUBLIC_CHAIN_ID',
    required: false,
    description: '프론트엔드용 Chain ID (사용되지 않음 - 코드에서 하드코딩됨)',
    validator: validators.number,
  },
  {
    key: 'NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS',
    required: false,
    description: '프론트엔드용 Voting 컨트랙트 주소 (VOTING_V2_ADDRESS와 중복)',
    validator: validators.ethereumAddress,
  },
  {
    key: 'NEXT_PUBLIC_API_URL',
    required: false,
    description: '프론트엔드용 API URL (없으면 상대 경로 자동 사용)',
    validator: validators.url,
  },
  {
    key: 'NEXT_PUBLIC_BASE_URL',
    required: false,
    description: 'QR 코드 페이지용 Base URL (없으면 localhost 기본값)',
    validator: validators.url,
  },

  // 선택 변수
  {
    key: 'VOTING_CONTRACT_ADDRESS',
    required: false,
    description: 'Voting 컨트랙트 주소 (VotingV2와 동일할 수 있음)',
    validator: validators.ethereumAddress,
  },
  {
    key: 'ENABLE_METRICS',
    required: false,
    description: '메트릭 수집 활성화',
    validator: validators.boolean,
  },
  {
    key: 'ENABLE_ONCHAIN_CREATION',
    required: false,
    description: '온체인 투표 생성 활성화',
    validator: validators.boolean,
  },
  {
    key: 'PROOF_SERVER_URL',
    required: false,
    description: 'WSL Proof 서버 URL',
    validator: validators.url,
  },
  {
    key: 'PORT',
    required: false,
    description: '서버 포트',
    validator: validators.number,
  },
]

// .env 파일 읽기
function loadEnvFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env')

  if (!fs.existsSync(envPath)) {
    log('❌ .env 파일을 찾을 수 없습니다!', 'red')
    log(`   경로: ${envPath}`, 'yellow')
    log('   해결: env.example.txt를 복사하여 .env 파일을 생성하세요', 'yellow')
    process.exit(1)
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}

  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    // 주석이나 빈 줄 건너뛰기
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      // 따옴표 제거
      env[key] = value.replace(/^["']|["']$/g, '')
    }
  }

  return env
}

// 검증 실행
function validateEnv(): boolean {
  log('\n🔍 환경 변수 검증 시작...\n', 'cyan')

  const env = loadEnvFile()
  let hasErrors = false
  let hasWarnings = false

  // 필수 변수 검증
  const requiredVars = envVars.filter((v) => v.required)
  const missingRequired: string[] = []

  for (const envVar of requiredVars) {
    const value = env[envVar.key]

    if (!value) {
      missingRequired.push(envVar.key)
      log(`❌ [필수] ${envVar.key} - 누락됨`, 'red')
      log(`   설명: ${envVar.description}`, 'yellow')
      hasErrors = true
      continue
    }

    // 형식 검증
    if (envVar.validator) {
      const result = envVar.validator(value)
      if (!result.valid) {
        log(`❌ [형식 오류] ${envVar.key}`, 'red')
        log(
          `   값: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`,
          'yellow'
        )
        log(`   오류: ${result.error}`, 'yellow')
        hasErrors = true
        continue
      }
    }

    log(`✅ [필수] ${envVar.key}`, 'green')
  }

  // RPC URL 상호 의존성 검증
  const hasInfura = !!env['INFURA_URL']
  const hasAlchemy = !!env['ALCHEMY_URL']

  if (!hasInfura && !hasAlchemy) {
    log('❌ [필수] INFURA_URL 또는 ALCHEMY_URL 중 하나는 필수입니다', 'red')
    hasErrors = true
  } else if (hasInfura && hasAlchemy) {
    log(
      '⚠️  [경고] INFURA_URL과 ALCHEMY_URL이 모두 설정되어 있습니다',
      'yellow'
    )
    log('   둘 중 하나만 사용하는 것을 권장합니다', 'yellow')
    hasWarnings = true
  } else {
    if (hasInfura) {
      log(`✅ [RPC] INFURA_URL 설정됨`, 'green')
    }
    if (hasAlchemy) {
      log(`✅ [RPC] ALCHEMY_URL 설정됨`, 'green')
    }
  }

  // 중복 변수 경고
  log('\n⚠️  중복 변수 확인:', 'cyan')
  if (env['VOTING_V2_ADDRESS'] && env['NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS']) {
    if (
      env['VOTING_V2_ADDRESS'] !== env['NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS']
    ) {
      log(
        '⚠️  [경고] VOTING_V2_ADDRESS와 NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS가 다릅니다',
        'yellow'
      )
      log('   같은 주소를 사용하는 것을 권장합니다', 'yellow')
      hasWarnings = true
    } else {
      log(
        '✅ VOTING_V2_ADDRESS = NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS (일치)',
        'green'
      )
    }
  }
  if (env['CHAIN_ID'] && env['NEXT_PUBLIC_CHAIN_ID']) {
    if (env['CHAIN_ID'] !== env['NEXT_PUBLIC_CHAIN_ID']) {
      log('⚠️  [경고] CHAIN_ID와 NEXT_PUBLIC_CHAIN_ID가 다릅니다', 'yellow')
      log('   같은 값을 사용하는 것을 권장합니다', 'yellow')
      hasWarnings = true
    } else {
      log('✅ CHAIN_ID = NEXT_PUBLIC_CHAIN_ID (일치)', 'green')
    }
  }
  if (env['NEXT_PUBLIC_API_URL'] && env['NEXT_PUBLIC_BASE_URL']) {
    if (env['NEXT_PUBLIC_API_URL'] !== env['NEXT_PUBLIC_BASE_URL']) {
      log(
        '⚠️  [경고] NEXT_PUBLIC_API_URL과 NEXT_PUBLIC_BASE_URL이 다릅니다',
        'yellow'
      )
      log('   같은 URL을 사용하는 것을 권장합니다 (Vercel 통합 배포)', 'yellow')
      hasWarnings = true
    } else {
      log('✅ NEXT_PUBLIC_API_URL = NEXT_PUBLIC_BASE_URL (일치)', 'green')
    }
  }

  // 선택 변수 검증
  const optionalVars = envVars.filter((v) => !v.required)
  log('\n📋 선택 변수 검증:', 'cyan')

  for (const envVar of optionalVars) {
    const value = env[envVar.key]

    if (!value) {
      log(`⚪ [선택] ${envVar.key} - 설정 안 됨`, 'blue')
      continue
    }

    // 형식 검증
    if (envVar.validator) {
      const result = envVar.validator(value)
      if (!result.valid) {
        log(`⚠️  [형식 오류] ${envVar.key}`, 'yellow')
        log(
          `   값: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`,
          'yellow'
        )
        log(`   오류: ${result.error}`, 'yellow')
        hasWarnings = true
        continue
      }
    }

    log(`✅ [선택] ${envVar.key}`, 'green')
  }

  // 요약
  log('\n' + '='.repeat(60), 'cyan')
  if (hasErrors) {
    log('❌ 검증 실패: 필수 환경 변수에 문제가 있습니다', 'red')
    log('\n해결 방법:', 'yellow')
    log('1. env.example.txt를 참고하여 .env 파일을 수정하세요', 'yellow')
    log('2. 누락된 필수 변수를 추가하세요', 'yellow')
    log('3. 형식 오류가 있는 변수를 수정하세요', 'yellow')
    return false
  } else if (hasWarnings) {
    log('⚠️  검증 완료: 일부 경고가 있습니다', 'yellow')
    return true
  } else {
    log('✅ 검증 완료: 모든 환경 변수가 올바르게 설정되었습니다!', 'green')
    return true
  }
}

// 실행
try {
  const success = validateEnv()
  process.exit(success ? 0 : 1)
} catch (error) {
  console.error('검증 중 오류 발생:', error)
  process.exit(1)
}

export { validateEnv }
