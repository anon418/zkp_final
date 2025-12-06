require('@nomicfoundation/hardhat-ethers')
require('@nomicfoundation/hardhat-chai-matchers')
require('dotenv').config()

// 환경 변수: SEPOLIA_RPC_URL 또는 INFURA_URL 또는 ALCHEMY_URL 사용
const SEPOLIA_RPC_URL =
  process.env.SEPOLIA_RPC_URL ||
  process.env.INFURA_URL ||
  process.env.ALCHEMY_URL

const PRIVATE_KEY = process.env.PRIVATE_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

// 필수 환경 변수 검증
if (!PRIVATE_KEY) {
  throw new Error(
    '❌ PRIVATE_KEY 환경 변수가 설정되지 않았습니다!\n' +
      '   .env 파일에 PRIVATE_KEY=0x... 를 추가하세요.\n' +
      '   자세한 내용은 HOW_TO_GET_ENV_VARS.md를 참고하세요.'
  )
}

if (!SEPOLIA_RPC_URL) {
  throw new Error(
    '❌ RPC URL이 설정되지 않았습니다!\n' +
      '   .env 파일에 INFURA_URL 또는 ALCHEMY_URL 중 하나를 설정하세요.\n' +
      '   자세한 내용은 HOW_TO_GET_ENV_VARS.md를 참고하세요.'
  )
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY, // ✔ V2 방식
    customChains: [
      {
        network: 'sepolia',
        chainId: 11155111,
        urls: {
          apiURL: 'https://api-sepolia.etherscan.io/api',
          browserURL: 'https://sepolia.etherscan.io',
        },
      },
    ],
  },
}
