/**
 * Proof 생성 CLI 도구
 * 
 * 목적: 명령줄에서 증명을 생성하고 JSON 파일로 저장
 * 
 * 실행: npm run proof:cli:v1.2
 * 
 * 사용법:
 *   npm run proof:cli:v1.2 \
 *     --wasm build/v1.2/vote_js/vote.wasm \
 *     --zkey build/v1.2/vote_final.zkey \
 *     --input fixtures/input.v1.2.sample.json \
 *     --out zkp_bundle/proof-v1.2.json
 * 
 * 출력:
 *   - proof: 증명 데이터 (컨트랙트에 전달)
 *   - publicSignals: [root, pollId, nullifier, voteCommitment]
 *   - ms: 증명 생성 시간 (밀리초)
 */

import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { groth16 } from 'snarkjs';

type CliArgs = {
  wasm: string;
  zkey: string;
  input: string;
  out: string;
};

function parseArgs(): CliArgs {
  const argv = minimist(process.argv.slice(2), {
    string: ['wasm', 'zkey', 'input', 'out'],
    default: {
      wasm: 'build/vote_js/vote.wasm',
      zkey: 'build/vote_final.zkey',
      input: 'input.json',
      out: 'zkp_bundle/proof.json',
    },
  });

  if (!argv.out) {
    throw new Error('--out <path>는 필수입니다.');
  }

  return {
    wasm: path.resolve(argv.wasm),
    zkey: path.resolve(argv.zkey),
    input: path.resolve(argv.input),
    out: path.resolve(argv.out),
  };
}

async function main() {
  const args = parseArgs();
  
  // 입력 파일 읽기 (투표 데이터)
  const payload = JSON.parse(fs.readFileSync(args.input, 'utf8'));
  
  // 증명 생성 (3~5초 소요)
  const started = process.hrtime.bigint();
  const { proof, publicSignals } = await groth16.fullProve(payload, args.wasm, args.zkey);
  const elapsed = Number(process.hrtime.bigint() - started) / 1e6;

  // 출력 디렉토리 생성
  const outDir = path.dirname(args.out);
  fs.mkdirSync(outDir, { recursive: true });
  
  // 결과 저장 (proof, publicSignals, 소요 시간, 사용한 파일 경로)
  fs.writeFileSync(
    args.out,
    JSON.stringify({ proof, publicSignals, ms: elapsed, wasm: args.wasm, zkey: args.zkey }, null, 2)
  );
  console.log(`proof saved to ${args.out} (${elapsed.toFixed(2)} ms)`);
}

main().catch((err) => {
  console.error('[proof-cli] failed:', err);
  process.exit(1);
});
