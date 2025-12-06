# test/ 폴더 설명

## 목적
**자동화된 테스트** - 테스트 프레임워크(Hardhat, Jest)로 실행되는 검증 코드

## 특징
- **자동 실행**: `npm run test:*` 명령으로 실행
- **CI/CD 통합**: 자동화된 빌드 파이프라인에서 실행
- **결과 보고**: 통과/실패 여부를 명확히 보고
- **반복 가능**: 동일한 입력에 대해 항상 동일한 결과

## 폴더 구조
```
test/
├── blockchain/          # 블록체인 컨트랙트 테스트
│   └── voting-v2.test.js  # VotingV2 컨트랙트 로직 테스트 (Mock Verifier)
└── zkp/                # ZKP 증명 검증 테스트
    └── verifier-test.ts   # 실제 Groth16Verifier 검증 테스트
```

## 실행 방법
```bash
# 모든 블록체인 테스트 실행
npm run test:blockchain

# 특정 테스트 실행
npx hardhat test test/blockchain/voting-v2.test.js
npx hardhat test test/zkp/verifier-test.ts
```

## test/ vs scripts/ 차이점

| 항목 | test/ | scripts/ |
|------|------|----------|
| **목적** | 자동화된 검증 | 수동 실행 유틸리티 |
| **실행 방식** | 테스트 프레임워크 | 직접 실행 또는 npm scripts |
| **결과** | 통과/실패 보고 | 작업 수행 (빌드, 배포 등) |
| **예시** | `voting-v2.test.js` | `build-v1.2.ts`, `deploy-v2.js` |
| **CI/CD** | 자동 실행 | 수동 실행 또는 특정 시점 실행 |

