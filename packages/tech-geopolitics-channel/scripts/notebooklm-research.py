#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/notebooklm-research.py

NotebookLM を使ってトピックのDeep Researchを実行し、
インフォグラフィック画像（PNG）とリサーチサマリーを生成する。

使い方:
  python scripts/notebooklm-research.py \\
    --topic "米中半導体戦争で投資マネーが動く" \\
    --ep ep006 \\
    [--prompt "カスタムリサーチ指示"] \\
    [--count 3] \\
    [--style scientific]

必要な環境変数:
  ANTHROPIC_API_KEY  ← Claude API キー

事前に必要:
  pip install "notebooklm-py[browser]"
  playwright install chromium
  notebooklm login   ← 初回のみ（Google OAuth）
"""

import asyncio
import argparse
import os
import sys
import time
import json
from pathlib import Path

# .env を自動ロード（ts-node と同様の挙動）
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=_env_path, override=True)
except ImportError:
    pass  # python-dotenv 未インストール時はスキップ

import anthropic
from notebooklm import NotebookLMClient
from notebooklm.types import InfographicStyle, InfographicOrientation, InfographicDetail

# ─── パス設定 ─────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
INPUT_DIR = PROJECT_DIR / "input"
PUBLIC_CONTENT_DIR = PROJECT_DIR / "public" / "content"

# ─── スタイルマッピング ────────────────────────────────────────────────────────
STYLE_MAP = {
    "auto": InfographicStyle.AUTO_SELECT,
    "sketch-note": InfographicStyle.SKETCH_NOTE,
    "professional": InfographicStyle.PROFESSIONAL,
    "bento": InfographicStyle.BENTO_GRID,
    "editorial": InfographicStyle.EDITORIAL,
    "instructional": InfographicStyle.INSTRUCTIONAL,
    "bricks": InfographicStyle.BRICKS,
    "clay": InfographicStyle.CLAY,
    "anime": InfographicStyle.ANIME,
    "kawaii": InfographicStyle.KAWAII,
    "scientific": InfographicStyle.SCIENTIFIC,
}

# ─── Claude API でリサーチクエリを生成 ──────────────────────────────────────
def generate_research_query(topic: str, custom_prompt: str) -> str:
    """Claude API でトピックに最適なDeep Researchクエリを生成する"""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ ANTHROPIC_API_KEY が設定されていません")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    system = """あなたはYouTube動画制作のためのリサーチアナリストです。
与えられたトピックに対して、NotebookLM の Deep Research（Web検索）で
最適な情報を収集するための検索クエリを生成してください。

クエリは英語で記述し、以下の情報が収集できるよう設計してください:
- 最新のデータ・統計・数値
- 専門家・アナリストの見解
- 具体的な事例・企業名
- 投資家・市場への影響
- 地政学的背景"""

    user_prompt = f"""以下のYouTube動画トピックのDeep Researchクエリを生成してください。

トピック: {topic}
{f'追加指示: {custom_prompt}' if custom_prompt else ''}

投資・地政学・テクノロジー系YouTubeチャンネル向けの
専門的かつ視聴者に刺さる情報を収集できるクエリを
1つの包括的な英語クエリとして出力してください。
クエリのみを出力し、説明は不要です。"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        system=system,
        messages=[{"role": "user", "content": user_prompt}],
    )

    query = message.content[0].text.strip()
    print(f"   リサーチクエリ: {query}")
    return query


