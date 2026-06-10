/**
 * generate-infographics.js
 * ep006「ホルムズ危機と日本のエネルギー安保」用インフォグラフィック 6枚バッチ生成
 * 使用: node scripts/generate-infographics.js
 */

const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// 日本語フォント登録（NotoSansJP）
GlobalFonts.registerFromPath('C:/Windows/Fonts/NotoSansJP-VF.ttf', 'NotoSansJP');
GlobalFonts.registerFromPath('C:/Windows/Fonts/seguiemj.ttf', 'SegoeEmoji');
const FONT = 'NotoSansJP';

const OUT_DIR = path.join(__dirname, '../public/images/ep006');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── カラーパレット ───────────────────────────────────────
const C = {
  bg:       '#0A0F1E',
  bgCard:   '#111827',
  bgCard2:  '#1F2937',
  cyan:     '#00D4FF',
  amber:    '#FFB800',
  red:      '#FF4444',
  green:    '#00FF88',
  white:    '#FFFFFF',
  gray:     '#9CA3AF',
  grayDark: '#374151',
  navy:     '#1E3A5F',
};

const W = 1920, H = 1080;

// ─── ユーティリティ ──────────────────────────────────────

function save(canvas, name) {
  const buf = canvas.toBuffer('image/png');
  const p = path.join(OUT_DIR, name);
  fs.writeFileSync(p, buf);
  console.log(`✅ ${name} (${Math.round(buf.length / 1024)}KB)`);
}

function makeCanvas() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  // 背景
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  return { canvas, ctx };
}

