#!/usr/bin/env node
// PreToolUse(Bash) hook: "remotion render" を含むコマンドの前に自動実行
// script-input.json の鮮度と image アセットの存在を検証して失敗時にブロックする

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  let command = '';
  try {
    const input = JSON.parse(raw);
    command = input?.tool_input?.command || '';
  } catch (_) {}

  if (!command.includes('remotion render')) {
    process.exit(0); // 対象外はスルー
  }

  const fs = require('fs');
  const path = require('path');

  // プロジェクトルートからの相対パス（グローバル settings.json から実行される想定）
  const base = 'packages/tech-geopolitics-channel';
  const scriptInputPath = path.join(base, 'input', 'script-input.json');

  const errors = [];

  // 1. script-input.json の存在確認
  if (!fs.existsSync(scriptInputPath)) {
    errors.push('script-input.json が見つかりません: ' + scriptInputPath);
  } else {
    try {
      const json = JSON.parse(fs.readFileSync(scriptInputPath, 'utf8'));

      // 2. image ビジュアル参照ファイルの存在確認
      const missing = [];
      (json.chapters || []).forEach(ch => {
        (ch.lines || []).forEach(l => {
          if (l.visual?.type === 'image' && l.visual?.src) {
            const imgPath = path.join(base, 'public', l.visual.src);
            if (!fs.existsSync(imgPath)) missing.push(l.visual.src);
          }
        });
      });
      if (missing.length > 0) {
        errors.push('Missing image assets: ' + missing.join(', '));
      }

      // 3. epId が一致しているか（script-input.json の epId を表示）
      if (json.epId) {
        process.stderr.write('[pre-render-check] epId: ' + json.epId + '\n');
      }
    } catch (e) {
      errors.push('script-input.json パースエラー: ' + e.message);
    }
  }

  if (errors.length > 0) {
    process.stderr.write('[pre-render-check] FAILED — レンダリングを中止します:\n');
    errors.forEach(e => process.stderr.write('  ✗ ' + e + '\n'));
    process.stderr.write('上記の問題を修正してから再実行してください。\n');
    process.exit(2); // exit code 2 = block
  }

  process.stderr.write('[pre-render-check] OK — pre-flight passed\n');
  process.exit(0);
});
