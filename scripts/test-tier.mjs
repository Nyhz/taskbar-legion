// Runs vitest on one test tier (vitest.config.ts TEST_TIER): `node scripts/test-tier.mjs slow|all [vitest args…]`.
// A tiny cross-platform stand-in for `TEST_TIER=… vitest run` (Windows shells do not take the prefix).
import { spawnSync } from 'node:child_process';

const [tier = 'fast', ...rest] = process.argv.slice(2);
const r = spawnSync('npx', ['vitest', 'run', ...rest], { stdio: 'inherit', shell: true, env: { ...process.env, TEST_TIER: tier } });
process.exit(r.status ?? 1);
