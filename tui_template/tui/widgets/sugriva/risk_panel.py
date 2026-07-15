from __future__ import annotations
import tracemalloc
import time
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import Label, ProgressBar
from tui.widgets.sugriva.engine import TxRecord, get_records


class SugivaRiskPanel(Vertical):
    DEFAULT_CSS = """
    SugivaRiskPanel {
        height: 1fr;
        padding: 1 2;
        border: solid $warning;
    }
    SugivaRiskPanel #risk-header {
        text-style: bold;
        color: $warning;
        height: 1;
        margin-bottom: 1;
    }
    SugivaRiskPanel #risk-value {
        height: 1;
        margin-bottom: 1;
        text-style: bold;
    }
    SugivaRiskPanel .shap-label {
        height: 1;
        margin-top: 1;
        color: $text-muted;
    }
    SugivaRiskPanel ProgressBar {
        height: 1;
        margin-bottom: 1;
    }
    SugivaRiskPanel #sandbox-header {
        text-style: bold;
        margin-top: 2;
        margin-bottom: 1;
        color: $success;
    }
    SugivaRiskPanel .sandbox-row {
        height: 1;
        color: $text;
    }
    """

    _t0: float = 0.0

    def compose(self) -> ComposeResult:
        yield Label("DYNAMIC RISK RATIO", id="risk-header")
        yield Label("risk: 0.0000", id="risk-value")

        yield Label("IP Anomaly Weight", classes="shap-label")
        yield ProgressBar(total=1.0, show_eta=False, id="bar-ip")

        yield Label("Auth Status Discrepancy", classes="shap-label")
        yield ProgressBar(total=1.0, show_eta=False, id="bar-auth")

        yield Label("Velocity Scale Impact", classes="shap-label")
        yield ProgressBar(total=1.0, show_eta=False, id="bar-vel")

        yield Label("Post-Quantum Agility Risk", classes="shap-label")
        yield ProgressBar(total=1.0, show_eta=False, id="bar-pq")

        yield Label("Sandbox Runtime", id="sandbox-header")
        yield Label("Memory Delta: -- B", id="sb-mem", classes="sandbox-row")
        yield Label("CPU Latency: -- ms", id="sb-cpu", classes="sandbox-row")
        yield Label("Ledger Rows: 2,000,000", id="sb-rows", classes="sandbox-row")
        yield Label("Cluster: ONLINE", id="sb-cluster", classes="sandbox-row")

    def on_mount(self) -> None:
        tracemalloc.start()
        self._t0 = time.perf_counter()
        self.set_interval(0.5, self._refresh)

    def _refresh(self) -> None:
        records: list[TxRecord] = get_records()
        if not records:
            return
        rec = records[-1]

        risk_lbl = self.query_one("#risk-value", Label)
        if rec.risk >= 0.75:
            risk_lbl.update(f"[bold red]risk: {rec.risk:.4f}[/bold red]")
        elif rec.risk >= 0.5:
            risk_lbl.update(f"[bold yellow]risk: {rec.risk:.4f}[/bold yellow]")
        else:
            risk_lbl.update(f"[bold green]risk: {rec.risk:.4f}[/bold green]")

        shap = rec.shap
        for bar_id, key in [
            ("bar-ip", "ip_anomaly"),
            ("bar-auth", "auth_discrepancy"),
            ("bar-vel", "velocity_impact"),
            ("bar-pq", "pq_agility"),
        ]:
            bar = self.query_one(f"#{bar_id}", ProgressBar)
            val = shap.get(key, 0.0)
            bar.update(progress=val)

        snapshot = tracemalloc.take_snapshot()
        stats = snapshot.statistics("lineno")
        mem_delta = sum(s.size for s in stats[:10]) if stats else 0

        t1 = time.perf_counter()
        cpu_ms = (t1 - self._t0) * 1000.0
        self._t0 = t1

        self.query_one("#sb-mem", Label).update(f"Memory Delta: {mem_delta:+,} B")
        self.query_one("#sb-cpu", Label).update(f"CPU Latency: {cpu_ms:.2f} ms")
