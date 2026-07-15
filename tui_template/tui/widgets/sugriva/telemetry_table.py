from __future__ import annotations
import tracemalloc
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import DataTable, Label, ProgressBar
from textual.reactive import reactive
from tui.widgets.sugriva.engine import TxRecord, get_records


class TelemetryLogPane(Vertical):
    DEFAULT_CSS = """
    TelemetryLogPane {
        height: 1fr;
    }
    TelemetryLogPane DataTable {
        height: 1fr;
    }
    """

    _tick: reactive[int] = reactive(0)

    def compose(self) -> ComposeResult:
        table: DataTable[str] = DataTable(zebra_stripes=True, cursor_type="row")
        table.id = "telemetry-table"
        yield table

    def on_mount(self) -> None:
        table = self.query_one("#telemetry-table", DataTable)
        table.add_columns(
            "Timestamp",
            "Rail",
            "Network",
            "Amount (INR)",
            "STGNN Risk",
            "Escrow",
        )
        self.set_interval(0.5, self._refresh_table)

    def _refresh_table(self) -> None:
        table = self.query_one("#telemetry-table", DataTable)
        records: list[TxRecord] = get_records()
        current_count = table.row_count
        new_records = records[current_count:]
        for rec in new_records:
            risk_str = f"{rec.risk:.4f}"
            if rec.risk >= 0.75:
                risk_cell = f"[bold red]{risk_str}[/bold red]"
                escrow_cell = f"[bold red]{rec.escrow}[/bold red]"
            elif rec.risk >= 0.5:
                risk_cell = f"[yellow]{risk_str}[/yellow]"
                escrow_cell = f"[yellow]{rec.escrow}[/yellow]"
            else:
                risk_cell = f"[green]{risk_str}[/green]"
                escrow_cell = f"[dim green]{rec.escrow}[/dim green]"
            table.add_row(
                rec.timestamp,
                rec.rail,
                rec.network,
                f"{rec.amount:,.2f}",
                risk_cell,
                escrow_cell,
            )
        if new_records:
            table.move_cursor(row=table.row_count - 1)
