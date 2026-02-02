#!/usr/bin/env node
/**
 * Generate review_now.ts
 *
 * Purpose:
 * Create a MANUAL REVIEW SURFACE for senior engineers.
 * Copies source files verbatim, in deterministic order.
 *
 * ❌ No formatting
 * ❌ No rewriting
 * ❌ No summarizing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ────────────────────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────────────────────

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'review_now.ts');

// const INCLUDE_PATHS = ['rng-platform'];
// const INCLUDE_PATHS = ['rng-repository'];
const INCLUDE_PATHS = ['rng-platform/rng-auth/app-auth-components'];

const EXCLUDE_DIRS = new Set(['dist', 'build', 'node_modules', 'abstract-client-repository']);

const VALID_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs']);
// const VALID_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs']);

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

const shouldExcludeDir = (name: string) => EXCLUDE_DIRS.has(name);

const shouldIncludeFile = (filePath: string) => VALID_EXTENSIONS.has(path.extname(filePath));

const walkDir = (dir: string, collected: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!shouldExcludeDir(entry.name)) {
        walkDir(fullPath, collected);
      }
    } else if (entry.isFile() && shouldIncludeFile(fullPath)) {
      collected.push(fullPath);
    }
  }
  return collected;
};

// ────────────────────────────────────────────────────────────
// WRITERS
// ────────────────────────────────────────────────────────────

const writeHeader = (out: fs.WriteStream) => {
  out.write(`/**
 * rng-platform manual review file
 * Purpose: line-by-line senior engineer review
 */

`);
};

const writeFile = (out: fs.WriteStream, filePath: string) => {
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

  out.write(`// FILE: ${relativePath}\n\n`);
  out.write(fs.readFileSync(filePath, 'utf8'));
  out.write('\n\n');
};

const writeFooter = (out: fs.WriteStream) => {
  out.write(`/**
 * End of review file
 */
`);
};

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────

const main = () => {
  const out = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });

  writeHeader(out);

  for (const includePath of INCLUDE_PATHS) {
    const resolved = path.join(ROOT_DIR, includePath);
    if (!fs.existsSync(resolved)) continue;

    if (fs.statSync(resolved).isFile()) {
      writeFile(out, resolved);
    } else {
      const files = walkDir(resolved).sort();
      for (const file of files) {
        writeFile(out, file);
      }
    }
  }

  writeFooter(out);
  out.end();

  console.log('✅ review_now.ts generated successfully');
};

main();

// #!/usr/bin/env node
// /**
//  * Generate review_now.ts
//  *
//  * Purpose:
//  * Create a MANUAL REVIEW SURFACE for senior engineers.
//  * This script copies source files verbatim without modification.
//  *
//  * ❌ No formatting
//  * ❌ No rewriting
//  * ❌ No summarizing
//  */

// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // ────────────────────────────────────────────────────────────
// // CONFIG
// // ────────────────────────────────────────────────────────────

// const ROOT_DIR = path.resolve(__dirname, '..');
// const OUTPUT_FILE = path.join(ROOT_DIR, 'review_now.ts');

// const INCLUDE_PATHS = ['rng-firebase'];

// const EXCLUDE_DIRS = new Set([
//   'dist',
//   'build',
//   'node_modules',
//   'rng-firebase/abstract-client-repository',
//   'abstract-client-repository',
// ]);

// const VALID_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.md']);

// // ────────────────────────────────────────────────────────────
// // HELPERS
// // ────────────────────────────────────────────────────────────

// const isExcluded = (filePath) => EXCLUDE_DIRS.has(path.basename(filePath));

// const shouldIncludeFile = (filePath) => VALID_EXTENSIONS.has(path.extname(filePath));

// const walkDir = (dir, collected = []) => {
//   const entries = fs.readdirSync(dir, { withFileTypes: true });

//   for (const entry of entries) {
//     const fullPath = path.join(dir, entry.name);

//     if (entry.isDirectory()) {
//       if (!isExcluded(entry.name)) {
//         walkDir(fullPath, collected);
//       }
//     } else if (entry.isFile() && shouldIncludeFile(fullPath)) {
//       collected.push(fullPath);
//     }
//   }

//   return collected;
// };

// const writeHeader = (stream) => {
//   stream.write(`/**
//  * rng-firebase manual review file
//  * Purpose: line-by-line senior engineer review
//  */

// `);
// };

// const writeFileBlock = (stream, filePath) => {
//   const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
//   const content = fs.readFileSync(filePath, 'utf8');

//   stream.write(`// ============================================================
// // FILE: ${relativePath}
// // ============================================================

// // [BEGIN ORIGINAL CODE]

// ${content}

// // [END ORIGINAL CODE]

// `);
// };

// const writeFooter = (stream) => {
//   stream.write(`/**
//  * End of review file
//  * Frozen contracts intentionally excluded
//  */
// `);
// };

// // ────────────────────────────────────────────────────────────
// // MAIN
// // ────────────────────────────────────────────────────────────

// const main = () => {
//   const out = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });

//   writeHeader(out);

//   for (const includePath of INCLUDE_PATHS) {
//     const resolvedPath = path.join(ROOT_DIR, includePath);

//     if (!fs.existsSync(resolvedPath)) continue;

//     if (fs.statSync(resolvedPath).isFile()) {
//       writeFileBlock(out, resolvedPath);
//     } else {
//       const files = walkDir(resolvedPath).sort();
//       for (const file of files) {
//         writeFileBlock(out, file);
//       }
//     }
//   }

//   writeFooter(out);
//   out.end();

//   console.log(`✅ review_now.ts generated successfully`);
// };

// main();
