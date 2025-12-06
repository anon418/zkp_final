/**
 * Merkle Tree 구현 (Poseidon 해시 사용)
 *
 * ZKP 회로와 호환되는 Merkle tree 구현
 * - 깊이: 14 (최대 2^14 = 16,384명 지원)
 * - 해시 함수: Poseidon(2) - 두 개의 입력을 받는 Poseidon 해시
 * - Leaf: Poseidon(nullifierSecret, pollId)
 */

// circomlibjs는 서버 사이드에서만 사용 (동적 import)

// Merkle tree 깊이 (회로와 동일)
const MERKLE_TREE_DEPTH = 14

// Poseidon 해시 함수 (2개 입력) - 동적 import 사용
async function poseidonHash2(a: bigint, b: bigint): Promise<bigint> {
  const { buildPoseidon } = await import('circomlibjs')
  const poseidon = await buildPoseidon()
  const hash = poseidon([a.toString(), b.toString()])
  return BigInt(poseidon.F.toString(hash))
}

// Merkle Tree 클래스
export class MerkleTree {
  private depth: number
  private leaves: bigint[]
  private tree: bigint[][]
  /**
   * Poseidon 해시 함수 인스턴스
   * circomlibjs의 buildPoseidon() 반환 타입 (동적 import로 타입 정의 어려움)
   */
  private poseidon: {
    F: {
      toString: (value: unknown) => string
    }
    (inputs: string[]): unknown
  } | null = null

  constructor(depth: number = MERKLE_TREE_DEPTH) {
    this.depth = depth
    this.leaves = []
    this.tree = []
  }

  /**
   * Poseidon 초기화 (비동기)
   */
  async initialize() {
    const { buildPoseidon } = await import('circomlibjs')
    this.poseidon = (await buildPoseidon()) as {
      F: {
        toString: (value: unknown) => string
      }
      (inputs: string[]): unknown
    }
  }

  /**
   * Leaf 추가
   * @param leaf Poseidon(nullifierSecret, pollId)로 계산된 leaf 값
   */
  addLeaf(leaf: bigint) {
    this.leaves.push(leaf)
  }

  /**
   * Merkle tree 구성
   */
  async   buildTree() {
    if (this.leaves.length === 0) {
      throw new Error('No leaves to build tree')
    }

    if (!this.poseidon) {
      throw new Error('Poseidon not initialized. Call initialize() first.')
    }

    // 트리 초기화
    this.tree = []

    // Level 0: Leaves
    const level0: bigint[] = [...this.leaves]

    // 빈 슬롯을 0으로 채움 (2^depth 크기)
    const maxLeaves = 2 ** this.depth
    while (level0.length < maxLeaves) {
      level0.push(BigInt(0))
    }

    this.tree.push(level0)

    // Level 1 ~ depth: 부모 노드 계산
    for (let level = 0; level < this.depth; level++) {
      const currentLevel = this.tree[level]
      const nextLevel: bigint[] = []

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]
        const right = currentLevel[i + 1] || BigInt(0)

        // Poseidon(2) 해시: left와 right를 해시
        const hash = this.poseidon([left.toString(), right.toString()])
        const parent = BigInt(this.poseidon.F.toString(hash))

        nextLevel.push(parent)
      }

      this.tree.push(nextLevel)
    }
  }

  /**
   * Root 반환
   */
  getRoot(): bigint {
    if (this.tree.length === 0) {
      throw new Error('Tree not built. Call buildTree() first.')
    }
    return this.tree[this.depth][0]
  }

  /**
   * Merkle proof 생성
   * @param leafIndex 찾을 leaf의 인덱스
   * @returns { pathElements: bigint[], pathIndices: number[] }
   */
  getProof(leafIndex: number): {
    pathElements: bigint[]
    pathIndices: number[]
  } {
    if (this.tree.length === 0) {
      throw new Error('Tree not built. Call buildTree() first.')
    }

    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error(`Leaf index ${leafIndex} out of range`)
    }

    const pathElements: bigint[] = []
    const pathIndices: number[] = []

    let currentIndex = leafIndex

    // 각 레벨에서 형제 노드와 인덱스 수집
    for (let level = 0; level < this.depth; level++) {
      const currentLevel = this.tree[level]
      const siblingIndex =
        currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1

      // 형제 노드 (없으면 0)
      const sibling = currentLevel[siblingIndex] || BigInt(0)
      pathElements.push(sibling)

      // 인덱스 (0 = 왼쪽, 1 = 오른쪽)
      pathIndices.push(currentIndex % 2)

      // 다음 레벨로 이동
      currentIndex = Math.floor(currentIndex / 2)
    }

    return { pathElements, pathIndices }
  }

  /**
   * Leaf 값으로 proof 찾기
   * @param leaf 찾을 leaf 값
   * @returns { pathElements: bigint[], pathIndices: number[] } | null
   */
  getProofByLeaf(leaf: bigint): {
    pathElements: bigint[]
    pathIndices: number[]
  } | null {
    const leafIndex = this.leaves.findIndex((l) => l === leaf)
    if (leafIndex === -1) {
      return null
    }
    return this.getProof(leafIndex)
  }
}

/**
 * 유권자 목록으로부터 Merkle tree 구성 및 proof 생성
 *
 * @param voters 등록된 유권자 목록 (identityNullifier 포함)
 * @param pollId 투표 ID
 * @param targetNullifier 찾을 유권자의 nullifierSecret
 * @returns { root: bigint, merkleProof: { pathElements: string[], pathIndices: number[] } }
 */
export async function generateMerkleProofForVoter(
  voters: Array<{ identityNullifier: string }>,
  pollId: string | number,
  targetNullifier: string
): Promise<{
  root: string
  merkleProof: { pathElements: string[]; pathIndices: number[] }
}> {
  // Poseidon 초기화 (동적 import)
  const { buildPoseidon } = await import('circomlibjs')
  const poseidon = await buildPoseidon()

  // Poll ID를 BigInt로 변환
  const pollIdBigInt = BigInt(pollId)

  // 각 유권자의 leaf 계산: Poseidon(nullifierSecret, pollId)
  const leaves: bigint[] = []
  let targetLeaf: bigint | null = null

  for (const voter of voters) {
    const nullifierSecret = BigInt(voter.identityNullifier)
    const hash = poseidon([nullifierSecret.toString(), pollIdBigInt.toString()])
    const leaf = BigInt(poseidon.F.toString(hash))

    leaves.push(leaf)

    // 타겟 유권자의 leaf 찾기
    if (voter.identityNullifier === targetNullifier) {
      targetLeaf = leaf
    }
  }

  if (!targetLeaf) {
    throw new Error(
      `Voter with nullifierSecret ${targetNullifier} not found in the tree`
    )
  }

  // Merkle tree 구성
  const tree = new MerkleTree(MERKLE_TREE_DEPTH)
  await tree.initialize()

  for (const leaf of leaves) {
    tree.addLeaf(leaf)
  }

  await tree.buildTree()

  // Root 가져오기
  const root = tree.getRoot()

  // Proof 생성
  const proof = tree.getProofByLeaf(targetLeaf)
  if (!proof) {
    throw new Error('Failed to generate merkle proof')
  }

  return {
    root: '0x' + root.toString(16).padStart(64, '0'),
    merkleProof: {
      pathElements: proof.pathElements.map((e) => e.toString()),
      pathIndices: proof.pathIndices,
    },
  }
}
