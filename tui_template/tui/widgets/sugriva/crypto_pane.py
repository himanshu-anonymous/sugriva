from __future__ import annotations
import hmac
import hashlib
import time
import random
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import RichLog


class CryptoEnginePane(Vertical):
    DEFAULT_CSS = """
    CryptoEnginePane {
        height: 1fr;
    }
    CryptoEnginePane RichLog {
        height: 1fr;
        background: $surface-darken-1;
    }
    """

    def compose(self) -> ComposeResult:
        log = RichLog(markup=True, highlight=False, wrap=False, id="crypto-log")
        log.border_title = "Cryptographical Engine Logs"
        yield log

    def on_mount(self) -> None:
        self._log = self.query_one("#crypto-log", RichLog)
        self.set_interval(0.4, self._tick_crypto)

    def _tick_crypto(self) -> None:
        # Generate some mock dynamic encryption/salting ticks
        vpas = ["user_1001@bank", "user_1234@bank", "gsec_vault@corp", "liquidity_pool@bank"]
        vpa = random.choice(vpas)
        salt = f"salt_{int(time.time() * 10) % 1000}"
        
        # Calculate HMAC SHA-256
        h = hmac.new(salt.encode(), vpa.encode(), hashlib.sha256).hexdigest()
        
        event_type = random.choice(["SALT_ROTATE", "HMAC_GEN", "AES_ENCRYPT", "KEY_ROTATION"])
        ts = time.strftime("%H:%M:%S")
        
        if event_type == "SALT_ROTATE":
            self._log.write(f"[{ts}] [bold yellow]SYSTEM[/bold yellow] Rotating active salt: {salt}")
        elif event_type == "HMAC_GEN":
            self._log.write(f"[{ts}] [bold green]HMAC-SHA256[/bold green] vpa={vpa} -> [cyan]0x{h[:24]}[/cyan]")
        elif event_type == "AES_ENCRYPT":
            cipher = hashlib.md5(f"{vpa}:{salt}".encode()).hexdigest()
            self._log.write(f"[{ts}] [bold blue]AES-256-GCM[/bold blue] Encrypted payload: [magenta]aes_gcm({cipher[:12]})[/magenta]")
        elif event_type == "KEY_ROTATION":
            self._log.write(f"[{ts}] [bold red]VAULT[/bold red] Key Rotation Sync: KeyID={random.randint(100, 999)} - [green]SUCCESS[/green]")
