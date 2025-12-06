/**
 * VotingV2 컨트랙트 비즈니스 로직 테스트
 *
 * 검증 내용:
 * - 투표 생성: 새 투표 생성, 여러 투표 동시 생성, 중복 pollId 방지
 * - 투표 제출: 유효한 증명으로 투표, 재투표 업데이트, 에러 처리
 * - 다중 투표 독립성: 같은 사용자가 다른 투표에 각각 참여 가능
 * - 조회 함수: 후보 목록 조회, 투표 여부 확인
 *
 * 특징:
 * - MockVerifierV12 사용 (실제 ZKP 증명 검증 없음)
 * - 컨트랙트 로직만 검증 (빠른 실행)
 * - 현재 코드베이스는 VotingV2만 사용하므로 이 테스트만 실행됨
 *
 * 실행 방법:
 *   npm run test:blockchain
 *   (test/blockchain 폴더에 voting-v2.test.js만 있으므로 자동으로 v2만 테스트됨)
 */

const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VotingV2 - 다중 투표 지원', function () {
  let votingV2
  let verifier
  let owner
  let voter1
  let voter2

  const POLL_ID_1 = 1
  const POLL_ID_2 = 2
  const MERKLE_ROOT = ethers.zeroPadValue('0x1234', 32)

  // 타임아웃 증가 (컨트랙트 배포에 시간이 걸릴 수 있음)
  this.timeout(30000) // 30초

  beforeEach(async function () {
    ;[owner, voter1, voter2] = await ethers.getSigners()

    // Mock Verifier 배포
    // MockVerifierV12는 constructor에 bool 파라미터를 받음
    const MockVerifier = await ethers.getContractFactory('MockVerifierV12')
    verifier = await MockVerifier.deploy(true) // true = 항상 검증 성공
    await verifier.waitForDeployment()

    // VotingV2 배포
    const VotingV2 = await ethers.getContractFactory('VotingV2')
    votingV2 = await VotingV2.deploy(await verifier.getAddress())
    await votingV2.waitForDeployment()
  })

  describe('투표 생성', function () {
    it('새 투표를 생성할 수 있어야 함', async function () {
      const startTime = Math.floor(Date.now() / 1000)
      const endTime = startTime + 3600 // 1시간 후

      const tx = await votingV2.createElection(
        POLL_ID_1,
        MERKLE_ROOT,
        startTime,
        endTime,
        ['치킨', '피자', '파스타']
      )

      await expect(tx)
        .to.emit(votingV2, 'PollCreated')
        .withArgs(POLL_ID_1, owner.address, startTime, endTime, 3)

      const election = await votingV2.getElection(POLL_ID_1)
      expect(election.creator).to.equal(owner.address)
      expect(election.candidatesCount).to.equal(3n)
    })

    it('여러 투표를 동시에 생성할 수 있어야 함', async function () {
      const startTime = Math.floor(Date.now() / 1000)
      const endTime = startTime + 3600

      // 투표 1
      await votingV2.createElection(
        POLL_ID_1,
        MERKLE_ROOT,
        startTime,
        endTime,
        ['치킨', '피자']
      )

      // 투표 2
      await votingV2.createElection(
        POLL_ID_2,
        MERKLE_ROOT,
        startTime,
        endTime,
        ['찬성', '반대']
      )

      // 두 투표가 독립적으로 존재
      const election1 = await votingV2.getElection(POLL_ID_1)
      const election2 = await votingV2.getElection(POLL_ID_2)

      expect(election1.candidatesCount).to.equal(2n)
      expect(election2.candidatesCount).to.equal(2n)
    })

    it('중복된 pollId로 생성하면 실패해야 함', async function () {
      const startTime = Math.floor(Date.now() / 1000)
      const endTime = startTime + 3600

      await votingV2.createElection(
        POLL_ID_1,
        MERKLE_ROOT,
        startTime,
        endTime,
        ['A', 'B']
      )

      await expect(
        votingV2.createElection(POLL_ID_1, MERKLE_ROOT, startTime, endTime, [
          'C',
          'D',
        ])
      ).to.be.revertedWith('Election already exists')
    })
  })

  describe('투표 제출', function () {
    beforeEach(async function () {
      const startTime = Math.floor(Date.now() / 1000) - 60 // 1분 전 시작
      const endTime = startTime + 3600 // 1시간 후 종료

      await votingV2.createElection(
        POLL_ID_1,
        ethers.zeroPadValue('0x00', 32), // merkleRoot 검증 스킵
        startTime,
        endTime,
        ['치킨', '피자', '파스타']
      )
    })

    it('유효한 증명으로 투표할 수 있어야 함', async function () {
      const proposalId = 0 // 치킨
      const pubSignals = [
        123, // root
        POLL_ID_1, // pollId
        456, // nullifier
        789, // voteCommitment
      ]

      const tx = await votingV2.vote(
        POLL_ID_1,
        proposalId,
        [1, 2],
        [
          [1, 2],
          [3, 4],
        ],
        [5, 6],
        pubSignals
      )

      await expect(tx)
        .to.emit(votingV2, 'VoteCast')
        .withArgs(POLL_ID_1, 456, proposalId, 789, false)

      // 투표 확인
      const voteInfo = await votingV2.getVote(POLL_ID_1, 456)
      expect(voteInfo.candidate).to.equal(BigInt(proposalId))
      expect(voteInfo.exists).to.be.true
    })

    it('재투표 시 업데이트되어야 함', async function () {
      const nullifier = 456
      const pubSignals = [123, POLL_ID_1, nullifier, 789]

      // 첫 번째 투표 (치킨)
      await votingV2.vote(
        POLL_ID_1,
        0,
        [1, 2],
        [
          [1, 2],
          [3, 4],
        ],
        [5, 6],
        pubSignals
      )

      // 재투표 (피자)
      const tx = await votingV2.vote(
        POLL_ID_1,
        1, // 피자로 변경
        [1, 2],
        [
          [1, 2],
          [3, 4],
        ],
        [5, 6],
        pubSignals
      )

      await expect(tx)
        .to.emit(votingV2, 'VoteCast')
        .withArgs(POLL_ID_1, nullifier, 1, 789, true) // isUpdate = true

      // 마지막 투표만 유효
      const voteInfo = await votingV2.getVote(POLL_ID_1, nullifier)
      expect(voteInfo.candidate).to.equal(1n) // 피자
    })

    it('존재하지 않는 투표에는 제출할 수 없어야 함', async function () {
      const pubSignals = [123, 999, 456, 789] // pollId = 999 (존재하지 않음)

      await expect(
        votingV2.vote(
          999,
          0,
          [1, 2],
          [
            [1, 2],
            [3, 4],
          ],
          [5, 6],
          pubSignals
        )
      ).to.be.revertedWith('Election not found')
    })

    it('pollId 불일치 시 실패해야 함', async function () {
      const pubSignals = [123, 999, 456, 789] // pollId = 999

      await expect(
        votingV2.vote(
          POLL_ID_1, // 컨트랙트는 pollId=1 기대
          0,
          [1, 2],
          [
            [1, 2],
            [3, 4],
          ],
          [5, 6],
          pubSignals
        )
      ).to.be.revertedWith('pollId mismatch')
    })
  })

  describe('다중 투표 독립성', function () {
    beforeEach(async function () {
      const startTime = Math.floor(Date.now() / 1000) - 60
      const endTime = startTime + 3600

      // 투표 1: 점심 메뉴
      await votingV2.createElection(
        POLL_ID_1,
        ethers.zeroPadValue('0x00', 32),
        startTime,
        endTime,
        ['치킨', '피자', '파스타']
      )

      // 투표 2: 회장 선거
      await votingV2.createElection(
        POLL_ID_2,
        ethers.zeroPadValue('0x00', 32),
        startTime,
        endTime,
        ['후보A', '후보B']
      )
    })

    it('같은 사용자가 다른 투표에 각각 참여할 수 있어야 함', async function () {
      const nullifier = 456 // 같은 사용자

      // 투표 1에 참여
      await votingV2.vote(
        POLL_ID_1,
        0, // 치킨
        [1, 2],
        [
          [1, 2],
          [3, 4],
        ],
        [5, 6],
        [123, POLL_ID_1, nullifier, 789]
      )

      // 투표 2에 참여 (같은 nullifier 가능)
      await votingV2.vote(
        POLL_ID_2,
        1, // 후보B
        [1, 2],
        [
          [1, 2],
          [3, 4],
        ],
        [5, 6],
        [123, POLL_ID_2, nullifier, 999]
      )

      // 두 투표 모두 정상 기록
      const vote1 = await votingV2.getVote(POLL_ID_1, nullifier)
      const vote2 = await votingV2.getVote(POLL_ID_2, nullifier)

      expect(vote1.exists).to.be.true
      expect(vote2.exists).to.be.true
      expect(vote1.candidate).to.equal(0n)
      expect(vote2.candidate).to.equal(1n)
    })
  })

  describe('조회 함수', function () {
    it('후보 목록을 조회할 수 있어야 함', async function () {
      const startTime = Math.floor(Date.now() / 1000)
      const endTime = startTime + 3600
      const candidates = ['치킨', '피자', '파스타']

      await votingV2.createElection(
        POLL_ID_1,
        MERKLE_ROOT,
        startTime,
        endTime,
        candidates
      )

      const retrieved = await votingV2.getCandidates(POLL_ID_1)
      expect(retrieved).to.deep.equal(candidates)
    })

    it('투표 여부를 확인할 수 있어야 함', async function () {
      const startTime = Math.floor(Date.now() / 1000) - 60
      const endTime = startTime + 3600

      await votingV2.createElection(
        POLL_ID_1,
        ethers.zeroPadValue('0x00', 32),
        startTime,
        endTime,
        ['A', 'B']
      )

      const nullifier = 456

      // 투표 전
      expect(await votingV2.hasVoted(POLL_ID_1, nullifier)).to.be.false

      // 투표
      await votingV2.vote(
        POLL_ID_1,
        0,
        [1, 2],
        [
          [1, 2],
          [3, 4],
        ],
        [5, 6],
        [123, POLL_ID_1, nullifier, 789]
      )

      // 투표 후
      expect(await votingV2.hasVoted(POLL_ID_1, nullifier)).to.be.true
    })
  })
})
