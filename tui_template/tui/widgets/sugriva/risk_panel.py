from __future__ import annotations
import tracemalloc
import time
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import Label, ProgressBar
from tui.widgets.sugriva.engine import TxRecord, get_records, get_telemetry_stats


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
    SugivaRiskPanel .graph-header {
        text-style: bold;
        margin-top: 2;
        margin-bottom: 1;
    }
    SugivaRiskPanel #auth-graph-header {
        color: $success;
    }
    SugivaRiskPanel #threat-graph-header {
        color: $error;
    }
    SugivaRiskPanel .graph-row {
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

        # Dynamic Auth Unicode Status Graph
        yield Label("AUTH ROUTING TELEMETRY", id="auth-graph-header", classes="graph-header")
        yield Label("Pass:    [░░░░░░░░░░░░░░░] (0)", id="graph-pass", classes="graph-row")
        yield Label("Step-up: [░░░░░░░░░░░░░░░] (0)", id="graph-step", classes="graph-row")

        # Dynamic Threat & Detections Unicode Status Graph
        yield Label("THREAT & QUANTUM DETECTIONS", id="threat-graph-header", classes="graph-header")
        yield Label("Blocks:  [░░░░░░░░░░░░░░░] (0)", id="graph-blocks", classes="graph-row")
        yield Label("Quantum: [░░░░░░░░░░░░░░░] (0)", id="graph-quantum", classes="graph-row")

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
            ("bar-pq", "pqc_decryption_anomalies"),
        ]:
            try:
                bar = self.query_one(f"#{bar_id}", ProgressBar)
                val = shap.get(key, 0.0)
                bar.update(progress=val)
            except Exception:
                pass

        # Query stats from SQLite for Unicode graphs
        stats = get_telemetry_stats()
        clear_cnt = stats["clear"]
        pending_cnt = stats["pending"]
        threat_cnt = stats["threats"]
        quantum_cnt = stats["quantum"]
        
        total = max(1, clear_cnt + pending_cnt + threat_cnt)
        
        # Scale to max 15 blocks
        w_pass = min(15, int(clear_cnt / total * 15)) if clear_cnt > 0 else 0
        w_step = min(15, int(pending_cnt / total * 15)) if pending_cnt > 0 else 0
        w_blocks = min(15, int(threat_cnt / total * 15)) if threat_cnt > 0 else 0
        w_quantum = min(15, quantum_cnt) # raw count scaling for quantum hits
        
        # Update Unicode Graph elements with correct Rich formatting
        self.query_one("#graph-pass", Label).update(
            f"Pass:    [ [green]{'█' * w_pass}{'░' * (15 - w_pass)}[/green] ] ({clear_cnt})"
        )
        self.query_one("#graph-step", Label).update(
            f"Step-up: [ [yellow]{'█' * w_step}{'░' * (15 - w_step)}[/yellow] ] ({pending_cnt})"
        )
        self.query_one("#graph-blocks", Label).update(
            f"Blocks:  [ [red]{'█' * w_blocks}{'░' * (15 - w_blocks)}[/red] ] ({threat_cnt})"
        )
        self.query_one("#graph-quantum", Label).update(
            f"Quantum: [ [cyan]{'█' * w_quantum}{'░' * (15 - w_quantum)}[/cyan] ] ({quantum_cnt})"
        )
