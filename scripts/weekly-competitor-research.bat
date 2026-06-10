@echo off
REM 毎週月曜日 競合チャンネル corpus 更新
REM Windows タスクスケジューラから自動実行

setlocal
cd /d "C:\Users\81808\Desktop\money_video_cluade\packages\tech-geopolitics-channel"

echo [%date% %time%] 週次競合リサーチ 開始 >> "%~dp0logs\weekly-competitor.log"

REM 競合コーパス収集（上位20件）
call npx ts-node --transpile-only scripts/fetch-competitor-corpus.ts --top 20 >> "%~dp0logs\weekly-competitor.log" 2>&1
if errorlevel 1 (
  echo [%date% %time%] ERROR: fetch-competitor-corpus 失敗 >> "%~dp0logs\weekly-competitor.log"
  exit /b 1
)

echo [%date% %time%] 週次競合リサーチ 完了 >> "%~dp0logs\weekly-competitor.log"
endlocal