# ─── メイン非同期処理 ─────────────────────────────────────────────────────────
async def run_research(
    topic: str,
    ep_id: str,
    custom_prompt: str,
    count: int,
    style_name: str,
):
    """NotebookLMでDeep Researchを実行してインフォグラフィックを生成する"""

    INPUT_DIR.mkdir(exist_ok=True)
    PUBLIC_CONTENT_DIR.mkdir(parents=True, exist_ok=True)

    style = STYLE_MAP.get(style_name, InfographicStyle.SCIENTIFIC)

    # ─── 既存ノートブックIDのキャッシュ確認 ─────────────────────────────────
    notebook_cache_file = INPUT_DIR / f"{ep_id}_notebook_id.txt"
    notebook_id = None
    if notebook_cache_file.exists():
        cached_id = notebook_cache_file.read_text(encoding="utf-8").strip()
        if cached_id:
            print(f"   既存ノートブックを再利用: {cached_id}")
            notebook_id = cached_id

    async with await NotebookLMClient.from_storage() as client:
        # ─── ノートブック作成 ─────────────────────────────────────────────
        if not notebook_id:
            print(f"\n📓 ノートブック作成中: [{ep_id}] {topic}")
            notebook = await client.notebooks.create(f"[{ep_id}] {topic}")
            notebook_id = notebook.id
            notebook_cache_file.write_text(notebook_id, encoding="utf-8")
            print(f"   ノートブックID: {notebook_id}")
        else:
            print(f"\n📓 既存ノートブック使用: {notebook_id}")

        # ─── Deep Research 実行 ──────────────────────────────────────────
        print("\n🔍 Deep Research を開始中...")
        research_query = generate_research_query(topic, custom_prompt)

        task = await client.research.start(
            notebook_id,
            research_query,
            source="web",
            mode="deep",
        )

        if not task:
            print("❌ Deep Research の開始に失敗しました")
            sys.exit(1)

        task_id = task["task_id"]
        print(f"   タスクID: {task_id}")
        print("   Deep Research 実行中（数分かかります）...")

        # ─── リサーチ完了待機（ポーリング） ─────────────────────────────
        max_wait = 300  # 最大5分
        start_time = time.time()
        result = None

        while time.time() - start_time < max_wait:
            await asyncio.sleep(10)
            elapsed = int(time.time() - start_time)
            print(f"   ポーリング中... ({elapsed}秒経過)", end="\r")

            result = await client.research.poll(notebook_id)
            if result.get("status") == "completed":
                print(f"\n   ✅ リサーチ完了 ({elapsed}秒)")
                break
        else:
            print(f"\n⚠️  タイムアウト（{max_wait}秒）。取得できた結果で続行します。")

        if not result:
            print("❌ リサーチ結果の取得に失敗しました")
            sys.exit(1)

        sources = result.get("sources", [])
        report = result.get("report", "")
        summary = result.get("summary", "")
        print(f"   取得ソース数: {len(sources)}")

        # ─── ソースをノートブックにインポート ────────────────────────────
        MAX_IMPORT_SOURCES = 10  # タイムアウト防止のため上限を設定
        if sources:
            sources_to_import = sources[:MAX_IMPORT_SOURCES]
            print(f"\n📥 ソース {len(sources_to_import)}/{len(sources)} 件をノートブックに追加中...")
            try:
                imported = await client.research.import_sources(
                    notebook_id,
                    task_id,
                    sources_to_import,
                )
                print(f"   インポート完了: {len(imported)} 件")
            except Exception as e:
                print(f"   ⚠️  ソースインポートをスキップ（タイムアウト）: {type(e).__name__}")
                print("   Deep Researchレポートはノートブックに保存済みのため続行します")
        else:
            print("⚠️  インポートするソースが見つかりませんでした")

        # ─── インフォグラフィック生成 ────────────────────────────────────
        print(f"\n🎨 インフォグラフィック生成中 (×{count}枚, スタイル: {style_name})...")
        infographic_paths = []

        for i in range(1, count + 1):
            print(f"   [{i}/{count}] 生成リクエスト送信...")

            base_instruction = (
                f"投資家向けの「{topic}」に関するインフォグラフィックを作成してください。"
                "重要な数値・統計・トレンドを視覚的に強調してください。"
            )
            instructions = f"{base_instruction} {custom_prompt}" if custom_prompt else base_instruction

            status = await client.artifacts.generate_infographic(
                notebook_id,
                language="ja",
                orientation=InfographicOrientation.LANDSCAPE,
                detail_level=InfographicDetail.DETAILED,
                style=style,
                instructions=instructions,
            )

            print(f"   [{i}/{count}] タスクID: {status.task_id}, 完了待機中...")

            # 完了待機
            final_status = await client.artifacts.wait_for_completion(
                notebook_id,
                status.task_id,
                timeout=300.0,
                initial_interval=5.0,
                max_interval=20.0,
            )

            if not final_status.is_complete:
                print(f"   [{i}/{count}] ⚠️  生成タイムアウト。スキップします。")
                continue

            # PNG ダウンロード
            output_path = PUBLIC_CONTENT_DIR / f"infographic_{ep_id}_{i}.png"
            # Windows対応: rename()は既存ファイルに上書き不可のため事前削除
            output_path.unlink(missing_ok=True)
            tmp_path = PUBLIC_CONTENT_DIR / f"infographic_{ep_id}_{i}.png.tmp"
            tmp_path.unlink(missing_ok=True)
            await client.artifacts.download_infographic(
                notebook_id,
                str(output_path),
                artifact_id=status.task_id,
            )
            infographic_paths.append(output_path)
            print(f"   [{i}/{count}] ✅ 保存: {output_path.relative_to(PROJECT_DIR)}")

            # 複数枚生成時は少し待機（レート制限対策）
            if i < count:
                await asyncio.sleep(5)

        # ─── リサーチサマリー取得 ────────────────────────────────────────
        print("\n📝 リサーチサマリー取得中...")
        ask_result = await client.chat.ask(
            notebook_id,
            f"「{topic}」についての重要なポイントを日本語で以下の形式で回答してください:\n"
            "1. 最も重要な事実・数値（3〜5点）\n"
            "2. 投資家への影響（2〜3点）\n"
            "3. 地政学的背景（1〜2点）\n"
            "各ポイントは具体的な数値・企業名・国名を含めてください。",
        )

        research_summary = ask_result.answer if ask_result else ""

        # ─── リサーチサマリー保存 ────────────────────────────────────────
        research_md = INPUT_DIR / f"{ep_id}_research.md"
        with open(research_md, "w", encoding="utf-8") as f:
            f.write(f"# {ep_id} リサーチサマリー: {topic}\n\n")
            f.write(f"**トピック**: {topic}\n")
            f.write(f"**リサーチクエリ**: {research_query}\n")
            f.write(f"**生成日時**: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("---\n\n")
            f.write("## キーポイント（NotebookLM分析）\n\n")
            f.write(research_summary + "\n\n")
            if report:
                f.write("---\n\n")
                f.write("## Deep Researchレポート\n\n")
                f.write(report + "\n\n")
            if sources:
                f.write("---\n\n")
                f.write("## 参照ソース\n\n")
                for src in sources[:10]:
                    url = src.get("url", "")
                    title = src.get("title", "")
                    if url:
                        f.write(f"- [{title}]({url})\n")
            f.write("\n---\n\n")
            f.write("## 生成されたインフォグラフィック\n\n")
            for p in infographic_paths:
                rel = p.relative_to(PROJECT_DIR / "public")
                f.write(f"- `{rel}`\n")

        print(f"\n✅ 完了!")
        print(f"   リサーチサマリー : {research_md.relative_to(PROJECT_DIR)}")
        print(f"   インフォグラフィック: {len(infographic_paths)} 枚")
        for p in infographic_paths:
            print(f"     - {p.relative_to(PROJECT_DIR)}")

        # ─── 次のステップを案内 ──────────────────────────────────────────
        print("\n次のステップ:")
        print(
            f"  npx ts-node --transpile-only scripts/generate-script.ts "
            f"--topic \"{topic}\" --ep {ep_id} "
            f"--research-file input/{ep_id}_research.md"
        )

        return {
            "notebook_id": notebook_id,
            "infographic_paths": [str(p) for p in infographic_paths],
            "research_md": str(research_md),
        }


# ─── エントリポイント ─────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="NotebookLM Deep Research + インフォグラフィック生成"
    )
    parser.add_argument("--topic", required=True, help="動画トピック")
    parser.add_argument("--ep", required=True, help="エピソードID (例: ep006)")
    parser.add_argument(
        "--prompt",
        default="",
        help="カスタムリサーチプロンプト（省略可）",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=3,
        help="生成するインフォグラフィック枚数（デフォルト: 3）",
    )
    parser.add_argument(
        "--style",
        default="scientific",
        choices=list(STYLE_MAP.keys()),
        help="インフォグラフィックスタイル（デフォルト: scientific）",
    )
    args = parser.parse_args()

    print(f"\n🚀 NotebookLM リサーチパイプライン開始")
    print(f"   トピック  : {args.topic}")
    print(f"   エピソード: {args.ep}")
    print(f"   スタイル  : {args.style}")
    print(f"   枚数      : {args.count}")

    asyncio.run(
        run_research(
            topic=args.topic,
            ep_id=args.ep,
            custom_prompt=args.prompt,
            count=args.count,
            style_name=args.style,
        )
    )


if __name__ == "__main__":
    main()
