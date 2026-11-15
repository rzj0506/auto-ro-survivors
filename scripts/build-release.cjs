'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function buildRelease(source, repository, branch = 'userscript-release') {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9_.-]+$/.test(repository || '')) throw new Error('repository 必須是 GitHub owner/repo');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(branch) || branch.includes('..') || branch.endsWith('/')) throw new Error('發布分支名稱無效');
  const match = source.replace(/^\uFEFF/, '').match(/^\/\/ ==UserScript==\r?\n[\s\S]*?^\/\/ ==\/UserScript==/m);
  if (!match || match.index !== 0) throw new Error('缺少 UserScript 檔頭');
  let header = match[0];
  const version = header.match(/^\/\/\s+@version\s+(\d+\.\d+\.\d+)\s*$/m)?.[1];
  const runtimeVersion = source.match(/const VERSION = ['"](\d+\.\d+\.\d+)['"]/ )?.[1];
  if (!version || version !== runtimeVersion) throw new Error('@version 與 const VERSION 必須相同，例如 1.2.1');
  for (const tag of ['name', 'namespace']) if (!new RegExp('^//\\s+@' + tag + '\\s+\\S', 'm').test(header)) throw new Error('缺少 @' + tag);
  const root = `https://raw.githubusercontent.com/${repository}/${branch.split('/').map(encodeURIComponent).join('/')}`;
  const downloadURL = `${root}/ro-survivors-helper.user.js`, updateURL = `${root}/ro-survivors-helper.meta.js`;
  header = header.replace(/^\/\/\s+@(homepageURL|updateURL|downloadURL)\s+.*\r?\n/gm, '');
  header = header.replace('// ==/UserScript==', [
    `// @homepageURL  https://github.com/${repository}`,
    `// @updateURL    ${updateURL}`,
    `// @downloadURL  ${downloadURL}`,
    '// ==/UserScript==',
  ].join('\n'));
  const script = header + source.replace(/^\uFEFF/, '').slice(match[0].length);
  const meta = header + '\n';
  const manifest = { version, repository, branch, downloadURL, updateURL, sha256: crypto.createHash('sha256').update(script).digest('hex') };
  return { version, script, meta, manifest };
}

function main(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!['--repository', '--branch', '--source', '--out'].includes(argv[i]) || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('用法：node scripts/build-release.cjs --repository owner/repo [--branch userscript-release] [--source 檔案] [--out 目錄]');
    args[argv[i].slice(2)] = argv[i + 1];
  }
  const source = path.resolve(args.source || path.join(__dirname, '../src/ro-survivors-helper.user.js'));
  const directory = path.resolve(args.out || path.join(__dirname, '../dist'));
  if (source === path.join(directory, 'ro-survivors-helper.user.js')) throw new Error('輸出目錄不可覆蓋原始碼檔案');
  const result = buildRelease(fs.readFileSync(source, 'utf8'), args.repository || process.env.GITHUB_REPOSITORY, args.branch || 'userscript-release');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'ro-survivors-helper.user.js'), result.script);
  fs.writeFileSync(path.join(directory, 'ro-survivors-helper.meta.js'), result.meta);
  fs.writeFileSync(path.join(directory, 'release.json'), JSON.stringify(result.manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(directory, 'README.md'), `RO 倖存者助手 ${result.version}\n\n[安裝／更新腳本](${result.manifest.downloadURL})\n\n這是自動發布分支，請在 main 分支修改 src/ro-survivors-helper.user.js，並同時增加 @version 與 const VERSION。\n`);
  console.log(JSON.stringify(result.manifest, null, 2));
}
module.exports = { buildRelease, main };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