/** グリッドの薄いライン（背景装飾） */
function drawGrid(ctx) {
  ctx.strokeStyle = 'rgba(0,212,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

/** タイトルバーを描く */
function drawTitleBar(ctx, title, subtitle = '') {
  // 上部グラデーションバー
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, C.cyan);
  grad.addColorStop(1, '#0050FF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 6);

  ctx.fillStyle = C.white;
  ctx.font = 'bold 56px NotoSansJP';
  ctx.fillText(title, 80, 110);

  if (subtitle) {
    ctx.fillStyle = C.cyan;
    ctx.font = '30px NotoSansJP';
    ctx.fillText(subtitle, 80, 158);
  }

  // 区切り線
  ctx.strokeStyle = 'rgba(0,212,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 178); ctx.lineTo(W - 80, 178);
  ctx.stroke();
}

/** 角丸矩形 */
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

/** ウォーターマーク */
function drawWatermark(ctx) {
  ctx.fillStyle = 'rgba(0,212,255,0.15)';
  ctx.font = '22px NotoSansJP';
  ctx.fillText('テクノロジー投資×地政学', W - 420, H - 30);
}

// ─────────────────────────────────────────────────────────
// 1. ホルムズ海峡マップ（地政学的位置の概念図）
// ─────────────────────────────────────────────────────────
function gen01_HormuzMap() {
  const { canvas, ctx } = makeCanvas();
  drawGrid(ctx);
  drawTitleBar(ctx, 'ホルムズ海峡 — 世界最重要のチョークポイント', '幅わずか33kmの海峡を通る石油・LNG輸送量');

  // 海のグラデーション
  const sea = ctx.createRadialGradient(960, 600, 100, 960, 600, 700);
  sea.addColorStop(0, 'rgba(0,80,120,0.3)');
  sea.addColorStop(1, 'rgba(0,20,60,0.5)');
  ctx.fillStyle = sea;
  ctx.fillRect(80, 200, W - 160, H - 280);

  // ペルシャ湾（簡略図）
  const regions = [
    { label: 'イラン', x: 960, y: 350, w: 380, h: 200, color: 'rgba(255,68,68,0.35)', border: C.red },
    { label: 'UAE', x: 580, y: 480, w: 220, h: 130, color: 'rgba(0,212,255,0.25)', border: C.cyan },
    { label: 'オマーン', x: 820, y: 560, w: 180, h: 120, color: 'rgba(0,255,136,0.2)', border: C.green },
    { label: 'サウジアラビア', x: 200, y: 400, w: 340, h: 220, color: 'rgba(255,184,0,0.25)', border: C.amber },
    { label: 'クウェート', x: 400, y: 340, w: 140, h: 100, color: 'rgba(0,212,255,0.2)', border: C.cyan },
    { label: 'カタール', x: 560, y: 440, w: 100, h: 90, color: 'rgba(255,184,0,0.2)', border: C.amber },
  ];

  regions.forEach(r => {
    roundRect(ctx, r.x, r.y, r.w, r.h, 8, r.color, r.border);
    ctx.fillStyle = C.white;
    ctx.font = 'bold 28px NotoSansJP';
    ctx.fillText(r.label, r.x + 12, r.y + r.h / 2 + 10);
  });

  // ホルムズ海峡ハイライト
  ctx.strokeStyle = C.cyan;
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 6]);
  ctx.beginPath();
  ctx.moveTo(800, 530); ctx.lineTo(1000, 480);
  ctx.stroke();
  ctx.setLineDash([]);

  // 海峡ラベル
  roundRect(ctx, 850, 440, 300, 52, 8, 'rgba(0,212,255,0.2)', C.cyan);
  ctx.fillStyle = C.cyan;
  ctx.font = 'bold 26px NotoSansJP';
  ctx.fillText('ホルムズ海峡（幅33km）', 862, 473);

  // タンカールート矢印
  const routePoints = [
    [700, 550], [860, 530], [1020, 490], [1200, 480], [1450, 500], [1700, 540], [1850, 580]
  ];
  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 5;
  ctx.setLineDash([20, 10]);
  ctx.beginPath();
  routePoints.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.stroke();
  ctx.setLineDash([]);

  // 矢印先端
  ctx.fillStyle = C.amber;
  ctx.beginPath();
  ctx.moveTo(1870, 580); ctx.lineTo(1840, 565); ctx.lineTo(1840, 595);
  ctx.closePath(); ctx.fill();

  // 統計カード
  const stats = [
    { val: '93隻/日', label: '平時タンカー通過数', x: 100 },
    { val: '20%',     label: '世界の石油取引量',   x: 450 },
    { val: '33km',    label: '最狭部の幅',          x: 800 },
    { val: '95%',     label: '日本の中東依存率',    x: 1150 },
  ];
  stats.forEach(s => {
    roundRect(ctx, s.x, H - 220, 280, 130, 12, C.bgCard2, C.cyan + '55');
    ctx.fillStyle = C.cyan;
    ctx.font = 'bold 48px NotoSansJP';
    ctx.fillText(s.val, s.x + 16, H - 130);
    ctx.fillStyle = C.gray;
    ctx.font = '22px NotoSansJP';
    ctx.fillText(s.label, s.x + 16, H - 100);
  });

  // インド洋ラベル
  ctx.fillStyle = 'rgba(0,212,255,0.4)';
  ctx.font = 'italic bold 36px NotoSansJP';
  ctx.fillText('インド洋', 1550, 680);

  drawWatermark(ctx);
  save(canvas, '01_hormuz_map.png');
}

