# VoteZK ⚡

> **운영자도 조작할 수 없는 투명한 투표 플랫폼**  
> Zero-Knowledge Proof로 익명성 보장 + 블록체인으로 검증 가능

<div align="center">

![VoteZK Logo](public/logo.svg)

**[🚀 Demo](https://votezk.vercel.app)** • **[📖 Documentation](docs/)** • **[🔍 Etherscan](https://sepolia.etherscan.io)**

[![Status](https://img.shields.io/badge/Status-Production-ready-brightgreen?style=for-the-badge)](README.md)
[![시연](https://img.shields.io/badge/시연-Ready-blue?style=for-the-badge)](docs/START_PROJECT.md)

</div>

---

## 💡 **VoteZK란?**

**Zero-Knowledge Proof(영지식 증명)**와 **블록체인**을 활용한 투명하고 익명적인 투표 플랫폼입니다.

### **핵심 가치**

- 🔒 **익명성**: ZKP로 투표 내용을 숨기면서도 유효성 증명
- ✅ **검증 가능**: Etherscan에서 누구나 투표 결과 검증 가능
- ⛓️ **조작 불가**: 블록체인에 기록되어 변조 불가능
- 🎯 **1인 1표**: Nullifier 기반 중복 투표 방지

### **기존 투표 시스템과 비교**

| 시스템           | 익명성           | 검증 가능성      | 조작 불가능성       |
| ---------------- | ---------------- | ---------------- | ------------------- |
| **Google Forms** | ⚠️ IP 로그 남음  | ❌ 관리자만 확인 | ❌ 관리자 조작 가능 |
| **일반 투표 앱** | ⚠️ 서버 로그     | ❌ 믿어야 함     | ❌ 서버 조작 가능   |
| **VoteZK**       | ✅ ZKP 기반 익명 | ✅ 누구나 검증   | ✅ 블록체인 보장    |

### ⚠️ **중요한 제한사항**

**현재 시스템은 Open Poll (공개 투표) 방식입니다:**

- ✅ 같은 지갑 주소로는 중복 투표 불가
- ⚠️ 다른 지갑 주소로는 중복 투표 가능 (여러 MetaMask 계정 사용 시)
- ⚠️ 화이트리스트 없음 (누구나 투표 가능)

**자세한 내용**: [docs/LIMITATIONS.md](docs/LIMITATIONS.md) 참고

---

## 🔧 **어떻게 작동하는가?**

> **💡 용어가 어려우신가요?** [docs/README.md](docs/README.md)의 용어집을 참고하세요!

**간단히 말하면**: "나는 유효한 투표를 했지만, 무엇을 선택했는지는 비밀"이라는 것을 수학적으로 증명합니다.

### **핵심 용어**

- **ZKP**: 정보를 공개하지 않고도 유효함을 증명하는 암호학적 방법
- **Nullifier**: 중복 투표 방지를 위한 고유 식별자
- **Relayer**: 사용자 대신 가스비를 지불하는 서버

**더 자세한 설명**: [docs/README.md](docs/README.md)의 용어집 참고

### **작동 흐름 (간단)**

1. **투표 생성**: MetaMask로 연결, 후보 입력
2. **ZKP 생성**: 브라우저에서 증명 자동 생성 (~15초)
3. **블록체인 제출**: Relayer가 가스비 대납하여 제출
4. **검증**: 스마트 컨트랙트가 ZKP 검증 후 투표 기록
5. **확인**: Etherscan에서 누구나 검증 가능

**상세한 작동 원리**: [docs/README.md](docs/README.md) 참고

---

## 🚀 **빠른 시작**

### **필수 요구사항**

- Node.js 18 이상
- MongoDB (로컬 또는 MongoDB Atlas)
- MetaMask 브라우저 확장 프로그램

### **3단계로 시작**

```bash
# 1. 의존성 설치
npm install --legacy-peer-deps

# 2. 환경 변수 설정
copy env.example.txt .env
# .env 파일에 MongoDB URI, Sepolia RPC, Relayer Private Key 설정

# 3. 개발 서버 실행
npm run dev
```

→ 브라우저에서 `http://localhost:3000` 접속

**자세한 설정 가이드**: [docs/START_PROJECT.md](docs/START_PROJECT.md) 참고

---

## 📖 **문서**

> **처음 보는 분들**: [docs/README.md](docs/README.md)에서 문서 읽기 순서와 용어집을 확인하세요!

### 📌 필수 문서

| 문서                                           | 설명                               |
| ---------------------------------------------- | ---------------------------------- |
| [docs/README.md](docs/README.md)               | ⭐ 문서 가이드 (읽기 순서, 용어집) |
| [docs/START_PROJECT.md](docs/START_PROJECT.md) | ⭐ 빠른 시작 가이드 (로컬 개발)    |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md)       | ⭐ 사용자 가이드 (투표 사용법)     |

### 📚 참고 문서

| 문서                                                   | 설명                         |
| ------------------------------------------------------ | ---------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)           | 시스템 아키텍처              |
| [docs/blockchain.md](docs/blockchain.md)               | 블록체인 정보 (주소, 이벤트) |
| [docs/ETHERSCAN_GUIDE.md](docs/ETHERSCAN_GUIDE.md)     | Etherscan 확인 방법          |
| [docs/LIMITATIONS.md](docs/LIMITATIONS.md)             | 제한사항 상세                |
| [docs/zkp/zkp-spec-v1.2.md](docs/zkp/zkp-spec-v1.2.md) | ZKP 기술 명세                |

---

## 🛠️ **기술 스택**

- **Frontend**: Next.js 15, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes, MongoDB
- **Blockchain**: Solidity, Hardhat, Sepolia Testnet
- **ZKP**: Circom, snarkjs, Groth16

**자세한 기술 정보**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 참고

---

## 🔐 **검증**

### **Etherscan**

- **VotingV2**: [0xE4B4219eb5a12825859104601Fd8d94fFEF1e3d9](https://sepolia.etherscan.io/address/0xE4B4219eb5a12825859104601Fd8d94fFEF1e3d9)
- **Verifier**: [0x6A49b069Eaf2A53ab31723d93bd758310bFeb345](https://sepolia.etherscan.io/address/0x6A49b069Eaf2A53ab31723d93bd758310bFeb345)

**Etherscan 확인 방법**: [docs/ETHERSCAN_GUIDE.md](docs/ETHERSCAN_GUIDE.md) 참고

---

## 🚀 **배포**

```bash
# Vercel에 배포
vercel deploy --prod
```

**배포 가이드**: [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) 참고

---

<div align="center">

**Made with ⚡ by VoteZK Team**

[GitHub](https://github.com) • [Demo](https://votezk.vercel.app) • [Docs](docs/)

</div>
