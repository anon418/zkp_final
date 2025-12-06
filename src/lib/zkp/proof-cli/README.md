# proof-cli (beta)

두 가지 실행 모드를 제공합니다.

1. **CLI 모드** – 로컬에서 입력 JSON을 받아 증명/공개 신호를 생성하고 파일로 저장.
2. **Server 모드** – Express 기반 REST API(`/prove`)로 느린 기기 대신 서버가 증명을 생성.

## CLI

```bash
# v1.2 사용
npm run proof:cli:v1.2
```

또는 직접 실행:

```bash
ts-node tools/proof-cli/cli.ts \
  --wasm build/v1.2/vote_js/vote.wasm \
  --zkey build/v1.2/vote_final.zkey \
  --input fixtures/input.v1.2.sample.json \
  --out out/proof.json
```

출력 파일에는 `{ proof, publicSignals, ms }`가 JSON 형태로 저장됩니다.

## Server

```bash
# v1.2 사용
npm run proof:server:v1.2
```

또는 직접 실행:

```bash
ts-node tools/proof-cli/server.ts \
  --port 8787 \
  --wasm build/v1.2/vote_js/vote.wasm \
  --zkey build/v1.2/vote_final.zkey
```

- `POST /prove` : `{ "input": { ...snark input... } }` (백워드 호환으로 body 전체를 input으로 보내도 됩니다.)
- `GET /health` : 큐 상태·동시성 확인.
- `GET /metrics` : `prom-client` 기본 지표 + `proof_cli_latency_ms`.
- Express JSON limit 1MB, CORS 화이트리스트: `*.vercel.app`, `http://localhost:3000`.

요청 예시:

```bash
curl -X POST http://localhost:8787/prove \
  -H "Content-Type: application/json" \
  -d "{\"input\": $(cat fixtures/input.v1.2.sample.json)}"
```

## TODO

- 인증/레이트 리밋 옵션
- 입력 검증(Zod 스키마) 연동
- /health, /metrics 엔드포인트
