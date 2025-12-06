# VoteZK ⚡

> **운영자도 조작할 수 없는 투명한 투표 플랫폼**  
> Zero-Knowledge Proof로 익명성 보장 + 블록체인으로 검증 가능

<div align="center">

![VoteZK Logo](public/logo.svg)

**[🚀 Demo](https://votezk.vercel.app)** • **[📖 Documentation](docs/)** • **[🔍 Etherscan](https://sepolia.etherscan.io)** • **[📋 배포 가이드](DEPLOYMENT_CHECKLIST.md)**

[![Status](https://img.shields.io/badge/Status-Production-ready-brightgreen?style=for-the-badge)](README.md)
[![시연](https://img.shields.io/badge/시연-Ready-blue?style=for-the-badge)](docs/START_PROJECT.md)
[![WSL](https://img.shields.io/badge/WSL-Optional-lightgrey?style=for-the-badge)](wsl/README.md)

</div>

---

## 💡 **VoteZK란?**

VoteZK는 Zero-Knowledge Proof(영지식 증명)와 블록체인을 활용한 투명하고 익명적인 투표 플랫폼입니다.

### **기존 투표 시스템의 한계**

| 시스템           | 익명성           | 검증 가능성      | 조작 불가능성       |
| ---------------- | ---------------- | ---------------- | ------------------- |
| **Google Forms** | ⚠️ IP 로그 남음  | ❌ 관리자만 확인 | ❌ 관리자 조작 가능 |
| **일반 투표 앱** | ⚠️ 서버 로그     | ❌ 믿어야 함     | ❌ 서버 조작 가능   |
| **VoteZK**       | ✅ ZKP 기반 익명 | ✅ 누구나 검증   | ✅ 블록체인 보장    |

### ⚠️ **중요한 제한사항**

**현재 시스템은 Open Poll (공개 투표) 방식입니다:**

- ✅ **같은 지갑 주소로는 중복 투표 불가**: 완벽하게 차단됨
- ⚠️ **다른 지갑 주소로는 중복 투표 가능**: 한 사람이 여러 MetaMask 계정을 만들어서 여러 번 투표할 수 있음
- ⚠️ **화이트리스트 없음**: Merkle Tree 미사용, 누구나 투표 가능
- ⚠️ **신원 검증 없음**: MetaMask 지갑 주소만으로 투표, 실제 신원(학번, 이메일 등) 검증 없음

**이유**: 링크/QR을 통해 **누구나** 투표 가능하도록 설계되었으며, 완전한 익명성을 보장합니다.  
**향후 개선**: Closed Poll 지원 (화이트리스트, 신원 검증) 예정

**자세한 내용**: [docs/SYSTEM.md](docs/SYSTEM.md), [docs/LIMITATIONS.md](docs/LIMITATIONS.md) 참고

### **VoteZK의 특징**

#### 🔒 **1. 투명성과 검증 가능성**

- **일반 투표**: 관리자가 서버에서 결과를 조작할 수 있음
- **VoteZK**: 블록체인에 기록되어 **조작이 어려움**
- **검증 방법**: [Etherscan](https://sepolia.etherscan.io)에서 누구나 직접 확인 가능

#### 🎭 **2. 익명성 보장**

- **일반 투표**: IP 주소, 접속 시간 등이 서버 로그에 남음
- **VoteZK**: Zero-Knowledge Proof로 **서버도 누가 투표했는지 알 수 없음**
- **기술**: Circom + Groth16 증명 시스템
- **주의**: 같은 지갑 주소로는 중복 투표 불가, 다른 지갑 주소로는 가능 (Open Poll 방식)

#### ⛓️ **3. 검증 가능한 투표 기록**

- **일반 투표**: 발표된 결과를 믿어야 함
- **VoteZK**: Sepolia 블록체인에 **기록되어 검증 가능**
- **투명성**: 누구나 언제든지 Etherscan에서 재검증 가능

---

## 🎯 **사용 사례**

### 📌 **1. 과대표/회장 선거**

```
문제: 운영진 조작 의혹
해결: Etherscan에서 누구나 결과 검증
효과: 투명성 확보, 신뢰 회복
```

### 📌 **2. 익명 강의평가**

```
문제: 교수가 누가 작성했는지 알 수 있음
해결: ZKP로 완전 익명 (서버도 모름)
효과: 솔직한 피드백 가능
```

### 📌 **3. DAO/NFT 커뮤니티 거버넌스**

```
문제: 중앙화된 투표 시스템
해결: 온체인 투표, MetaMask 연동
효과: 진정한 탈중앙화 실현
```

---

## 🔧 **어떻게 작동하는가?**

VoteZK는 Zero-Knowledge Proof(영지식 증명)를 사용하여 투표 내용을 숨기면서도 유효성을 증명할 수 있습니다. 간단히 말하면, "나는 유효한 투표를 했지만, 무엇을 선택했는지는 비밀"이라는 것을 수학적으로 증명하는 것입니다.

### **ZKP 기반 익명 투표 프로세스**

#### **1단계: 투표자 등록**

```
사용자 → MetaMask 지갑 연결 → Identity 생성
  ↓
- Nullifier Secret (비밀값) 생성: 중복 투표 방지용
- Identity Trapdoor 생성: 익명성 보장용
- MongoDB에 등록 (익명 정보만 저장, 지갑 주소는 저장하지 않음)
```

#### **2단계: ZKP 증명 생성**

```
후보 선택 → ZKP 증명 생성 (브라우저 Web Worker에서 실행)
  ↓
입력 (Private - 비밀):
- vote: 선택한 후보 ID (0-7)
- nullifierSecret: 사용자 고유 비밀값
- merkleProof: Merkle Tree 증명 (화이트리스트 검증용, Open Poll에서는 사용 안 함)
- pollId: 투표 ID

처리:
- Circom 회로 실행 (약 1300개 제약조건 계산)
- Groth16 증명 생성 (약 15초 소요)
- Public Signals 생성: [root, pollId, nullifier, voteCommitment]

출력:
- Proof: ZKP 증명 (a, b, c) - 수학적 증명
- Public Signals: 검증 가능한 공개 정보 (비밀 정보는 포함되지 않음)
```

#### **3단계: 블록체인 검증 및 저장**

```
Relayer (가스비 대납 서버) → Sepolia 블록체인에 제출
  ↓
1. Groth16Verifier.verifyProof() 호출
   - ZKP 증명 수학적 검증 (증명이 유효한지 확인)
   - Public Signals 검증 (pollId, nullifier 등 확인)

2. VotingV2.vote() 호출
   - Nullifier 중복 체크 (같은 nullifier로 재투표 방지)
   - 투표 기록 저장 (블록체인에 영구 보관)
   - 이벤트 발생 (Etherscan에서 확인 가능)
```

#### **4단계: 익명성 보장**

```
✅ 서버는 누가 투표했는지 알 수 없음
   - Nullifier만 기록 (신원 정보 없음)
   - IP 주소, 접속 시간 등 로그 없음
   - voterAddress는 저장하지 않음

✅ 블록체인에서도 신원 노출 없음
   - Nullifier는 해시값 (역추적 불가능)
   - Vote Commitment는 암호화된 투표 정보
   - Etherscan에서 candidate 값은 보이지만, 누가 선택했는지는 연결 불가능

✅ 누구나 검증 가능하지만 신원은 보호
   - Etherscan에서 투표 기록 확인 가능
   - 하지만 누가 투표했는지는 알 수 없음 (ZKP로 분리됨)
```

### **핵심 보안 메커니즘**

| 메커니즘          | 목적              | 구현                                       | 설명                                                 |
| ----------------- | ----------------- | ------------------------------------------ | ---------------------------------------------------- |
| **Nullifier**     | 중복 투표 방지    | 같은 nullifierSecret으로는 두 번 투표 불가 | 사용자별 고유 해시값으로 중복 투표 차단              |
| **Merkle Tree**   | 화이트리스트 검증 | 승인된 사용자만 투표 가능 (Closed Poll)    | 현재는 Open Poll 방식으로 미사용                     |
| **ZKP (Groth16)** | 익명성 보장       | 투표 내용을 숨기면서 유효성 증명           | "유효한 투표를 했지만 무엇을 선택했는지는 비밀" 증명 |
| **블록체인**      | 검증 가능한 기록  | Sepolia에 저장, 누구나 확인 가능           | Etherscan에서 투표 기록 검증 가능                    |

---

## 🚀 **빠른 시작**

### **필수 요구사항**

- Node.js 18 이상
- npm 9 이상
- MongoDB (로컬 또는 MongoDB Atlas)
- MetaMask 브라우저 확장 프로그램
- Sepolia 테스트넷 ETH (테스트용)

### **Windows (권장)**

```cmd
# 1. 의존성 설치
npm install --legacy-peer-deps

# 2. 환경 변수 설정
copy env.example.txt .env
# .env 파일을 열어서 다음 값들을 설정:
# - MONGODB_URI: MongoDB 연결 문자열
# - SEPOLIA_RPC_URL: Sepolia RPC 엔드포인트
# - RELAYER_PRIVATE_KEY: Relayer 지갑 개인키
# - VOTING_V2_CONTRACT_ADDRESS: VotingV2 컨트랙트 주소

# 3. 개발 서버 실행
npm run dev
```

### **WSL (선택 사항, 현재 미사용)**

> **참고**: 현재는 브라우저 Web Worker만 사용합니다. WSL Proof 서버는 시연 시 속도 향상을 위한 선택 사항이며, 일반 사용 시에는 불필요합니다.

```bash
# wsl/README.md 참고 (선택 사항)
# 현재는 브라우저 Web Worker만 사용하므로 WSL 설정 불필요
```

→ 브라우저에서 `http://localhost:3000` 접속

**자세한 설정 가이드**: [docs/START_PROJECT.md](docs/START_PROJECT.md) 참고

---

## 📊 **주요 기능**

### **투표 생성자**

- ✅ 템플릿 기반 빠른 생성 (6종)
- ✅ QR 코드 자동 생성
- ✅ 실시간 결과 확인
- ✅ CSV 내보내기
- ✅ Etherscan 링크

### **투표 참여자**

- ✅ MetaMask 지갑으로 인증
- ✅ ZKP 증명 자동 생성
- ✅ 가스비 대납 (Relayer)
- ✅ 익명성 보장 (ZKP 기반)
- ✅ 1인 1표 강제 (Nullifier 기반)

### **시스템 관리자**

- ✅ 통계 대시보드
- ✅ 전체 투표 모니터링
- ✅ 성능 메트릭스

---

## 🛠️ **기술 스택**

### **Frontend**

- Next.js 15 (App Router)
- React 19
- Zustand (상태 관리)
- Tailwind CSS 4

### **Backend**

- Next.js API Routes
- MongoDB + Mongoose
- Ethers.js 6
- Express (Relayer)

### **Blockchain**

- Solidity (Smart Contracts)
- Hardhat (개발/테스트)
- Sepolia Testnet
- Etherscan API

### **Zero-Knowledge Proof**

- Circom (회로 설계)
- snarkjs (증명 생성)
- Groth16 (증명 시스템)
- WebWorker (비동기 처리)

---

## 📡 **주요 API 엔드포인트**

```
POST /api/polls              # 투표 생성
GET  /api/polls?creator=...  # 내 투표 목록
GET  /api/polls/:id/public   # 공개 투표 정보
GET  /api/polls/:id/results  # 투표 결과
GET  /api/polls/:id/export   # CSV 다운로드
POST /api/relay              # 가스비 대납 (Relayer)
GET  /api/stats              # 전체 통계
```

---

## 🎬 **데모 시연 (3분)**

### **1️⃣ 투표 생성 (30초)**

```
1. 템플릿 선택 ("학과 회장 선거")
2. 후보 입력 또는 자동 완성
3. 생성 버튼 클릭
4. QR 코드 자동 생성
```

### **2️⃣ 투표 참여 (1분) - 실제 ZKP!**

```
1. QR 코드 스캔 또는 링크 접속
2. MetaMask 연결
3. 후보 선택
4. 🔐 ZKP 증명 자동 생성 (15초) ⭐
   → build/v1.2/vote.wasm 사용
   → snarkjs.groth16.fullProve() 호출
   → 1300개 제약조건 계산
5. ⛓️ 블록체인 제출 (Relayer 사용)
   → Sepolia 네트워크
   → Groth16Verifier.verifyProof() 호출
6. ✅ Etherscan 링크로 검증 가능
```

### **3️⃣ 결과 확인 + 검증 (30초)**

```
1. 실시간 결과 차트
2. 참여자 수 확인
3. 🔍 Etherscan 링크 클릭 ⭐
   → verifyProof() 호출 기록 확인
   → nullifier 중복 체크 확인
   → 온체인 검증 완료! ✅
```

### **4️⃣ 관리 (30초)**

```
1. CSV 내보내기
2. 투표 삭제
3. 통계 대시보드 확인
```

**⚠️ 중요**:

- `/polls/[pollId]` = 결과 조회 전용
- 실제 투표는 QR 코드를 통해 별도 링크로 이동
- **실제 ZKP 증명 사용** (약 15초 소요, 브라우저에서 실행)

---

## 📚 **프로젝트 구조**

```
zkp_final/
├── contracts/              # Solidity 스마트 컨트랙트
│   ├── zkp/v1.2/          # ZKP 회로 (Circom)
│   └── solidity/          # Voting, Verifier 컨트랙트
├── src/
│   ├── app/               # Next.js 페이지
│   │   ├── page.tsx       # 메인 랜딩
│   │   ├── polls/         # 투표 관리
│   │   └── vote/          # 투표 참여
│   ├── components/        # React 컴포넌트
│   ├── lib/               # 핵심 로직
│   │   ├── zkp.ts         # ZKP 증명 생성
│   │   ├── contract.ts    # 블록체인 연동
│   │   └── api.ts         # API 클라이언트
│   └── models/            # MongoDB 스키마
├── scripts/               # 배포/테스트 스크립트
├── docs/                  # 문서
└── build/v1.2/           # ZKP 빌드 결과물
```

---

## 🔐 **보안 & 검증**

### **ZKP 회로 검증**

```bash
npm run test:zkp
```

### **스마트 컨트랙트 테스트**

```bash
npm run test:blockchain
```

### **백엔드 통합 테스트**

```bash
npm run test:backend
```

### **Etherscan 검증**

- **VotingV2**: [0xE4B4219eb5a12825859104601Fd8d94fFEF1e3d9](https://sepolia.etherscan.io/address/0xE4B4219eb5a12825859104601Fd8d94fFEF1e3d9)
- **Verifier**: [0x6A49b069Eaf2A53ab31723d93bd758310bFeb345](https://sepolia.etherscan.io/address/0x6A49b069Eaf2A53ab31723d93bd758310bFeb345)

자세한 정보는 [docs/blockchain.md](docs/blockchain.md) 참고

---

## 📖 **문서**

### 📌 필수 문서

| 문서                                                 | 설명                            |
| ---------------------------------------------------- | ------------------------------- |
| [docs/START_PROJECT.md](docs/START_PROJECT.md)       | ⭐ 빠른 시작 가이드 (로컬 개발) |
| [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | ⭐ 배포 가이드 (Vercel + 시연)  |
| [docs/SYSTEM.md](docs/SYSTEM.md)                     | ⭐ 시스템 정보 (제한사항, 정책) |

### 📚 참고 문서

| 문서                                                       | 설명                         |
| ---------------------------------------------------------- | ---------------------------- |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md)                   | 사용자 가이드                |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)               | 시스템 아키텍처              |
| [docs/blockchain.md](docs/blockchain.md)                   | 블록체인 정보 (주소, 이벤트) |
| [docs/zkp/zkp-spec-v1.2.md](docs/zkp/zkp-spec-v1.2.md)     | ZKP 기술 명세                |
| [wsl/README.md](wsl/README.md)                             | WSL 설정 가이드              |
| [scripts/README_CHECK_ENV.md](scripts/README_CHECK_ENV.md) | 환경 변수 검증 가이드        |

---

## 🎓 **학술적 기여**

### **논문 참고**

- Groth16: "On the Size of Pairing-based Non-interactive Arguments" (2016)
- Merkle Tree: 중복 투표 방지 메커니즘
- Nullifier: 익명성과 유효성의 균형

### **구현 특징**

- Circom 회로 최적화 (1300 제약조건)
- WebWorker 기반 비동기 증명 생성
- Relayer 패턴으로 UX 개선

---

## 🚀 **배포**

### **통합 배포 (Vercel)** ⭐

**현재 방식**: Next.js 풀스택으로 프론트엔드 + API 통합 배포

```bash
# Vercel에 배포 (프론트 + API 모두 포함)
vercel deploy --prod
```

**포함 내용**:

- ✅ 프론트엔드 (React)
- ✅ API Routes (`/api/*`)
- ✅ Relayer (`/api/relay`)
- ✅ MongoDB 연결

**상세 가이드**: [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

---

### **분리 배포 (선택 - 원래 WBS 방식)**

**원래 계획**: 프론트엔드와 백엔드 분리 배포

```bash
# Frontend (Vercel)
vercel deploy --prod

# Backend: Vercel API Routes로 통합 배포 (별도 서버 불필요)
```

**상세 설정**: Vercel 자동 배포 (GitHub 연동)

**참고**: 현재는 Vercel 통합 배포로 충분하며, 모든 기능 정상 작동합니다.

---

### **Smart Contract (Sepolia)**

```bash
npm run deploy:all
```

---

## 📊 **성능**

- **ZKP 증명 생성**: ~15초 (WebWorker)
- **블록체인 트랜잭션**: ~10초 (Sepolia)
- **동시 접속**: 100+ 사용자 지원
- **데이터베이스**: MongoDB Atlas (Auto-scaling)

---

## 🤝 **기여**

이 프로젝트는 **캡스톤 디자인 프로젝트**로 개발되었습니다.

### **팀원**

- ZKP 회로 설계
- 스마트 컨트랙트 개발
- Frontend 개발
- Backend 개발
- DevOps & 배포
- 문서화

---

## 📄 **라이선스**

MIT License

---

## 🌟 **핵심 차별점 요약**

| 기능          | 기존 투표    | VoteZK                      |
| ------------- | ------------ | --------------------------- |
| **익명성**    | ⚠️ IP 로그   | ✅ ZKP 기반 익명            |
| **검증**      | ❌ 관리자만  | ✅ 누구나 Etherscan         |
| **조작 방지** | ❌ 서버 의존 | ✅ 블록체인 보장            |
| **투명성**    | ❌ 블랙박스  | ✅ 오픈소스 + 온체인        |
| **1인1표**    | ⚠️ 로그인    | ✅ Nullifier + 화이트리스트 |

---

## ⚠️ **중요: 보안 한계 및 권장 사용법**

### **Sybil Attack (다중 계정 공격) 주의**

**문제**: 같은 사람이 여러 MetaMask 계정을 만들면 중복 투표 가능

**해결**: **화이트리스트 방식 권장** ⭐

```typescript
// 사전에 승인된 지갑 주소만 투표 가능
const approvedWallets = [
  '0xAAA...', // 민수
  '0xBBB...', // 영희
  '0xCCC...', // 철수
]
```

### **권장 사용 시나리오**

- ✅ **소규모 선거** (20-100명, 사전 지갑 수집)
- ✅ **NFT 커뮤니티** (NFT 홀더만 투표)
- ✅ **DAO 거버넌스** (토큰 홀더 투표)
- ⚠️ **대규모 공개 투표** (화이트리스트 관리 어려움)

**자세한 내용**: [SECURITY_LIMITATIONS.md](SECURITY_LIMITATIONS.md) 참고

---

<div align="center">

**Made with ⚡ by VoteZK Team**

[GitHub](https://github.com) • [Demo](https://votezk.vercel.app) • [Docs](docs/)

</div>
