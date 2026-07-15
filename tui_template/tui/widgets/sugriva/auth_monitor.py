from __future__ import annotations
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import Label
from textual.reactive import reactive
from tui.widgets.sugriva.engine import TxRecord, get_records


def _classify(risk: float) -> tuple[str, str]:
    if risk >= 0.75:
        return "DIGILOCKER_KYC_REQUIRED", "bold red"
    if risk >= 0.50:
        return "SMS_OTP_PENDING", "bold yellow"
    return "INLINE_PASS", "bold green"


class AuthMonitorPane(Vertical):
    DEFAULT_CSS = """
    AuthMonitorPane {
        height: 1fr;
        padding: 1 2;
    }
    AuthMonitorPane Label {
        height: auto;
        margin-bottom: 1;
    }
    """

    def compose(self) -> ComposeResult:
        yield Label("Authentication Step-Up Monitor", id="auth-header")
        yield Label("", id="auth-status-1")
        yield Label("", id="auth-status-2")
        yield Label("", id="auth-status-3")
        yield Label("", id="auth-status-4")
        yield Label("", id="auth-status-5")

    def on_mount(self) -> None:
        self.set_interval(0.5, self._refresh)

    def _refresh(self) -> None:
        records: list[TxRecord] = get_records()
        recent = records[-5:] if len(records) >= 5 else records
        ids = ["auth-status-1", "auth-status-2", "auth-status-3", "auth-status-4", "auth-status-5"]
        for i, label_id in enumerate(ids):
            lbl = self.query_one(f"#{label_id}", Label)
            if i < len(recent):
                rec = recent[i]
                status, color = _classify(rec.risk)
                lbl.update(
                    f"[dim]{rec.timestamp}[/dim]  "
                    f"[bold]{rec.vpa[:20]}[/bold]  "
                    f"[{color}]{status}[/{color}]  "
                    f"[dim]risk={rec.risk:.4f}[/dim]"
                )
            else:
                lbl.update("")
