# ZKP Spec v1.2

## 개요

ZKP v1.2는 다중 선거 동시 운영과 재투표 업데이트 정책을 지원하는 회로
주요 변경사항은:

- `pollId`를 public input으로 변경하여 선거별 1인 1표 보장
- 재투표 시 마지막 표만 유효하도록 설계
- vote 범위를 0~7 (최대 8개 후보)로 확장하여 유연한 후보 개수 지원

## Public Signals 순서

v1.2의 public signals는 다음 순서로 출력:

```
[0] root           : MerkleTreeInclusionProof로 계산된 루트
[1] pollId         : 투표 ID (선거별 구분)
[2] nullifier      : Poseidon(nullifierSecret, pollId)
[3] voteCommitment : Poseidon(vote, salt, pollId)
```

## Private Inputs

- `vote`: 0~7 (최대 8개 후보 지원, 실제 사용 개수는 앱에서 관리)
- `voteBit0`: vote의 LSB (0 또는 1)
- `voteBit1`: vote의 중간 비트 (0 또는 1)
- `voteBit2`: vote의 MSB (0 또는 1)
- `salt`: 랜덤 솔트 (선택값 커밋용)
- `nullifierSecret`: nullifier 생성용 비밀값
- `pathElements[14]`: Merkle 경로 형제 노드들
- `pathIndex[14]`: Merkle 경로 인덱스 (0=왼쪽, 1=오른쪽)

**후보 개수 관리**:

- 회로는 0~7 (최대 8개 후보)까지 지원
- 실제 사용 후보 개수는 프론트/백엔드에서 관리
- 예: 후보 5개면 0~4만 사용, 후보 6개면 0~5만 사용
- 회로는 "0~7 중 하나를 선택했다"만 증명 (실제 후보 범위 검증은 앱 레벨)

## Public Inputs

- `pollId`: 투표 ID (선거별 구분, public input으로 검증 시 일치 확인)

## 수식 정의

### Nullifier

```
nullifier = Poseidon(nullifierSecret, pollId)
```

**중요**: `pollId`가 nullifier 계산에 포함되므로, 동일한 `nullifierSecret`이라도 다른 선거(`pollId`)에서는 다른 nullifier가 생성됩니다. 이는 선거별 1인 1표를 보장합니다.

#### nullifierHash 형식 (API 연동)

**형식**: `0x`로 시작하는 16진수 문자열

