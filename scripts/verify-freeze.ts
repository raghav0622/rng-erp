import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const BASE_DIR = 'd:/dev/rng-app/rng-firebase';

const CHECKS = [
  {
    path: 'abstract-client-repository/AbstractClientFirestoreRepository.ts',
    versionConst: 'RNG_REPOSITORY_VERSION',
    versionVal: '1.0.0',
    frozenTag: true,
  },
  {
    path: 'abstract-client-service/index.ts',
    versionConst: 'RNG_SERVICE_VERSION',
    versionVal: '1.0.0',
    frozenTag: true,
  },
  {
    path: 'hooks/index.ts',
    versionConst: 'RNG_HOOKS_VERSION',
    versionVal: '1.0.0',
    frozenTag: true,
  },
  {
    path: 'react/index.ts',
    versionConst: 'RNG_REACT_VERSION',
    versionVal: '1.0.0',
    frozenTag: true,
  },
];

console.log('🔒 Verifying Freeze Status...\n');

let allPassed = true;

CHECKS.forEach((check) => {
  const fullPath = join(BASE_DIR, check.path);
  if (!existsSync(fullPath)) {
    console.error(`❌ File not found: ${check.path}`);
    allPassed = false;
    return;
  }

  const content = readFileSync(fullPath, 'utf-8');

  // Check Frozen Tag
  if (check.frozenTag && !content.includes('@frozen v1')) {
    console.error(`❌ Missing @frozen tag in: ${check.path}`);
    allPassed = false;
  } else {
    console.log(`✅ Frozen tag present in: ${check.path}`);
  }

  // Check Version Constant
  if (!content.includes(`export const ${check.versionConst} = '${check.versionVal}';`)) {
    console.error(`❌ Missing/Incorrect version constant ${check.versionConst} in: ${check.path}`);
    allPassed = false;
  } else {
    console.log(`✅ Version constant ${check.versionConst} verified`);
  }
});

if (allPassed) {
  console.log('\n✨ ALL SYSTEMS FROZEN. v1 CONTRACTS SECURED.');
} else {
  console.error('\n⚠️ FREEZE VERIFICATION FAILED.');
  process.exit(1);
}
