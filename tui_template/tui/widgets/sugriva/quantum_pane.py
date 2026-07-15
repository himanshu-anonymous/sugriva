from __future__ import annotations
import random
import time
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import RichLog


class QuantumGuardPane(Vertical):
    DEFAULT_CSS = """
    QuantumGuardPane {
        height: 1fr;
    }
    QuantumGuardPane RichLog {
        height: 1fr;
        background: $surface-darken-1;
    }
    """

    def compose(self) -> ComposeResult:
        log = RichLog(markup=True, highlight=False, wrap=False, id="quantum-log")
        log.border_title = "Quantum Guard Security Logs"
        yield log

    def on_mount(self) -> None:
        self._log = self.query_one("#quantum-log", RichLog)
        self.set_interval(0.5, self._tick_quantum)

    def _tick_quantum(self) -> None:
        from tui.widgets.sugriva.engine import get_quantum_metrics
        qkd, entropy, pqc = get_quantum_metrics()
        ts = time.strftime("%H:%M:%S")
        
        # Render active warnings if anomalies are injected
        if qkd < 95.0:
            self._log.write(f"[{ts}] [bold red]QKD BREACH DETECTED[/bold red] Entangled fiber state collapsed: [bold]{qkd:.2f}% coherence[/bold] (Observer intervention).")
        if entropy < 50.0:
            self._log.write(f"[{ts}] [bold red]TRNG ENTROPY EXHAUSTION[/bold red] Available quantum pool depleted: [bold]{entropy:.2f}%[/bold].")
        if pqc > 0:
            self._log.write(f"[{ts}] [bold red]KYBER DECIPHER ERROR[/bold red] [bold]{pqc}[/bold] active encapsulation mismatches detected on tunnel handshake.")
            
        # Standard logging ticks
        event_type = random.choice(["KYBER_KEM", "DILITHIUM_SIG", "QKD_SYNC", "ENTROPY_POLL"])
        if event_type == "KYBER_KEM":
            self._log.write(f"[{ts}] [bold cyan]KYBER-1024[/bold cyan] Key encapsulation complete. Shared secret generated successfully.")
        elif event_type == "DILITHIUM_SIG":
            latency = random.uniform(0.12, 0.45)
            self._log.write(f"[{ts}] [bold green]DILITHIUM-5[/bold green] Decoupled signature verified in {latency:.2f} ms.")
        elif event_type == "QKD_SYNC" and qkd >= 95.0:
            self._log.write(f"[{ts}] [bold yellow]QKD CHANNEL[/bold yellow] Entangled fiber state: [bold]{qkd:.2f}% coherence[/bold].")
        elif event_type == "ENTROPY_POLL" and entropy >= 50.0:
            self._log.write(f"[{ts}] [bold magenta]TRNG POOL[/bold magenta] Quantum Entropy: {int(entropy * 81.92)} bits cached [green]OK[/green]")
