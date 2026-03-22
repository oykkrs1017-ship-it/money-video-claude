/**
 * scripts/create-placeholder-images.ts
 * public/content/ にプレースホルダー画像（SVG→PNG）を生成する
 * 実際の地図・ロゴを用意するまでの開発用
 *
 * 使い方: npx ts-node scripts/create-placeholder-images.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const CONTENT_DIR = path.resolve('./public/content');

if (!fs.existsSync(CONTENT_DIR)) {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
}

/** SVG プレースホルダーを生成（PNG の代わりに .svg として保存） */
function makePlaceholderSvg(label: string, width = 400, height = 280, bg = '#1a2744'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bg}" rx="8"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#4a9eff" stroke-width="2" rx="7" stroke-dasharray="8 4"/>
  <text x="${width / 2}" y="${height / 2 - 16}" font-family="sans-serif" font-size="18" fill="#4a9eff" text-anchor="middle" font-weight="bold">${label}</text>
  <text x="${width / 2}" y="${height / 2 + 12}" font-family="sans-serif" font-size="13" fill="#88aacc" text-anchor="middle">public/content/ に実画像を配置してください</text>
  <text x="${width / 2}" y="${height / 2 + 34}" font-family="sans-serif" font-size="12" fill="#668899" text-anchor="middle">${width} × ${height}px 推奨</text>
</svg>`;
}

// 画像プレースホルダーの定義
const placeholders: { file: string; label: string; w: number; h: number; bg: string }[] = [
  // 地図
  { file: 'map_usachina.png', label: '🗺 米中対立マップ',     w: 500, h: 320, bg: '#0d1b2a' },
  { file: 'map_taiwan.png',   label: '🗺 台湾海峡マップ',     w: 480, h: 300, bg: '#0d1b2a' },
  { file: 'map_japan.png',    label: '🗺 日本地図',           w: 360, h: 440, bg: '#0d1b2a' },
  { file: 'map_china.png',    label: '🗺 中国地図',           w: 500, h: 360, bg: '#0d1b2a' },
  { file: 'map_asia.png',     label: '🗺 アジア全体マップ',   w: 560, h: 380, bg: '#0d1b2a' },
  { file: 'map_world.png',    label: '🗺 世界地図',           w: 640, h: 360, bg: '#0d1b2a' },
  // 企業ロゴ
  { file: 'logo_tsmc.png',    label: '🏭 TSMC ロゴ',          w: 320, h: 180, bg: '#1a0a2e' },
  { file: 'logo_nvidia.png',  label: '🏭 NVIDIA ロゴ',        w: 320, h: 180, bg: '#0a1a10' },
  { file: 'logo_samsung.png', label: '🏭 Samsung ロゴ',       w: 320, h: 180, bg: '#001233' },
  { file: 'logo_intel.png',   label: '🏭 Intel ロゴ',         w: 320, h: 180, bg: '#001a3a' },
  { file: 'logo_apple.png',   label: '🏭 Apple ロゴ',         w: 280, h: 280, bg: '#1a1a1a' },
  { file: 'logo_softbank.png',label: '🏭 SoftBank ロゴ',      w: 320, h: 180, bg: '#1a0000' },
  // 国旗
  { file: 'flag_jp.png',      label: '🇯🇵 日本国旗',          w: 300, h: 200, bg: '#fff' },
  { file: 'flag_us.png',      label: '🇺🇸 米国旗',            w: 300, h: 200, bg: '#002868' },
  { file: 'flag_cn.png',      label: '🇨🇳 中国国旗',          w: 300, h: 200, bg: '#de2910' },
  { file: 'flag_tw.png',      label: '🇹🇼 台湾旗',            w: 300, h: 200, bg: '#003087' },
  { file: 'flag_kr.png',      label: '🇰🇷 韓国旗',            w: 300, h: 200, bg: '#fff' },
  // その他
  { file: 'img_semiconductor.png',  label: '💾 半導体チップ',       w: 400, h: 280, bg: '#0a0a1a' },
  { file: 'img_ai_chip.png',        label: '🤖 AI チップ',          w: 400, h: 280, bg: '#0a0a1a' },
  { file: 'img_supply_chain.png',   label: '🔗 サプライチェーン',    w: 520, h: 300, bg: '#0a1a0a' },
  { file: 'img_datacenter.png',     label: '🖥 データセンター',      w: 480, h: 300, bg: '#0a0a1a' },
];

let created = 0;
let skipped = 0;

for (const p of placeholders) {
  // .png → .svg として保存（Remotion は SVG も読める）
  const svgPath = path.join(CONTENT_DIR, p.file.replace('.png', '.svg'));
  const pngPath = path.join(CONTENT_DIR, p.file);

  if (fs.existsSync(pngPath)) {
    console.log(`  ⏭ スキップ（実画像あり）: ${p.file}`);
    skipped++;
    continue;
  }
  if (fs.existsSync(svgPath)) {
    console.log(`  ⏭ スキップ（SVGあり）: ${p.file}`);
    skipped++;
    continue;
  }

  fs.writeFileSync(svgPath, makePlaceholderSvg(p.label, p.w, p.h, p.bg), 'utf-8');
  console.log(`  ✅ 作成: ${p.file.replace('.png', '.svg')}`);
  created++;
}

console.log(`\n✅ 完了: ${created}個作成, ${skipped}個スキップ`);
console.log(`📁 保存先: ${CONTENT_DIR}`);
console.log('');
console.log('⚠️  これはプレースホルダーです。実際の画像は .png として同じファイル名で配置してください。');
console.log('   SVG プレースホルダーを使う場合は script-input.json の src を .svg に変更してください。');
