/**
 * scripts/create-script.ts
 * Claude APIを使ってscript-input.jsonを自動生成する
 *
 * 使い方:
 *   npx ts-node scripts/create-script.ts --topic "半導体規制が日本の投資家に与える影響"
 *   npx ts-node scripts/create-script.ts --topic "..." --output ./input/my-script.json
 */
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// ---- 引数パース ----
const args = process.argv.slice(2);
const topicIdx = args.indexOf('--topic');
const outputIdx = args.indexOf('--output');
const topic = topicIdx >= 0 ? args[topicIdx + 1] : null;
const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : './input/script-input.json';

if (!topic) {
  console.error('❌ --topic を指定してください');
  console.error('例: npx ts-node scripts/create-script.ts --topic "半導体規制が日本投資家に与える影響"');
  process.exit(1);
}

// ---- APIキー確認 ----
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY 環境変数が設定されていません');
  process.exit(1);
}

// ---- プロンプト生成 ----
function buildPrompt(topic: string): string {
  return `あなたはYouTubeチャンネル「テクノロジー投資×地政学」の台本ライターです。
以下のトピックについて、ずんだもん（解説役）とめたん（聞き役・ツッコミ役）の掛け合い形式で台本JSONを生成してください。

## トピック
${topic}

## 出力形式
以下のJSON形式で出力してください。説明文やコードブロックは不要で、JSONのみ出力してください。

{
  "videoId": "ep001",
  "seed": "一意のseed文字列（英数字ハイフン、トピックを反映）",
  "title": "動画タイトル（30文字以内、インパクトのある日本語）",
  "description": "YouTube説明欄テキスト（200文字程度）",
  "tags": ["タグ1", "タグ2", "タグ3", "タグ4", "タグ5"],
  "chapters": [
    {
      "type": "hook",
      "duration": 30,
      "lines": [
        { "speaker": "zundamon", "text": "セリフ（ずんだもん語尾「〜のだ」）", "emotion": "serious" },
        { "speaker": "metan", "text": "セリフ", "emotion": "surprised" }
      ]
    },
    {
      "type": "explanation",
      "duration": 180,
      "lines": [
        { "speaker": "zundamon", "text": "セリフ", "emotion": "normal" },
        { "speaker": "metan", "text": "セリフ", "emotion": "normal" }
      ],
      "visuals": [
        { "type": "keyword", "text": "キーワード", "at": 10 }
      ]
    },
    {
      "type": "analysis",
      "duration": 180,
      "lines": [
        { "speaker": "zundamon", "text": "独自分析セリフ", "emotion": "thinking" }
      ],
      "visuals": [
        { "type": "keyword", "text": "分析ポイント", "at": 5 }
      ]
    },
    {
      "type": "summary",
      "duration": 60,
      "lines": [
        { "speaker": "zundamon", "text": "まとめセリフ", "emotion": "happy" },
        { "speaker": "metan", "text": "まとめへの反応", "emotion": "happy" }
      ]
    },
    {
      "type": "cta",
      "duration": 30,
      "lines": [
        { "speaker": "zundamon", "text": "チャンネル登録と高評価をよろしくなのだ！", "emotion": "happy" },
        { "speaker": "metan", "text": "次回もお楽しみに！", "emotion": "happy" }
      ]
    }
  ],
  "chartData": {}
}

## 制約（必ず守ること）
- ずんだもんは語尾に「〜のだ」「〜なのだ」を使う
- めたんは聞き役・ツッコミ役（「え、本当に？」「それってどういうこと？」など）
- explanationとanalysisには各5〜8セリフ含める
- 「独自分析」パートを必ず含める（他チャンネルとの差別化）
- 各セリフは1文で完結させる（長すぎない）
- emotionは normal/happy/surprised/thinking/serious/sad のいずれか
- visuals の type は keyword/chart/split/timeline のいずれか
- chartData は空オブジェクト {} でOK（後から追加）
- seedは英数字とハイフンのみ（例: "semiconductor-2024"）
- JSONのみ出力（説明文・コードブロック不要）`;
}

// ---- メイン ----
async function main() {
  console.log('🤖 Claude API で台本を生成中...');
  console.log(`📌 トピック: ${topic}`);
  console.log('');

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: buildPrompt(topic),
      },
    ],
  });

  // レスポンスからテキストを取得
  const rawText = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  // JSONブロックを抽出（```json ... ``` がある場合も対応）
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null;
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim();

  // パース確認
  let scriptInput: object;
  try {
    scriptInput = JSON.parse(jsonStr);
  } catch {
    console.error('❌ JSON パース失敗。生のレスポンス:');
    console.error(rawText.slice(0, 500));
    process.exit(1);
  }

  // 出力先ディレクトリ作成
  const outDir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 保存
  fs.writeFileSync(path.resolve(outputPath), JSON.stringify(scriptInput, null, 2), 'utf-8');

  console.log(`✅ 台本を生成しました → ${outputPath}`);
  console.log('');
  console.log('次のステップ:');
  console.log(`  npm run generate -- --input ${outputPath}`);
  console.log('');

  // 生成内容のサマリーを表示
  const script = scriptInput as any;
  if (script.title) console.log(`📺 タイトル : ${script.title}`);
  if (script.chapters) {
    const totalLines = script.chapters.reduce((acc: number, ch: any) => acc + (ch.lines?.length ?? 0), 0);
    console.log(`📝 チャプター: ${script.chapters.length}個`);
    console.log(`💬 総セリフ数: ${totalLines}件`);
  }
}

main().catch((err) => {
  console.error('❌ エラー:', err.message ?? err);
  process.exit(1);
});
