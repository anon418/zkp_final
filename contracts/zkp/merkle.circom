pragma circom 2.1.4;

include "circomlib/circuits/poseidon.circom";

/*
  단순 Poseidon 머클트리 포함 증명 회로

  depth: 트리 높이 (예: 14)

  input:
    - leaf            : 리프 값
    - pathElements[i] : i번째 레벨에서 형제 노드 값
    - pathIndex[i]    : 0이면 leaf가 왼쪽, 1이면 오른쪽

  output:
    - root            : 계산된 루트
*/

template MerkleTreeInclusionProof(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndex[depth]; // 0 또는 1
    signal output root;

    // 현재 노드 값 (bottom-up)
    signal cur[depth + 1];
    cur[0] <== leaf;

    signal left[depth];
    signal right[depth];

    component hashers[depth];

    for (var i = 0; i < depth; i++) {
        // pathIndex[i]는 0 또는 1
        pathIndex[i] * (pathIndex[i] - 1) === 0;

        // left/right 선택 로직
        // left  = cur    if idx=0 else pathElements[i]
        // right = pathEl if idx=0 else cur
        left[i]  <== cur[i] + (pathElements[i] - cur[i]) * pathIndex[i];
        right[i] <== pathElements[i] + (cur[i] - pathElements[i]) * pathIndex[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];

        cur[i + 1] <== hashers[i].out;
    }

    root <== cur[depth];
}
