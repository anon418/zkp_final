/// <reference types="hardhat/types" />

declare module 'hardhat' {
  import { HardhatRuntimeEnvironment } from 'hardhat/types'
  const hre: HardhatRuntimeEnvironment & {
    ethers: any
  }
  export default hre
}
