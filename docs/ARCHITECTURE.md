# 🏗️ 시스템 아키텍처

## 전체 시스템 구조

```mermaid
graph TB
    subgraph "프론트엔드 (Next.js)"
        A[사용자 브라우저] --> B[React 컴포넌트]
        B --> C[API 클라이언트]
        B --> D[Web Worker]
        B --> E[MetaMask 연동]
    end

    subgraph "백엔드 (Next.js API Routes)"
        C --> F[API Routes]
        F --> G[비즈니스 로직]
        F --> H[에러 처리]
        F --> I[인증/권한]
    end

    subgraph "데이터 계층"
        G --> J[MongoDB Atlas]
        J --> K[Poll Collection]
        J --> L[Vote Collection]
    end

    subgraph "블록체인 계층"
        G --> M[Ethers.js]
        M --> N[Sepolia Network]
        N --> O[VotingV2 Contract]
        N --> P[Verifier Contract]
        E --> N
    end

    subgraph "ZKP 계층"
        D --> Q[snarkjs]
        Q --> R[Groth16 Proof]
        R --> S[Public Signals]
        S --> O
    end

    style A fill:#e1f5ff
    style J fill:#fff4e1
    style N fill:#ffe1f5
    style Q fill:#e1ffe1
```

## 데이터 플로우

### 투표 생성 플로우

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as 프론트엔드
    participant API as API Routes
    participant DB as MongoDB
    participant BC as 블록체인

    U->>F: 투표 생성 요청
    F->>API: POST /api/vote
    API->>DB: Poll 저장
    DB-->>API: 저장 완료
    API->>BC: Election 생성 (선택)
    BC-->>API: 트랜잭션 해시
    API-->>F: pollId 반환
    F-->>U: QR 코드 표시
```

### 투표 참여 플로우

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as 프론트엔드
    participant W as Web Worker
    participant API as API Routes
    participant DB as MongoDB
    participant BC as 블록체인

    U->>F: 후보 선택
    F->>API: GET /api/vote/:pollId/public
    API->>DB: Poll 조회
    DB-->>API: Poll 데이터
    API-->>F: Merkle Root, 후보 목록
    
    F->>W: ZKP 증명 생성 요청
    W->>W: Groth16 Proof 생성 (15초)
    W-->>F: Proof + Public Signals
    
    F->>API: POST /api/relay
    API->>BC: vote() 호출
    BC->>BC: ZKP 검증
    BC-->>API: 트랜잭션 해시
    API->>DB: Vote 저장
    DB-->>API: 저장 완료
    API-->>F: 성공 응답
    F-->>U: 투표 완료 안내
```

### 결과 조회 플로우

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as 프론트엔드
    participant API as API Routes
    participant DB as MongoDB

    U->>F: 결과 보기 클릭
    F->>API: GET /api/vote/:pollId/results
    API->>DB: Vote 집계
    Note over API,DB: 재투표 정책 적용<br/>(마지막 투표만 유효)
    DB-->>API: 집계 결과
    API-->>F: 후보별 득표수
    F-->>U: 결과 차트 표시
```

## ZKP 증명 생성 플로우

```mermaid
graph LR
    A[투표 입력] --> B[Salt 생성]
    B --> C[Nullifier Secret 생성]
    C --> D[Merkle Proof 생성]
    D --> E[Circuit Input 준비]
    E --> F[Groth16 Proof 생성]
    F --> G[Public Signals 추출]
    G --> H[Proof 검증]
    H --> I[블록체인 제출]
    
    style F fill:#ffe1f5
    style G fill:#e1ffe1
    style H fill:#fff4e1
```

## 보안 계층

```mermaid
graph TB
    subgraph "익명성 보장"
        A[ZKP Proof] --> B[투표 내용 암호화]
        B --> C[Nullifier로 중복 방지]
        C --> D[서버는 투표 내용 모름]
    end

    subgraph "무결성 보장"
        E[블록체인 저장] --> F[불변성 보장]
        F --> G[Etherscan 검증 가능]
    end

    subgraph "접근 제어"
        H[생성자 검증] --> I[투표 삭제 권한]
        J[MetaMask 인증] --> K[지갑 주소 확인]
    end

    style A fill:#e1ffe1
    style E fill:#ffe1f5
    style H fill:#fff4e1
```

## 기술 스택

### 프론트엔드
- **Next.js 15**: React 프레임워크
- **TypeScript**: 타입 안정성
- **Zustand**: 상태 관리
- **Ethers.js**: 블록체인 연동

### 백엔드
- **Next.js API Routes**: 서버리스 API
- **MongoDB + Mongoose**: 데이터베이스
- **Zod**: 런타임 검증

### 블록체인
- **Solidity**: 스마트 컨트랙트
- **Hardhat**: 개발 환경
- **Sepolia**: 테스트넷

### ZKP
- **Circom**: 회로 작성
- **snarkjs**: 증명 생성/검증
- **Groth16**: 증명 시스템

## 주요 설계 결정

### 1. 재투표 정책
- 마감 시간 전까지 재투표 가능
- 마지막 투표만 유효 (컨트랙트 및 DB 일치)

### 2. Relayer 패턴
- 사용자는 가스비 지불 불필요
- Relayer가 가스비 대납
- Nonce 큐로 동시성 관리

### 3. 캐싱 전략
- 진행 중 투표: 10초 캐시
- 종료된 투표: 5분 캐시
- 통계: 1분 캐시

### 4. 에러 처리
- 중앙화된 에러 핸들러
- 일관된 에러 응답 형식
- 사용자 친화적 메시지

## 확장성 고려사항

### 현재 구조
- 단일 MongoDB 인스턴스
- 단일 Relayer 지갑
- 클라이언트 사이드 ZKP 생성

### 향후 개선 가능
- MongoDB 샤딩
- Relayer 풀 (로드 밸런싱)
- 서버 사이드 ZKP 생성 (WSL Proof 서버)

