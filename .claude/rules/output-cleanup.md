# output/ クリーンアップ標準

## トリガー
YouTubeアップロード完了後、毎回必ず実施する。

## 残すもの
- `{epId}.mp4`
- `{epId}_upload_result.json`
- `{epId}_thumbnail-brief.md`
- `{epId}_props.json`（直近1世代のみ）
- サムネイルJPEG
- `channel-analysis.json`
- `thumbnail-metadata.md`

## 削除するもの
- `*.png`（still確認用）
- `*_test.mp4`
- 旧世代の `*_props.json`
- テスト用JSON類

## 実行方法
```bash
cd packages/tech-geopolitics-channel
# 削除前にリストを表示してユーザー確認を取る
ls output/*.png output/*_test.mp4 2>/dev/null
# y/n 確認後に削除
rm output/*.png output/*_test.mp4 2>/dev/null
```

## 根拠
2026-04-25: ep008完成後にPNG 189枚・テストMP4等205ファイルが蓄積、手動削除が必要になった。