**예시**:
```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**길이**: 66자 (`0x` + 64자 16진수)

**변환 방법**:
- ZKP 회로에서 생성된 `nullifier` (BigInt 문자열)를 16진수로 변환
- 앞에 `0x` 접두사 추가
- 64자로 패딩 (필요 시 앞에 0 추가)

**예시 코드**:
```javascript
// publicSignals[2]는 nullifier (BigInt 문자열)
const nullifier = publicSignals[2]
const nullifierHash = '0x' + BigInt(nullifier).toString(16).padStart(64, '0')
// 결과: "0x1234567890abcdef..."
```

#### 중복 처리 정책

**같은 pollId에서**:
- 같은 `nullifierHash` 사용 시 중복으로 인식
- 재투표 시 업데이트 처리 (200 OK, `isUpdate: true`)

**다른 pollId에서**:
- 같은 `nullifierHash` 사용은 허용
- 선거별 1인 1표 정책 (pollId별로 독립적)

**사용 위치**:
1. **투표 제출 API** (`POST /api/vote/create`)
   - 요청 필드: `nullifierHash`
   - 중복 체크에 사용
2. **결과 집계** (`GET /api/polls/:pollId/results`)
   - `nullifierHash`별로 그룹화하여 최신 투표만 집계
   - 재투표 제외 집계에 사용

### Vote Commitment

```
voteCommitment = Poseidon(vote, salt, pollId)
```

선택값(`vote`)과 솔트(`salt`)를 함께 해시하여 커밋합니다. `pollId`도 포함하여 선거별로 다른 커밋이 생성됩니다.

### Merkle Leaf

```
leaf = Poseidon(nullifierSecret, pollId)
```

Merkle 트리의 리프 노드는 nullifier와 동일한 계산식을 사용합니다.

## 후보 개수 확장: 최대 8개 지원

### 설계

회로는 **최대 8개 후보(0~7)**까지 지원하도록 설계되었으며, 실제 사용 후보 개수는 프론트/백엔드에서 관리합니다.

**이유**:

- ZKP 회로는 컴파일 시점에 고정되므로, 런타임에 임의 개수의 후보를 동적으로 지원하는 것은 복잡함
- 대신 "최대 K개"를 지원하고, 앱 레벨에서 실제 사용 개수를 관리하는 방식이 실용적
- 8개면 대부분의 투표 시나리오를 충분히 커버

### 사용 예시

**예 1: 후보 5개 투표**

```
후보 목록: ["치킨", "피자", "파스타", "햄버거", "라면"]
ID 매핑: 0=치킨, 1=피자, 2=파스타, 3=햄버거, 4=라면
사용 범위: 0~4만 사용 (5, 6, 7은 미사용)
```

**예 2: 후보 6개 투표**

```
후보 목록: ["후보A", "후보B", "후보C", "후보D", "후보E", "후보F"]
ID 매핑: 0=후보A, 1=후보B, ..., 5=후보F
사용 범위: 0~5만 사용 (6, 7은 미사용)
```

### 앱 레벨 검증

회로는 "0~7 중 하나를 선택했다"만 증명합니다. 실제 후보 범위 검증은 앱 레벨에서 수행:

1. **프론트엔드**: UI에서 선택 가능한 후보만 표시 (vote가 0~n-1 범위 내)
2. **백엔드**: API에서 후보 개수 검증 (vote < numCandidates)
3. **컨트랙트**: 필요시 이벤트에서 후보 범위 검증

### 향후 확장 (v2)

더 엄격한 검증이 필요한 경우:

- Public input에 `numCandidates` 추가
- 회로 내에서 `vote < numCandidates` 제약 추가 (LessThan 컴포넌트 사용)
- 또는 후보 목록의 Merkle root를 public input에 포함

현재 v1.2는 "확장 가능한 기초 버전"으로, 데모 및 실제 사용에 충분합니다.

## 재투표 정책: 마지막 표만 유효

동일한 `nullifier`가 같은 `pollId`에 대해 다시 제출되면, 이는 "재투표(업데이트)"로 간주됩니다.

**Solidity 컨트랙트 동작**:

- `mapping(pollId => mapping(bytes32 => Vote))` 구조로 저장
- 동일 `(pollId, nullifier)` 조합이 이미 존재하면 기존 투표를 업데이트
- 이벤트 `VoteCast`에 `isUpdate: true` 플래그 발행
- **마지막 표만 유효**: 이전 투표는 무시되고 최신 커밋만 집계에 반영

**왜 이렇게 설계했나?**

- 사용자가 실수로 잘못 투표한 경우 수정 가능
- 동시에 여러 표를 제출해도 마지막 것만 유효하므로 중복 집계 방지
- 온체인 이벤트에서 `isUpdate` 플래그로 재투표 여부 추적 가능

## 다이어그램

### Nullifier 생성

```
nullifierSecret ----\
                     Poseidon(2) --> nullifier (public output)
pollId (public) ----/
```

### Vote Commitment 생성

```
vote (private) -----\
salt (private) ------\
                       Poseidon(3) --> voteCommitment (public output)
pollId (public) -----/
```

### 전체 플로우

```
[Private Inputs]
  vote, voteBit0, voteBit1, voteBit2
  salt
  nullifierSecret
  pathElements[14], pathIndex[14]

[Public Input]
  pollId

[Circuit Logic]
  1. leaf = Poseidon(nullifierSecret, pollId)
  2. root = MerkleTreeInclusionProof(leaf, pathElements, pathIndex)
  3. nullifier = Poseidon(nullifierSecret, pollId)
  4. voteCommitment = Poseidon(vote, salt, pollId)
  5. vote ∈ {0..7} 제약 검증 (v = b0 + 2*b1 + 4*b2)

