/**
 * Verifier 컨트랙트 배포 스크립트
 *
 * 목적: Sepolia 테스트넷에 Groth16Verifier 컨트랙트 배포
 *
 * 실행: npx hardhat run scripts/deploy.ts --network sepolia
 *
 * 생성 파일:
 *   - zkp_bundle/verifier.json - 배포된 컨트랙트 주소 및 ABI
 *
 * 용도: 프론트/백엔드에서 컨트랙트 주소를 사용하여 증명 검증
 */

import hre from 'hardhat'
import * as fs from 'fs'

async function main() {
  // Groth16Verifier 컨트랙트 배포 (build-v1.2.ts에서 생성된 VerifierV1_2.sol 컴파일 후)
  const Verifier = await hre.ethers.getContractFactory('Groth16Verifier')
  const verifier = await Verifier.deploy()
  await verifier.waitForDeployment()

  const verifierAddress = await verifier.getAddress()
  console.log('Groth16Verifier deployed to:', verifierAddress)

  // ABI 및 배포 정보를 JSON 파일로 저장 (프론트/백엔드에서 사용)
  const artifact = await hre.artifacts.readArtifact('Groth16Verifier')
  const out = {
    address: verifierAddress,
    abi: artifact.abi,
    network: hre.network.name,
    updatedAt: new Date().toISOString(),
  }

  // zkp_bundle 폴더가 없을 수도 있으니 보장
  if (!fs.existsSync('zkp_bundle')) fs.mkdirSync('zkp_bundle')
  fs.writeFileSync('zkp_bundle/verifier.json', JSON.stringify(out, null, 2))
  console.log('Saved zkp_bundle/verifier.json')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
