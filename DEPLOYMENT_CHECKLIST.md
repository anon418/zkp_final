# 🚀 배포 체크리스트 & 가이드

## ✅ 배포 준비 상태 확인

### 1. 코드 상태
- [x] 모든 요구사항 구현 완료
- [x] 오류 없음 (linter 통과)
- [x] 환경 변수 정의 완료
- [x] `.gitignore` 설정 완료
- [x] `vercel.json` 설정 완료

### 2. 시연 시나리오 확인
- [x] 관리자 플로우: `/vote/new` → 투표 생성 → QR 공유
- [x] 참여자 플로우: QR 스캔 → 지갑 연결 → 증명 생성 → 제출
- [x] 중복 방지: 같은 계정 재투표 → 409 에러
- [x] 결과 확인: 실시간 차트 + Etherscan 링크

**결론**: ✅ **현재 상태로 GitHub 배포 가능!**

---

## 📦 1. GitHub 배포

### Step 1: Git 초기화 (아직 안 했다면)

```bash
# 현재 디렉토리에서
git init

# .gitignore 확인 (이미 설정됨)
cat .gitignore

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: ZKP Voting Platform v2.0"

# GitHub 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: GitHub 저장소 생성

1. https://github.com 접속
2. "New repository" 클릭
3. Repository name: `zkp-voting-platform` (또는 원하는 이름)
4. **Public** 또는 **Private** 선택
5. "Create repository" 클릭
6. 위 명령어 실행

### Step 3: 배포 전 최종 확인

```bash
# 환경 변수 검증
npm run check:env

# 빌드 테스트
npm run build

# 테스트 실행
npm test
```

---

## 🌐 2. Vercel 배포

### Step 1: Vercel 프로젝트 생성

1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. "Add New..." → "Project" 클릭
4. GitHub 저장소 선택
5. 프로젝트 설정:
   - **Framework Preset**: Next.js (자동 감지)
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build` (자동)
   - **Output Directory**: `.next` (자동)
   - **Install Command**: `npm install --legacy-peer-deps` (자동)

### Step 2: 환경 변수 설정 (중요!)

Vercel Dashboard → Settings → Environment Variables에서 다음을 추가:

#### 필수 환경 변수 (서버 사이드)

```bash
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority

# Sepolia RPC (INFURA_URL 또는 ALCHEMY_URL 중 하나)
INFURA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# 또는
ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Relayer 지갑 (가스 대납용)
RELAYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE_64_CHARS

# 컨트랙트 주소 (Sepolia에 배포된 주소)
CHAIN_ID=11155111
VOTING_V2_ADDRESS=0x6f75A7759b65C951E256BF9A90B7b1eE769ACD67
VERIFIER_ADDRESS=0x88984d59545FcABC3525F3237Ee276a655Db7AAe

# 기능 활성화
USE_VOTING_V2=true
ENABLE_RELAYER=true
```

#### 프론트엔드 환경 변수 (선택 - 자동 fallback 있음)

```bash
# Vercel 배포 후 자동으로 설정됨 (수동 설정 불필요)
# NEXT_PUBLIC_API_URL=https://your-project.vercel.app
# NEXT_PUBLIC_CHAIN_ID=11155111
# NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS=0x6f75A7759b65C951E256BF9A90B7b1eE769ACD67
```

**⚠️ 중요**: 
- `RELAYER_PRIVATE_KEY`는 **절대 GitHub에 커밋하지 마세요!**
- Vercel Dashboard에서만 설정
- `.env` 파일은 `.gitignore`에 포함됨

### Step 3: 배포 실행

1. "Deploy" 버튼 클릭
2. 또는 GitHub에 푸시하면 자동 배포:
   ```bash
   git push origin main
   ```

### Step 4: 배포 확인

1. Vercel Dashboard에서 배포 상태 확인
2. 배포 완료 후 URL 확인: `https://your-project.vercel.app`
3. 브라우저에서 접속 테스트

---

## 🐧 3. WSL 설정 (이미 설치된 상태)

### Step 1: WSL 확인

```powershell
# PowerShell에서
wsl --version
# 또는
wsl --list --verbose
```

### Step 2: 프로젝트 접근

```bash
# WSL 터미널 열기
wsl

# Windows 드라이브 접근
cd /mnt/e/zkp_final
# 또는 프로젝트 경로에 따라
cd /mnt/c/Users/YOUR_USERNAME/path/to/zkp_final
```

### Step 3: Node.js 설치 확인

```bash
# Node.js 버전 확인
node --version  # v18.x.x 이상 필요

# 없으면 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 4: 의존성 설치

```bash
# 프로젝트 루트에서
npm install --legacy-peer-deps
```

### Step 5: ZKP 빌드 파일 확인

```bash
# 빌드 파일 확인
ls -lh build/v1.2/vote_js/vote.wasm
ls -lh build/v1.2/vote_final.zkey

