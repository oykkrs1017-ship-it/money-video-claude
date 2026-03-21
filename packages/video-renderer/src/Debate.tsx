import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {AgentCard} from './components/AgentCard';
import {WordByWord} from './components/WordByWord';
import {OpeningHook} from './components/OpeningHook';
import {InterruptFlash} from './components/InterruptFlash';
import {DataVisual} from './components/DataVisual';
import {Waveform} from './components/Waveform';
import {EmotionArc} from './components/EmotionArc';
import {GlitchEffect} from './components/GlitchEffect';
import {Particles} from './components/Particles';
import {HolographicBackground} from './components/HolographicBackground';
import {DataCubes} from './components/DataCubes';
import {EndCard} from './components/EndCard';
import {AUDIO_SEGMENTS, SCRIPT_SEGMENTS} from './data';

const AXIS_COLOR = '#00d4ff';
const LYRA_COLOR = '#bf5af2';

const AXIS_POSITION = 'AIは仕事を再定義し、生産性を向上させる';
const LYRA_POSITION = 'AIは雇用の喪失と社会の変革を招く';

const TOTAL_FRAMES = 5964;

export const DebateComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const currentMs = (frame / fps) * 1000;

  const activeSegmentIndex = AUDIO_SEGMENTS.reduce<number>((active, seg, i) => {
    if (currentMs >= seg.start_ms && currentMs < seg.start_ms + seg.duration_ms) {
      return i;
    }
    return active;
  }, -1);

  const activeSegment = activeSegmentIndex >= 0 ? AUDIO_SEGMENTS[activeSegmentIndex] : null;
  const activeScript = activeSegmentIndex >= 0 ? SCRIPT_SEGMENTS[activeSegmentIndex] : null;

  const axisEmotion = AUDIO_SEGMENTS.slice(0, activeSegmentIndex + 1)
    .filter(s => s.speaker === 'agent_a')
    .reduce<number>((_last, s) => s.emotion, 35);

  const lyraEmotion = AUDIO_SEGMENTS.slice(0, activeSegmentIndex + 1)
    .filter(s => s.speaker === 'agent_b')
    .reduce<number>((_last, s) => s.emotion, 42);

  const isAxisActive = activeSegment?.speaker === 'agent_a';
  const isLyraActive = activeSegment?.speaker === 'agent_b';

  const backgroundStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 50%, #f5f0ff 100%)',
    position: 'relative',
    overflow: 'hidden',
  };

  const contentStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '40px 60px',
    boxSizing: 'border-box',
  };

  const agentsRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    gap: '40px',
  };

  const dividerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: '1px',
    background: 'linear-gradient(to bottom, transparent, rgba(30,30,80,0.1) 30%, rgba(30,30,80,0.1) 70%, transparent)',
    transform: 'translateX(-50%)',
  };

  return (
    <AbsoluteFill style={backgroundStyle}>
      {/* レイヤー1: ホログラフィック背景 */}
      <div style={{position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none'}}>
        <HolographicBackground />
      </div>

      {/* レイヤー1b: データキューブ */}
      <div style={{position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none'}}>
        <DataCubes />
      </div>

      {/* レイヤー1c: パーティクル（感情連動） */}
      <div style={{position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none'}}>
        <Particles axisEmotion={axisEmotion} lyraEmotion={lyraEmotion} />
      </div>

      {/* デコレーショングリッド */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(60,80,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(60,80,255,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* センター区切り線 */}
      <div style={{...dividerStyle, zIndex: 3}} />

      {/* グリッチエフェクト（感情80以上） */}
      <div style={{position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none'}}>
        <GlitchEffect emotion={axisEmotion} color={AXIS_COLOR} side="left" />
      </div>
      <div style={{position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none'}}>
        <GlitchEffect emotion={lyraEmotion} color={LYRA_COLOR} side="right" />
      </div>

      {/* 音声トラック（混合済みWAV1本で再生） */}
      <Sequence from={0} durationInFrames={5964}>
        <Audio src={staticFile('mixed.wav')} />
      </Sequence>

      {/* メインコンテンツ */}
      <div style={{...contentStyle, position: 'relative', zIndex: 5}}>
        {/* タイトルバー: 左に経過時間、中央にタイトル、右にEmotionArc */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24}}>
          {/* 経過時間 */}
          <div style={{fontSize: 14, color: 'rgba(30,30,80,0.5)', letterSpacing: 2, paddingTop: 8}}>
            {Math.floor(currentMs / 60000)}:{String(Math.floor((currentMs % 60000) / 1000)).padStart(2, '0')} / 3:18
          </div>
          {/* タイトル中央 */}
          <div style={{textAlign: 'center', flex: 1}}>
            <div style={{fontSize: 16, color: 'rgba(30,30,80,0.55)', letterSpacing: 4, fontWeight: 600}}>AI DEBATE</div>
            <div style={{fontSize: 36, color: '#1a1a4a', fontWeight: 900, letterSpacing: 1, marginTop: 6, textShadow: 'none'}}>AIは人間の仕事を奪うか</div>
          </div>
          {/* EmotionArcを右上に配置（幅160px） */}
          <div style={{width: 160}}>
            <EmotionArc audioSegments={AUDIO_SEGMENTS} />
          </div>
        </div>

        {/* エージェント行 */}
        <div style={agentsRowStyle}>
          {/* 左側AXIS */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1}}>
            <AgentCard
              name="AXIS"
              side="left"
              color={AXIS_COLOR}
              isActive={isAxisActive ?? false}
              emotion={axisEmotion}
              position={AXIS_POSITION}
            />
            <Waveform color={AXIS_COLOR} isActive={isAxisActive ?? false} emotion={axisEmotion} side="left" />
          </div>

          {/* 中央エリア */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            flexShrink: 0,
            minWidth: 200,
          }}>
            <div style={{fontSize: 64, fontWeight: 900, color: 'rgba(30,30,80,0.12)', letterSpacing: 4}}>VS</div>
            {/* 現在話者インジケーター */}
            {activeSegment && (
              <div style={{
                padding: '8px 20px',
                background: activeSegment.speaker === 'agent_a' ? '#00d4ff22' : '#bf5af222',
                border: `1px solid ${activeSegment.speaker === 'agent_a' ? '#00d4ff' : '#bf5af2'}`,
                borderRadius: 20,
                fontSize: 13,
                color: activeSegment.speaker === 'agent_a' ? '#00d4ff' : '#bf5af2',
                letterSpacing: 2,
                fontWeight: 'bold',
              }}>
                {activeSegment.speaker === 'agent_a' ? '← AXIS' : 'LYRA →'}
              </div>
            )}
            {/* タイムライン進捗バー */}
            <div style={{width: 4, height: 120, background: 'rgba(30,30,80,0.1)', borderRadius: 2, overflow: 'hidden'}}>
              <div style={{
                width: '100%',
                height: `${(currentMs / 198798) * 100}%`,
                background: 'linear-gradient(to bottom, #00d4ff, #bf5af2)',
                borderRadius: 2,
              }} />
            </div>
            {/* セグメント番号 */}
            <div style={{fontSize: 11, color: 'rgba(30,30,80,0.4)', letterSpacing: 1}}>
              {activeSegmentIndex >= 0 ? `${activeSegmentIndex + 1} / 16` : ''}
            </div>
          </div>

          {/* 右側LYRA */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1}}>
            <AgentCard
              name="LYRA"
              side="right"
              color={LYRA_COLOR}
              isActive={isLyraActive ?? false}
              emotion={lyraEmotion}
              position={LYRA_POSITION}
            />
            <Waveform color={LYRA_COLOR} isActive={isLyraActive ?? false} emotion={lyraEmotion} side="right" />
          </div>
        </div>
      </div>

      {/* 字幕 WordByWord */}
      {activeSegment && activeScript && (
        <div style={{position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none'}}>
          <WordByWord
            text={activeScript.text}
            speaker={activeScript.speaker}
            segmentStartFrame={Math.round((activeSegment.start_ms / 1000) * fps)}
            durationFrames={Math.round((activeSegment.duration_ms / 1000) * fps)}
            color={activeSegment.speaker === 'agent_a' ? AXIS_COLOR : LYRA_COLOR}
          />
        </div>
      )}

      {/* データビジュアル */}
      {activeScript && activeScript.data_visual && activeSegment && (
        <div style={{position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none'}}>
          <DataVisual
            dataVisual={activeScript.data_visual}
            color={activeSegment.speaker === 'agent_a' ? AXIS_COLOR : LYRA_COLOR}
            startFrame={Math.round((activeSegment.start_ms / 1000) * fps)}
          />
        </div>
      )}

      {/* 割り込みフラッシュ */}
      <div style={{position: 'absolute', inset: 0, zIndex: 9, pointerEvents: 'none'}}>
        <InterruptFlash audioSegments={AUDIO_SEGMENTS} scriptSegments={SCRIPT_SEGMENTS} />
      </div>

      {/* エンドカード */}
      <div style={{position: 'absolute', inset: 0, zIndex: 10}}>
        <EndCard totalFrames={TOTAL_FRAMES} />
      </div>

      {/* オープニングフック（最前面） */}
      <div style={{position: 'absolute', inset: 0, zIndex: 100}}>
        <OpeningHook />
      </div>
    </AbsoluteFill>
  );
};
