import { existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const apiPath = join(root, 'app', 'api');
const disabledPath = join(root, 'app', '_api_disabled');
const hasExternalApi = Boolean(process.env.NEXT_PUBLIC_API_BASE_URL);

if (!existsSync(apiPath)) {
  throw new Error('app/api 경로를 찾을 수 없습니다.');
}

if (existsSync(disabledPath)) {
  throw new Error('app/_api_disabled 경로가 이미 있습니다. 정적 빌드 전 상태를 확인해주세요.');
}

try {
  renameSync(apiPath, disabledPath);

  const result = spawnSync('npx next build', {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      GITHUB_PAGES: 'true',
      NEXT_PUBLIC_STATIC_DEMO: process.env.NEXT_PUBLIC_STATIC_DEMO ?? (hasExternalApi ? 'false' : 'true'),
      NEXT_PUBLIC_BASE_PATH: '/smartyouth'
    }
  });

  if (result.status !== 0) {
    throw new Error(`next build failed with exit code ${result.status ?? 'unknown'}`);
  }
} finally {
  if (existsSync(disabledPath)) {
    renameSync(disabledPath, apiPath);
  }
}