// ─────────────────────────────────────────────────────────
// 2. 日本エネルギー依存度（円グラフ）
// ─────────────────────────────────────────────────────────
function gen02_EnergyDependency() {
  const { canvas, ctx } = makeCanvas();
  drawGrid(ctx);
  drawTitleBar(ctx, '日本の石油輸入先（中東依存95%）', '2024年 原油輸入国別シェア');

  const data = [
    { label: 'サウジアラビア', value: 40, color: '#FF6B35' },
    { label: 'UAE',           value: 30, color: '#00D4FF' },
    { label: 'クウェート',     value: 10, color: '#FFB800' },
    { label: 'カタール',       value: 8,  color: '#00FF88' },
    { label: 'その他中東',     value: 7,  color: '#A78BFA' },
    { label: '非中東',         value: 5,  color: '#6B7280' },
  ];

  // 円グラフ描画
  const cx = 600, cy = 620, r = 320;
  let startAngle = -Math.PI / 2;

  data.forEach(d => {
    const angle = (d.value / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 3;
    ctx.stroke();

    // ラベル線
    const midAngle = startAngle + angle / 2;
    const lx = cx + Math.cos(midAngle) * (r + 60);
    const ly = cy + Math.sin(midAngle) * (r + 60);
    if (d.value >= 8) {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(midAngle) * (r + 8), cy + Math.sin(midAngle) * (r + 8));
      ctx.lineTo(lx, ly);
      ctx.stroke();
      ctx.fillStyle = C.white;
      ctx.font = 'bold 26px NotoSansJP';
      ctx.fillText(`${d.value}%`, lx + (Math.cos(midAngle) > 0 ? 8 : -80), ly + 10);
    }

    startAngle += angle;
  });

  // 中央ドーナツ穴
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = C.bg;
  ctx.fill();
  ctx.fillStyle = C.amber;
  ctx.font = 'bold 72px NotoSansJP';
  ctx.textAlign = 'center';
  ctx.fillText('95%', cx, cy - 10);
  ctx.fillStyle = C.white;
  ctx.font = '26px NotoSansJP';
  ctx.fillText('中東依存', cx, cy + 38);
  ctx.textAlign = 'left';

  // 凡例（右側）
  const legX = 1200, legStartY = 280;
  ctx.fillStyle = C.white;
  ctx.font = 'bold 36px NotoSansJP';
  ctx.fillText('輸入先内訳', legX, legStartY - 20);

  data.forEach((d, i) => {
    const y = legStartY + i * 100;
    // カラーバー
    roundRect(ctx, legX, y, 24, 70, 4, d.color, null);
    // 国名
    ctx.fillStyle = C.white;
    ctx.font = 'bold 32px NotoSansJP';
    ctx.fillText(d.label, legX + 44, y + 32);
    // シェア
    ctx.fillStyle = d.color;
    ctx.font = 'bold 40px NotoSansJP';
    ctx.fillText(`${d.value}%`, legX + 44, y + 68);
    // バー
    roundRect(ctx, legX + 160, y + 46, (d.value / 40) * 480, 14, 4, d.color + '88', null);
  });

  // 注釈
  ctx.fillStyle = C.gray;
  ctx.font = '24px NotoSansJP';
  ctx.fillText('※出典：資源エネルギー庁「エネルギー白書2024」', 80, H - 40);

  drawWatermark(ctx);
  save(canvas, '02_energy_dependency.png');
}

