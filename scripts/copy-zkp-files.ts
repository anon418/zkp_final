/**
 * ZKP 파일과 ABI를 복사하는 스크립트
 * 
 * 목적: 
 * - build/v1.2의 파일을 public/zkp/v1.2로 복사하여 배포에 포함
 * - artifacts의 ABI를 src/lib/abis로 복사하여 클라이언트에서 사용
 * 
 * 실행: npx ts-node scripts/copy-zkp-files.ts
 * 또는: npm run copy:zkp (package.json에 추가 필요)
 */

import fs from 'fs'
import path from 'path'

const BUILD_DIR = 'build/v1.2'
const PUBLIC_DIR = 'public/zkp/v1.2'
const ARTIFACTS_DIR = 'artifacts/contracts/solidity'
const ABI_DIR = 'src/lib/abis'

const zkpFilesToCopy = [
  { src: 'vote_js/vote.wasm', dest: 'vote.wasm' },
  { src: 'vote_final.zkey', dest: 'vote_final.zkey' },
  { src: 'verification_key.json', dest: 'verification_key.json' },
]

const abiFilesToCopy = [
  { src: 'VotingV2.sol/VotingV2.json', dest: 'VotingV2.json' },
  { src: 'Groth16Verifier.sol/Groth16Verifier.json', dest: 'Groth16Verifier.json' },
]

console.log('[copy-zkp-files] Copying ZKP files and ABIs...\n')

// 1. ZKP 파일 복사
console.log('📦 Copying ZKP files...')
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true })
  console.log(`✅ Created directory: ${PUBLIC_DIR}`)
}

let copiedCount = 0
let skippedCount = 0

for (const { src, dest } of zkpFilesToCopy) {
  const srcPath = path.join(BUILD_DIR, src)
  const destPath = path.join(PUBLIC_DIR, dest)

  if (!fs.existsSync(srcPath)) {
    console.warn(`⚠️  Source file not found: ${srcPath}`)
    skippedCount++
    continue
  }

  try {
    fs.copyFileSync(srcPath, destPath)
    const stats = fs.statSync(destPath)
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
    console.log(`✅ Copied: ${dest} (${sizeMB} MB)`)
    copiedCount++
  } catch (error) {
    console.error(`❌ Failed to copy ${src} to ${dest}:`, error)
  }
}

// 2. ABI 파일 복사
console.log('\n📄 Copying ABI files...')
if (!fs.existsSync(ABI_DIR)) {
  fs.mkdirSync(ABI_DIR, { recursive: true })
  console.log(`✅ Created directory: ${ABI_DIR}`)
}

for (const { src, dest } of abiFilesToCopy) {
  const srcPath = path.join(ARTIFACTS_DIR, src)
  const destPath = path.join(ABI_DIR, dest)

  if (!fs.existsSync(srcPath)) {
    console.warn(`⚠️  ABI file not found: ${srcPath}`)
    skippedCount++
    continue
  }

  try {
    // ABI만 추출하여 저장
    const artifact = JSON.parse(fs.readFileSync(srcPath, 'utf8'))
    const abiOnly = { abi: artifact.abi }
    fs.writeFileSync(destPath, JSON.stringify(abiOnly, null, 2))
    console.log(`✅ Copied ABI: ${dest}`)
    copiedCount++
  } catch (error) {
    console.error(`❌ Failed to copy ABI ${src} to ${dest}:`, error)
  }
}

console.log(`\n📦 Summary: ${copiedCount} copied, ${skippedCount} skipped`)
console.log('✅ Copy complete!\n')

