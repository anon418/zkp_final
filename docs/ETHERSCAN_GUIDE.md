# Etherscan 확인 가이드

## 🔍 핵심 개념

### Indexed vs Non-Indexed 파라미터

이벤트 파라미터는 두 가지로 나뉩니다:

1. **Indexed 파라미터**: Topics에 저장됨 (검색 가능, 정확한 값)
2. **Non-Indexed 파라미터**: Data에 저장됨 (검색 불가, 디코딩 오류 가능)

### VoteCast 이벤트 구조

```solidity
event VoteCast(
    uint256 indexed pollId,        // ← Topics에 저장
    uint256 indexed nullifier,     // ← Topics에 저장
    uint256 candidate,             // ← Data에 저장
    uint256 voteCommitment,        // ← Data에 저장
    bool isUpdate                  // ← Data에 저장
);
```

## 📊 Topics 구조

### Topic 0: 이벤트 시그니처
```
0x1d9a32fc32c9c78199dfe097096077219d82cd4cbb56372b5ca2c3e87c6552ae
```
- 이벤트 이름과 파라미터 타입의 해시
- 모든 VoteCast 이벤트에서 동일

### Topic 1: pollId (indexed)
```
0x000000000000000000000000000000000000000000000000000000005317fc79
```
- 실제 pollId 값
- 마지막 8자리: `5317fc79` (16진수)
- 10진수 변환: `1394080889`

### Topic 2: nullifier (indexed)
```
0x0908bcd95484e4e252387a5f41cafefd51b0f2e1bc40809f27c273198df5962d
```
- 실제 nullifier 값
- 전체 해시 값

## ⚠️ Data 섹션의 문제

Etherscan의 **Data** 섹션은 **non-indexed 파라미터만** 포함합니다:
- `candidate` (uint256)
- `voteCommitment` (uint256)
- `isUpdate` (bool)

**중요**: Data 섹션에는 `pollId`와 `nullifier`가 **없습니다**!

Etherscan이 Data 섹션에서 `pollId: 0` 또는 `pollId: 1`로 표시하는 것은:
1. **잘못된 디코딩**: Etherscan이 Data를 잘못 해석
2. **다른 이벤트**: 다른 이벤트의 데이터를 표시
3. **디스플레이 버그**: Etherscan UI 버그

**이것은 Etherscan의 버그이지, 컨트랙트의 문제가 아닙니다.**

## ✅ 올바른 확인 방법

### 1. Topics 확인 (가장 정확)

**Topics** 섹션에서:
- Topic 1 = pollId (indexed) - 정확한 값
- Topic 2 = nullifier (indexed) - 정확한 값

**pollId 변환**:
```javascript
// Topic 1의 마지막 8자리 추출
const topic1 = "0x000000000000000000000000000000000000000000000000000000005317fc79"
const pollIdHex = topic1.slice(-8) // "5317fc79"
const pollId = parseInt(pollIdHex, 16) // 1394080889
```

### 2. 서버 로그 확인

서버 로그에서 파싱한 값이 정확합니다:
```
[DEBUG] [EventParser] 이벤트 pollId: 1394080889
[DEBUG] [EventParser] 이벤트 nullifier: 408625380129014992074298739659...
[DEBUG] [EventParser] 이벤트에서 파싱한 isUpdate: true
```

### 3. 컨트랙트 직접 조회

```javascript
// pollId 확인
const election = await contract.getElection(pollIdNumeric)

// nullifier 확인
const hasVoted = await contract.hasVoted(pollIdNumeric, nullifier)
```

## 🔍 재투표 확인 방법

### 정상적인 재투표

1. **Topics에서 pollId 확인**: 두 투표 모두 동일한 pollId
2. **Topics에서 nullifier 확인**: 두 투표 모두 동일한 nullifier
3. **isUpdate 확인**: 
   - 첫 번째: `false` (또는 `0`)
   - 두 번째: `true` (또는 `1`)

### isUpdate 값 확인

Etherscan에서 `bool` 타입은 다음과 같이 표시될 수 있습니다:

1. **Dec 모드**: `0` 또는 `1`로 표시
   - `0` = `false`
   - `1` = `true`

2. **Hex 모드**: `0x00` 또는 `0x01`로 표시
   - `0x00` = `false`
   - `0x01` = `true`

3. **Decoded 모드**: `false` 또는 `true`로 표시 (가장 명확)

## 📊 집계 로직

집계는 **nullifier**를 기준으로 합니다:

1. 같은 `pollId` + 같은 `nullifier` = 재투표
2. 재투표 시 마지막 표만 집계됨
3. `totalVotes`는 증가하지 않음 (재투표이므로)

## 🔧 해결 방법

Etherscan의 Data 섹션 오류는 무시하고:
1. **Topics** 섹션에서 실제 값 확인
2. **서버 로그**에서 파싱한 값 확인
3. **컨트랙트 상태** 직접 조회 (getElection, hasVoted 등)

## 📝 참고

이 문제는 Etherscan의 알려진 이슈입니다:
- 큰 숫자(uint256)를 디코딩할 때 오류 발생
- indexed 파라미터는 Topics에서 정확히 확인 가능
- non-indexed 파라미터는 Data에서 확인 (오류 가능)

**직접 해결 불가능**: Etherscan은 서드파티 서비스이므로 우리가 수정할 수 없습니다.

