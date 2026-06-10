#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/notebooklm-channel-analysis.py

既存のNotebookLMノートブック（チャンネル動画格納済み）に対して
第三者視点の弱点分析クエリを5軸で送信し、結果をMarkdownに保存する。

使い方:
  python scripts/notebooklm-channel-analysis.py \
    --notebook e7b686b9-3915-452c-b8ca-c131cec25c8a \
    [--output-dir output]
"""

import asyncio
import argparse
import sys
import time
from pathlib import Path

try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=_env_path, override=True)
except ImportError:
    pass

from notebooklm import NotebookLMClient

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

# ─── 5軸分析クエリ ─────────────────────────────────────────────────────────────
QUERIES = [
    {
        "key": "retention",
        "title": "軸1: 視聴者離脱の原因（Retention）",
        "prompt": (
            "あなたは厳しいYouTubeコンテンツアナリストです。"
            "格納されている動画スクリプトと分析データをもとに、"
            "「なぜ視聴者が途中で離脱するか」を3〜5つ具体的に指摘してください。"
            "冒頭30秒・中盤・終盤それぞれで何が起きているか分析してください。"
            "「うまくいっている点」は省略し、問題点のみ列挙してください。"
            "できるだけ具体的なエピソード名（ep003等）や時刻を引用して答えてください。"
        ),
    },
    {
        "key": "ctr",
        "title": "軸2: タイトル・サムネイルの弱点（CTR）",
        "prompt": (
            "あなたはYouTubeのCTR改善専門家です。"
            "格納されている各エピソードのタイトルをすべて評価してください。"
            "検索されにくい理由、クリックされにくい理由を具体的に指摘してください。"
            "「検索ボリュームがありそうなキーワード」と「実際のタイトルのズレ」を"
            "エピソードごとに比較してください。"
            "改善案も各エピソードに対して1つずつ提示してください。"
        ),
    },
    {
        "key": "script",
        "title": "軸3: スクリプト構造の問題（台本品質）",
        "prompt": (
            "あなたは視聴率の高いYouTube台本を多数手がけてきた専門家です。"
            "格納された台本を読み、「一般的なYouTubeのベストプラクティスと比べて"
            "何が欠けているか」を指摘してください。"
            "フック・展開・CTA・情報密度・話速感・感情的な引きの強さについて"
            "それぞれ100点満点で採点し、60点未満の項目を詳しく説明してください。"
            "具体的なエピソードの台詞を引用しながら説明してください。"
        ),
    },
    {
        "key": "positioning",
        "title": "軸4: 競合との差別化不足（ポジショニング）",
        "prompt": (
            "あなたは日本のYouTube投資・地政学ジャンルを普段から視聴している一般視聴者です。"
            "このチャンネルの動画を見て「高橋ダンや両学長と比べて、"
            "このチャンネルを登録する理由が何か」を正直に答えてください。"
            "差別化できていない点を具体的に3つ挙げてください。"
            "また、このチャンネルだけが持っている強みがあれば1つ挙げてください。"
        ),
    },
    {
        "key": "production",
        "title": "軸5: 制作クオリティの改善点（映像・音声・テンポ）",
        "prompt": (
            "あなたはYouTubeの視聴体験を専門的に評価するコンサルタントです。"
            "動画の映像構成・テロップ・音声品質・テンポ・情報の見せ方について、"
            "「視聴者がストレスを感じる可能性がある箇所」を具体的に指摘してください。"
            "抽象的な表現（「テンポが悪い」など）は避け、"
            "「どのエピソードの何分何秒でどんな問題が起きているか」の形で答えてください。"
            "改善コストが低い順に優先度をつけて提示してください。"
        ),
    },
    {
        "key": "summary",
        "title": "総括: 最優先改善3点",
        "prompt": (
            "上記の5軸分析を踏まえ、このチャンネルが「月間1万再生→10万再生」に"
            "成長するために最優先で改善すべき3点を、具体的な行動レベルで提示してください。"
            "「コンテンツの質を上げる」のような抽象的な表現は禁止です。"
            "各改善点について「何を」「どのように変える」「期待される効果」を明記してください。"
            "さらに「今日から1本目の動画で試せる最小の改善アクション」を1つだけ挙げてください。"
        ),
    },
]


async def run_analysis(notebook_id: str, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)

    all_results = []

    async with await NotebookLMClient.from_storage() as client:
        print(f"\n[OK] notebook: {notebook_id}\n")

        for i, q in enumerate(QUERIES, 1):
            print(f"[{i}/{len(QUERIES)}] {q['title']}")
            print("    sending query...")

            try:
                result = await client.chat.ask(notebook_id, q["prompt"])
                answer = result.answer if result else "(no answer)"
            except Exception as e:
                answer = f"(error: {e})"
                print(f"    ERROR: {e}")

            print(f"    done ({len(answer)} chars)\n")

            # 個別ファイルに保存
            out_file = output_dir / f"notebooklm-analysis-{q['key']}.md"
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(f"# {q['title']}\n\n")
                f.write(f"**生成日時**: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                f.write("---\n\n")
                f.write(answer)
                f.write("\n")
            print(f"    保存: {out_file.relative_to(PROJECT_DIR)}")

            all_results.append({"title": q["title"], "answer": answer})

            # レート制限対策
            if i < len(QUERIES):
                await asyncio.sleep(3)

    # 統合レポート作成
    report_file = output_dir / "channel-weakness-report.md"
    with open(report_file, "w", encoding="utf-8") as f:
        f.write("# チャンネル弱点分析レポート（NotebookLM 第三者視点）\n\n")
        f.write(f"**生成日時**: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**ノートブックID**: {notebook_id}\n\n")
        f.write("---\n\n")
        for r in all_results:
            f.write(f"## {r['title']}\n\n")
            f.write(r["answer"])
            f.write("\n\n---\n\n")

    print(f"\n[DONE] analysis complete!")
    print(f"   report: {report_file.relative_to(PROJECT_DIR)}")
    print(f"   files:  output/notebooklm-analysis-{{retention|ctr|script|positioning|production|summary}}.md")


def main():
    parser = argparse.ArgumentParser(description="NotebookLM チャンネル弱点分析")
    parser.add_argument(
        "--notebook",
        required=True,
        help="NotebookLMノートブックID",
    )
    parser.add_argument(
        "--output-dir",
        default=str(PROJECT_DIR / "output"),
        help="出力ディレクトリ（デフォルト: output/）",
    )
    args = parser.parse_args()

    asyncio.run(
        run_analysis(
            notebook_id=args.notebook,
            output_dir=Path(args.output_dir),
        )
    )


if __name__ == "__main__":
    main()
