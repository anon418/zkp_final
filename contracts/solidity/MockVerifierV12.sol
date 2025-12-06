// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVerifierV12
 * @notice 테스트용 Mock Verifier
 * @dev voting-v1_2.test.js에서 사용
 */
contract MockVerifierV12 {
    bool private returnValue;

    constructor(bool _returnValue) {
        returnValue = _returnValue;
    }

    /**
     * @notice v1.2 Verifier 인터페이스 호환
     * Mock verifyProof - 항상 설정된 값 반환
     */
    function verifyProof(
        uint[2] calldata, // pA
        uint[2][2] calldata, // pB
        uint[2] calldata, // pC
        uint[4] calldata // pubSignals [root, pollId, nullifier, voteCommitment]
    ) external view returns (bool) {
        // Mock: 항상 설정된 값 반환
        return returnValue;
    }

    // 테스트용: 반환값 변경
    function setReturnValue(bool _value) external {
        returnValue = _value;
    }
}

