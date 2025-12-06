#!/bin/bash
###############################################################################
# WSL Proof 서버 (라즈베리파이 #1 대체)
# 
# 역할:
# - 브라우저/느린 기기에서 증명 생성 요청 받기
# - build/v1.2/vote.wasm, vote_final.zkey 사용
# - HTTP API로 Proof 반환
#
# 사용법:
#   chmod +x wsl/proof-server.sh
#   ./wsl/proof-server.sh
#
# 또는 자동 시작:
#   wsl/install-service.sh
###############################################################################

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 WSL Proof 서버 시작...${NC}"

# 프로젝트 루트 찾기
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 프로젝트 루트: $PROJECT_ROOT${NC}"

# Node.js 설치 확인
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js가 설치되지 않았습니다!${NC}"
    echo "설치 방법:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

# npm 패키지 확인
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 npm 패키지 설치 중...${NC}"
    npm install
fi

# ZKP 파일 확인
if [ ! -f "build/v1.2/vote_js/vote.wasm" ]; then
    echo -e "${RED}❌ vote.wasm이 없습니다!${NC}"
    echo "빌드 필요: npm run build:zkp"
    exit 1
fi

if [ ! -f "build/v1.2/vote_final.zkey" ]; then
    echo -e "${RED}❌ vote_final.zkey가 없습니다!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ZKP 파일 확인 완료${NC}"

# 포트 설정
PORT=${PROOF_SERVER_PORT:-8787}

echo -e "${YELLOW}🌐 Proof 서버 포트: $PORT${NC}"
echo -e "${YELLOW}📡 API 엔드포인트: http://localhost:$PORT/prove${NC}"

# 서버 실행
echo -e "${GREEN}🔥 서버 시작...${NC}\n"

npx ts-node src/lib/zkp/proof-cli/server.ts \
  --port $PORT \
  --wasm build/v1.2/vote_js/vote.wasm \
  --zkey build/v1.2/vote_final.zkey \
  --verbose

# Ctrl+C 종료 처리
trap "echo -e '\n${YELLOW}🛑 서버 종료됨${NC}'; exit 0" INT TERM
