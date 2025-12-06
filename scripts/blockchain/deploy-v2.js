/**
 * VotingV2 배포 스크립트
 *
 * 사용법:
 * npx hardhat run scripts/blockchain/deploy-v2.js --network sepolia
 */

const hre = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('🚀 VotingV2 배포 시작...')

  // Verifier 주소 (이미 배포된 것 사용)
  // 여러 환경 변수 이름 지원: VERIFIER_ADDRESS, VERIFIER_CONTRACT_ADDRESS
  const VERIFIER_ADDRESS =
    process.env.VERIFIER_ADDRESS ||
    process.env.VERIFIER_CONTRACT_ADDRESS ||
    '0x88984d59545FcABC3525F3237Ee276a655Db7AAe'

  console.log('📍 Verifier 주소:', VERIFIER_ADDRESS)

  // VotingV2 컨트랙트 배포
  const VotingV2 = await hre.ethers.getContractFactory('VotingV2')
  const voting = await VotingV2.deploy(VERIFIER_ADDRESS)

  await voting.waitForDeployment()
  const votingAddress = await voting.getAddress()

  console.log('✅ VotingV2 배포 완료!')
  console.log('   주소:', votingAddress)
  console.log('   Verifier:', VERIFIER_ADDRESS)
  console.log('   네트워크:', hre.network.name)

  // addresses.md 업데이트
  const addressesPath = path.join(
    __dirname,
    '../../docs/blockchain/addresses.md'
  )
  const timestamp = new Date().toISOString()

  const content = `# Voting v2.0 – Sepolia Contracts (Multi-Poll Support)

> **배포 일시**: ${timestamp}  
> **네트워크**: Sepolia Testnet (ChainID: 11155111)

---

## 🔹 VotingV2 Contract (다중 투표 지원)

- **VotingV2**: ${votingAddress}
- **Verifier**: ${VERIFIER_ADDRESS}
- **Etherscan (VotingV2)**: https://sepolia.etherscan.io/address/${votingAddress}
- **Etherscan (Verifier)**: https://sepolia.etherscan.io/address/${VERIFIER_ADDRESS}

---

## 🔹 BACKUP Voting Contract (v1.0)

- **Voting**: 0x6f75A7759b65C951E256BF9A90B7b1eE769ACD67
- **Verifier**: 0x88984d59545FcABC3525F3237Ee276a655Db7AAe
- **Etherscan**: https://sepolia.etherscan.io/address/0x6f75A7759b65C951E256BF9A90B7b1eE769ACD67

---

## 📝 주요 기능

### VotingV2 (다중 투표)
- ✅ \`createElection(pollId, ...)\` - 새 투표 생성
- ✅ \`vote(pollId, proposalId, ...)\` - 투표 제출
- ✅ \`getElection(pollId)\` - 투표 정보 조회
- ✅ \`getCandidates(pollId)\` - 후보 목록 조회
- ✅ \`hasVoted(pollId, nullifier)\` - 투표 여부 확인

### 이벤트
- \`PollCreated(pollId, creator, startTime, endTime, candidatesCount)\`
- \`ProofVerified(pollId, voter, nullifier)\`
- \`VoteCast(pollId, nullifier, candidate, voteCommitment, isUpdate)\`

---

## 🔧 환경 변수 설정

\`\`\`bash
# .env
VOTING_V2_CONTRACT_ADDRESS=${votingAddress}
VERIFIER_CONTRACT_ADDRESS=${VERIFIER_ADDRESS}
CHAIN_ID=11155111
\`\`\`

---

※ 이 문서는 VotingV2 배포 후 자동 생성되었습니다.
`

  fs.writeFileSync(addressesPath, content)
  console.log('📝 addresses.md 업데이트 완료')

  // .env.example 업데이트
  const envExamplePath = path.join(__dirname, '../../env.example.txt')
  let envContent = fs.readFileSync(envExamplePath, 'utf8')

  // VOTING_V2_CONTRACT_ADDRESS 추가
  if (!envContent.includes('VOTING_V2_CONTRACT_ADDRESS')) {
    envContent += `\n# VotingV2 (다중 투표 지원)\nVOTING_V2_CONTRACT_ADDRESS=${votingAddress}\n`
    fs.writeFileSync(envExamplePath, envContent)
    console.log('📝 env.example.txt 업데이트 완료')
  }

  // 배포 정보 저장
  const deployInfo = {
    network: hre.network.name,
    votingV2: votingAddress,
    verifier: VERIFIER_ADDRESS,
    timestamp,
    deployer: (await hre.ethers.getSigners())[0].address,
  }

  // 배포 정보는 docs/blockchain.md에 기록됨
  // .deploy-v2.json은 더 이상 생성하지 않음 (gitignore에 추가됨)
  console.log('📝 배포 정보는 docs/blockchain.md를 참고하세요')

  console.log('\n✅ 모든 배포 작업 완료!')
  console.log('\n📋 다음 단계:')
  console.log('1. .env 파일에 VOTING_V2_CONTRACT_ADDRESS 추가')
  console.log('2. Etherscan에서 컨트랙트 검증')
  console.log('3. 프론트/백엔드 코드에서 VotingV2 사용')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
