pragma circom 2.1.4;

include "circomlib/circuits/poseidon.circom";
include "../merkle.circom";

// -----------------------------
// vote ∈ {0..7} 제약 (3비트, 최대 8개 후보)
// -----------------------------
/*
  v, b0, b1, b2 모두 private 입력

  - v  : 0~7 중 하나 (실제 투표값, 최대 8개 후보 지원)
  - b0 : 2진수 LSB (0 또는 1)
  - b1 : 2진수 중간 비트 (0 또는 1)
  - b2 : 2진수 MSB (0 또는 1)

  제약:
    1) b0, b1, b2 ∈ {0,1}
    2) v = b0 + 2*b1 + 4*b2   (0~7 표현)

  참고: 실제 앱에서는 관리자가 2~8개 중 원하는 개수만 후보로 사용.
        예: 후보 5개면 0~4만 사용, 6개면 0~5만 사용.
*/
template VoteInRange3Bits() {
    signal input v;
    signal input b0;
    signal input b1;
    signal input b2;

    // b0, b1, b2 boolean
    b0 * (b0 - 1) === 0;
    b1 * (b1 - 1) === 0;
    b2 * (b2 - 1) === 0;

    // v = b0 + 2*b1 + 4*b2 (0~7)
    v === b0 + 2 * b1 + 4 * b2;
}

// -----------------------------
// 메인 투표 회로 v1.2
// -----------------------------
/*
  v1.2 변경사항:
    - pollId를 public input으로 변경
    - public outputs 순서: [root, pollId, nullifier, voteCommitment]
    - vote 범위 확장: 0~7 (최대 8개 후보 지원)

  private inputs:
    - vote          : 0~7 (최대 8개 후보, 실제 사용 개수는 앱에서 관리)
    - voteBit0      : vote 의 LSB (0 또는 1)
    - voteBit1      : vote 의 중간 비트 (0 또는 1)
    - voteBit2      : vote 의 MSB (0 또는 1)
    - salt
    - nullifierSecret
    - pathElements[depth]
    - pathIndex[depth]

  public inputs:
    - pollId        : 투표 ID (선거별 구분)

  public outputs:
    - root          : MerkleTreeInclusionProof 로 계산된 루트
    - pollId        : 입력과 동일 (검증 시 일치 확인)
    - nullifier     : Poseidon(nullifierSecret, pollId) - 선거별 1인 1표 보장
    - voteCommitment: Poseidon(vote, salt, pollId) - 선택값 커밋

  참고:
    - 회로는 0~7 (최대 8개 후보)까지 지원
    - 실제 사용 후보 개수는 프론트/백엔드에서 관리
    - 예: 후보 5개면 0~4만 사용, 후보 6개면 0~5만 사용
    - 회로는 "0~7 중 하나를 선택했다"만 증명 (실제 후보 범위 검증은 앱 레벨)
*/
template VoteCircuit(depth) {
    // ---- private inputs ----
    signal input vote;
    signal input voteBit0;
    signal input voteBit1;
    signal input voteBit2;
    signal input salt;
    signal input nullifierSecret;
    signal input pathElements[depth];
    signal input pathIndex[depth];

    // ---- public inputs ----
    signal input pollId;

    // ---- public outputs (순서: root, pollId, nullifier, voteCommitment) ----
    signal output root;
    signal output pollIdOut;
    signal output nullifier;
    signal output voteCommitment;

    // leaf = Poseidon(nullifierSecret, pollId)
    component leafH = Poseidon(2);
    leafH.inputs[0] <== nullifierSecret;
    leafH.inputs[1] <== pollId;

    // Merkle 포함 증명
    component mp = MerkleTreeInclusionProof(depth);
    mp.leaf <== leafH.out;

    for (var i = 0; i < depth; i++) {
        mp.pathElements[i] <== pathElements[i];
        mp.pathIndex[i]    <== pathIndex[i];
    }

    root <== mp.root;

    // vote ∈ {0..7} 제약 (최대 8개 후보)
    component vin = VoteInRange3Bits();
    vin.v  <== vote;
    vin.b0 <== voteBit0;
    vin.b1 <== voteBit1;
    vin.b2 <== voteBit2;

    // nullifier = Poseidon(nullifierSecret, pollId)
    // 선거별로 다른 nullifier 생성 (pollId 포함)
    component nh = Poseidon(2);
    nh.inputs[0] <== nullifierSecret;
    nh.inputs[1] <== pollId;
    nullifier <== nh.out;

    // voteCommitment = Poseidon(vote, salt, pollId)
    component ch = Poseidon(3);
    ch.inputs[0] <== vote;
    ch.inputs[1] <== salt;
    ch.inputs[2] <== pollId;
    voteCommitment <== ch.out;

    // pollId 출력 (입력과 동일)
    pollIdOut <== pollId;
}

// 깊이 14 머클트리를 기본으로 사용 (최대 2^14 = 16,384명 지원)
component main = VoteCircuit(14);