[Public Outputs]
  [root, pollId, nullifier, voteCommitment]
```

## 보안 속성

1. **익명성**: `vote`와 `salt`는 private이므로 선택값은 공개되지 않음
2. **무결성**: Merkle proof로 유권자 자격 검증
3. **1인 1표**: `nullifier = Poseidon(secret, pollId)`로 선거별 고유 식별
4. **변조 방지**: public signals나 proof를 변조하면 검증 실패 (테스트: `npm run test:tampered`)

## v0.9 → v1.2 변경사항

| 항목                | v0.9                                         | v1.2                                           |
| ------------------- | -------------------------------------------- | ---------------------------------------------- |
| pollId 위치         | private input                                | **public input**                               |
| public outputs 순서 | [root, nullifierHash, commitment, pollIdOut] | **[root, pollId, nullifier, voteCommitment]**  |
| 선거별 구분         | pollId가 private이라 검증 시 확인 불가       | pollId가 public이라 검증 시 일치 확인 가능     |
| 재투표 정책         | 명시적 정책 없음                             | 마지막 표만 유효 (업데이트)                    |
| vote 범위           | 0/1/2 (3개 후보 고정)                        | **0~7 (최대 8개 후보, 앱에서 실제 개수 관리)** |

## 검증 예시

### 정상 증명

```javascript
const { proof, publicSignals } = await groth16.fullProve(input, wasm, zkey)
// publicSignals = [root, pollId, nullifier, voteCommitment]

const valid = await groth16.verify(vkey, publicSignals, proof)
// true
```

### 변조된 증명 (검증 실패)

```javascript
const tampered = [...publicSignals]
tampered[0] = (BigInt(tampered[0]) + BigInt(1)).toString() // root 변조

const valid = await groth16.verify(vkey, tampered, proof)
// false ✅ (정상 동작)
```

## Trusted Setup (ptau)

v1.2는 **pot14_final.ptau**를 사용합니다.

**선택 이유:**

- Merkle tree depth: **14** (최대 2¹⁴ = 16,384명 지원)
- 회로 제약 수: depth 14 기준으로 최적화 (빌드 후 확인)
- pot14 (2¹⁴ = 16,384)가 depth 14와 정확히 일치하여 최적의 사이즈
- pot13 (2¹³ = 8192)는 살짝 부족할 수 있고, pot15 (2¹⁵ = 32768)는 과도하게 큰 사이즈
- 학부 프로젝트/데모 환경에서 개발자들이 로컬에서 zkey를 재생성하기 용이한 수준으로 조정

**성능/보안 영향:**

- 온체인 가스/검증 시간: 영향 없음 (Groth16 검증 복잡도는 동일)
- Proof 생성 속도: 영향 없음 (회로 제약 수에 의해 결정)
- 보안: pot14로 충분한 보안 수준 보장

## 파일 위치

- 회로: `circuits/v1.2/vote.circom`
- 빌드 산출물: `build/v1.2/`
  - `vote.r1cs`: R1CS 제약
  - `vote_js/vote.wasm`: WASM 바이너리
  - `vote_final.zkey`: 최종 zkey
  - `verification_key.json`: 검증 키
- Trusted setup: `pot14_final.ptau`
- Verifier 컨트랙트: `contracts/VerifierV1_2.sol`
- 버전 락: `zkp-version.lock`

## 빌드 및 테스트

```bash
# v1.2 회로 빌드
npm run build:v1.2

# 변조된 Proof 테스트
npm run test:tampered

# 버전 락 업데이트
npm run lock:v1.2
```

## 참고

- **왜 ZKP인가?**: "유효성(1인1표)만 공개하고, 신원/선택은 끝까지 비공개"
- **재검증 가능성**: 온체인 이벤트(`VoteCast`)로 누구나 유효표 개수 재집계 가능
- **3자 검증**: `events.csv`와 `usedNullifiers.csv`로 중복=0, 집계 일치 확인