// ─────────────────────────────────────────────────────────
// 3. 原油価格シナリオ（横棒グラフ）
// ─────────────────────────────────────────────────────────
function gen03_OilPriceScenario() {
  const { canvas, ctx } = makeCanvas();
  drawGrid(ctx);
  drawTitleBar(ctx, '原油価格シナリオ — 封鎖時の影響試算', '1バレルあたりドル（USD）');

  const bars = [
    { label: '2020年コロナ安値',      value: 20,  color: '#6B7280', note: '歴史的底値' },
    { label: '2024年初 現在',         value: 71,  color: C.green,   note: '基準ライン' },
    { label: '現在（高止まり）',       value: 96,  color: C.amber,   note: '2026年4月' },
    { label: '部分封鎖シナリオ',       value: 130, color: '#FF8C42', note: '輸送量30%減' },
    { label: '長期緊張シナリオ',       value: 160, color: '#FF4444', note: 'オイルショック級' },
    { label: '完全封鎖シナリオ',       value: 200, color: '#CC0000', note: '最悪ケース' },
  ];

  const maxVal = 220;
  const barH = 90;
  const gap = 30;
  const chartX = 520, chartY = 220;
  const chartW = W - chartX - 100;

  bars.forEach((b, i) => {
    const y = chartY + i * (barH + gap);
    const bw = (b.value / maxVal) * chartW;

    // ラベル
    ctx.fillStyle = C.white;
    ctx.font = 'bold 28px NotoSansJP';
    ctx.textAlign = 'right';
    ctx.fillText(b.label, chartX - 20, y + barH / 2 + 10);
    ctx.textAlign = 'left';

    // バー（グラデーション）
    const grad = ctx.createLinearGradient(chartX, 0, chartX + bw, 0);
    grad.addColorStop(0, b.color + 'AA');
    grad.addColorStop(1, b.color);
    roundRect(ctx, chartX, y, bw, barH, 8, grad, null);

    // 値
    ctx.fillStyle = C.white;
    ctx.font = 'bold 36px NotoSansJP';
    ctx.fillText(`$${b.value}`, chartX + bw + 16, y + barH / 2 + 12);

    // 注記
    ctx.fillStyle = b.color;
    ctx.font = '22px NotoSansJP';
    ctx.fillText(b.note, chartX + bw + 16, y + barH / 2 + 42);
  });

  // 完全封鎖ライン強調
  const crisisX = chartX + (200 / maxVal) * chartW;
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(crisisX, chartY - 20); ctx.lineTo(crisisX, chartY + bars.length * (barH + gap) + 10);
  ctx.stroke();
  ctx.setLineDash([]);

  // ガソリン換算
  roundRect(ctx, 80, H - 200, 860, 140, 16, C.bgCard2, C.red + '88');
  ctx.fillStyle = C.red;
  ctx.font = 'bold 32px NotoSansJP';
  ctx.fillText('⚠ 完全封鎖時の生活への影響試算', 110, H - 160);
  ctx.fillStyle = C.white;
  ctx.font = '28px NotoSansJP';
  ctx.fillText('ガソリン：約400円/L ｜ 電気代：2〜3倍 ｜ 食料品・輸送コスト全般に波及', 110, H - 110);

  ctx.fillStyle = C.gray;
  ctx.font = '22px NotoSansJP';
  ctx.fillText('※試算値。実際の価格は需給・為替・政策により変動します', 80, H - 40);

  drawWatermark(ctx);
  save(canvas, '03_oil_price_scenario.png');
}

