/**
 * video-settings.yaml → src/settings.generated.ts に一方向同期するスクリプト
 * npm run sync-settings で実行
 */
import * as fs from 'fs';
import * as path from 'path';

const YAML_PATH = path.join(__dirname, '..', 'video-settings.yaml');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'settings.generated.ts');

// 簡易 YAML パーサー（深いネスト対応・yaml パッケージ不要）
function parseYaml(content: string): Record<string, unknown> {
  const lines = content.split('\n');
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; obj: Record<string, unknown> }> = [
    { indent: -1, obj: root },
  ];

  for (const rawLine of lines) {
    const trimmed = rawLine.trimEnd();
    if (!trimmed || trimmed.trimStart().startsWith('#')) continue;

    const indent = trimmed.length - trimmed.trimStart().length;
    const line = trimmed.trim();

    // キー: 値 の形式
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const rawVal = line.slice(colonIdx + 1).trim();

    // 親スタックを調整
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;

    if (rawVal === '' || rawVal === null) {
      // ネストされたオブジェクト
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
    } else if (rawVal.startsWith('-')) {
      // インラインリストの最初の要素
      if (!Array.isArray(parent[key])) parent[key] = [];
      (parent[key] as string[]).push(rawVal.slice(1).trim().replace(/^["']|["']$/g, ''));
    } else {
      // スカラー値
      const val = rawVal.replace(/^["']|["']$/g, '');
      if (val === 'true') parent[key] = true;
      else if (val === 'false') parent[key] = false;
      else if (!isNaN(Number(val)) && val !== '') parent[key] = Number(val);
      else parent[key] = val;
    }
    continue;
  }

  // リスト項目（"  - value" 行）の追加処理
  const lines2 = content.split('\n');
  let currentArrayKey: string | null = null;
  let currentArrayParent: Record<string, unknown> = root;
  let currentArrayIndent = -1;

  for (const rawLine of lines2) {
    const trimmed = rawLine.trimEnd();
    if (!trimmed || trimmed.trimStart().startsWith('#')) continue;
    const indent = trimmed.length - trimmed.trimStart().length;
    const line = trimmed.trim();

    if (line.startsWith('- ')) {
      const val = line.slice(2).trim().replace(/^["']|["']$/g, '');
      if (currentArrayKey && indent > currentArrayIndent) {
        const existing = currentArrayParent[currentArrayKey];
        if (Array.isArray(existing)) {
          if (!existing.includes(val)) existing.push(val);
        }
      }
    } else {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      // 新しいキーをスキャンして配列コンテキストを更新
      currentArrayKey = null;
    }
  }

  return root;
}

function generateTs(settings: Record<string, unknown>): string {
  const lines: string[] = [
    '// このファイルは自動生成されます',
    '// 編集する場合は video-settings.yaml を編集してください',
    '// npm run sync-settings で再生成されます',
    '',
  ];

  // SETTINGS オブジェクト（characters を除く）
  const { characters, ...rest } = settings as {
    characters: Record<string, unknown>;
    [key: string]: unknown;
  };
  lines.push(`export const SETTINGS = ${JSON.stringify(rest, null, 2)} as const;`);
  lines.push('');
  lines.push('export type VideoSettings = typeof SETTINGS;');
  lines.push('');

  // CHARACTER_CONFIGS
  if (characters) {
    lines.push('export const CHARACTER_CONFIGS = {');
    for (const [id, cfg] of Object.entries(characters)) {
      const c = cfg as Record<string, unknown>;
      lines.push(`  ${id}: {`);
      lines.push(`    id: '${id}' as const,`);
      lines.push(`    name: '${c.name}',`);
      lines.push(`    role: '${c.role}',`);
      lines.push(`    voicevoxSpeakerId: ${c.voicevoxSpeakerId},`);
      lines.push(`    defaultSpeedScale: ${c.defaultSpeedScale},`);
      lines.push(`    defaultPitchScale: ${c.defaultPitchScale},`);
      lines.push(`    color: '${c.color}',`);
      lines.push(`    position: '${c.position}' as const,`);
      lines.push(
        `    expressions: ${JSON.stringify(c.expressions)} as const,`,
      );
      lines.push(`  },`);
    }
    lines.push('} as const;');
    lines.push('');
    lines.push('export type CharacterID = keyof typeof CHARACTER_CONFIGS;');
    lines.push(
      'export type CharacterConfig = (typeof CHARACTER_CONFIGS)[CharacterID];',
    );
  }

  return lines.join('\n') + '\n';
}

function main() {
  const yamlContent = fs.readFileSync(YAML_PATH, 'utf8');
  const settings = parseYaml(yamlContent);
  const ts = generateTs(settings);
  fs.writeFileSync(OUTPUT_PATH, ts, 'utf8');
  console.log(`✅ Generated: ${OUTPUT_PATH}`);
}

main();
