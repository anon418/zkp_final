# VoteZK 상세 개요

> README에서 간략히 설명한 내용의 상세 버전

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

## 🔧 **상세 작동 원리**

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

## 📊 **성능**

- **ZKP 증명 생성**: ~15초 (WebWorker)
- **블록체인 트랜잭션**: ~10초 (Sepolia)
- **동시 접속**: 100+ 사용자 지원
- **데이터베이스**: MongoDB Atlas (Auto-scaling)

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

**자세한 내용**: [LIMITATIONS.md](./LIMITATIONS.md) 참고

