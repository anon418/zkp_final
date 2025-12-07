# 재투표 시 nullifier/pollId 변동 문제 분석

## 🔍 문제 상황

**사용자 보고**: 동일한 투표에서 후보만 바꿔서 재투표했을 때, Etherscan에서 `nullifier`와 `pollId`가 변함

## ✅ 정상 동작 (이론)

### Nullifier 생성 공식

```
nullifier = Poseidon(nullifierSecret, pollId)
```

### 재투표 시 기대 동작

- **같은 pollId**: 동일한 투표이므로 `pollId`는 **변하지 않아야 함**
- **같은 nullifierSecret**: 같은 지갑 주소이므로 `nullifierSecret`은 **변하지 않아야 함**
- **결과**: `nullifier`도 **변하지 않아야 함**

### 컨트랙트 로직

```solidity
bool isUpdate = votes[pollId][nullifier].exists;
```

- 첫 투표: `isUpdate = false` (새 투표)
- 재투표: `isUpdate = true` (기존 투표 업데이트)

## ⚠️ 가능한 원인

### 1. Etherscan 디코딩 오류 (가장 가능성 높음)

**증상**:

- **Topics 섹션**: 정확한 값 (변하지 않음) ✅
- **Data 섹션**: 잘못된 값 (0 또는 1로 표시) ❌

**확인 방법**:

1. Etherscan에서 **"Logs" 탭** 클릭
2. `VoteCast` 이벤트의 **"Topics" 섹션** 확인
   - Topics[1] = pollId (indexed)
   - Topics[2] = nullifier (indexed)
3. **"Data" 섹션**은 무시 (디코딩 오류 가능)

**해결책**: Topics 섹션의 값을 기준으로 확인

### 2. localStorage 초기화 (identityNullifier 변경)

**증상**:

- Topics 섹션에서도 nullifier가 변함
- pollId는 같지만 nullifier가 다름

**원인**:

- 브라우저 localStorage 초기화
- 시크릿 모드 사용
- 다른 브라우저/기기 사용
- `voter_identity_${address}` 키 삭제

**코드 위치**: `src/lib/voter.ts`

```typescript
// localStorage 키: voter_identity_${address}
const cached = getStoredIdentity(address)
if (!cached) {
  // 백엔드에 새로 등록 → 새로운 identityNullifier 생성
  const identity = await ensureRegistered(address)
}
```

**확인 방법**:

1. 브라우저 개발자 도구 → Application → Local Storage
2. `voter_identity_${지갑주소}` 키 확인
3. 재투표 전후로 `identityNullifier` 값이 같은지 확인

### 3. 다른 지갑 주소 사용

**증상**:

- Topics 섹션에서 nullifier가 변함
- pollId는 같음

**원인**:

- MetaMask에서 다른 계정으로 전환
- 다른 지갑 주소 = 다른 identityNullifier = 다른 nullifier

**확인 방법**:

- Etherscan에서 트랜잭션의 `From` 주소 확인
- 첫 투표와 재투표의 `From` 주소가 같은지 확인

### 4. 다른 pollId (다른 투표)

**증상**:

- pollId가 변함
- nullifier도 변함 (pollId가 nullifier 계산에 포함되므로)

**원인**:

- 실수로 다른 투표 페이지에서 투표
- URL의 pollId가 다름

**확인 방법**:

- 투표 페이지 URL의 pollId 확인
- 첫 투표와 재투표의 pollId가 같은지 확인

## 🔍 진단 체크리스트

### Step 1: Etherscan 확인

1. **첫 투표 트랜잭션**:

   - Etherscan 링크 열기
   - "Logs" 탭 클릭
   - `VoteCast` 이벤트 찾기
   - **Topics[1]** (pollId) 기록
   - **Topics[2]** (nullifier) 기록

2. **재투표 트랜잭션**:

   - Etherscan 링크 열기
   - "Logs" 탭 클릭
   - `VoteCast` 이벤트 찾기
   - **Topics[1]** (pollId) 기록
   - **Topics[2]** (nullifier) 기록

3. **비교**:
   - Topics[1] (pollId)가 같으면 → 같은 투표 ✅
   - Topics[2] (nullifier)가 같으면 → 정상 재투표 ✅
   - Topics[2] (nullifier)가 다르면 → 문제 발생 ❌

