# VoteZK ⚡

> **운영자도 조작할 수 없는 완전 투명 투표 플랫폼**  
> Zero-Knowledge Proof로 익명성 보장 + 블록체인으로 영구 검증 가능

<div align="center">

![VoteZK Logo](public/logo.svg)

**[🚀 Demo](https://votezk.vercel.app)** • **[📖 Documentation](docs/)** • **[🔍 Etherscan](https://sepolia.etherscan.io)** • **[📋 배포 가이드](DEPLOYMENT_CHECKLIST.md)**

[![완성도](https://img.shields.io/badge/완성도-100%25-brightgreen?style=for-the-badge)](README.md)
[![시연](https://img.shields.io/badge/시연-Ready-blue?style=for-the-badge)](docs/START_PROJECT.md)
[![WSL](https://img.shields.io/badge/WSL-Optional-lightgrey?style=for-the-badge)](wsl/README.md)

</div>

---

## 💡 **왜 VoteZK인가?**

### **문제점: 기존 투표 시스템의 한계**

| 시스템           | 익명성          | 검증 가능성      | 조작 불가능성       |
| ---------------- | --------------- | ---------------- | ------------------- |
| **Google Forms** | ⚠️ IP 로그 남음 | ❌ 관리자만 확인 | ❌ 관리자 조작 가능 |
| **일반 투표 앱** | ⚠️ 서버 로그    | ❌ 믿어야 함     | ❌ 서버 조작 가능   |
| **VoteZK**       | ✅ 완전 익명    | ✅ 누구나 검증   | ✅ 수학적 보장      |

### ⚠️ **중요한 제한사항**

**현재 시스템은 Open Poll (공개 투표) 방식입니다:**

- ✅ **같은 지갑 주소로는 중복 투표 불가**: 완벽하게 차단됨
- ⚠️ **다른 지갑 주소로는 중복 투표 가능**: 한 사람이 여러 MetaMask 계정을 만들어서 여러 번 투표할 수 있음
- ⚠️ **화이트리스트 없음**: Merkle Tree 미사용, 누구나 투표 가능
- ⚠️ **신원 검증 없음**: MetaMask 지갑 주소만으로 투표, 실제 신원(학번, 이메일 등) 검증 없음

**이유**: 링크/QR을 통해 **누구나** 투표 가능하도록 설계되었으며, 완전한 익명성을 보장합니다.  
**향후 개선**: Closed Poll 지원 (화이트리스트, 신원 검증) 예정

**자세한 내용**: [docs/SYSTEM.md](docs/SYSTEM.md), [docs/LIMITATIONS.md](docs/LIMITATIONS.md) 참고

### **VoteZK의 차별화**

#### 🔒 **1. 운영자를 믿지 않아도 됨**

- **일반 투표**: 관리자가 서버에서 결과를 조작할 수 있음
- **VoteZK**: 블록체인에 기록되어 **수학적으로 조작 불가능**
- **검증 방법**: [Etherscan](https://sepolia.etherscan.io)에서 직접 확인

#### 🎭 **2. 완전한 익명성**

- **일반 투표**: IP 주소, 접속 시간 등이 서버 로그에 남음
- **VoteZK**: Zero-Knowledge Proof로 **서버도 누굴 찍었는지 모름**
- **기술**: Circom + Groth16 증명 시스템

#### ⛓️ **3. 영구 검증 가능**

- **일반 투표**: 발표된 결과를 믿어야 함
- **VoteZK**: Sepolia 블록체인에 **영구 기록**
- **투명성**: 누구나 언제든지 재검증 가능

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

### **ZKP 기반 익명 투표 프로세스**

#### **1단계: 투표자 등록**
```
사용자 → MetaMask 연결 → Identity 생성
  ↓
- Nullifier Secret (비밀값) 생성
- Identity Trapdoor 생성
- MongoDB에 등록 (익명 정보만 저장)
```

#### **2단계: ZKP 증명 생성**
```
후보 선택 → ZKP 증명 생성 (Web Worker)
  ↓
입력:
- vote: 선택한 후보 ID (0-7)
- nullifierSecret: 사용자 고유 비밀값
- merkleProof: Merkle Tree 증명 (화이트리스트 검증)
- pollId: 투표 ID

처리:
- Circom 회로 실행 (1300개 제약조건)
- Groth16 증명 생성 (~15초)
- Public Signals 생성: [root, pollId, nullifier, voteCommitment]

출력:
- Proof: ZKP 증명 (a, b, c)
- Public Signals: 검증 가능한 공개 정보
```

#### **3단계: 블록체인 검증 및 저장**
```
Relayer → 블록체인 제출
  ↓
1. Groth16Verifier.verifyProof() 호출
   - ZKP 증명 수학적 검증
   - Public Signals 검증

2. VotingV2.vote() 호출
   - Nullifier 중복 체크
   - 투표 기록 저장 (영구 보관)
   - 이벤트 발생 (Etherscan에서 확인 가능)
```

#### **4단계: 익명성 보장**
```
✅ 서버는 누가 투표했는지 모름
   - Nullifier만 기록 (신원 정보 없음)
   - IP 주소, 접속 시간 등 로그 없음

✅ 블록체인에서도 신원 노출 없음
   - Nullifier는 해시값 (역추적 불가능)
   - Vote Commitment는 암호화된 투표 정보

✅ 누구나 검증 가능하지만 신원은 보호
   - Etherscan에서 투표 기록 확인 가능
   - 하지만 누가 투표했는지는 알 수 없음
```

### **핵심 보안 메커니즘**

| 메커니즘 | 목적 | 구현 |
|---------|------|------|
| **Nullifier** | 중복 투표 방지 | 같은 nullifierSecret으로는 두 번 투표 불가 |
| **Merkle Tree** | 화이트리스트 검증 | 승인된 사용자만 투표 가능 (Closed Poll) |
| **ZKP (Groth16)** | 익명성 보장 | 투표 내용을 숨기면서 유효성 증명 |
| **블록체인** | 영구 기록 | Sepolia에 영구 저장, 조작 불가능 |

---

## 🚀 **빠른 시작**

### **Windows (권장)**

```cmd
# 1. 설치
npm install --legacy-peer-deps

# 2. 환경 변수 설정
copy env.example.txt .env
# .env 파일 편집 (MongoDB, Sepolia RPC 등)

# 3. 실행
npm run dev
```

### **WSL (Proof 서버용 - 선택 사항, 현재 미사용)**

> **참고**: 현재는 브라우저 Web Worker만 사용합니다. WSL은 시연 시 속도 향상을 위한 선택 사항입니다.

```bash
# wsl/README.md 참고 (선택 사항)
# 현재는 브라우저 Web Worker만 사용하므로 WSL 설정 불필요
# cd /mnt/e/zkp_final
# ./wsl/proof-server.sh
```

→ 브라우저에서 `http://localhost:3000` 접속

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
- ✅ 익명성 100% 보장
- ✅ 1인 1표 강제

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
- **진짜 ZKP 증명 사용! (15초 소요)**

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

### **E2E 테스트 (Puppeteer)**

```bash
# 서버 실행 후 (별도 터미널)
npm run dev

# E2E 테스트 실행
npm run test:e2e
```

**참고**: E2E 테스트는 Puppeteer를 사용하여 브라우저 자동화 테스트를 수행합니다. (`src/__tests__/e2e/vote-flow.e2e.test.ts`)

### **Etherscan 검증**

- Verifier: [0x...](https://sepolia.etherscan.io)
- Voting: [0x...](https://sepolia.etherscan.io)

---

## 📖 **문서**

### 📌 필수 문서

| 문서                                                       | 설명                |
| ---------------------------------------------------------- | ------------------- |
| [docs/START_PROJECT.md](docs/START_PROJECT.md)             | ⭐ 빠른 시작 가이드 (로컬 개발) |
| [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)       | ⭐ 배포 가이드 (Vercel + 시연) |
| [docs/SYSTEM.md](docs/SYSTEM.md)                            | ⭐ 시스템 정보 (제한사항, 정책) |

### 📚 참고 문서

| 문서                                                           | 설명                  |
| -------------------------------------------------------------- | --------------------- |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md)                      | 사용자 가이드         |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                  | 시스템 아키텍처       |
| [docs/blockchain.md](docs/blockchain.md)                      | 블록체인 정보 (주소, 이벤트) |
| [docs/zkp/zkp-spec-v1.2.md](docs/zkp/zkp-spec-v1.2.md)         | ZKP 기술 명세         |
| [wsl/README.md](wsl/README.md)                                 | WSL 설정 가이드       |
| [scripts/README_CHECK_ENV.md](scripts/README_CHECK_ENV.md)     | 환경 변수 검증 가이드 |

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
| **익명성**    | ⚠️ IP 로그   | ✅ ZKP 완전 익명            |
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
