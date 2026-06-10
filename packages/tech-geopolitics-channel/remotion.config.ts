import { Config } from '@remotion/cli/config';

// public/ フォルダを明示的に指定（Studio での静的ファイル配信修正）
Config.setPublicDir('./public');

// ── レンダリング最適化 ──────────────────────────────
// CPUコア数に応じて並行レンダリング数を設定（Windows: 10が最適）
Config.setConcurrency(10);

// 中間フレームをJPEGで保存（PNGより高速）
Config.setVideoImageFormat('jpeg');

// H.264 高品質設定（YouTube向け）
Config.setCodec('h264');
