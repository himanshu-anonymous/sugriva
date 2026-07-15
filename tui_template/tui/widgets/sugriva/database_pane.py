from __future__ import annotations
import hashlib
from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import DataTable, Input, Label
from textual import on


MOCK_ACCOUNTS = [
    {"id": "ACC-1001", "vpa": "user_1001@bank", "balance": 45000.50, "status": "SECURE"},
    {"id": "ACC-1002", "vpa": "user_1002@bank", "balance": 128900.00, "status": "SECURE"},
    {"id": "ACC-1003", "vpa": "admin_sec_vault@corp", "balance": 15000000.00, "status": "ELEVATED"},
    {"id": "ACC-1004", "vpa": "gsec_vault@corp", "balance": 50000000.00, "status": "CRITICAL"},
    {"id": "ACC-1005", "vpa": "user_1234@bank", "balance": 3500.00, "status": "SECURE"},
    {"id": "ACC-1006", "vpa": "user_9999@bank", "balance": 9800.75, "status": "SECURE"},
    {"id": "ACC-1007", "vpa": "liquidity_pool@bank", "balance": 2400000.00, "status": "SECURE"},
    {"id": "ACC-1008", "vpa": "settlement_escrow@bank", "balance": 875000.00, "status": "SECURE"},
    {"id": "ACC-1009", "vpa": "user_7777@bank", "balance": 1200.00, "status": "SECURE"},
    {"id": "ACC-1010", "vpa": "user_8888@bank", "balance": 54000.25, "status": "SECURE"},
]


class DatabasePane(Vertical):
    DEFAULT_CSS = """
    DatabasePane {
        height: 1fr;
        background: $surface-darken-1;
    }
    DatabasePane #db-search-bar {
        height: 3;
        layout: horizontal;
        padding: 0 1;
        background: $surface;
        border-bottom: solid $border;
    }
    DatabasePane #db-search-label {
        width: auto;
        padding-right: 2;
        color: $accent;
        text-style: bold;
        height: 3;
        content-align: center middle;
    }
    DatabasePane #db-search-input {
        width: 1fr;
        height: 3;
        border: none;
        background: transparent;
    }
    DatabasePane DataTable {
        height: 1fr;
    }
    """

    def compose(self) -> ComposeResult:
        with Horizontal(id="db-search-bar"):
            yield Label("FIND ACCOUNT:", id="db-search-label")
            yield Input(placeholder="Search by VPA or Account ID...", id="db-search-input")
        table: DataTable[str] = DataTable(zebra_stripes=True, cursor_type="row")
        table.id = "db-table"
        yield table

    def on_mount(self) -> None:
        table = self.query_one("#db-table", DataTable)
        table.add_columns("Account ID", "VPA", "Balance (INR)", "Status", "Salted HMAC Hash")
        self._populate_table("")

    def _populate_table(self, query: str) -> None:
        table = self.query_one("#db-table", DataTable)
        table.clear()
        query = query.lower().strip()
        salt = "sugriva_salting_matrix_2026"

        for acc in MOCK_ACCOUNTS:
            if query and query not in acc["id"].lower() and query not in acc["vpa"].lower():
                continue

            h = hashlib.sha256(f"{acc['id']}:{salt}".encode()).hexdigest()[:24].upper()
            status = acc["status"]
            if status == "CRITICAL":
                status_str = f"[bold red]{status}[/bold red]"
            elif status == "ELEVATED":
                status_str = f"[bold yellow]{status}[/bold yellow]"
            else:
                status_str = f"[green]{status}[/green]"

            table.add_row(
                acc["id"],
                acc["vpa"],
                f"{acc['balance']:,.2f}",
                status_str,
                f"0x{h}",
            )

    @on(Input.Changed, selector="#db-search-input")
    def handle_search_change(self, event: Input.Changed) -> None:
        self._populate_table(event.value)
