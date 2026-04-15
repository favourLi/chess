'use strict';

/**
 * 生产构建后：为静态资源生成同名 .gz 侧车文件，便于 Nginx `gzip_static on;`。
 * - dist/：JS/CSS/HTML 等 + 较大的栅格贴图 + 若构建产物中含 .exr
 * - public/exrs/：环境贴图 EXR（不经 webpack 打包时仍在此目录）
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicExrsDir = path.join(rootDir, 'public', 'exrs');

/** 文本类：入口与脚本通常较小也压缩 */
const MIN_TEXT = 1024;
/** 栅格大图：过小文件侧车意义不大，略降目录噪音 */
const MIN_RASTER = 20 * 1024;
/** EXR 环境贴图：一般较大，≥1KB 即压 */
const MIN_EXR = 1024;

function isTargetFile(name) {
  if (name.endsWith('.gz')) return false;
  return /\.(js|mjs|css|html|svg|json|png|jpe?g|webp|gif|exr)$/i.test(name);
}

function minBytesFor(name) {
  if (/\.exr$/i.test(name)) return MIN_EXR;
  if (/\.(png|jpe?g|webp|gif)$/i.test(name)) return MIN_RASTER;
  return MIN_TEXT;
}

function gzipFile(fullPath) {
  const buf = fs.readFileSync(fullPath);
  const minB = minBytesFor(path.basename(fullPath));
  if (buf.length < minB) return false;
  const out = `${fullPath}.gz`;
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(fullPath).mtimeMs) {
    return false;
  }
  const gz = zlib.gzipSync(buf, { level: zlib.constants.Z_BEST_COMPRESSION });
  fs.writeFileSync(out, gz);
  return true;
}

function walk(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      count += walk(full);
      continue;
    }
    if (!isTargetFile(ent.name)) continue;
    if (gzipFile(full)) count += 1;
  }
  return count;
}

let total = 0;

if (!fs.existsSync(distDir)) {
  console.error('[gzip-dist] 未找到 dist/，请先执行 webpack 构建');
  process.exit(1);
}

total += walk(distDir);

if (fs.existsSync(publicExrsDir)) {
  total += walk(publicExrsDir);
}

console.log(
  `[gzip-dist] 已生成 ${total} 个 .gz 侧车（dist/ + public/exrs/；大图≥${MIN_RASTER >> 10}KB，EXR≥${MIN_EXR}B，其余文本类≥${MIN_TEXT}B）`
);
