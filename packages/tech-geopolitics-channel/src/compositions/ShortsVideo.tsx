import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';
import { ScriptInput, ScriptLine } from '../utils/types';
import { buildTimeline, getVariation } from '@money-video/domain';
import { THEMES } from '../styles/themes';
import { ProgressBar } from '../components/ProgressBar';
import { TitleAnimation } from '../components/TitleAnimation';
import { BackgroundRenderer } from '../components/BackgroundRenderer';
import { AudioTrack } from '../components/AudioTrack';
import { SubtitleLayer } from '../components/SubtitleLayer';
import { VisualLayer } from '../components/VisualLayer';
import slideMapRaw from '../../out/html-slides/slide-map.json';

interface SlideMapEntry {
  slideNum: number;
  slidePng: string;
  type: string;
  audioFile?: string;
  audioFiles?: string[];
}
const slideMap = slideMapRaw as SlideMapEntry[];
const audioToSlide = new Map<string, string>();
for (const e of slideMap) {
  if (e.type !== 'visual') continue;
  const files = e.audioFiles ?? (e.audioFile ? [e.audioFile] : []);
  for (const f of files) audioToSlide.set(f, e.slidePng);
}

export interface ShortsVideoProps {
  scriptInput: ScriptInput;
}

// ─── 文節区切り改行: 読点・句点・！・？の後で <br> を挿入 ───────────────────
function insertBunsetsuBreaks(text: string): React.ReactNode[] {
  const BREAK_CHARS = '、。！？';
  const result: React.ReactNode[] = [];
  let last = 0;
  for (let i = 0; i < text.length; i++) {
    if (BREAK_CHARS.includes(text[i]) && i + 1 < text.length) {
      result.push(text.slice(last, i + 1));
      result.push(<br key={i} />);
      last = i + 1;
    }
  }
  if (last < text.length) result.push(text.slice(last));
  return result;
}

// ─── Shorts 1080×1920 セーフゾーン定義（タイトルセーフ） ───
const SAFE_TB = '3%'; // 上下マージン（57.6px）
const SAFE_LR = '5%'; // 左右マージン（54px）

// コンテンツゾーン境界（キャラなし版）
// 上部テキスト: top:3%, height:23% → 下端=26%
// スライド: top:28% → 下端≈58%（width*0.95*9/16）
// 字幕: top:59%〜
const ZONE = {
  headerTop:    '3%',   // 上部テキストエリア上端
  headerHeight: '23%',  // 上部テキストエリア高さ（3+23=26%で下端確定）
  visualTop:    '28%',  // スライド上端（2%余白）
  visualBottom: '58%',  // スライド下端（参照用）
} as const;

// ─── ダイジェスト設定（各チャプターの秒数予算） ──────────────────────────────
// summary / cta は 0 にして除外 → 結論はロング動画に誘導する
const DIGEST_BUDGET_SEC: Record<string, number> = {
  hook:        15,
  explanation: 12,
  analysis:    15,
  summary:      0,  // 除外: ロング動画へ誘導
  cta:          0,  // 除外: ロング動画へ誘導
};
const DEFAULT_BUDGET_SEC = 10;

// ロング動画誘導 CTA の秒数
const CTA_SEC = 3;

// 冒頭フック専用テロップの表示秒数（初速離脱対策・H-08）
// タイトルを全画面パンチインで見せ、視線を 0.5 秒以内に固定する
const HOOK_TEASER_SEC = 1.5;