# 없으면 Windows에서 빌드 후 복사
# Windows PowerShell:
# npm run build:zkp
```

### Step 6: Proof 서버 실행

```bash
# 스크립트 실행 권한 부여
chmod +x wsl/*.sh

# Proof 서버 실행
./wsl/proof-server.sh
```

**출력 예시**:
```
🚀 WSL Proof 서버 시작...
📁 프로젝트 루트: /mnt/e/zkp_final
✅ ZKP 파일 확인 완료
🌐 Proof 서버 포트: 8787
📡 API 엔드포인트: http://localhost:8787/prove
🔥 서버 시작...
```

### Step 7: 자동 시작 설정 (선택)

```bash
# systemd 서비스 설치
./wsl/install-service.sh

# 상태 확인
sudo systemctl status zkp-proof-server

# 로그 확인
sudo journalctl -u zkp-proof-server -f
```

### Step 8: 프론트엔드 연동 (로컬 개발 시)

**`.env.local` 파일 생성** (프로젝트 루트):

```bash
# WSL Proof 서버 URL
NEXT_PUBLIC_PROOF_SERVER_URL=http://localhost:8787
```

**로컬 개발 서버 실행**:

```bash
# Windows PowerShell 또는 다른 터미널
npm run dev
```

**접속**: http://localhost:3000

---

## 🎬 시연 시나리오 확인

### 시나리오 1: Vercel만 사용 (기본)

1. **관리자**: Vercel URL 접속 → `/vote/new` → 투표 생성 → QR 공유
2. **참여자**: QR 스캔 → 지갑 연결 → 증명 생성 (15초) → 제출
3. **결과**: 실시간 차트 + Etherscan 링크

**장점**: 간단, 배포만 하면 됨  
**단점**: 증명 생성이 느림 (15초)

### 시나리오 2: Vercel + WSL (빠름)

1. **관리자**: Vercel URL 접속 → `/vote/new` → 투표 생성 → QR 공유
2. **WSL**: Proof 서버 실행 (`./wsl/proof-server.sh`)
3. **참여자**: QR 스캔 → 지갑 연결 → 증명 생성 (3-6초) → 제출
4. **결과**: 실시간 차트 + Etherscan 링크

**장점**: 증명 생성 빠름 (3-6초)  
**단점**: WSL 설정 필요

**⚠️ 주의**: WSL은 로컬 개발 시에만 사용. Vercel 배포는 그대로 사용.

---

## 🔍 배포 후 확인 사항

### 1. Vercel 배포 확인

```bash
# Vercel URL 접속
https://your-project.vercel.app

# 헬스 체크
https://your-project.vercel.app/api/health

# 메트릭스 확인
https://your-project.vercel.app/api/metrics
```

### 2. 환경 변수 확인

```bash
# Vercel Dashboard → Settings → Environment Variables
# 모든 필수 변수가 설정되었는지 확인
```

### 3. MongoDB 연결 확인

- MongoDB Atlas → Network Access → IP 화이트리스트
- Vercel은 동적 IP 사용 → `0.0.0.0/0` 허용 (개발용)

### 4. Relayer 지갑 잔액 확인

- Sepolia Faucet: https://sepoliafaucet.com
- 최소 0.5 ETH 권장

### 5. 컨트랙트 주소 확인

- Etherscan: https://sepolia.etherscan.io
- `VOTING_V2_ADDRESS`와 일치하는지 확인

---

## 🚨 문제 해결

### 문제 1: 빌드 실패

```bash
# 로컬에서 빌드 테스트
npm run build

# 오류 확인 후 수정
```

### 문제 2: 환경 변수 누락

```bash
# Vercel Dashboard에서 확인
# 모든 필수 변수가 설정되었는지 확인
```

### 문제 3: MongoDB 연결 실패

- MongoDB Atlas → Network Access → IP 화이트리스트 확인
- `0.0.0.0/0` 허용 (개발용)

### 문제 4: Relayer 실패

- Relayer 지갑 잔액 확인
- Sepolia ETH 충전: https://sepoliafaucet.com

### 문제 5: WSL Proof 서버 연결 실패

```bash
# WSL에서 서버 실행 확인
./wsl/status.sh

# 포트 확인
netstat -tuln | grep 8787

# 프론트엔드에서 URL 확인
# .env.local에 NEXT_PUBLIC_PROOF_SERVER_URL=http://localhost:8787 설정
```

---

## ✅ 최종 체크리스트

### 배포 전
- [ ] Git 초기화 및 커밋 완료
- [ ] GitHub 저장소 생성 및 푸시 완료
- [ ] 로컬 빌드 테스트 통과 (`npm run build`)
- [ ] 환경 변수 검증 통과 (`npm run check:env`)

### Vercel 배포
- [ ] Vercel 프로젝트 생성 완료
- [ ] 모든 필수 환경 변수 설정 완료
- [ ] 배포 성공 확인
- [ ] 헬스 체크 통과 (`/api/health`)

### WSL 설정 (선택)
- [ ] WSL 설치 확인
- [ ] Node.js 설치 확인
- [ ] 의존성 설치 완료
- [ ] Proof 서버 실행 성공
- [ ] 자동 시작 설정 완료 (선택)

### 시연 준비
- [ ] Vercel URL 확인
- [ ] Relayer 지갑 잔액 확인
- [ ] MongoDB 연결 확인
- [ ] 컨트랙트 주소 확인
- [ ] 시연 시나리오 테스트 완료

---

## 📞 지원

**문제 발생 시**:
1. Vercel Dashboard → Deployments → 로그 확인
2. MongoDB Atlas → Logs 확인
3. WSL 로그: `sudo journalctl -u zkp-proof-server -f`

**완료!** 🎉