### Step 2: localStorage 확인

1. 브라우저 개발자 도구 열기 (F12)
2. Application 탭 → Local Storage
3. `voter_identity_${지갑주소}` 키 찾기
4. 값 확인:
   ```json
   {
     "identityNullifier": "1234567890...",
     "identityTrapdoor": "9876543210..."
   }
   ```
5. 재투표 전후로 `identityNullifier` 값이 같은지 확인

### Step 3: 지갑 주소 확인

1. 첫 투표 트랜잭션의 `From` 주소 확인
2. 재투표 트랜잭션의 `From` 주소 확인
3. 두 주소가 같은지 확인

### Step 4: pollId 확인

1. 첫 투표 페이지 URL의 pollId 확인
2. 재투표 페이지 URL의 pollId 확인
3. 두 pollId가 같은지 확인

## 🛠️ 해결 방법

### Case 1: Etherscan Data 섹션만 변함 (Topics는 같음)

**원인**: Etherscan 디코딩 오류

**해결책**:

- ✅ **정상 동작**: Topics 섹션의 값이 정확함
- ✅ Data 섹션은 무시하고 Topics만 확인
- ✅ 서버 로그에서 정확한 값 확인 가능

### Case 2: Topics 섹션에서도 nullifier가 변함

**원인**: localStorage 초기화 또는 다른 지갑

**해결책**:

1. **localStorage 확인**:

   - `voter_identity_${address}` 키가 있는지 확인
   - 값이 재투표 전후로 같은지 확인

2. **지갑 주소 확인**:

   - MetaMask에서 같은 계정 사용 중인지 확인

3. **예방책**:
   - 같은 브라우저/기기에서 재투표
   - localStorage 초기화하지 않기
   - 시크릿 모드 사용하지 않기

### Case 3: pollId가 변함

**원인**: 다른 투표에 투표함

**해결책**:

- 올바른 투표 페이지에서 재투표
- URL의 pollId 확인

## 📊 정상 재투표 vs 비정상 재투표

### ✅ 정상 재투표

```
첫 투표:
- pollId: 2571662651 (Topics[1])
- nullifier: 0x1d2e3f4a... (Topics[2])
- isUpdate: false

재투표:
- pollId: 2571662651 (Topics[1]) ← 같음 ✅
- nullifier: 0x1d2e3f4a... (Topics[2]) ← 같음 ✅
- isUpdate: true ← 재투표로 인식 ✅
```

### ❌ 비정상 재투표 (nullifier 변경)

```
첫 투표:
- pollId: 2571662651 (Topics[1])
- nullifier: 0x1d2e3f4a... (Topics[2])
- isUpdate: false

재투표:
- pollId: 2571662651 (Topics[1]) ← 같음 ✅
- nullifier: 0x5a6b7c8d... (Topics[2]) ← 다름 ❌
- isUpdate: false ← 첫 투표로 인식됨 ❌
```

**결과**:

- 컨트랙트는 **새로운 투표**로 인식
- `totalVotes`가 증가함 (재투표가 아님)
- 중복 투표로 집계됨

## 🎯 권장 확인 절차

1. **Etherscan Topics 확인** (가장 중요)

   - Logs 탭 → VoteCast 이벤트 → Topics 섹션
   - Topics[1] (pollId) 비교
   - Topics[2] (nullifier) 비교

2. **서버 로그 확인**

   - Relayer 로그에서 `nullifierHash` 확인
   - 첫 투표와 재투표의 nullifierHash 비교

3. **localStorage 확인**

   - `voter_identity_${address}` 키 확인
   - `identityNullifier` 값 비교

4. **지갑 주소 확인**
   - 트랜잭션의 `From` 주소 비교

## 💡 결론

**정상인 경우**:

- Topics 섹션에서 pollId와 nullifier가 모두 같음
- Data 섹션은 Etherscan 디코딩 오류로 무시 가능

**비정상인 경우**:

- Topics 섹션에서 nullifier가 다름
- 원인: localStorage 초기화 또는 다른 지갑 사용
- 결과: 재투표가 아닌 새 투표로 인식됨

**확인 방법**:

1. Etherscan Topics 섹션 확인 (가장 정확)
2. 서버 로그 확인
3. localStorage 확인
