#!/bin/bash
###############################################################################
# WSL Proof 서버 자동 시작 설정
# 
# WSL 시작 시 자동으로 Proof 서버를 백그라운드에서 실행
# 
# 사용법:
#   chmod +x wsl/install-service.sh
#   ./wsl/install-service.sh
#
# 확인:
#   ./wsl/status.sh
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 WSL Proof 서버 자동 시작 설정...${NC}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_HOME="$HOME"

# systemd 사용 여부 확인
if command -v systemctl &> /dev/null; then
    echo -e "${YELLOW}📋 systemd 사용 가능 - systemd service 설치${NC}"
    
    # systemd 서비스 파일 생성
    SERVICE_FILE="/etc/systemd/system/zkp-proof-server.service"
    
    sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=ZKP Proof Server (VoteZK)
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_ROOT
Environment="PATH=/usr/bin:/usr/local/bin:$HOME/.nvm/versions/node/v18.0.0/bin"
Environment="PROOF_SERVER_PORT=8787"
ExecStart=$PROJECT_ROOT/wsl/proof-server.sh
Restart=always
RestartSec=10
StandardOutput=append:/var/log/zkp-proof-server.log
StandardError=append:/var/log/zkp-proof-server.error.log

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable zkp-proof-server
    sudo systemctl start zkp-proof-server
    
    echo -e "${GREEN}✅ systemd 서비스 설치 완료${NC}"
    echo "상태 확인: sudo systemctl status zkp-proof-server"
    echo "로그 확인: sudo journalctl -u zkp-proof-server -f"
    
else
    # systemd 없으면 cron 사용
    echo -e "${YELLOW}📋 systemd 없음 - @reboot cron 설정${NC}"
    
    CRON_LINE="@reboot cd $PROJECT_ROOT && ./wsl/proof-server.sh >> /var/log/zkp-proof-server.log 2>&1 &"
    
    # 기존 cron에 추가
    (crontab -l 2>/dev/null | grep -v "zkp-proof-server"; echo "$CRON_LINE") | crontab -
    
    echo -e "${GREEN}✅ cron 설정 완료${NC}"
    echo "확인: crontab -l"
fi

# 상태 확인 스크립트 생성
cat > "$PROJECT_ROOT/wsl/status.sh" <<'EOF'
#!/bin/bash
# Proof 서버 상태 확인

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PORT=${PROOF_SERVER_PORT:-8787}

echo -e "${YELLOW}🔍 ZKP Proof 서버 상태 확인...${NC}\n"

# 프로세스 확인
if pgrep -f "proof-cli/server.ts" > /dev/null; then
    echo -e "${GREEN}✅ 프로세스: 실행 중${NC}"
    echo "   PID: $(pgrep -f "proof-cli/server.ts")"
else
    echo -e "${RED}❌ 프로세스: 중지됨${NC}"
fi

# 포트 확인
if nc -z localhost $PORT 2>/dev/null; then
    echo -e "${GREEN}✅ 포트 $PORT: 열림${NC}"
else
    echo -e "${RED}❌ 포트 $PORT: 닫힘${NC}"
fi

# API 테스트
if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API: 응답 정상${NC}"
else
    echo -e "${RED}❌ API: 응답 없음${NC}"
fi

echo ""
EOF

chmod +x "$PROJECT_ROOT/wsl/status.sh"

echo -e "\n${GREEN}✅ 설치 완료!${NC}"
echo -e "\n📋 명령어:"
echo "  상태 확인: ./wsl/status.sh"
echo "  수동 시작: ./wsl/proof-server.sh"
echo "  서비스 중지: sudo systemctl stop zkp-proof-server"
echo "  서비스 재시작: sudo systemctl restart zkp-proof-server"
