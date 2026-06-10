import { useCurrentFrame } from 'remotion';

/**
 * 現在のフレームで口が開いているかを返す（口パクアニメーション）
 */
export function useLipSync(isSpeaking: boolean): boolean {
  const frame = useCurrentFrame();
  if (!isSpeaking) return false;
  // 6fps で交互（約 5 フレームごと）
  return Math.floor(frame / 5) % 2 === 0;
}