export const ShortsVideo: React.FC<ShortsVideoProps> = ({ scriptInput }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const variation = getVariation(scriptInput.seed);
  const theme = THEMES[variation.theme];
  const { timeline, titleFrames } = buildTimeline(scriptInput, fps);

  // ─── ダイジェストタイムライン構築 ──────────────────────────────────────────
  // 各チャプターから予算フレーム分の台詞を選出し、frame 0 始まりで連続配置する
  const digestTimeline: typeof timeline = [];
  let cursor = 0;

  for (let ci = 0; ci < scriptInput.chapters.length; ci++) {
    const ch = scriptInput.chapters[ci];
    const budgetFrames = (DIGEST_BUDGET_SEC[ch.type] ?? DEFAULT_BUDGET_SEC) * fps;

    // チャプターのエントリを取得し titleFrames を引いて相対化
    const chEntries = timeline
      .filter((e) => e.chapterIndex === ci)
      .map((e) => ({
        ...e,
        startFrame: Math.max(0, e.startFrame - titleFrames),
        endFrame:   Math.max(0, e.endFrame   - titleFrames),
      }));

    if (chEntries.length === 0) continue;

    const chapterStart = chEntries[0].startFrame;
    let usedFrames = 0;

    for (const entry of chEntries) {
      const relStart = entry.startFrame - chapterStart;
      if (relStart >= budgetFrames) break; // 予算超過 → このチャプターはここまで
      const relEnd = entry.endFrame - chapterStart;
      digestTimeline.push({
        ...entry,
        startFrame: cursor + relStart,
        endFrame:   cursor + relEnd,
      });
      usedFrames = relEnd;
    }
    cursor += usedFrames;
  }

  const digestEndFrame = cursor > 0 ? cursor : fps * 42;
  const ctaFrames = Math.round(CTA_SEC * fps);
  const totalShortsFrames = digestEndFrame + ctaFrames;

  // CTA フェーズ（digest 終了後 〜 動画終了）
  const showCta = frame >= digestEndFrame;
  const ctaElapsed = showCta ? frame - digestEndFrame : 0;
  const ctaProgress = Math.min(ctaElapsed / ctaFrames, 1);

  const digestChapterTimeline = digestTimeline.map(({ chapterIndex, startFrame, endFrame }) => ({
    chapterIndex,
    startFrame,
    endFrame,
  }));

  const currentEntry = digestTimeline.find((e) => frame >= e.startFrame && frame < e.endFrame) ?? null;
  const currentLine: ScriptLine | null = currentEntry?.line ?? null;
  const currentChapter = currentEntry != null
    ? (scriptInput.chapters[currentEntry.chapterIndex] ?? null)
    : null;

  // Shorts はタイトルカードなし。frame 0 からスライド+キャラを表示
  const showTitle = false;
  const accentColor = theme.accent !== theme.background ? theme.accent : '#4a9eff';

  // HTMLスライドPNG — digestTimeline を走査して現在フレームの最新スライドを特定
  // 初期値は slide-001.png（カバースライド）。slideStartFrame を負値にして即時フル表示
  let currentSlidePng: string | null = 'html-slides/png/slide-001.png';
  let slideStartFrame = -(fps * 2);
  for (const entry of digestTimeline) {
    if (entry.startFrame > frame) break;
    if (entry.line.audioFile) {
      const png = audioToSlide.get(entry.line.audioFile);
      if (png) {
        currentSlidePng = png;
        slideStartFrame = entry.startFrame;
      }
    }
  }
  const slideElapsed = frame - slideStartFrame;
  const slideOpacity = currentSlidePng
    ? interpolate(slideElapsed, [0, fps * 0.25], [0, 1], { extrapolateRight: 'clamp' })
    : 0;

  // ─── 冒頭フック専用テロップ（H-08: 初速離脱対策）───────────────────────────
  // タイトルを全画面ビッグ＋パンチインで見せ、冒頭 0.5 秒で視線を固定する。
  // 表示後は通常の上部タイトルへクロスフェードで切り替える。
  const hookTeaserFrames = Math.round(fps * HOOK_TEASER_SEC);
  const showHookTeaser = !showTitle && !showCta && frame < hookTeaserFrames;
  // パンチイン: spring 出力(0→1)を scale 0.7→1 に写像（0.4秒で着地）
  const hookSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6 },
    durationInFrames: Math.round(fps * 0.4),
  });
  const hookScale = interpolate(hookSpring, [0, 1], [0.7, 1]);
  // フェードイン(0→0.15s) → 保持 → フェードアウト(終盤0.3s)
  const hookTeaserOpacity = interpolate(
    frame,
    [0, fps * 0.15, hookTeaserFrames - fps * 0.3, hookTeaserFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  // 上部タイトルはフック層が消えるタイミングでフェードイン（重複表示を防ぐ）
  const headerOpacity = interpolate(
    frame,
    [hookTeaserFrames - fps * 0.3, hookTeaserFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', fontFamily: theme.fontFamily ?? 'inherit' }}>
      {/* 音声（全チャプターのダイジェスト分） */}
      <AudioTrack
        timeline={digestTimeline}
        bgmMap={scriptInput.bgmMap}
        bgmVolume={scriptInput.bgmVolume}
        seVolume={scriptInput.seVolume}
        totalFrames={totalShortsFrames}
        chapters={scriptInput.chapters}
        chapterTimeline={digestChapterTimeline}
      />

      {/* Shorts: 常に純黒背景 */}
      <div style={{ position: 'absolute', inset: 0, background: '#000000', zIndex: 0 }} />

      {showTitle && (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.65) 100%)',
            zIndex: 15,
          }} />
          {/* チャンネル名（セーフゾーン内: top=SAFE_TB+若干余白） */}
          <div style={{
            position: 'absolute', top: '8%', left: SAFE_LR, right: SAFE_LR,
            display: 'flex', justifyContent: 'center',
            zIndex: 21,
          }}>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 999,
              padding: '8px 32px',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 28, fontWeight: 600, letterSpacing: '0.15em' }}>
                テクノロジー投資 × 地政学
              </span>
            </div>
          </div>
          {/* メインタイトル（左右セーフゾーン内） */}
          <div style={{ position: 'absolute', top: SAFE_TB, bottom: SAFE_TB, left: SAFE_LR, right: SAFE_LR }}>
            <TitleAnimation
              title={scriptInput.title}
              style={variation.titleStyle}
              startFrame={0}
              color="#ffffff"
              fontSize={Math.floor(width * 0.047)}
            />
          </div>
          {/* アクセントライン */}
          <div style={{
            position: 'absolute', bottom: '30%', left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 21,
            width: interpolate(frame, [0, fps * 1.5], [0, 280], { extrapolateRight: 'clamp' }),
            height: 3,
            backgroundColor: accentColor,
            borderRadius: 2,
          }} />
          {/* 「詳しくはロング動画で」バナー（左右セーフゾーン内） */}
          <div style={{
            position: 'absolute', bottom: '24%', left: SAFE_LR, right: SAFE_LR,
            display: 'flex', justifyContent: 'center',
            zIndex: 21,
          }}>
            <div style={{
              backgroundColor: accentColor,
              borderRadius: 8,
              padding: '10px 36px',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ color: '#ffffff', fontSize: 26, fontWeight: 700 }}>
                ▶ 詳しくはロング動画で
              </span>
            </div>
          </div>
        </>
      )}

      {/* 上部固定テキストエリア（見出し＋リード文） */}
      {!showTitle && (
        <div style={{
          position: 'absolute',
          top: ZONE.headerTop,
          height: ZONE.headerHeight,
          left: SAFE_LR, right: SAFE_LR,
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          opacity: headerOpacity,
        }}>
          {/* 見出し（タイトル）— 赤文字・柔らかめ強調 */}
          <div style={{
            color: '#ff2222',
            fontSize: Math.floor(width * 0.065),
            fontWeight: 700,
            fontFamily: "'Noto Sans JP', sans-serif",
            lineHeight: 1.55,
            textAlign: 'center',
            textShadow: '6px 6px 0 #fff, -6px -6px 0 #fff, 6px -6px 0 #fff, -6px 6px 0 #fff, 0 6px 0 #fff, 6px 0 0 #fff, -6px 0 0 #fff, 0 -6px 0 #fff, 4px 4px 0 #fff, -4px -4px 0 #fff, 4px -4px 0 #fff, -4px 4px 0 #fff',
            letterSpacing: '0.06em',
            wordBreak: 'keep-all',
          }}>
            {insertBunsetsuBreaks(scriptInput.title)}
          </div>
          {/* リード文（現在チャプターのトピック） */}
          {currentChapter?.topic && (
            <div style={{
              color: '#ffffff',
              fontSize: 30,
              fontWeight: 700,
              textAlign: 'center',
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 6,
              padding: '4px 18px',
            }}>
              {currentChapter.topic}
            </div>
          )}
        </div>
      )}

      {/* HTMLスライドPNG（SlidesVideo形式のhookに対応）*/}
      {!showTitle && currentSlidePng && (
        <div style={{
          position: 'absolute',
          top: ZONE.visualTop,
          left: '50%',
          transform: 'translateX(-50%)',
          width: Math.round(width * 0.95),
          height: Math.round(width * 0.95 * 9 / 16),
          zIndex: 40,
          opacity: slideOpacity,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        }}>
          <Img
            src={staticFile(currentSlidePng)}
            style={{ width: '100%', height: '100%', objectFit: 'fill' }}
          />
        </div>
      )}

      {/* VisualLayer（MainVideo形式のhook用・SlidesVideoでは非表示）*/}
      {!showTitle && !currentSlidePng && (
        <div style={{
          position: 'absolute',
          top: ZONE.visualTop,
          left: SAFE_LR, right: SAFE_LR,
          bottom: ZONE.visualBottom,
          overflow: 'hidden',
          zIndex: 30,
        }}>
          <VisualLayer
            currentChapter={currentChapter}
            currentLine={currentLine}
            currentEntry={currentEntry}
            timeline={digestTimeline}
            scriptInput={scriptInput}
            theme={theme}
            showTitle={showTitle}
            width={width}
            height={height}
          />
        </div>
      )}

      {/* キャラクター: 非表示（上部テキスト＋スライド＋字幕の3ゾーンレイアウトに変更） */}

      {/* シネマティック演出・トピックバッジ: キャラなしレイアウトでは非表示
          （上部テキストエリアにtopicを表示しているため不要） */}

      {/* 字幕（スライド下端58%の直下）— 冒頭フック表示中は隠して挨拶字幕の透けを防ぐ */}
      {!showTitle && !showHookTeaser && (
        <SubtitleLayer
          currentLine={currentLine}
          currentEntry={currentEntry}
          subtitleStyle="shorts-no-char"
        />
      )}

      {/* ─── 冒頭フック専用テロップ（H-08: 初速離脱対策）─────────────────────── */}
      {showHookTeaser && (
        <div style={{
          position: 'absolute', inset: 0,
          zIndex: 95,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 6%',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(10,12,30,0.86) 100%)',
          opacity: hookTeaserOpacity,
        }}>
          <div style={{
            transform: `scale(${hookScale})`,
            color: '#ffffff',
            fontSize: Math.floor(width * 0.082),
            fontWeight: 900,
            fontFamily: "'Noto Sans JP', sans-serif",
            textAlign: 'center',
            lineHeight: 1.4,
            letterSpacing: '0.02em',
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
            textShadow: `0 6px 28px rgba(0,0,0,0.75), 0 0 40px ${accentColor}55`,
          }}>
            {insertBunsetsuBreaks(scriptInput.title)}
          </div>
        </div>
      )}

      {/* ─── ロング動画誘導 CTA ─────────────────────────────────────────────── */}
      {showCta && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(10,12,30,0.97) 100%)',
          zIndex: 150,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
          padding: '0 5%',
          opacity: interpolate(ctaElapsed, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' }),
        }}>

          {/* ティーザーメッセージ */}
          <div style={{
            color: '#ffffff',
            fontSize: Math.floor(width * 0.072),
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.5,
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          }}>
            結論と投資判断は
            <br />
            <span style={{ color: accentColor }}>ロング動画</span>で公開中！
          </div>

          {/* 矢印アニメーション */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            opacity: interpolate(ctaElapsed % fps, [0, fps * 0.5, fps], [0.4, 1, 0.4], { extrapolateRight: 'clamp' }),
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 0, height: 0,
                borderLeft: '22px solid transparent',
                borderRight: '22px solid transparent',
                borderTop: `26px solid ${accentColor}`,
                opacity: 1 - i * 0.25,
              }} />
            ))}
          </div>

          {/* CTA ボタン */}
          <div style={{
            backgroundColor: accentColor,
            borderRadius: 12,
            padding: '18px 40px',
            width: '88%',
            textAlign: 'center',
            transform: `scale(${interpolate(ctaElapsed, [0, fps * 0.5], [0.85, 1], { extrapolateRight: 'clamp' })})`,
            boxShadow: `0 0 32px ${accentColor}88`,
          }}>
            <span style={{
              color: '#ffffff',
              fontSize: Math.floor(width * 0.062),
              fontWeight: 800,
              letterSpacing: '0.04em',
            }}>
              👆 概要欄のリンクから見る
            </span>
          </div>

          {/* サブテキスト */}
          <div style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: 28,
            textAlign: 'center',
            lineHeight: 1.6,
          }}>
            エントリー価格・撤退ラインまで
            <br />
            全て解説しています
          </div>

          {/* チャンネル登録 */}
          <div style={{
            marginTop: 8,
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: `1px solid ${accentColor}66`,
            borderRadius: 8,
            padding: '12px 32px',
            opacity: interpolate(ctaProgress, [0.4, 0.7], [0, 1], { extrapolateRight: 'clamp' }),
          }}>
            <span style={{ color: '#ffffff', fontSize: 28, fontWeight: 600 }}>
              🔔 チャンネル登録もよろしく！
            </span>
          </div>
        </div>
      )}

      <ProgressBar
        totalFrames={totalShortsFrames}
        color={theme.accent}
        chapterMarkers={[]}
        position="bottom"
      />
    </div>
  );
};

export default ShortsVideo;
