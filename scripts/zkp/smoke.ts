/**
 * 스모크 테스트 (5가지 케이스)
 * 
 * 목적: ZKP 시스템의 기본 기능 빠른 검증
 * 
 * 실행: npm run smoke
 * 
 * 테스트 케이스:
 *   1. ✅ Normal - 정상 증명 생성 및 검증
 *   2. ✅ Tampered proof - 변조된 증명 검증 실패
 *   3. ⏳ Duplicate vote - 중복 투표 차단 (다른 팀 통합 후)
 *   4. ⏳ Nullifier reuse - nullifier 재사용 차단 (다른 팀 통합 후)
 *   5. ⏳ Out of gas - 가스 부족 처리 (다른 팀 통합 후)
 *   6. ⏳ RPC delay - RPC 지연 처리 (다른 팀 통합 후)
 * 
 * 결과: SMOKE.md 파일에 자동 업데이트됨
 */

import fs from 'fs';
import { performance } from 'perf_hooks';
import minimist from 'minimist';
import { groth16 } from 'snarkjs';

type CaseStatus = 'pass' | 'fail' | 'mock';

interface CaseResult {
  key: string;
  label: string;
  status: CaseStatus;
  message: string;
  ms?: number;
}

interface SmokeCase {
  key: string;
  label: string;
  run: () => Promise<CaseResult>;
}

const MARK_START = '<!-- SMOKE-AUTO:START -->';
const MARK_END = '<!-- SMOKE-AUTO:END -->';

const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));

// v1.2 경로 사용
const V1_2_DIR = 'build/v1.2';
const VKEY_V1_2 = `${V1_2_DIR}/verification_key.json`;

async function runValid(): Promise<CaseResult> {
  const started = performance.now();
  try {
    // v1.2 경로 사용
    if (!fs.existsSync(VKEY_V1_2)) {
      return {
        key: 'ok',
        label: 'Normal (v1.2)',
        status: 'fail',
        message: 'v1.2 verification key not found. Run: npm run build:v1.2',
        ms: performance.now() - started,
      };
    }
    
    // v1.2의 경우 증명을 먼저 생성해야 함 (동적 생성)
    const input = readJson('fixtures/input.v1.2.sample.json');
    const wasm = `${V1_2_DIR}/vote_js/vote.wasm`;
    const zkey = `${V1_2_DIR}/vote_final.zkey`;
    
    if (!fs.existsSync(wasm) || !fs.existsSync(zkey)) {
      return {
        key: 'ok',
        label: 'Normal (v1.2)',
        status: 'fail',
        message: 'v1.2 build artifacts not found. Run: npm run build:v1.2',
        ms: performance.now() - started,
      };
    }
    
    const { proof, publicSignals } = await groth16.fullProve(input, wasm, zkey);
    const vkey = readJson(VKEY_V1_2);
    const ok = await groth16.verify(vkey, publicSignals, proof);
    return {
      key: 'ok',
      label: 'Normal (v1.2)',
      status: ok ? 'pass' : 'fail',
      message: ok ? 'groth16 verify OK (v1.2)' : 'groth16 verify failed',
      ms: performance.now() - started,
    };
  } catch (err) {
    return {
      key: 'ok',
      label: 'Normal',
      status: 'fail',
      message: `Error: ${err instanceof Error ? err.message : String(err)}`,
      ms: performance.now() - started,
    };
  }
}

async function runTampered(): Promise<CaseResult> {
  try {
    // v1.2 경로 사용
    if (!fs.existsSync(VKEY_V1_2)) {
      return {
        key: 'tampered',
        label: 'Tampered proof (v1.2)',
        status: 'fail',
        message: 'v1.2 verification key not found. Run: npm run build:v1.2',
      };
    }
    
    const input = readJson('fixtures/input.v1.2.sample.json');
    const wasm = `${V1_2_DIR}/vote_js/vote.wasm`;
    const zkey = `${V1_2_DIR}/vote_final.zkey`;
    
    if (!fs.existsSync(wasm) || !fs.existsSync(zkey)) {
      return {
        key: 'tampered',
        label: 'Tampered proof (v1.2)',
        status: 'fail',
        message: 'v1.2 build artifacts not found. Run: npm run build:v1.2',
      };
    }
    
    const { proof, publicSignals } = await groth16.fullProve(input, wasm, zkey);
    // publicSignals 변조
    const tampered = [...(publicSignals as string[])];
    tampered[0] = (BigInt(tampered[0]) + BigInt(1)).toString();
    
    const vkey = readJson(VKEY_V1_2);
    const ok = await groth16.verify(vkey, tampered, proof);
    return {
      key: 'tampered',
      label: 'Tampered proof (v1.2)',
      status: ok ? 'fail' : 'pass',
      message: ok ? 'Expected failure but verification returned true' : 'groth16.verify returned false (v1.2)',
    };
  } catch (err) {
    return {
      key: 'tampered',
      label: 'Tampered proof',
      status: 'fail',
      message: `Error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

const mock = (key: string, label: string, note: string): Promise<CaseResult> =>
  Promise.resolve({ key, label, status: 'mock', message: note });

const CASES: SmokeCase[] = [
  { key: 'ok', label: 'Normal', run: runValid },
  { key: 'tampered', label: 'Tampered proof', run: runTampered },
  { key: 'duplicate', label: 'Duplicate vote', run: () => mock('duplicate', 'Duplicate vote', 'Pending (Solidity nullifier mapping)') },
  { key: 'nullifier_reuse', label: 'Nullifier reuse', run: () => mock('nullifier_reuse', 'Nullifier reuse', 'Pending (Atlas UNIQUE + API 409)') },
  { key: 'out_of_gas', label: 'Out of gas', run: () => mock('out_of_gas', 'Out of gas', 'Pending (Relayer retry)') },
  { key: 'rpc_delay', label: 'RPC delay / timeout', run: () => mock('rpc_delay', 'RPC delay / timeout', 'Pending (Web3 fallback ladder)') },
];

function renderTable(results: CaseResult[]) {
  const lines = ['| Case | Status | Note |', '|------|--------|------|'];
  for (const r of results) {
    const icon = r.status === 'pass' ? 'PASS' : r.status === 'fail' ? 'FAIL' : 'PENDING';
    const note = r.ms ? `${r.message} (${r.ms.toFixed(2)} ms)` : r.message;
    lines.push(`| ${r.label} | ${icon} | ${note} |`);
  }
  return `${lines.join('\n')}\n_(last update: ${new Date().toISOString()})_`;
}

function inject(content: string, report: string) {
  if (!content.includes(MARK_START)) {
    return `${content.trim()}\n\n${MARK_START}\n${report}\n${MARK_END}\n`;
  }
  const pattern = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`);
  return content.replace(pattern, `${MARK_START}\n${report}\n${MARK_END}`);
}

async function main() {
  minimist(process.argv.slice(2));
  const results: CaseResult[] = [];
  for (const c of CASES) {
    results.push(await c.run());
  }
  const table = renderTable(results);
  const base = fs.existsSync('SMOKE.md') ? fs.readFileSync('SMOKE.md', 'utf8') : '# SMOKE (v1.2-stable)\n';
  fs.writeFileSync('SMOKE.md', inject(base, table));
  console.log(table);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[smoke] failed:', err);
    process.exit(1);
  });
