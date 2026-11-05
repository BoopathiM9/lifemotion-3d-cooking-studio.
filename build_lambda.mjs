import esbuild from 'esbuild';
import fs from 'fs';
import AdmZip from 'adm-zip';

async function build() {
  console.log('1. Bundling lambda/handler.mjs with esbuild...');
  await esbuild.build({
    entryPoints: ['lambda/handler.mjs'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    banner: {
      js: "import * as __native_module from 'node:module'; const require = __native_module.createRequire(import.meta.url);"
    },
    outfile: 'lambda/dist/index.mjs'
  });
  console.log('Bundled lambda/dist/index.mjs successfully.');

  // Mirror to index.js and handler.mjs
  fs.copyFileSync('lambda/dist/index.mjs', 'lambda/dist/index.js');
  fs.copyFileSync('lambda/dist/index.mjs', 'lambda/dist/handler.mjs');
  console.log('Copied to index.js and handler.mjs.');

  console.log('2. Creating lambda/lambda.zip...');
  const zip = new AdmZip();
  zip.addLocalFile('lambda/package.json');
  zip.addLocalFile('lambda/dist/index.js');
  zip.addLocalFile('lambda/dist/index.mjs');
  zip.addLocalFile('lambda/dist/handler.mjs');
  zip.writeZip('lambda/lambda.zip');
  const stats = fs.statSync('lambda/lambda.zip');
  console.log(`lambda/lambda.zip created successfully (${stats.size} bytes).`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