// ─────────────────────────────────────────────────────────
// 4. 封鎖シナリオ影響フロー（縦フロー図）
// ─────────────────────────────────────────────────────────
function gen04_BlockadeFlow() {
  const { canvas, ctx } = makeCanvas();
  drawGrid(ctx);
  drawTitleBar(ctx, '封鎖シナリオ — 影響の連鎖', 'ホルムズ封鎖から日本経済へのインパクトチェーン');

  const steps = [
    { icon: '①', title: 'ホルムズ海峡 封鎖', body: 'イランが機雷敷設・タンカー拿捕', color: C.red },
    { icon: '②', title: '原油・LNG輸送 停止',  body: '日本向け95%のエネルギーが途絶える危機', color: '#FF8C42' },
    { icon: '③', title: '原油価格 急騰',        body: '1バレル$71 → 最大$200超の試算', color: C.amber },
    { icon: '④', title: '電気代・ガス代 高騰', body: '電力：LNG依存35%。家庭電気代2〜3倍', color: '#FFD700' },
    { icon: '⑤', title: '製造業・物流 停滞',   body: 'プラスチック・化学品の原料不足、輸送コスト増大', color: C.cyan },
  ];

  const boxW = 700, boxH = 120;
  const startX = (W - boxW) / 2;
  const startY = 220;
  const stepGap = 148;

  steps.forEach((s, i) => {
    const y = startY + i * stepGap;

    // 接続矢印
    if (i > 0) {
      ctx.strokeStyle = s.color + 'AA';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2, y - 28); ctx.lineTo(W / 2, y);
      ctx.stroke();
      // 矢印先端
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(W / 2, y + 2);
      ctx.lineTo(W / 2 - 10, y - 16);
      ctx.lineTo(W / 2 + 10, y - 16);
      ctx.closePath(); ctx.fill();
    }

    // カード
    roundRect(ctx, startX, y, boxW, boxH, 14, C.bgCard2, s.color + '88');
    // 左アクセントバー
    roundRect(ctx, startX, y, 8, boxH, 4, s.color, null);

    // アイコン
    ctx.font = '52px NotoSansJP';
    ctx.fillText(s.icon, startX + 28, y + 74);

    // タイトル
    ctx.fillStyle = s.color;
    ctx.font = 'bold 32px NotoSansJP';
    ctx.fillText(s.title, startX + 100, y + 44);

    // 本文
    ctx.fillStyle = C.gray;
    ctx.font = '24px NotoSansJP';
    ctx.fillText(s.body, startX + 100, y + 82);

    // ステップ番号
    roundRect(ctx, startX + boxW - 60, y + 36, 44, 44, 22, s.color, null);
    ctx.fillStyle = C.bg;
    ctx.font = 'bold 26px NotoSansJP';
    ctx.textAlign = 'center';
    ctx.fillText(i + 1, startX + boxW - 38, y + 64);
    ctx.textAlign = 'left';
  });

  // 右側サイドパネル：備蓄情報
  const panelX = W / 2 + 430;
  roundRect(ctx, panelX, 220, 420, 680, 16, C.bgCard2, C.amber + '55');
  ctx.fillStyle = C.amber;
  ctx.font = 'bold 28px NotoSansJP';
  ctx.fillText('日本の防衛ライン', panelX + 24, 270);

  const defenses = [
    { label: '国家石油備蓄', val: '約90日分', note: 'IEA基準：90日' },
    { label: '民間備蓄合計', val: '約145日分', note: '政府+民間合計' },
    { label: '代替調達期間', val: '数週間〜数ヶ月', note: '中東以外から調達' },
    { label: '1973年教訓', val: '節電・ガソリン規制', note: 'オイルショック3ヶ月継続' },
  ];
  defenses.forEach((d, i) => {
    const dy = 310 + i * 148;
    ctx.strokeStyle = 'rgba(255,184,0,0.2)';
    ctx.lineWidth = 1;
    if (i > 0) { ctx.beginPath(); ctx.moveTo(panelX + 20, dy - 8); ctx.lineTo(panelX + 400, dy - 8); ctx.stroke(); }
    ctx.fillStyle = C.white;
    ctx.font = 'bold 26px NotoSansJP';
    ctx.fillText(d.label, panelX + 24, dy + 30);
    ctx.fillStyle = C.amber;
    ctx.font = 'bold 38px NotoSansJP';
    ctx.fillText(d.val, panelX + 24, dy + 78);
    ctx.fillStyle = C.gray;
    ctx.font = '21px NotoSansJP';
    ctx.fillText(d.note, panelX + 24, dy + 110);
  });

  drawWatermark(ctx);
  save(canvas, '04_blockade_flow.png');
}

