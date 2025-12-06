# ⛓️ 블록체인 정보

> **VotingV2 컨트랙트 주소 및 이벤트 스펙 통합 문서**

---

## 🔹 VotingV2 Contract (다중 투표 지원)

### 배포 정보

- **배포 일시**: 2025-12-05T16:43:38.341Z
- **네트워크**: Sepolia Testnet (ChainID: 11155111)

### 컨트랙트 주소

- **VotingV2**: `0xE4B4219eb5a12825859104601Fd8d94fFEF1e3d9`
- **Verifier**: `0x6A49b069Eaf2A53ab31723d93bd758310bFeb345`

### Etherscan 링크

- **VotingV2**: https://sepolia.etherscan.io/address/0xE4B4219eb5a12825859104601Fd8d94fFEF1e3d9
- **Verifier**: https://sepolia.etherscan.io/address/0x6A49b069Eaf2A53ab31723d93bd758310bFeb345

---

## 📝 주요 기능

### VotingV2 (다중 투표)

- ✅ `createElection(pollId, ...)` - 새 투표 생성
- ✅ `vote(pollId, proposalId, ...)` - 투표 제출
- ✅ `getElection(pollId)` - 투표 정보 조회
- ✅ `getCandidates(pollId)` - 후보 목록 조회
- ✅ `hasVoted(pollId, nullifier)` - 투표 여부 확인

---

## 🔧 환경 변수 설정

```bash
# .env
VOTING_V2_CONTRACT_ADDRESS=0xE4B4219eb5a12825859104601Fd8d94fFEF1e3d9
VERIFIER_CONTRACT_ADDRESS=0x6A49b069Eaf2A53ab31723d93bd758310bFeb345
CHAIN_ID=11155111
```

---

## 📡 이벤트 스펙

### 1. Event Definition

```solidity
event PollCreated(
    uint256 indexed pollId,
    address indexed creator,
    uint256 startTime,
    uint256 endTime,
    uint256 candidatesCount
);

event ProofVerified(
    uint256 indexed pollId,
    address indexed voter,
    uint256 nullifier
);

event VoteCast(
    uint256 indexed pollId,
    uint256 indexed nullifier,
    uint256 candidate,
    uint256 voteCommitment,
    bool isUpdate
);
```

---

### 2. 필드 설명

#### 🔹 PollCreated

| 필드명         | 타입      | indexed | 설명 |
|----------------|-----------|---------|-------|
| pollId         | uint256   | yes     | 투표 ID |
| creator        | address   | yes     | 투표 생성자 주소 |
| startTime      | uint256   | no      | 투표 시작 시간 |
| endTime        | uint256   | no      | 투표 종료 시간 |
| candidatesCount| uint256   | no      | 후보 개수 |

#### 🔹 ProofVerified

| 필드명 | 타입 | indexed | 설명 |
|-------|-------|---------|------|
| pollId | uint256 | yes | 해당 투표의 pollId |
| voter | address | yes | ZKP 검증을 통과한 지갑 주소 |
| nullifier | uint256 | no | nullifier 해시 |

#### 🔹 VoteCast

| 필드명         | 타입      | indexed | 설명 |
|----------------|-----------|---------|-------|
| pollId         | uint256   | yes     | 투표 진행 중인 poll 식별자 |
| nullifier      | uint256   | yes     | 중복 투표 방지를 위한 ZKP nullifier |
| candidate      | uint256   | no      | 투표자가 선택한 후보 ID |
| voteCommitment | uint256   | no      | 투표 커밋먼트 값 |
| isUpdate       | bool      | no      | 재투표 여부 (true면 재투표) |

---

### 3. Trigger 함수

#### createElection(pollId, merkleRoot, startTime, endTime, candidates)
- 투표 생성 → `PollCreated` 발생

#### vote(pollId, proposalId, pA, pB, pC, pubSignals)
`pubSignals = [root, pollId, nullifier, voteCommitment]`

- ZKP 검증 성공 → `ProofVerified` 발생  
- 투표 반영 → `VoteCast` 발생  

---

### 4. 샘플 트랜잭션 (증거용)

**TX**: https://sepolia.etherscan.io/tx/0x2ddc58e3557c34d99db2ceba5037c00e99e30ba23fb0a104d3173280940e3114

해당 트랜잭션에서:
- `ProofVerified` 이벤트 발생  
- `VoteCast(isUpdate=false)` 이벤트 정상 기록  

### Decoded Log 예시

```
voter         = 0x...
pollId        = 1
proposalId    = 1
nullifier     = 123456789...
voteCommitment= 987654321...
isUpdate      = false
```

---

## 📋 Evidence 참고 (events.csv 기준 컬럼 예시)

- tx_hash  
- log_index  
- pollId  
- proposalId  
- nullifier  
- voteCommitment  
- isUpdate  
- voter (ProofVerified 기준)  
- block_number  
- block_timestamp  
- contract_address

---

※ 이 문서는 VotingV2 배포 후 자동 생성되었습니다.

