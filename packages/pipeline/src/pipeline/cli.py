"""
CLIエントリーポイント
使用例:
  pipeline generate-script --topic "AIは人間の仕事を奪うか"
  pipeline generate-script --auto
  pipeline run --topic "量子コンピューターの未来"
"""
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from pipeline.orchestrator import Pipeline
from pipeline.config import Config

console = Console()


@click.group()
def main():
    """AI Debate Video Pipeline CLI"""
    pass


@main.command("generate-script")
@click.option("--topic", "-t", default=None, help="Debate topic")
@click.option("--description", "-d", default="", help="Topic description")
@click.option("--auto", "auto_topic", is_flag=True, help="Auto-extract trending topic")
def generate_script(topic: str | None, description: str, auto_topic: bool):
    """Generate a debate script (Phase 1)."""
    if not topic and not auto_topic:
        console.print("[red]Error: provide --topic or --auto[/red]")
        raise SystemExit(1)

    config = Config()
    missing = config.validate()
    if missing:
        console.print(f"[yellow]Warning: Missing config keys: {', '.join(missing)}[/yellow]")

    pipeline = Pipeline(config=config)

    with console.status("[bold green]Generating script...[/bold green]"):
        try:
            result = pipeline.run_script_pipeline(
                topic=topic,
                description=description,
                auto_topic=auto_topic,
            )
        except Exception as e:
            console.print(f"[red]Pipeline failed: {e}[/red]")
            raise SystemExit(1)

    # Display results
    table = Table(title="Script Generation Result")
    table.add_column("Field", style="cyan")
    table.add_column("Value", style="white")
    table.add_row("Topic", result["topic"])
    table.add_row("Script Path", result["script_path"])
    table.add_row("Review Passed", "✅" if result["review_passed"] else "❌")
    table.add_row("Review Loops", str(result["review_loops"]))
    table.add_row("Issues Found", str(result["issue_count"]))
    console.print(table)
    console.print(Panel(f"[green]Script saved to:[/green] {result['script_path']}"))


@main.command("run")
@click.option("--topic", "-t", default=None)
@click.option("--auto", "auto_topic", is_flag=True)
def run_full(topic: str | None, auto_topic: bool):
    """Run full pipeline (Phase 1 only for now; audio/video coming in later phases)."""
    console.print("[yellow]Full pipeline: currently runs Phase 1 (script generation) only.[/yellow]")
    ctx = click.get_current_context()
    ctx.invoke(generate_script, topic=topic, description="", auto_topic=auto_topic)


if __name__ == "__main__":
    main()
