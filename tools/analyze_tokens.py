#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
トークン消費分析スクリプト
何が最もトークンを消費しているかを特定する
"""
import io
import os
import re
import sys
from pathlib import Path

# Windows での文字化けを防ぐ
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
from typing import NamedTuple

# tiktoken があれば使う、なければ文字数ベースで近似
try:
    import tiktoken
    enc = tiktoken.get_encoding("cl100k_base")
    def count_tokens(text: str) -> int:
        return len(enc.encode(text))
    TOKEN_METHOD = "tiktoken(cl100k_base)"
except ImportError:
    def count_tokens(text: str) -> int:
        # 日本語混じりテキストの近似: 文字数÷2.5
        return int(len(text) / 2.5)
    TOKEN_METHOD = "文字数÷2.5（近似）"

# ────────────────────────────────────────────────
# 設定
# ────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent  # tools/ の親 = プロジェクトルート
CLAUDE_ROOT   = Path.home() / ".claude"

# Claude Code セッションで毎回ロードされるファイル
CONTEXT_FILES = [
    CLAUDE_ROOT / "CLAUDE.md",
    PROJECT_ROOT / "CLAUDE.md",
    PROJECT_ROOT / "packages/tech-geopolitics-channel/CLAUDE.md",
    PROJECT_ROOT / "packages/ai-money-shorts/CLAUDE.md",
]

# ルールディレクトリ（再帰スキャン）
RULE_DIRS = [
    CLAUDE_ROOT / "rules",
    PROJECT_ROOT / ".claude/rules",
]

# メモリディレクトリ（現在のプロジェクトのみ）
def _project_memory_dir() -> list[Path]:
    projects_dir = CLAUDE_ROOT / "projects"
    if not projects_dir.exists():
        return []
    # Claude Code のキー形式: ":" "\" "/" "_" をすべて "-" に変換
    key = str(PROJECT_ROOT.resolve())
    key = key.replace(":", "-").replace("\\", "-").replace("/", "-").replace("_", "-")
    key = key.lstrip("-")
    exact = projects_dir / key / "memory"
    if exact.exists():
        return [exact]
    # 前方一致フォールバック: プロジェクト名のアンダースコアをハイフンに変換して検索
    proj_key = PROJECT_ROOT.name.replace("_", "-")
    for d in projects_dir.iterdir():
        if proj_key in d.name and (d / "memory").exists():
            return [d / "memory"]
    return list(projects_dir.glob("*/memory"))

MEMORY_DIRS = _project_memory_dir()

# Claude API が使うプロンプトファイル
PROMPT_FILES = [
    PROJECT_ROOT / "packages/ai-money-shorts/prompts/script-system-prompt.md",
    PROJECT_ROOT / "packages/tech-geopolitics-channel/input/SCRIPT_GENERATION_PROMPT.md",
]

# Claude API 呼び出しスクリプト（inline system prompt を抽出）
API_SCRIPTS = [
    PROJECT_ROOT / "packages/tech-geopolitics-channel/scripts/generate-script.ts",
    PROJECT_ROOT / "packages/ai-money-shorts/scripts/generate-script.ts",
    PROJECT_ROOT / "packages/ai-money-shorts/scripts/fetch-images.ts",
    PROJECT_ROOT / "packages/ai-money-shorts/scripts/create-script.ts",
]


# ────────────────────────────────────────────────
# データクラス
# ────────────────────────────────────────────────
class TokenEntry(NamedTuple):
    category: str
    label: str
    tokens: int
    note: str = ""


# ────────────────────────────────────────────────
# ヘルパー
# ────────────────────────────────────────────────
def read_file(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None


def short_path(path: Path) -> str:
    """表示用の短いパス"""
    try:
        return str(path.relative_to(Path.home()))
    except ValueError:
        return str(path)


def scan_dir(directory: Path, exts=(".md", ".txt"), exclude_dirs=("_inactive",)) -> list[Path]:
    if not directory.exists():
        return []
    return [
        p for p in directory.rglob("*")
        if p.suffix in exts
        and p.is_file()
        and not any(part in exclude_dirs for part in p.parts)
    ]


def has_paths_frontmatter(path: Path) -> bool:
    """ファイルが paths: frontmatter を持つか（条件付きロード）を判定"""
    text = read_file(path)
    if not text:
        return False
    # --- で始まる frontmatter ブロック内に paths: があるか確認
    if not text.startswith("---"):
        return False
    end = text.find("---", 3)
    if end == -1:
        return False
    frontmatter = text[3:end]
    return "paths:" in frontmatter


def extract_inline_system_prompts(ts_code: str) -> list[tuple[str, str]]:
    """
    TypeScript コードから const SYSTEM_PROMPT = `...` パターンを抽出。
    Returns list of (variable_name, content)
    """
    results = []
    # バッククォートテンプレートリテラル
    pattern = re.compile(
        r'const\s+(SYSTEM_PROMPT|systemPrompt|PROMPT\w*)\s*=\s*`(.*?)`',
        re.DOTALL
    )
    for m in pattern.finditer(ts_code):
        name, content = m.group(1), m.group(2)
        if len(content.strip()) > 100:  # 短すぎるものは除外
            results.append((name, content))
    return results


def extract_max_tokens(ts_code: str) -> list[tuple[str, int, str]]:
    """
    TypeScript コードから max_tokens と model を抽出。
    Returns list of (model, max_tokens, context_line)
    """
    results = []
    lines = ts_code.split("\n")
    for i, line in enumerate(lines):
        if "max_tokens" in line:
            m = re.search(r'max_tokens\s*:\s*(\d+)', line)
            if m:
                tokens = int(m.group(1))
                # 近くの model 定義を探す
                model = "unknown"
                for j in range(max(0, i-10), min(len(lines), i+5)):
                    mm = re.search(r"model\s*:\s*['\"]([^'\"]+)['\"]", lines[j])
                    if mm:
                        model = mm.group(1)
                        break
                ctx = line.strip()[:60]
                results.append((model, tokens, ctx))
    return results


# ────────────────────────────────────────────────
# 分析関数
# ────────────────────────────────────────────────
def analyze_context_files() -> list[TokenEntry]:
    """Claude Code セッションで自動ロードされる CLAUDE.md"""
    entries = []
    for p in CONTEXT_FILES:
        text = read_file(p)
        if text:
            entries.append(TokenEntry(
                "セッションコンテキスト",
                short_path(p),
                count_tokens(text),
                "毎セッション自動ロード"
            ))
    return entries


def analyze_rules() -> list[TokenEntry]:
    """rules ディレクトリ内の全 .md ファイル"""
    entries = []
    for d in RULE_DIRS:
        for p in scan_dir(d):
            text = read_file(p)
            if text:
                if has_paths_frontmatter(p):
                    note = "paths-filtered（対象ファイル編集時のみ）"
                else:
                    note = "毎セッション自動ロード"
                entries.append(TokenEntry(
                    "ルールファイル",
                    short_path(p),
                    count_tokens(text),
                    note
                ))
    return entries


def analyze_memory() -> list[TokenEntry]:
    """memory ディレクトリ内のファイル"""
    entries = []
    for d in MEMORY_DIRS:
        for p in scan_dir(d):
            text = read_file(p)
            if text:
                entries.append(TokenEntry(
                    "メモリファイル",
                    short_path(p),
                    count_tokens(text),
                    "セッション冒頭でロード"
                ))
    return entries


def analyze_prompt_files() -> list[TokenEntry]:
    """API 呼び出し用プロンプトファイル"""
    entries = []
    for p in PROMPT_FILES:
        text = read_file(p)
        if text:
            entries.append(TokenEntry(
                "APIプロンプトファイル",
                short_path(p),
                count_tokens(text),
                "generate-script.ts でシステムプロンプトとして送信"
            ))
    return entries


def analyze_api_scripts() -> list[TokenEntry]:
    """API スクリプトからインラインプロンプトと max_tokens を解析"""
    entries = []
    for p in API_SCRIPTS:
        text = read_file(p)
        if not text:
            continue
        label = short_path(p)

        # インライン system_prompt
        for varname, content in extract_inline_system_prompts(text):
            entries.append(TokenEntry(
                "インラインシステムプロンプト",
                f"{label} ({varname})",
                count_tokens(content),
                "API 呼び出し時に毎回送信"
            ))

        # max_tokens 設定
        for model, max_tok, ctx in extract_max_tokens(text):
            entries.append(TokenEntry(
                "max_tokens設定",
                f"{label} [{model}]",
                max_tok,
                f"上限値: {ctx}"
            ))

    return entries


# ────────────────────────────────────────────────
# 表示
# ────────────────────────────────────────────────
CATEGORY_ORDER = [
    "セッションコンテキスト",
    "ルールファイル",
    "メモリファイル",
    "APIプロンプトファイル",
    "インラインシステムプロンプト",
    "max_tokens設定",
]

CATEGORY_DESC = {
    "セッションコンテキスト": "毎セッション自動ロードされる CLAUDE.md（入力トークンに計上）",
    "ルールファイル":         "~/.claude/rules/ 以下の全ルール（入力トークンに計上）",
    "メモリファイル":         "memory/ ディレクトリのファイル（入力トークンに計上）",
    "APIプロンプトファイル":  "generate-script.ts が読み込む外部プロンプトファイル",
    "インラインシステムプロンプト": "TypeScript 内に直接書かれた system_prompt",
    "max_tokens設定":         "Claude API へのリクエストの出力上限値（消費上限）",
}


def print_report(all_entries: list[TokenEntry]):
    RESET = "\033[0m"
    BOLD  = "\033[1m"
    RED   = "\033[91m"
    YEL   = "\033[93m"
    CYN   = "\033[96m"
    GRN   = "\033[92m"

    def color_for(t):
        if t >= 5000: return RED
        if t >= 2000: return YEL
        if t >= 500:  return CYN
        return GRN

    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}  トークン消費分析レポート  (推定方法: {TOKEN_METHOD}){RESET}")
    print(f"{'='*70}{RESET}")

    by_cat: dict[str, list[TokenEntry]] = {}
    for e in all_entries:
        by_cat.setdefault(e.category, []).append(e)

    grand_total = 0
    session_total = 0       # 常時ロード（CLAUDE.md + paths-なし rules + memory）
    paths_filtered_total = 0  # paths-filtered rules（条件付き）
    api_total = 0

    for cat in CATEGORY_ORDER:
        entries = by_cat.get(cat, [])
        if not entries:
            continue
        cat_total = sum(e.tokens for e in entries)
        grand_total += cat_total
        if cat == "ルールファイル":
            for e in entries:
                if "paths-filtered" in e.note:
                    paths_filtered_total += e.tokens
                else:
                    session_total += e.tokens
        elif cat in ("セッションコンテキスト", "メモリファイル"):
            session_total += cat_total
        elif cat in ("APIプロンプトファイル", "インラインシステムプロンプト"):
            api_total += cat_total

        print(f"\n{BOLD}>> {cat}{RESET}  {CATEGORY_DESC.get(cat, '')}")
        print(f"  {'トークン':>8}  ファイル / 場所")
        print(f"  {'-'*8}  {'-'*55}")

        for e in sorted(entries, key=lambda x: x.tokens, reverse=True):
            col = color_for(e.tokens)
            tok_str = f"{e.tokens:>8,}"
            if e.note:
                # paths-filtered は薄色で表示
                if "paths-filtered" in e.note:
                    note_str = f"  \033[2m# {e.note}\033[22m"
                else:
                    note_str = f"  # {e.note}"
            else:
                note_str = ""
            print(f"  {col}{tok_str}{RESET}  {e.label}{note_str}")

        print(f"  {'─'*8}")
        print(f"  {BOLD}{cat_total:>8,}{RESET}  小計")

    # サマリー
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}  サマリー{RESET}")
    print(f"{'─'*70}")
    print(f"  セッション常時ロード合計   : {session_total:>8,} tokens  (Claude Code を開くたびに消費)")
    print(f"  paths-filtered ルール合計  : {paths_filtered_total:>8,} tokens  (対象ファイル編集時のみ消費)")
    print(f"  API システムプロンプト合計  : {api_total:>8,} tokens  (generate-script.ts 実行ごとに消費)")
    print(f"{'─'*70}")

    # コスト推定（claude-sonnet-4-6 input $3/Mtok, claude-opus-4-6 input $15/Mtok）
    sonnet_cost = session_total * 3 / 1_000_000
    opus_cost   = session_total * 15 / 1_000_000
    print(f"  常時ロードコスト推定:")
    print(f"    Sonnet ($3/Mtok) : ${sonnet_cost:.4f} / セッション")
    print(f"    Opus   ($15/Mtok): ${opus_cost:.4f} / セッション")

    api_sonnet = api_total * 3 / 1_000_000
    api_opus   = api_total * 15 / 1_000_000
    print(f"  API呼び出しのコスト推定:")
    print(f"    Sonnet ($3/Mtok) : ${api_sonnet:.4f} / 実行")
    print(f"    Opus   ($15/Mtok): ${api_opus:.4f} / 実行")
    print(f"{'='*70}\n")

    # TOP10 ランキング
    print(f"{BOLD}  全体 TOP10 トークン消費源{RESET}")
    print(f"{'─'*70}")
    all_sorted = sorted(all_entries, key=lambda x: x.tokens, reverse=True)
    for i, e in enumerate(all_sorted[:10], 1):
        col = color_for(e.tokens)
        print(f"  {i:2}. {col}{e.tokens:>8,}{RESET}  [{e.category}]  {e.label}")
    print(f"{'='*70}\n")


# ────────────────────────────────────────────────
# メイン
# ────────────────────────────────────────────────
def main():
    print("スキャン中...", end="", flush=True)
    all_entries: list[TokenEntry] = []
    all_entries += analyze_context_files()
    all_entries += analyze_rules()
    all_entries += analyze_memory()
    all_entries += analyze_prompt_files()
    all_entries += analyze_api_scripts()
    print(" 完了")

    print_report(all_entries)


if __name__ == "__main__":
    main()
