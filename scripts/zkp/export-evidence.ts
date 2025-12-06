/**
 * 증빙 패키지 생성 스크립트
 * 
 * 목적: 시연/검증용 증빙 자료를 한 폴더에 모아 zip으로 압축 가능하게 준비
 * 
 * 실행: npm run export:evidence
 * 
 * 생성 폴더: zkvote-demo-evidence/
 *   - 01_chain/ - 온체인 이벤트 CSV (events.csv, usedNullifiers.csv)
 *   - 02_metrics/ - API 지표 (latency, success rate)
 *   - 03_logs/ - 요청 로그 샘플 (PII 제거)
 *   - 04_zk/ - ZKP 버전 락 및 스펙
 *   - 05_report/ - 데모 실행서 및 결과 요약
 * 
 * 용도: 교수님/심사자가 우리 없이도 결과를 재검증할 수 있도록 모든 증빙 자료 제공
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'zkvote-demo-evidence');

const STRUCTURE = [
  '00_README.md',
  '01_chain/events.csv',
  '01_chain/usedNullifiers.csv',
  '02_metrics/api_health.png',
  '02_metrics/latency_p50_p95.csv',
  '02_metrics/relay_success_rate.csv',
  '03_logs/request_sample.redacted.jsonl',
  '03_logs/smoke_5cases.screencast.mp4',
  '04_zk/zkp-version.lock',
  '04_zk/proof_schema.md',
  '05_report/demo_runbook.pdf',
  '05_report/results_summary.pdf',
];

/**
 * 증빙 패키지 폴더 구조 생성
 * - 각 폴더와 파일의 기본 틀 생성 (실제 데이터는 다른 스크립트에서 채움)
 */
function ensureStructure() {
  for (const relative of STRUCTURE) {
    const target = path.join(ROOT, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) {
      if (target.endsWith('.md')) {
        fs.writeFileSync(target, `# ${path.basename(target)}\n\nTODO\n`);
      } else if (target.endsWith('.csv')) {
        fs.writeFileSync(target, 'placeholder\n');
      } else if (target.endsWith('.jsonl')) {
        fs.writeFileSync(target, '');
      } else {
        fs.writeFileSync(target, '');
      }
    }
  }
}

/**
 * zkp-version.lock을 증빙 패키지에 복사
 * - ZKP 버전 및 해시 정보를 증빙 자료에 포함
 */
function copyZkLock() {
  const src = path.resolve('zkp-version.lock');
  const dest = path.join(ROOT, '04_zk', 'zkp-version.lock');
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`[export-evidence] copied zkp-version.lock to ${dest}`);
  } else {
    console.warn(`[export-evidence] zkp-version.lock not found at ${src}`);
  }
}

function main() {
  ensureStructure();
  copyZkLock();
  console.log(`[export-evidence] generated scaffold at ${ROOT}`);
}

main();
