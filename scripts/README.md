# scripts/ 폴더 설명

## 목적
**수동 실행 유틸리티 스크립트** - 빌드, 배포, 검증 등 개발 작업을 수행하는 도구

## 특징
- **수동 실행**: 필요할 때 직접 실행
- **작업 수행**: 테스트가 아닌 실제 작업 (빌드, 배포 등)
- **유연한 실행**: npm scripts 또는 직접 실행 가능
- **결과 생성**: 파일 생성, 배포, 보고서 작성 등

## 폴더 구조
```
scripts/
├── backend/            # 백엔드 관련 스크립트
│   └── smoke-test.js      # 백엔드 스모크 테스트 (수동 실행)
├── blockchain/         # 블록체인 관련 스크립트
│   └── deploy-v2.js       # VotingV2 컨트랙트 배포
└── zkp/                # ZKP 관련 스크립트
    ├── build-v1.2.ts       # ZKP 회로 빌드
    ├── deploy.ts           # Verifier 컨트랙트 배포
    ├── export-evidence.ts  # 증명 데이터 내보내기
    └── smoke.ts            # ZKP 스모크 테스트 (수동 실행)
```

## 실행 방법
```bash
# npm scripts로 실행
npm run build:zkp          # scripts/zkp/build-v1.2.ts
npm run deploy:v2          # scripts/blockchain/deploy-v2.js
npm run test:zkp           # scripts/zkp/smoke.ts

# 직접 실행
npx ts-node scripts/zkp/build-v1.2.ts
node scripts/backend/smoke-test.js
```

## test/ vs scripts/ 차이점

| 항목 | test/ | scripts/ |
|------|------|----------|
| **목적** | 자동화된 검증 | 수동 실행 유틸리티 |
| **실행 방식** | 테스트 프레임워크 | 직접 실행 또는 npm scripts |
| **결과** | 통과/실패 보고 | 작업 수행 (빌드, 배포 등) |
| **예시** | `voting-v2.test.js` | `build-v1.2.ts`, `deploy-v2.js` |
| **CI/CD** | 자동 실행 | 수동 실행 또는 특정 시점 실행 |