---

## 🔄 재투표 검증 방법

### UI에서 확인

**영수증 화면**:
- 재투표 완료 후 "🔄 재투표 완료! 마지막 투표만 집계됩니다" 메시지 표시
- 이전 투표는 자동으로 무효화됨
- 총 투표 수는 증가하지 않음

**투표 결과 화면**:
- 재투표 정책 안내 표시
- 마감 시간 전까지 재투표 가능
- 마지막 투표만 집계됨

### Etherscan에서 확인 (가장 확실)

**Step 1**: 트랜잭션 페이지에서 **"Logs" 탭** 클릭

**Step 2**: `VoteCast` 이벤트 찾기

**Step 3**: `isUpdate` 값 확인
- 첫 투표: `isUpdate: False` (또는 `0`)
- 재투표: `isUpdate: True` (또는 `1`)

**Step 4**: Topics에서 `pollId`와 `nullifier` 확인
- 두 투표 모두 동일한 `pollId`와 `nullifier`여야 함
- 같은 `nullifier`로 여러 이벤트가 있으면 재투표

**Step 5**: `candidate` 값 확인
- 첫 투표: `candidate: 0` (예: 후보 A)
- 재투표: `candidate: 1` (예: 후보 B)
- 마지막 값만 유효

### 컨트랙트 로직 확인

**VotingV2.sol의 vote() 함수**:
```solidity
// 재투표 감지
bool isUpdate = votes[pollId][nullifier].exists;

// 투표 반영
if (!isUpdate) {
    election.totalVotes += 1;  // 첫 투표만 카운트
}
// 재투표인 경우 totalVotes 증가 없음

// 투표 정보 저장/업데이트
votes[pollId][nullifier] = VoteInfo({
    candidate: proposalId,
    voteCommitment: voteCommitment,
    exists: true
});
// 같은 nullifier로 재투표하면 기존 값 덮어쓰기
```

**핵심 포인트**:
- `isUpdate: true` → 재투표, `totalVotes` 증가 없음
- 같은 `nullifier`로 재투표하면 기존 `VoteInfo` 덮어쓰기
- **마지막 투표만 유효**

### DB 집계 로직 확인

**코드 위치**: `src/lib/vote-aggregation.ts`의 `getValidVotes()` 함수

```typescript
// nullifierHash별로 가장 최근 투표만 선택 (마지막 투표만 유효)
const latestVotesByNullifier = new Map<string, VoteDocument>()

allVotes.forEach((vote) => {
  if (vote.nullifierHash) {
    const existing = latestVotesByNullifier.get(vote.nullifierHash)
    // 시간 비교 로직
    if (!existing || voteTime > existingTime) {
      latestVotesByNullifier.set(vote.nullifierHash, vote)
    }
  }
})
```

**동작 원리**:
1. 같은 `nullifierHash`를 가진 모든 투표 조회
2. `timestamp` 기준으로 정렬
3. **가장 최근 투표만** 선택하여 집계

### 실전 확인 시나리오

**시나리오: 후보 A → 후보 B로 재투표**

1. **첫 투표** (후보 A 선택)
   - Etherscan: `VoteCast(nullifier=0x123..., candidate=0, isUpdate=False)`
   - 결과: 후보 A 득표수 +1

2. **재투표** (후보 B 선택)
   - Etherscan: `VoteCast(nullifier=0x123..., candidate=1, isUpdate=True)`
   - 결과: 후보 A 득표수 -1, 후보 B 득표수 +1
   - **총 투표 수는 그대로** (재투표이므로)

3. **최종 결과**
   - 후보 A: 0표
   - 후보 B: 1표
   - 총 투표 수: 1표 (증가하지 않음)

### 확인 체크리스트

재투표 후 다음 항목들을 확인하세요:

- [ ] 영수증에 "재투표 완료! 마지막 투표만 유효합니다" 메시지 표시
- [ ] Etherscan에서 `VoteCast` 이벤트의 `isUpdate: True` 확인
- [ ] 같은 `nullifier` 값으로 여러 이벤트가 있는지 확인
- [ ] 가장 최근 이벤트의 `candidate` 값이 최종 선택과 일치하는지 확인
- [ ] 투표 결과에서 이전 선택이 반영되지 않고 최신 선택만 반영되는지 확인
- [ ] 재투표 후 총 투표 수가 증가하지 않는지 확인

### 문제 해결

**Q: 재투표했는데 `isUpdate: False`로 표시됨**

**A**: 다음을 확인하세요:
1. 같은 `pollId`를 사용했는지 확인
2. 같은 지갑 주소로 투표했는지 확인
3. `nullifier` 값이 동일한지 확인 (Etherscan에서)

**Q: 재투표했는데 결과가 반영되지 않음**

**A**: 다음을 확인하세요:
1. 마감 시간이 지나지 않았는지 확인
2. 트랜잭션이 성공적으로 완료되었는지 확인 (2회 컨펌)
3. 결과 페이지를 새로고침해보세요 (캐시 문제일 수 있음)

**Q: 총 투표 수가 증가함**

**A**: 이는 정상이 아닙니다. 다음을 확인하세요:
1. `isUpdate: True`로 표시되었는지 확인
2. 컨트랙트의 `totalVotes`가 증가하지 않았는지 확인
3. DB 집계 로직이 올바르게 작동하는지 확인