// ─────────────────────────────────────────────────────────
// 5. 投資銘柄マップ（セクターネットワーク図）
// ─────────────────────────────────────────────────────────
function gen05_InvestmentMap() {
  const { canvas, ctx } = makeCanvas();
  drawGrid(ctx);
  drawTitleBar(ctx, 'ホルムズ危機で注目の投資セクター', 'エネルギー地政学リスク×受益銘柄マップ 2026年版');

  // 中央ノード
  const cx = 700, cy = 610;
  ctx.beginPath();
  ctx.arc(cx, cy, 90, 0, Math.PI * 2);
  const cGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 90);
  cGrad.addColorStop(0, C.amber);
  cGrad.addColorStop(1, '#FF6B00');
  ctx.fillStyle = cGrad;
  ctx.fill();
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = C.bg;
  ctx.font = 'bold 28px NotoSansJP';
  ctx.textAlign = 'center';
  ctx.fillText('ホルムズ', cx, cy - 10);
  ctx.fillText('危機', cx, cy + 28);
  ctx.textAlign = 'left';

  const sectors = [
    {
      label: '石油・天然ガス',
      color: '#FF6B35',
      angle: -100,
      dist: 320,
      stocks: ['INPEX', '石油資源開発', 'ENEOSホールディングス'],
      badge: '最直接的受益',
    },
    {
      label: '総合商社',
      color: C.cyan,
      angle: -20,
      dist: 320,
      stocks: ['三菱商事', '三井物産', '伊藤忠商事'],
      badge: '資源権益保有',
    },
    {
      label: '再生可能エネルギー',
      color: C.green,
      angle: 60,
      dist: 320,
      stocks: ['レノバ', 'エネクスインフラ', 'ソフトバンク傘下'],
      badge: '中長期テーマ',
    },
    {
      label: '防衛・セキュリティ',
      color: '#A78BFA',
      angle: 145,
      dist: 320,
      stocks: ['三菱重工業', 'IHI', '川崎重工業'],
      badge: '安保強化',
    },
    {
      label: 'ヘッジ資産',
      color: '#FFD700',
      angle: -160,
      dist: 300,
      stocks: ['金ETF', '原油先物', 'ドル建て資産'],
      badge: 'リスクオフ',
    },
  ];

  sectors.forEach(s => {
    const rad = (s.angle * Math.PI) / 180;
    const nx = cx + Math.cos(rad) * s.dist;
    const ny = cy + Math.sin(rad) * s.dist;

    // 接続線
    ctx.strokeStyle = s.color + '66';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * 95, cy + Math.sin(rad) * 95);
    ctx.lineTo(nx - Math.cos(rad) * 80, ny - Math.sin(rad) * 80);
    ctx.stroke();
    ctx.setLineDash([]);

    // ノード
    ctx.beginPath();
    ctx.arc(nx, ny, 72, 0, Math.PI * 2);
    ctx.fillStyle = C.bgCard2;
    ctx.fill();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = s.color;
    ctx.font = 'bold 22px NotoSansJP';
    ctx.textAlign = 'center';
    const lines = s.label.split('・');
    lines.forEach((l, li) => ctx.fillText(l, nx, ny - 10 + li * 28));
    ctx.textAlign = 'left';

    // 銘柄カード（横）
    const cardX = nx + (Math.cos(rad) > 0 ? 85 : -400);
    const cardY = ny - 80;
    roundRect(ctx, cardX, cardY, 310, 170, 12, C.bgCard, s.color + '44');

    // バッジ
    roundRect(ctx, cardX + 12, cardY + 12, 180, 34, 6, s.color, null);
    ctx.fillStyle = C.bg;
    ctx.font = 'bold 19px NotoSansJP';
    ctx.fillText(s.badge, cardX + 20, cardY + 34);

    // 銘柄リスト
    s.stocks.forEach((st, si) => {
      ctx.fillStyle = C.white;
      ctx.font = '21px NotoSansJP';
      ctx.fillText(`• ${st}`, cardX + 14, cardY + 70 + si * 32);
    });
  });

  // 免責事項
  roundRect(ctx, W - 640, H - 120, 580, 80, 10, 'rgba(255,0,0,0.1)', C.red + '55');
  ctx.fillStyle = C.red;
  ctx.font = 'bold 20px NotoSansJP';
  ctx.fillText('⚠ 投資は自己責任です。当情報は参考のみ。', W - 628, H - 90);
  ctx.fillStyle = C.gray;
  ctx.font = '18px NotoSansJP';
  ctx.fillText('必ず自身でリサーチのうえ、慎重に判断してください。', W - 628, H - 58);

  drawWatermark(ctx);
  save(canvas, '05_investment_map.png');
}

