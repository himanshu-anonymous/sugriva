from __future__ import annotations
from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import DataTable, RichLog, Label
from tui.widgets.sugriva.engine import get_audit_logs, get_cert_incidents


class AuditPane(Horizontal):
    DEFAULT_CSS = """
    AuditPane {
        height: 1fr;
        layout: horizontal;
    }
    AuditPane #audit-left-col {
        width: 1fr;
        height: 1fr;
        border-right: solid $border;
    }
    AuditPane #audit-right-col {
        width: 1fr;
        height: 1fr;
    }
    AuditPane RichLog {
        height: 1fr;
        background: $surface-darken-1;
    }
    AuditPane DataTable {
        height: 1fr;
    }
    AuditPane #incident-title {
        height: 1;
        background: $surface;
        color: $accent;
        text-style: bold;
        padding-left: 1;
    }
    """

    _last_audit_count: int = 0

    def compose(self) -> ComposeResult:
        with Vertical(id="audit-left-col"):
            log = RichLog(markup=True, highlight=False, wrap=False, id="audit-log")
            log.border_title = "IMMUTABLE AUDIT LOG (NON-REPUDIATION)"
            yield log
        with Vertical(id="audit-right-col"):
            yield Label("CERT-In 6-HOUR INCIDENT SLA TRACKER", id="incident-title")
            table: DataTable[str] = DataTable(zebra_stripes=True, cursor_type="row")
            table.id = "cert-table"
            yield table

    def on_mount(self) -> None:
        table = self.query_one("#cert-table", DataTable)
        table.add_columns("Incident ID", "Source / VPA", "Severity", "Time Remaining")
        self.set_interval(0.5, self._refresh)

    def _refresh(self) -> None:
        # Refresh Audit Log
        logs = get_audit_logs()
        log_widget = self.query_one("#audit-log", RichLog)
        new_logs = logs[self._last_audit_count:]
        self._last_audit_count = len(logs)
        for entry in new_logs:
            # Highlight warning/failures in red
            if "BLOCKED" in entry or "RATE" in entry or "unauthorized" in entry.lower():
                log_widget.write(f"[bold red]{entry}[/bold red]")
            else:
                log_widget.write(entry)

        # Refresh CERT-In Table
        table = self.query_one("#cert-table", DataTable)
        table.clear()
        incidents = get_cert_incidents()
        for inc in incidents:
            rem_str = inc.time_remaining_str
            if "EXPIRED" in rem_str:
                rem_cell = f"[bold red]{rem_str}[/bold red]"
            else:
                rem_cell = f"[bold yellow]{rem_str}[/bold yellow]"
            
            table.add_row(
                inc.id,
                f"{inc.source} ({inc.vpa[:12]})",
                f"[bold red]{inc.severity}[/bold red]",
                rem_cell,
            )
