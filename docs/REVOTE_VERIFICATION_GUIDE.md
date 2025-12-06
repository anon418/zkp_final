# 재투표 확인 가이드

## 📋 마지막 투표만 집계되는 것을 확인하는 방법

재투표를 했을 때 마지막 투표만 집계되는 것을 확인할 수 있는 여러 방법을 안내합니다.

---

## 1️⃣ UI에서 확인

### 영수증 화면
재투표 완료 후 영수증에 다음 메시지가 표시됩니다:

```
🔄 재투표 완료!
✅ 마지막 투표만 집계됩니다
• 이전 투표는 자동으로 무효화되었습니다
• 투표 결과에서 이번 선택만 반영됩니다
• 총 투표 수는 증가하지 않습니다 (재투표이므로)
```

### 투표 결과 화면
투표 결과 하단에 재투표 정책 안내가 표시됩니다:

```
💡 재투표 정책 안내
• 마감 시간 전까지 재투표 가능
• 마지막 투표만 집계되며, 이전 투표는 자동으로 무효화됩니다
• 재투표 시 총 투표 수는 증가하지 않습니다
```

---

## 2️⃣ Etherscan에서 확인 (가장 확실한 방법)

### Step 1: 트랜잭션 페이지 열기
1. 영수증의 "Etherscan에서 확인" 버튼 클릭
2. 또는 트랜잭션 해시를 Etherscan에 직접 입력

### Step 2: Logs 탭 확인
1. 트랜잭션 페이지에서 **"Logs"** 탭 클릭
2. `VoteCast` 이벤트 찾기

### Step 3: isUpdate 필드 확인
`VoteCast` 이벤트의 Decoded 데이터에서:

- **첫 투표**: `isUpdate: False`
- **재투표**: `isUpdate: True` ✅

### Step 4: nullifier 확인
같은 `nullifier` 값으로 여러 번 투표했는지 확인:

1. 첫 투표의 `nullifier` 값 기록
2. 재투표의 `nullifier` 값 확인
3. **두 값이 동일하면** → 같은 사람의 재투표

### Step 5: candidate 값 확인
- 첫 투표: `candidate: 0` (예: 후보 A)
- 재투표: `candidate: 1` (예: 후보 B)

**중요**: 재투표 시 `candidate` 값이 변경되었지만, **마지막 값만 집계**됩니다.

---

## 3️⃣ 온체인 이벤트 직접 확인

### 컨트랙트 이벤트 필터링
Etherscan의 컨트랙트 페이지에서:

1. **"Events"** 탭 클릭
2. `VoteCast` 이벤트 필터링
3. 같은 `nullifier`로 여러 이벤트가 있는지 확인

### 확인 포인트
- 같은 `nullifier`로 여러 `VoteCast` 이벤트가 있음
- 가장 최근 이벤트의 `candidate` 값만 유효
- 이전 이벤트들은 무효화됨

---

## 4️⃣ DB 집계 로직 확인 (개발자용)

### 코드 위치
`src/lib/vote-aggregation.ts`의 `getValidVotes()` 함수:

```typescript
// nullifierHash별로 가장 최근 투표만 선택 (마지막 투표만 유효)
const latestVotesByNullifier = new Map<string, VoteDocument>()

allVotes.forEach((vote) => {
  if (vote.nullifierHash) {
    const existing = latestVotesByNullifier.get(vote.nullifierHash)
    // ... 시간 비교 로직
    if (!existing || voteTime > existingTime) {
      latestVotesByNullifier.set(vote.nullifierHash, vote)
    }
  }
})
```

### 동작 원리
1. 같은 `nullifierHash`를 가진 모든 투표 조회
2. `timestamp` 기준으로 정렬
3. **가장 최근 투표만** 선택하여 집계

---

## 5️⃣ 컨트랙트 로직 확인

### VotingV2.sol의 vote() 함수

```solidity
// === 6) 재투표 감지 ===
bool isUpdate = votes[pollId][nullifier].exists;

// === 8) 투표 반영 ===
if (!isUpdate) {
    election.totalVotes += 1;  // 첫 투표만 카운트
}
// 재투표인 경우 totalVotes 증가 없음

// === 9) 투표 정보 저장/업데이트 ===
votes[pollId][nullifier] = VoteInfo({
    candidate: proposalId,
    voteCommitment: voteCommitment,
    exists: true
});
// 같은 nullifier로 재투표하면 기존 값 덮어쓰기
```

### 핵심 포인트
- `isUpdate: true` → 재투표, `totalVotes` 증가 없음
- 같은 `nullifier`로 재투표하면 기존 `VoteInfo` 덮어쓰기
- **마지막 투표만 유효**

---

## 6️⃣ 실전 확인 시나리오

### 시나리오: 후보 A → 후보 B로 재투표

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

---

## ✅ 확인 체크리스트

재투표 후 다음 항목들을 확인하세요:

- [ ] 영수증에 "재투표 완료! 마지막 투표만 유효합니다" 메시지 표시
- [ ] Etherscan에서 `VoteCast` 이벤트의 `isUpdate: True` 확인
- [ ] 같은 `nullifier` 값으로 여러 이벤트가 있는지 확인
- [ ] 가장 최근 이벤트의 `candidate` 값이 최종 선택과 일치하는지 확인
- [ ] 투표 결과에서 이전 선택이 반영되지 않고 최신 선택만 반영되는지 확인
- [ ] 재투표 후 총 투표 수가 증가하지 않는지 확인

---

## 🔍 문제 해결

### Q: 재투표했는데 `isUpdate: False`로 표시됨
**A**: 다음을 확인하세요:
1. 같은 `pollId`를 사용했는지 확인
2. 같은 지갑 주소로 투표했는지 확인
3. `nullifier` 값이 동일한지 확인 (Etherscan에서)

### Q: 재투표했는데 결과가 반영되지 않음
**A**: 다음을 확인하세요:
1. 마감 시간이 지나지 않았는지 확인
2. 트랜잭션이 성공적으로 완료되었는지 확인 (2회 컨펌)
3. 결과 페이지를 새로고침해보세요 (캐시 문제일 수 있음)

### Q: 총 투표 수가 증가함
**A**: 이는 정상이 아닙니다. 다음을 확인하세요:
1. `isUpdate: True`로 표시되었는지 확인
2. 컨트랙트의 `totalVotes`가 증가하지 않았는지 확인
3. DB 집계 로직이 올바르게 작동하는지 확인

---

## 📚 관련 문서

- [재투표 정책 설명](./REVOTE_POLICY.md)
- [Etherscan 이벤트 확인 가이드](./ETHERSCAN_VERIFICATION.md)
- [ZKP 스펙 v1.2](./zkp/zkp-spec-v1.2.md)

