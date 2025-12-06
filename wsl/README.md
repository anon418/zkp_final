# 🐧 WSL 설정 가이드 (선택 사항 - 현재 미사용)

> ⚠️ **중요**: 현재 시스템은 **브라우저 Web Worker만 사용**합니다.  
> WSL Proof Server는 **선택 사항**이며, 시연 시 속도 향상을 원할 때만 사용합니다.

---

## 📌 현재 상태

### ✅ **현재 작동 방식**

- **브라우저 Web Worker**에서 직접 ZKP 증명 생성
- **소요 시간**: 약 15-20초 (기기 성능에 따라 다름)
- **추가 인프라 불필요**: WSL 설정 없이 바로 사용 가능

### ❓ **WSL Proof Server의 목적** (선택 사항)

- **느린 기기(노트북)를 위한 오프로딩**
- 서버에서 증명을 생성하여 브라우저 부하 감소
- **예상 소요 시간**: 3-6초 (서버 성능이 더 좋은 경우)
- **속도 향상**: 약 3-5배 (15-20초 → 3-6초)

---

## 🎯 WSL의 역할 (선택 사항)

### 1️⃣ Pi #1 역할: ZKP 증명 서버 (선택)

- **기능**: 느린 기기(노트북)를 위한 Proof 생성 오프로딩
- **포트**: 8787
- **API**: POST `/prove` - ZKP 증명 생성 요청 처리
- **장점**: PC보다 가볍고 항상 실행 가능
- **현재 상태**: ❌ **미사용** (브라우저 Web Worker 사용 중)

### 2️⃣ Pi #2 역할: 트랜잭션 브로드캐스터 (Relayer 통합)

- **기능**: Relayer API가 이미 구현됨
- **WSL에서**: 추가 Relayer 인스턴스 실행 (선택)
- **현재**: Next.js API Routes가 Relayer 역할 수행 중 ✅

---

## 💡 사용 여부 결정

### ✅ **WSL을 사용하지 않는 경우** (현재 방식)

- ✅ 브라우저 Web Worker만으로 충분히 작동
- ✅ 추가 인프라 관리 불필요
- ✅ 코드 수정 없이 바로 사용 가능
- ✅ 대부분의 사용자에게 15-20초면 충분히 빠름

### ❓ **WSL을 사용하는 경우** (선택 사항)

- 시연 시 속도가 매우 중요할 때 (15초 → 3-6초)
- 저사양 기기 지원이 필요할 때
- 코드 수정 및 인프라 관리가 가능할 때

**자세한 분석**: [wsl/COST_BENEFIT_ANALYSIS.md](COST_BENEFIT_ANALYSIS.md), [wsl/WHY_WSL.md](WHY_WSL.md) 참고

---

## 📦 사전 준비 (WSL 사용 시)

### 1. WSL 설치 확인

```bash
wsl --version
```

### 2. WSL Ubuntu 설치

```bash
wsl --install -d Ubuntu-22.04
```

### 3. 프로젝트 복사

```bash
# Windows에서 WSL로 접근
cd /mnt/e/zkp_final

# 또는 WSL 홈으로 복사
cp -r /mnt/e/zkp_final ~/zkp_final
cd ~/zkp_final
```

---

## 🚀 빠른 시작 (WSL 사용 시)

### 1. npm 패키지 설치

```bash
npm install --legacy-peer-deps
```

### 2. ZKP 파일 확인

```bash
# 빌드 파일 확인
ls -lh build/v1.2/vote_js/vote.wasm
ls -lh build/v1.2/vote_final.zkey
```

### 3. Proof 서버 실행

```bash
# 실행 권한 부여
chmod +x wsl/*.sh

# 줄바꿈 변환 (Windows → Linux)
sed -i 's/\r$//' wsl/*.sh

# 서버 실행
./wsl/proof-server.sh
```

### 4. 상태 확인

```bash
# Health check
curl http://localhost:8787/health
```

---

## 🔧 자동 시작 설정 (WSL 사용 시)

### systemd 사용 (권장)

```bash
./wsl/install-service.sh
```

### 수동 실행

```bash
./wsl/proof-server.sh
```

---

## 📝 참고 문서

- [wsl/WHY_WSL.md](WHY_WSL.md) - WSL을 사용하는 이유
- [wsl/COST_BENEFIT_ANALYSIS.md](COST_BENEFIT_ANALYSIS.md) - 비용-효과 분석
- [wsl/FIX_WSL_SCRIPTS.md](FIX_WSL_SCRIPTS.md) - 트러블슈팅 가이드

---

## ⚠️ 중요 사항

**현재 시스템은 WSL 없이도 완전히 작동합니다.**

- 브라우저 Web Worker에서 직접 ZKP 증명 생성
- 추가 인프라 불필요
- Vercel 배포만으로 충분

**WSL은 시연 시 속도 향상을 원할 때만 선택적으로 사용하세요.**
