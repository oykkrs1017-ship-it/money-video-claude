@echo off
REM 毎月1日 自チャンネル分析 + 勝ちパターン抽出
REM Windows タスクスケジューラから自動実行

setlocal
cd /d "C:\Users\81808\Desktop\money_video_cluade\packages\tech-geopolitics-channel"

echo [%date% %time%] 月次チャンネル分析 開始 >> "%~dp0logs\monthly-analysis.log"

REM 自チャンネルパフォーマンス取得（直近30日）
call npx ts-node --transpile-only scripts/analyze-my-channel.ts --days 30 --output output/channel-analysis.json >> "%~dp0logs\monthly-analysis.log" 2>&1
if errorlevel 1 (
  echo [%date% %time%] ERROR: analyze-my-channel 失敗 >> "%~dp0logs\monthly-analysis.log"
  exit /b 1
)

REM 勝ちパターン抽出
call npx ts-node --transpile-only scripts/analyze-winning-patterns.ts --top-n 50 >> "%~dp0logs\monthly-analysis.log" 2>&1
if errorlevel 1 (
  echo [%date% %time%] ERROR: analyze-winning-patterns 失敗 >> "%~dp0logs\monthly-analysis.log"
  exit /b 1
)

echo [%date% %time%] 月次チャンネル分析 完了 >> "%~dp0logs\monthly-analysis.log"
endlocal
