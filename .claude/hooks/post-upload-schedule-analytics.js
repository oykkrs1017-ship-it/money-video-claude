/**
 * PostToolUse hook: アップロード後にエピソード情報を episode-analytics.json に記録し
 * 48時間後の Analytics 収集リマインダーを表示する。
 */
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const cmd = (event.tool_input || {}).command || '';
if (!cmd.includes('upload-youtube')) {
  process.stdout.write(raw);
  process.exit(0);
}

const exitCode = (event.tool_result || {}).exit_code;
if (exitCode !== 0 && exitCode !== undefined) {
  process.stdout.write(raw);
  process.exit(0);
}

const projectRoot = path.resolve(__dirname, '..', '..');

// アップロードしたエピソードIDをスコアカードから逆引き
const scorecardsDir = path.join(projectRoot, 'brain', 'scorecards');
const analyticsFile = path.join(projectRoot, 'knowledge', 'episode-analytics.json');

try {
  // 最新のスコアカードを取得（更新日時でソート）
  const scorecards = fs.readdirSync(scorecardsDir)
    .filter(f => f.startsWith('ep') && f.endsWith('.json'))
    .map(f => {
      const filePath = path.join(scorecardsDir, f);
      const stat = fs.statSync(filePath);
      return { file: f, mtime: stat.mtimeMs, filePath };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (scorecards.length === 0) {
    process.stdout.write(raw);
    process.exit(0);
  }

  const latest = scorecards[0];
  const scorecard = JSON.parse(fs.readFileSync(latest.filePath, 'utf8'));
  const epId = scorecard.episodeId;
  const videoId = scorecard.videoId;

  if (!epId || !videoId) {
    process.stdout.write(raw);
    process.exit(0);
  }

  // input/ep*.yaml からタイトル・タイトルパターン種別を取得
  const yamlPath = path.join(projectRoot, 'packages', 'tech-geopolitics-channel', 'input', `${epId}.yaml`);
  let title = '';
  let titlePatternType = 'unknown';

  if (fs.existsSync(yamlPath)) {
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const titleMatch = yamlContent.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
      if (title.startsWith('なぜ') && title.includes('【')) {
        titlePatternType = 'why_academic';
      } else if (title.includes('→') || title.includes('のに')) {
        titlePatternType = 'paradox';
      } else if (/\d+[兆億万%]/.test(title)) {
        titlePatternType = 'number_impact';
      } else {
        titlePatternType = 'other';
      }
    }
  }

  // episode-analytics.json に追記
  let analytics = { schemaVersion: '1.0', updatedAt: new Date().toISOString(), episodes: [] };
  if (fs.existsSync(analyticsFile)) {
    analytics = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));
  }

  const uploadedAt = new Date().toISOString();
  const analyticsReadyAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  // 既存エントリを更新 or 新規追加
  const existingIdx = analytics.episodes.findIndex(e => e.epId === epId);
  const entry = {
    epId,
    videoId,
    title,
    titlePatternType,
    uploadedAt,
    analyticsReadyAt,
    ctr: null,
    retentionRate: null,
    views7d: null,
    verdict: 'PENDING',
  };

  if (existingIdx >= 0) {
    analytics.episodes[existingIdx] = { ...analytics.episodes[existingIdx], ...entry };
  } else {
    analytics.episodes.push(entry);
  }
  analytics.updatedAt = new Date().toISOString();

  fs.writeFileSync(analyticsFile, JSON.stringify(analytics, null, 2), 'utf8');

  // 48h後のリマインダー
  const readyDate = new Date(analyticsReadyAt);
  const readyStr = `${readyDate.toLocaleDateString('ja-JP')} ${readyDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
  process.stderr.write(
    `\n[analytics] 📊 ${epId} (${videoId}) をアップロード記録しました。\n` +
    `  タイトルパターン: ${titlePatternType}\n` +
    `  Analytics 収集可能時刻: ${readyStr}（48時間後）\n` +
    `  実行コマンド: npx ts-node --transpile-only scripts/collect-analytics.ts --ep ${epId}\n\n`
  );
} catch (err) {
  process.stderr.write(`[analytics] ⚠️  記録失敗: ${err.message}\n`);
}

process.stdout.write(raw);
