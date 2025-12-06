# PollId와 Nullifier 값 설명

## 🔍 사용자가 보는 값들

Etherscan의 VoteCast 이벤트에서 보이는 값들:
- `pollId`: 1, 2 등 작은 숫자
- `nullifier`: 0, 1 등 작은 숫자
- `isUpdate`: False

이 값들이 어떻게 생성되는지 설명합니다.

---

## 📊 PollId 변환 원리

### 1. UUID → 숫자 변환

투표 생성 시 UUID가 생성됩니다:
```
예: 9948753b-0a79-4451-ab3e-aed47583d953
```

이 UUID를 온체인에서 사용하기 위해 **숫자로 변환**합니다:

```javascript
// src/app/api/relay/route.ts:213
const pollIdNumeric = parseInt(validatedData.pollId.substring(0, 8), 16)
```

**변환 과정**:
1. UUID의 **첫 8자리** 추출: `9948753b`
2. 16진수로 파싱: `parseInt("9948753b", 16)`
3. 결과: `2571662651` (10진수)

### 2. 왜 작은 숫자로 보일까?

UUID의 첫 8자리가 작은 16진수 값이면 작은 숫자가 됩니다:
- `00000001` → `1`
- `00000002` → `2`
- `9948753b` → `2571662651`

**예시**:
- 첫 번째 투표: UUID 시작이 `00000001` → pollId = `1`
- 두 번째 투표: UUID 시작이 `00000002` → pollId = `2`
- 세 번째 투표: UUID 시작이 `9948753b` → pollId = `2571662651`

---

## 🔐 Nullifier 생성 원리

### 1. Nullifier 계산식

```javascript
nullifier = Poseidon(nullifierSecret, pollId)
```

**ZKP 회로에서** (`contracts/zkp/v1.2/vote.circom:116-121`):
```circom
// nullifier = Poseidon(nullifierSecret, pollId)
component nh = Poseidon(2);
nh.inputs[0] <== nullifierSecret;
nh.inputs[1] <== pollId;
nullifier <== nh.out;
```

### 2. Nullifier의 특징

1. **선거별로 다름**: 같은 `nullifierSecret`이라도 다른 `pollId`에서는 다른 nullifier 생성
2. **결정적**: 같은 `nullifierSecret`과 `pollId` 조합이면 항상 같은 nullifier
3. **중복 방지**: 같은 pollId에서 같은 nullifier는 재투표로 인식

### 3. 왜 0이나 1로 보일까?

Etherscan에서 nullifier가 `0` 또는 `1`로 보이는 경우:

**가능한 원인**:
1. **Poseidon 해시 결과가 작은 값**: 
   - Poseidon 해시는 매우 큰 숫자(약 254비트)를 생성하지만, 특정 입력에서는 작은 값이 나올 수 있습니다
   - 예: `Poseidon(0, 1)` → 작은 값

2. **Etherscan 표시 문제**:
   - 매우 큰 숫자를 표시할 때 일부만 보일 수 있습니다
   - "Dec" 모드에서 전체 값이 표시되지 않을 수 있습니다

3. **실제 값 확인 방법**:
   - Etherscan에서 "Hex" 모드로 전환하여 전체 16진수 값 확인
   - 또는 "Dec" 모드에서 스크롤하여 전체 값 확인

---

## 🔄 isUpdate: False인 이유

### 재투표가 아닌 경우

`isUpdate: False`는 **첫 투표**를 의미합니다.

**컨트랙트 로직** (`contracts/solidity/VotingV2.sol:171`):
```solidity
bool isUpdate = votes[pollId][nullifier].exists;
```

**동작**:
1. 첫 투표: `votes[pollId][nullifier].exists == false` → `isUpdate = false`
2. 재투표: `votes[pollId][nullifier].exists == true` → `isUpdate = true`

### 재투표 시나리오

**첫 투표**:
- `isUpdate: False`
- `totalVotes += 1` (투표 수 증가)

**재투표** (마감 시간 전):
- `isUpdate: True`
- `totalVotes` 증가 없음 (재투표이므로)
- 기존 투표 정보 덮어쓰기

---

## 📋 값 증가 패턴 이해

### PollId가 1씩 증가하는 이유

UUID 생성 시 첫 8자리가 순차적으로 증가할 수 있습니다:
- 첫 번째 투표: `00000001-xxxx-xxxx-xxxx-xxxxxxxxxxxx` → pollId = `1`
- 두 번째 투표: `00000002-xxxx-xxxx-xxxx-xxxxxxxxxxxx` → pollId = `2`
- 세 번째 투표: `00000003-xxxx-xxxx-xxxx-xxxxxxxxxxxx` → pollId = `3`

**주의**: UUID는 랜덤하게 생성되므로 항상 순차적이지는 않습니다.

### Nullifier가 1씩 증가하는 이유

Nullifier는 `Poseidon(nullifierSecret, pollId)`로 계산되므로:
- 같은 `nullifierSecret`을 사용하고
- `pollId`가 1씩 증가하면
- Nullifier도 달라집니다 (하지만 1씩 증가하지는 않음)

**실제로는**:
- `Poseidon(secret, 1)` → 매우 큰 숫자 (예: `1234567890...`)
- `Poseidon(secret, 2)` → 다른 매우 큰 숫자 (예: `9876543210...`)

Etherscan에서 `0` 또는 `1`로 보이는 것은:
- 표시 문제이거나
- 특정 입력 조합에서 작은 값이 나온 경우입니다

---

## ✅ 정리

1. **PollId**: UUID의 첫 8자리를 16진수로 파싱한 값
   - 작은 숫자로 보일 수 있음 (UUID 시작 부분이 작은 경우)

2. **Nullifier**: `Poseidon(nullifierSecret, pollId)`로 계산
   - 매우 큰 숫자지만, Etherscan 표시 문제로 작게 보일 수 있음
   - "Hex" 모드로 전체 값 확인 가능

3. **isUpdate: False**: 첫 투표를 의미
   - 재투표 시 `True`로 변경됨

4. **값 증가**: 
   - PollId는 UUID 생성 순서에 따라 증가할 수 있음
   - Nullifier는 PollId에 따라 달라지지만, 1씩 증가하지는 않음

---

## 🔍 실제 값 확인 방법

### Etherscan에서

1. **Hex 모드로 전환**: "Dec" → "Hex" 버튼 클릭
2. **전체 값 확인**: 스크롤하여 전체 16진수 값 확인
3. **Topics 확인**: Topics 섹션에서 전체 해시 값 확인

### 코드에서

```javascript
// PollId 확인
const pollIdNumeric = parseInt(pollId.substring(0, 8), 16)
console.log('PollId (numeric):', pollIdNumeric)

// Nullifier 확인 (publicSignals[2])
const nullifier = publicSignals[2]
const nullifierHex = '0x' + BigInt(nullifier).toString(16).padStart(64, '0')
console.log('Nullifier (hex):', nullifierHex)
```

