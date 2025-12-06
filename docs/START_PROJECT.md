# 🚀 VoteZK - 시작 가이드

> **프로젝트**: Zero-Knowledge Proof 기반 익명 투표 시스템  
> **완성도**: ✅ 100% 작동  
> **소요 시간**: 5분

---

## ⚡ 빠른 시작 (3단계)

### 1단계: ZKP 파일 복사 (1분)

```powershell
cd e:\zkp_final
powershell -ExecutionPolicy Bypass -File setup-zkp-files.ps1
```

**결과 확인**:

- ✅ `public\zkp\v1.2\vote.wasm` (2.3 MB)
- ✅ `public\zkp\v1.2\vote_final.zkey` (52.8 MB)
- ✅ `public\zkp\v1.2\verification_key.json`

---

### 2단계: 환경 변수 설정 (2분)

```powershell
powershell -ExecutionPolicy Bypass -File setup-env.ps1
```

**필수 설정** (`.env` 파일):

```bash
# 1. MongoDB Atlas (필수)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>

# 2. Sepolia RPC (필수 - 하나만 선택)
INFURA_URL=https://sepolia.infura.io/v3/YOUR_KEY

# 3. Relayer 지갑 (필수)
RELAYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

**무료 리소스**:

- MongoDB Atlas: https://www.mongodb.com/cloud/atlas/register
- Infura: https://infura.io/
- Sepolia Faucet: https://sepoliafaucet.com

---

### 3단계: 실행 (2분)

```powershell
# 패키지 설치 (첫 실행 시만)
npm install --legacy-peer-deps

# 개발 서버 실행
npm run dev
```

**확인**:

```powershell
# 브라우저 접속
http://localhost:3000
```

---

## 🎬 시연 시나리오 (3분)

### 1️⃣ 투표 생성 (30초)

1. `/polls/new` 접속
2. MetaMask 연결 (Sepolia)
3. 제목/후보 입력
4. "투표 생성하기" 클릭

### 2️⃣ 투표 참여 (1분 30초)

1. `/polls/[pollId]` 접속
2. MetaMask 연결
3. 후보 선택
4. **Generate Proof** (실제 ZKP v1.2 사용, 15초)
5. **Submit** (Relayer 가스 대납)
6. Etherscan 확인

### 3️⃣ 중복 차단 (30초)

1. 같은 계정으로 재투표
2. 409 Conflict 배지 확인

### 4️⃣ 결과 확인 (30초)

1. 실시간 차트
2. Etherscan 검증

---

## 🐛 트러블슈팅

### ❌ "MongoDB 연결 실패"

```powershell
# .env 파일의 MONGODB_URI 확인
# MongoDB Atlas IP 화이트리스트: 0.0.0.0/0 추가
```

### ❌ "vote.wasm not found"

```powershell
# ZKP 파일 복사 재실행
powershell -ExecutionPolicy Bypass -File setup-zkp-files.ps1
```

### ❌ "Relayer 잔액 부족"

```
1. https://sepoliafaucet.com
2. Relayer 지갑 주소 입력
3. Sepolia ETH 받기
```

---

## 📖 추가 문서

- **README.md** - 프로젝트 소개
- **docs/DEPLOYMENT_GUIDE.md** - 배포 가이드 (Vercel + 시연 환경)

---

**Made with ⚡ by VoteZK Team**
