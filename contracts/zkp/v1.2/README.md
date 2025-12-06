# circuits/v1.2

## 개요

v1.2는 다중 선거 동시 운영과 재투표 업데이트 정책을 지원하는 회로입니다.

## 주요 변경사항

- **pollId를 public input으로 변경**: 검증 시 선거 ID 일치 확인 가능
- **public outputs 순서 정리**: `[root, pollId, nullifier, voteCommitment]`
- **선거별 1인 1표 보장**: `nullifier = Poseidon(secret, pollId)`로 선거별 고유 식별
- **재투표 정책**: 마지막 표만 유효 (업데이트)

## 파일

- `vote.circom`: 메인 회로 파일
- 빌드 산출물: `build/v1.2/`

## 빌드

```bash
npm run build:v1.2
```

## 테스트

```bash
# 변조된 Proof 검증 실패 테스트
npm run test:tampered
```

## 상세 스펙

[../docs/zkp-spec-v1.2.md](../docs/zkp-spec-v1.2.md) 참고
