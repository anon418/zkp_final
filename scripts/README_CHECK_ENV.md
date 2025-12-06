# 환경 변수 검증 스크립트

## 사용법

```bash
npm run check:env
```

## 검증 항목

### 1. 필수 환경 변수 존재 여부

- `MONGODB_URI` - MongoDB Atlas 연결 문자열
- `RELAYER_PRIVATE_KEY` - 가스 대납용 지갑 개인키
- `CHAIN_ID` - 블록체인 네트워크 ID
- `VOTING_V2_ADDRESS` - VotingV2 컨트랙트 주소
- `VERIFIER_ADDRESS` - Groth16Verifier 컨트랙트 주소
- `USE_VOTING_V2` - VotingV2 사용 여부
- `ENABLE_RELAYER` - Relayer 기능 활성화
- `NEXT_PUBLIC_CHAIN_ID` - 프론트엔드용 Chain ID
- `NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS` - 프론트엔드용 컨트랙트 주소

### 2. 형식 검증

- **지갑 주소**: `0x`로 시작, 42자, 16진수
- **개인키**: `0x`로 시작, 66자, 16진수
- **MongoDB URI**: `mongodb://` 또는 `mongodb+srv://`로 시작
- **URL**: `http://` 또는 `https://`로 시작
- **숫자**: 유효한 숫자 형식
- **불린**: `true` 또는 `false`

### 3. 상호 의존성

- `INFURA_URL` 또는 `ALCHEMY_URL` 중 하나는 필수
- 둘 다 설정된 경우 경고 표시

## 출력 예시

### 성공

```
🔍 환경 변수 검증 시작...

✅ [필수] MONGODB_URI
✅ [필수] RELAYER_PRIVATE_KEY
✅ [필수] CHAIN_ID
✅ [RPC] INFURA_URL 설정됨
...

✅ 검증 완료: 모든 환경 변수가 올바르게 설정되었습니다!
```

### 실패

```
🔍 환경 변수 검증 시작...

❌ [필수] MONGODB_URI - 누락됨
   설명: MongoDB Atlas 연결 문자열
❌ [형식 오류] RELAYER_PRIVATE_KEY
   값: 0xYOUR_PRIVATE_KEY_HERE
   오류: 실제 개인키를 입력해주세요 (예제 값이 아닌)

❌ 검증 실패: 필수 환경 변수에 문제가 있습니다
```

## CI/CD 통합

배포 전 자동 검증:

```json
{
  "scripts": {
    "prebuild": "npm run check:env",
    "check:env": "npx ts-node scripts/check-env.ts"
  }
}
```
