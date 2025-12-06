# 🔧 WSL 스크립트 실행 오류 해결

## 문제

```bash
./wsl/proof-server.sh
-bash: ./wsl/proof-server.sh: cannot execute: required file not found
```

## 원인

Windows에서 생성된 파일은 CRLF(`\r\n`) 줄바꿈을 사용하지만, Linux/WSL은 LF(`\n`)만 사용합니다.  
이로 인해 shebang(`#!/bin/bash`)이 제대로 인식되지 않습니다.

## 해결 방법

### 방법 1: dos2unix 사용 (권장)

```bash
# dos2unix 설치
sudo apt-get update
sudo apt-get install -y dos2unix

# 줄바꿈 변환
dos2unix wsl/*.sh

# 실행 권한 부여
chmod +x wsl/*.sh

# 실행
./wsl/proof-server.sh
```

### 방법 2: sed 사용 (dos2unix 없을 때)

```bash
# 줄바꿈 변환
sed -i 's/\r$//' wsl/*.sh

# 실행 권한 부여
chmod +x wsl/*.sh

# 실행
./wsl/proof-server.sh
```

### 방법 3: 수동 변환

```bash
# 각 파일을 열어서 수동으로 변환
# 또는 Git 설정으로 자동 변환
git config core.autocrlf input
```

## 빠른 해결 (한 번에)

```bash
# WSL에서 실행
cd /mnt/e/zkp_final

# dos2unix 설치 (없다면)
sudo apt-get update && sudo apt-get install -y dos2unix

# 줄바꿈 변환 + 실행 권한 부여
dos2unix wsl/*.sh && chmod +x wsl/*.sh

# 실행 테스트
./wsl/proof-server.sh
```

## 확인

```bash
# 파일 형식 확인
file wsl/proof-server.sh
# 출력: wsl/proof-server.sh: Bourne-Again shell script, ASCII text executable

# 줄바꿈 확인 (CRLF면 문제)
cat -A wsl/proof-server.sh | head -1
# LF만 있으면: #!/bin/bash$
# CRLF면: #!/bin/bash^M$
```

## 추가 문제 해결

### 문제: "node: command not found"

```bash
# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 문제: "vote.wasm not found"

```bash
# Windows에서 빌드 후 복사
# 또는 WSL에서 직접 빌드
npm run build:zkp
```

### 문제: "Permission denied"

```bash
# 실행 권한 부여
chmod +x wsl/*.sh
```

---

**완료!** 이제 스크립트가 정상적으로 실행됩니다! 🎉

