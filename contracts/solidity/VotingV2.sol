// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Groth16Verifier.sol";

/**
 * @title VotingV2 - 다중 투표 지원 버전
 * @notice 하나의 컨트랙트로 무한대의 투표를 관리
 * @dev v1.2 ZKP 회로와 완전 호환
 * 
 * 핵심 개선사항:
 * - Election 구조체로 여러 투표 동시 관리
 * - createElection() 함수로 동적 투표 생성
 * - pollId별로 독립적인 nullifier 관리
 * - 재투표 시 마지막 표만 유효
 */
contract VotingV2 {
    
    // ==================== 구조체 ====================
    
    /**
     * @dev 투표(선거) 정보
     */
    struct Election {
        bytes32 merkleRoot;      // 유권자 화이트리스트 Merkle Root
        uint256 startTime;       // 투표 시작 시간
        uint256 endTime;         // 투표 종료 시간
        address creator;         // 투표 생성자
        string[] candidates;     // 후보 목록
        bool exists;             // 투표 존재 여부
        uint256 totalVotes;      // 총 투표 수
    }
    
    /**
     * @dev 개별 투표 정보
     */
    struct VoteInfo {
        uint256 candidate;       // 선택한 후보 ID
        uint256 voteCommitment;  // 투표 커밋먼트
        uint256 timestamp;       // 투표 시간
        bool exists;             // 투표 존재 여부
    }
    
    // ==================== 상태 변수 ====================
    
    Groth16Verifier public verifier;
    
    // pollId → Election 정보
    mapping(uint256 => Election) public elections;
    
    // pollId → nullifier → VoteInfo
    mapping(uint256 => mapping(uint256 => VoteInfo)) public votes;
    
    // ==================== 이벤트 ====================
    
    /**
     * @dev 투표 생성 이벤트
     */
    event PollCreated(
        uint256 indexed pollId,
        address indexed creator,
        uint256 startTime,
        uint256 endTime,
        uint256 candidatesCount
    );
    
    /**
     * @dev ZKP 검증 성공 이벤트
     */
    event ProofVerified(
        uint256 indexed pollId,
        address indexed voter,
        uint256 nullifier
    );
    
    /**
     * @dev 투표 제출 이벤트
     */
    event VoteCast(
        uint256 indexed pollId,
        uint256 indexed nullifier,
        uint256 candidate,
        uint256 voteCommitment,
        bool isUpdate
    );
    
    // ==================== 생성자 ====================
    
    constructor(address verifierAddress) {
        verifier = Groth16Verifier(verifierAddress);
    }
    
    // ==================== 관리자 함수 ====================
    
    /**
     * @notice 새 투표 생성
     * @param pollId 투표 ID (고유해야 함)
     * @param merkleRoot 유권자 화이트리스트 Merkle Root
     * @param startTime 투표 시작 시간
     * @param endTime 투표 종료 시간
     * @param candidates 후보 목록
     */
    function createElection(
        uint256 pollId,
        bytes32 merkleRoot,
        uint256 startTime,
        uint256 endTime,
        string[] memory candidates
    ) public {
        require(!elections[pollId].exists, "Election already exists");
        require(endTime > startTime, "Invalid time range");
        require(candidates.length >= 2 && candidates.length <= 8, "Invalid candidates count");
        
        elections[pollId] = Election({
            merkleRoot: merkleRoot,
            startTime: startTime,
            endTime: endTime,
            creator: msg.sender,
            candidates: candidates,
            exists: true,
            totalVotes: 0
        });
        
        emit PollCreated(pollId, msg.sender, startTime, endTime, candidates.length);
    }
    
    // ==================== 투표 함수 ====================
    
    /**
     * @notice v1.2 투표 함수
     * @param pollId 투표 ID
     * @param proposalId 투표하려는 후보 ID
     * @param pA Groth16 proof A
     * @param pB Groth16 proof B
     * @param pC Groth16 proof C
     * @param pubSignals [root, pollId, nullifier, voteCommitment]
     */
    function vote(
        uint256 pollId,
        uint256 proposalId,
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        uint[4] calldata pubSignals
    ) public {
        // === 1) 투표 존재 확인 ===
        require(elections[pollId].exists, "Election not found");
        Election storage election = elections[pollId];
        
        // === 2) 시간 검증 ===
        require(block.timestamp >= election.startTime, "Election not started");
        require(block.timestamp <= election.endTime, "Election ended");
        
        // === 3) 후보 ID 검증 ===
        require(proposalId < election.candidates.length, "Invalid proposalId");
        
        // === 4) pollId 일치 확인 ===
        require(pubSignals[1] == pollId, "pollId mismatch");
        
        uint256 root = pubSignals[0];
        uint256 nullifier = pubSignals[2];
        uint256 voteCommitment = pubSignals[3];
        
        // === 5) Merkle Root 검증 (선택사항) ===
        // 화이트리스트를 사용하는 경우
        if (election.merkleRoot != bytes32(0)) {
            require(bytes32(root) == election.merkleRoot, "Invalid merkle root");
        }
        
        // === 6) 재투표 감지 ===
        bool isUpdate = votes[pollId][nullifier].exists;
        
        // === 7) ZKP 검증 ===
        bool valid = verifier.verifyProof(pA, pB, pC, pubSignals);
        require(valid, "Invalid proof");
        
        // === 8) 투표 반영 ===
        if (!isUpdate) {
            election.totalVotes += 1;
        }
        
        votes[pollId][nullifier] = VoteInfo({
            candidate: proposalId,
            voteCommitment: voteCommitment,
            timestamp: block.timestamp,
            exists: true
        });
        
        // === 9) 이벤트 발생 ===
        emit ProofVerified(pollId, msg.sender, nullifier);
        emit VoteCast(pollId, nullifier, proposalId, voteCommitment, isUpdate);
    }
    
    // ==================== 조회 함수 ====================
    
    /**
     * @notice 투표 정보 조회
     */
    function getElection(uint256 pollId) 
        public 
        view 
        returns (
            bytes32 merkleRoot,
            uint256 startTime,
            uint256 endTime,
            address creator,
            uint256 candidatesCount,
            uint256 totalVotes
        ) 
    {
        require(elections[pollId].exists, "Election not found");
        Election storage e = elections[pollId];
        return (
            e.merkleRoot,
            e.startTime,
            e.endTime,
            e.creator,
            e.candidates.length,
            e.totalVotes
        );
    }
    
    /**
     * @notice 후보 목록 조회
     */
    function getCandidates(uint256 pollId) 
        public 
        view 
        returns (string[] memory) 
    {
        require(elections[pollId].exists, "Election not found");
        return elections[pollId].candidates;
    }
    
    /**
     * @notice 특정 nullifier의 투표 정보 조회
     */
    function getVote(uint256 pollId, uint256 nullifier) 
        public 
        view 
        returns (
            uint256 candidate,
            uint256 voteCommitment,
            uint256 timestamp,
            bool exists
        ) 
    {
        VoteInfo storage v = votes[pollId][nullifier];
        return (v.candidate, v.voteCommitment, v.timestamp, v.exists);
    }
    
    /**
     * @notice nullifier 사용 여부 확인
     */
    function hasVoted(uint256 pollId, uint256 nullifier) 
        public 
        view 
        returns (bool) 
    {
        return votes[pollId][nullifier].exists;
    }
    
    /**
     * @notice 투표 존재 여부 확인
     */
    function electionExists(uint256 pollId) 
        public 
        view 
        returns (bool) 
    {
        return elections[pollId].exists;
    }
}
