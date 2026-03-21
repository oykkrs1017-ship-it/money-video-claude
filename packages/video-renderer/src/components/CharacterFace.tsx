import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

interface CharacterFaceProps {
  name: 'AXIS' | 'LYRA';
  emotion: number;  // 0-100
  isActive: boolean;
  color: string;
  size?: number;
}

export const CharacterFace: React.FC<CharacterFaceProps> = ({
  name,
  emotion,
  isActive,
  color,
  size = 120,
}) => {
  const frame = useCurrentFrame();

  // 感情値で表情パラメータを計算
  const eyeOpenness = interpolate(emotion, [0, 50, 100], [0.6, 0.85, 1.0]);
  const mouthCurve = interpolate(emotion, [0, 40, 70, 100], [2, 5, -2, -8]); // 正=笑顔、負=険しい
  const eyebrowAngle = interpolate(emotion, [0, 50, 100], [0, -3, -10]); // 険しさ
  const pupilSize = interpolate(emotion, [0, 100], [4, 6]);

  // アクティブ時の呼吸アニメ（微妙なスケール）
  const breathScale = isActive ? 1 + Math.sin(frame * 0.08) * 0.015 : 1;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  if (name === 'AXIS') {
    // AXIS: シャープ・幾何学的・クール
    return (
      <svg width={size} height={size} style={{transform: `scale(${breathScale})`}}>
        <defs>
          <radialGradient id="axis-face-grad" cx="40%" cy="35%">
            <stop offset="0%" stopColor={`${color}44`} />
            <stop offset="100%" stopColor="#0a0a1f" />
          </radialGradient>
          <filter id="axis-glow">
            <feGaussianBlur stdDeviation={isActive ? '3' : '1'} result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* 外枠（六角形風の円） */}
        <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={color} strokeWidth="2" strokeDasharray="8 4" opacity={0.6} />

        {/* 顔の背景 */}
        <circle cx={cx} cy={cy} r={r} fill="url(#axis-face-grad)" />

        {/* スキャンライン（クール感） */}
        <rect x={cx - r} y={cy - 1} width={r * 2} height="1" fill={color} opacity="0.2" />

        {/* 左目（シャープ・菱形） */}
        <g transform={`translate(${cx - size * 0.15}, ${cy - size * 0.08}) rotate(${eyebrowAngle})`} filter="url(#axis-glow)">
          <ellipse cx="0" cy="0" rx={size * 0.1} ry={size * 0.07 * eyeOpenness} fill={color} opacity="0.9" />
          <ellipse cx="0" cy="0" rx={pupilSize * 0.6} ry={pupilSize * eyeOpenness * 0.6} fill="#001a33" />
          {/* アクティブ時: 目の光 */}
          {isActive && <circle cx={size * 0.03} cy={-size * 0.02} r={size * 0.015} fill="white" opacity="0.8" />}
        </g>

        {/* 右目 */}
        <g transform={`translate(${cx + size * 0.15}, ${cy - size * 0.08}) rotate(${-eyebrowAngle})`} filter="url(#axis-glow)">
          <ellipse cx="0" cy="0" rx={size * 0.1} ry={size * 0.07 * eyeOpenness} fill={color} opacity="0.9" />
          <ellipse cx="0" cy="0" rx={pupilSize * 0.6} ry={pupilSize * eyeOpenness * 0.6} fill="#001a33" />
          {isActive && <circle cx={size * 0.03} cy={-size * 0.02} r={size * 0.015} fill="white" opacity="0.8" />}
        </g>

        {/* 鼻（細いライン） */}
        <line x1={cx} y1={cy + size * 0.02} x2={cx} y2={cy + size * 0.1} stroke={color} strokeWidth="1.5" opacity="0.5" />

        {/* 口（感情で変化） */}
        <path
          d={`M ${cx - size * 0.12} ${cy + size * 0.15} Q ${cx} ${cy + size * 0.15 + mouthCurve} ${cx + size * 0.12} ${cy + size * 0.15}`}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          filter="url(#axis-glow)"
        />

        {/* 耳（サイバー風パーツ） */}
        <rect x={cx - r - 6} y={cy - 8} width="6" height="16" rx="2" fill={color} opacity="0.6" />
        <rect x={cx + r} y={cy - 8} width="6" height="16" rx="2" fill={color} opacity="0.6" />

        {/* 感情値が高い時：眉間の緊張ライン */}
        {emotion > 70 && (
          <line x1={cx - 4} y1={cy - size * 0.2} x2={cx + 4} y2={cy - size * 0.2}
            stroke={color} strokeWidth="1.5" opacity={interpolate(emotion, [70, 100], [0, 0.8])} />
        )}
      </svg>
    );
  }

  // LYRA: 柔らかい・有機的・共感的
  return (
    <svg width={size} height={size} style={{transform: `scale(${breathScale})`}}>
      <defs>
        <radialGradient id="lyra-face-grad" cx="40%" cy="35%">
          <stop offset="0%" stopColor={`${color}33`} />
          <stop offset="100%" stopColor="#0d0a1f" />
        </radialGradient>
        <filter id="lyra-glow">
          <feGaussianBlur stdDeviation={isActive ? '2.5' : '1'} result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="lyra-eye-grad" cx="35%" cy="35%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} />
        </radialGradient>
      </defs>

      {/* 外枠（柔らかい円） */}
      <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke={color} strokeWidth="0.5" opacity="0.2" />

      {/* 顔の背景 */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.05} fill="url(#lyra-face-grad)" />

      {/* 左目（大きく丸い・表情豊か） */}
      <g transform={`translate(${cx - size * 0.14}, ${cy - size * 0.07})`} filter="url(#lyra-glow)">
        {/* 白目 */}
        <ellipse cx="0" cy="0" rx={size * 0.11} ry={size * 0.1 * eyeOpenness} fill="white" opacity="0.15" />
        {/* 瞳 */}
        <ellipse cx="0" cy="0" rx={size * 0.08} ry={size * 0.08 * eyeOpenness} fill={color} opacity="0.85" />
        {/* 瞳孔 */}
        <circle cx="0" cy="0" r={pupilSize * 0.7} fill="#1a0033" />
        {/* ハイライト */}
        <circle cx={-size * 0.025} cy={-size * 0.025} r={size * 0.02} fill="white" opacity="0.9" />
        <circle cx={size * 0.02} cy={size * 0.015} r={size * 0.01} fill="white" opacity="0.5" />
      </g>

      {/* 右目 */}
      <g transform={`translate(${cx + size * 0.14}, ${cy - size * 0.07})`} filter="url(#lyra-glow)">
        <ellipse cx="0" cy="0" rx={size * 0.11} ry={size * 0.1 * eyeOpenness} fill="white" opacity="0.15" />
        <ellipse cx="0" cy="0" rx={size * 0.08} ry={size * 0.08 * eyeOpenness} fill={color} opacity="0.85" />
        <circle cx="0" cy="0" r={pupilSize * 0.7} fill="#1a0033" />
        <circle cx={-size * 0.025} cy={-size * 0.025} r={size * 0.02} fill="white" opacity="0.9" />
      </g>

      {/* まつ毛（上） */}
      {([-size * 0.2, -size * 0.14, -size * 0.08] as number[]).map((x, i) => (
        <line key={i}
          x1={cx + x} y1={cy - size * 0.17}
          x2={cx + x - 2} y2={cy - size * 0.22}
          stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"
        />
      ))}
      {([size * 0.08, size * 0.14, size * 0.2] as number[]).map((x, i) => (
        <line key={i}
          x1={cx + x} y1={cy - size * 0.17}
          x2={cx + x + 2} y2={cy - size * 0.22}
          stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"
        />
      ))}

      {/* 鼻（小さく控えめ） */}
      <path d={`M ${cx - 3} ${cy + size * 0.08} Q ${cx} ${cy + size * 0.12} ${cx + 3} ${cy + size * 0.08}`}
        fill="none" stroke={color} strokeWidth="1" opacity="0.4" />

      {/* 口（感情で変化、柔らかいカーブ） */}
      <path
        d={`M ${cx - size * 0.1} ${cy + size * 0.16} Q ${cx} ${cy + size * 0.16 + mouthCurve * 1.2} ${cx + size * 0.1} ${cy + size * 0.16}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#lyra-glow)"
        opacity="0.9"
      />

      {/* 頬の赤み（感情が高い時） */}
      {emotion > 60 && (
        <>
          <ellipse cx={cx - size * 0.22} cy={cy + size * 0.05} rx={size * 0.07} ry={size * 0.04}
            fill={color} opacity={interpolate(emotion, [60, 100], [0, 0.2])} />
          <ellipse cx={cx + size * 0.22} cy={cy + size * 0.05} rx={size * 0.07} ry={size * 0.04}
            fill={color} opacity={interpolate(emotion, [60, 100], [0, 0.2])} />
        </>
      )}

      {/* 涙（感情値が非常に高い時） */}
      {emotion > 85 && (
        <ellipse cx={cx - size * 0.14} cy={cy + size * 0.05} rx={2} ry={3}
          fill={color} opacity={interpolate(emotion, [85, 100], [0, 0.7])} />
      )}
    </svg>
  );
};