// ─────────────────────────────────────────────────────────
// 6. サムネイル
// ─────────────────────────────────────────────────────────
function gen06_Thumbnail() {
  const { canvas, ctx } = makeCanvas();

  // 背景グラデーション（炎・危機感）
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0A0F1E');
  bgGrad.addColorStop(0.5, '#1A0A00');
  bgGrad.addColorStop(1, '#0A0F1E');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 炎のエフェクト（右側グロー）
  const flameGrad = ctx.createRadialGradient(1450, 600, 50, 1450, 600, 500);
  flameGrad.addColorStop(0, 'rgba(255,80,0,0.5)');
  flameGrad.addColorStop(0.5, 'rgba(255,30,0,0.2)');
  flameGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = flameGrad;
  ctx.fillRect(0, 0, W, H);

  // グリッド（赤っぽく）
  ctx.strokeStyle = 'rgba(255,68,0,0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // 海峡の区切り線
  ctx.strokeStyle = C.cyan;
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 10]);
  ctx.beginPath();
  ctx.moveTo(900, 0); ctx.lineTo(900, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // タイトル（メイン）
  ctx.shadowColor = C.red;
  ctx.shadowBlur = 40;
  ctx.fillStyle = C.white;
  ctx.font = 'bold 120px NotoSansJP';
  ctx.fillText('電気が', 60, 260);

  ctx.fillStyle = C.amber;
  ctx.font = 'bold 140px NotoSansJP';
  ctx.fillText('消える？', 60, 420);
  ctx.shadowBlur = 0;

  // サブタイトル
  ctx.fillStyle = C.white;
  ctx.font = 'bold 54px NotoSansJP';
  ctx.fillText('ホルムズ海峡封鎖と', 60, 530);
  ctx.fillText('日本のエネルギー安保', 60, 600);

  // 数字バッジ
  const badges = [
    { val: '95%', label: '中東依存率', y: 700 },
    { val: '$200', label: '封鎖時原油価格', y: 820 },
    { val: '33km', label: '世界を左右する海峡幅', y: 940 },
  ];
  badges.forEach(b => {
    roundRect(ctx, 60, b.y - 42, 640, 82, 10, 'rgba(0,0,0,0.6)', C.red + '88');
    ctx.fillStyle = C.amber;
    ctx.font = 'bold 52px NotoSansJP';
    ctx.fillText(b.val, 90, b.y + 12);
    ctx.fillStyle = C.white;
    ctx.font = '36px NotoSansJP';
    ctx.fillText(b.label, 90 + (b.val.length * 32), b.y + 12);
  });

  // 右側：数字インフォ
  ctx.fillStyle = C.red;
  ctx.font = 'bold 52px NotoSansJP';
  ctx.textAlign = 'center';
  ctx.fillText('エネルギー危機', W * 0.73, 320);
  ctx.fillStyle = C.white;
  ctx.font = 'bold 36px NotoSansJP';
  ctx.fillText('投資家が今すぐ', W * 0.73, 390);
  ctx.fillText('知るべきこと', W * 0.73, 440);

  // 炎アイコン（簡略）
  // 炎をグラデーション円で表現
  const flameCore = ctx.createRadialGradient(1380, 650, 20, 1380, 650, 160);
  flameCore.addColorStop(0, '#FFFFFF');
  flameCore.addColorStop(0.2, '#FFD700');
  flameCore.addColorStop(0.6, '#FF4500');
  flameCore.addColorStop(1, 'rgba(255,50,0,0)');
  ctx.fillStyle = flameCore;
  ctx.beginPath();
  ctx.arc(1380, 650, 160, 0, Math.PI * 2);
  ctx.fill();
  // FIRE テキスト
  ctx.fillStyle = '#FF6B00';
  ctx.font = 'bold 72px NotoSansJP';
  ctx.textAlign = 'center';
  ctx.fillText('FIRE', 1380, 720);
  ctx.textAlign = 'left';
  ctx.textAlign = 'left';

  // チャンネル名バー
  const barGrad = ctx.createLinearGradient(0, H - 80, W, H - 80);
  barGrad.addColorStop(0, C.cyan);
  barGrad.addColorStop(1, '#0050FF');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, H - 70, W, 70);

  ctx.fillStyle = C.bg;
  ctx.font = 'bold 38px NotoSansJP';
  ctx.textAlign = 'center';
  ctx.fillText('テクノロジー投資×地政学', W / 2, H - 22);
  ctx.textAlign = 'left';

  save(canvas, '06_thumbnail.png');
}

// ─── メイン実行 ────────────────────────────────────────
console.log('\n🎨 ep006 インフォグラフィック生成開始\n');
console.log(`出力先: ${OUT_DIR}\n`);

gen01_HormuzMap();
gen02_EnergyDependency();
gen03_OilPriceScenario();
gen04_BlockadeFlow();
gen05_InvestmentMap();
gen06_Thumbnail();

console.log('\n✨ 全6枚の生成完了！');
