import * as fs from 'fs';
import * as path from 'path';
import { CHARACTER_CONFIGS, EXPRESSION_EMOJI, Expression } from '../src/types/character';

const CHAR_CONFIGS = [
  {
    id: 'pon' as const,
    expressions: ['normal', 'happy', 'surprised', 'thinking', 'angry', 'smug'] as Expression[],
    color: '#4CAF50',
    darkColor: '#388E3C',
  },
  {
    id: 'maro' as const,
    expressions: ['normal', 'happy', 'surprised', 'thinking', 'sad', 'excited'] as Expression[],
    color: '#E91E63',
    darkColor: '#C2185B',
  },
];

function generateSvg(
  name: string,
  color: string,
  darkColor: string,
  emoji: string,
  expression: string
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="300" height="400" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <defs>
    <radialGradient id="bodyGrad" cx="50%" cy="40%" r="55%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${darkColor};stop-opacity:1" />
    </radialGradient>
    <radialGradient id="faceGrad" cx="50%" cy="35%" r="50%">
      <stop offset="0%" style="stop-color:#fff8e1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffe0b2;stop-opacity:1" />
    </radialGradient>
  </defs>

  <!-- ボディ -->
  <ellipse cx="150" cy="320" rx="100" ry="120" fill="url(#bodyGrad)" />

  <!-- 頭 -->
  <circle cx="150" cy="160" r="110" fill="url(#faceGrad)" />
  <circle cx="150" cy="160" r="108" fill="none" stroke="${darkColor}" stroke-width="3" />

  <!-- 表情絵文字 -->
  <text x="150" y="170" text-anchor="middle" font-size="80" dominant-baseline="middle">${emoji}</text>

  <!-- キャラ名 -->
  <rect x="30" y="340" width="240" height="44" rx="22" fill="${darkColor}" opacity="0.85" />
  <text x="150" y="368" text-anchor="middle" font-size="20" fill="white" font-weight="bold"
        font-family="'Noto Sans JP', 'Hiragino Sans', sans-serif">${name}</text>

  <!-- 表情ラベル -->
  <text x="150" y="396" text-anchor="middle" font-size="14" fill="${color}" opacity="0.7"
        font-family="'Noto Sans JP', 'Hiragino Sans', sans-serif">${expression}</text>
</svg>`;
}

function main(): void {
  const publicDir = path.join(__dirname, '../public/characters');

  for (const char of CHAR_CONFIGS) {
    const config = CHARACTER_CONFIGS[char.id];
    const charDir = path.join(publicDir, char.id);
    fs.mkdirSync(charDir, { recursive: true });

    for (const expression of char.expressions) {
      const emoji = EXPRESSION_EMOJI[expression] ?? '😊';
      const svg = generateSvg(config.name, char.color, char.darkColor, emoji, expression);
      const svgPath = path.join(charDir, `${expression}.svg`);
      const pngPath = path.join(charDir, `${expression}.png`);

      // SVG を保存
      fs.writeFileSync(svgPath, svg, 'utf-8');
      console.log(`OK ${char.id}/${expression}.svg`);

      // PNG のコピーとしても SVG を置く（Remotion は SVG を staticFile で参照可能）
      // ※ 実際には PNG への変換は sharp 等が必要なため、SVG で代用
      fs.copyFileSync(svgPath, pngPath);
      console.log(`OK ${char.id}/${expression}.png (SVGのコピー)`);
    }
  }

  console.log('\nプレースホルダー画像生成完了！');
  console.log(`出力先: ${publicDir}`);
  console.log('\n本番用画像はVOICEVOX公式立ち絵素材を使用することを推奨します。');
  console.log('   https://voicevox.hiroshiba.jp/');
}

main();
