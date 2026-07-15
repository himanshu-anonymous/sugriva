from __future__ import annotations
import hashlib
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import RichLog
from tui.widgets.sugriva.engine import TxRecord, get_records


class SecurityMeshPane(Vertical):
    DEFAULT_CSS = """
    SecurityMeshPane {
        height: 1fr;
    }
    SecurityMeshPane RichLog {
        height: 1fr;
        background: $surface-darken-1;
    }
    """

    _last_count: int = 0

    def compose(self) -> ComposeResult:
        log = RichLog(markup=True, highlight=False, wrap=False, id="mesh-log")
        log.border_title = "Security Mesh"
        yield log

    def on_mount(self) -> None:
        self.set_interval(0.6, self._refresh_mesh)

    def _bridge_id(self, vpa: str) -> str:
        digest = hashlib.sha256(vpa.encode()).hexdigest()[:8].upper()
        return f"BRIDGE-{digest}"

    def _refresh_mesh(self) -> None:
        records: list[TxRecord] = get_records()
        log = self.query_one("#mesh-log", RichLog)
        new_records = records[self._last_count:]
        self._last_count = len(records)
        for rec in new_records:
            bridge = self._bridge_id(rec.vpa)
            if rec.risk >= 0.75:
                color = "red"
            elif rec.risk >= 0.5:
                color = "yellow"
            else:
                color = "dim green"
            sender_token = hashlib.sha256(rec.vpa.encode()).hexdigest()[:12].upper()
            line = (
                f"[{color}]"
                f"({rec.vpa}) "
                f"-> [{bridge}] "
                f"-> ({rec.ip}) "
                f"| {rec.rail}/{rec.network} "
                f"| risk={rec.risk:.4f}"
                f"[/{color}]"
            )
            log.write(line)
