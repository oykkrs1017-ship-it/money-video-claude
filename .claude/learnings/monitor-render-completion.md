# 学び: レンダリング完了の検知はファイルサイズで行う
日付: 2026-05-01
カテゴリ: スキルルール
関連スキル: remotion-still-check, video-render

## 状況
ep011 レンダリング中、Monitor の grep が誤検知してレンダリング完了と判断。
実際にはまだ進行中で、アップロードが「動画ファイルが見つかりません」エラーになった。

## 齟齬の内容
- AI の判断: `grep -qiE "Rendered 31563/31563"` でログをポーリングし、マッチしたら完了とみなした
- 実態: `31563` という数字がログの別の行（time remaining の計算など）でも登場し誤マッチ
- 差分の本質: テキストパターンでの完了検知は数字の再出現リスクがあり脆弱

## 学び

**レンダリング完了の判定は「ファイルの実在 + サイズ閾値」で行う。**

```bash
# NG: テキストパターン（誤検知リスク）
until grep -q "Rendered 31563/31563" render.log; do sleep 30; done

# OK: ファイル存在 + サイズ確認
until [ -f "output/epXXX.mp4" ] && [ $(stat -c%s "output/epXXX.mp4" 2>/dev/null || echo 0) -gt 50000000 ]; do
  sleep 15
done
```

サイズ閾値の目安: Remotion で 30fps / 10分 の動画 ≒ 80MB 以上

### ep016 追記（2026-05-16）: "encoded" パターンの誤マッチ

`grep "encoded"` を使った場合も同様に誤検知する。  
Remotion は `Rendered X/Y` フェーズの後に `Encoded X/Y` という進捗ログを出力する。  
これが完了前から出力されるため、`grep -q "encoded"` が中間状態でマッチしてしまう。

```bash
# NG: "encoded" パターン（中間ログに誤マッチ）
until grep -qi "encoded\|+.*video.mp4" render.log; do sleep 30; done

# OK: ファイル存在確認（確実）
until [ -f "output/epXXX.mp4" ]; do sleep 30; done

# より確実: ファイル存在 + 最低サイズ確認
until [ -f "output/epXXX.mp4" ] && [ $(stat -c%s "output/epXXX.mp4" 2>/dev/null || echo 0) -gt 50000000 ]; do
  sleep 15
done
```

## 適用先
- [x] `monitor-render-completion.md` に "encoded" パターン追記済み
- [ ] `CLAUDE.md` のパイプライン注記に追記
- [ ] Monitor を使う場合は `find ... -size +50M` パターンを標準化
