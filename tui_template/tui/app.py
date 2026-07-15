from __future__ import annotations

import threading
from pathlib import Path
from typing import Any, Literal, Sequence, cast

from rich.text import Text
from textual.content import Content

from textual import on, log, work
from textual.command import (
    CommandListItem,
    CommandPalette,
    SimpleCommand,
    SimpleProvider,
)
from textual import messages
from textual.css.query import NoMatches
from textual.events import Click
from textual.reactive import Reactive, reactive
from textual.app import App, ComposeResult, InvalidThemeError
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.screen import Screen
from textual.coordinate import Coordinate
from textual.markup import escape
from textual.signal import Signal
from textual.theme import Theme, BUILTIN_THEMES as TEXTUAL_THEMES
from textual.widget import AwaitMount, Widget
from textual.widgets import Button, Footer, Input, Label, TabPane
from textual.widgets import TabbedContent

from tui.commands import PostingProvider
from tui.config import Settings
from tui.jump_overlay import JumpOverlay
from tui.jumper import Jumper
from tui.themes import (
    BUILTIN_THEMES,
    load_user_theme,
    load_user_themes,
)
from tui.types import CertTypes, PostingLayout
from tui.version import VERSION
from tui.backend_interface import BaseTUIBackend

from tui.widgets.sugriva.engine import (
    start_simulator,
    stop_simulator,
    inject_credential_stuffing,
    inject_asset_liquidation,
    inject_velocity_flood,
)
from tui.widgets.sugriva.telemetry_tree import SugrivaTelemetryTree
from tui.widgets.sugriva.context_bar import ContextBar
from tui.widgets.sugriva.telemetry_table import TelemetryLogPane
from tui.widgets.sugriva.security_mesh import SecurityMeshPane
from tui.widgets.sugriva.auth_monitor import AuthMonitorPane
from tui.widgets.sugriva.risk_panel import SugivaRiskPanel
from tui.widgets.sugriva.database_pane import DatabasePane
from tui.widgets.sugriva.crypto_pane import CryptoEnginePane
from tui.widgets.sugriva.quantum_pane import QuantumGuardPane
from tui.widgets.sugriva.audit_pane import AuditPane


class AppHeader(Horizontal):
    def compose(self) -> ComposeResult:
        settings = self.app.settings.heading
        if settings.show_version:
            yield Label(f"[b]Sugriva[/] [dim]{VERSION}[/]  [dim]// Real-Time Fraud Correlation Core[/]", id="app-title")
        else:
            yield Label("[b]Sugriva[/]  [dim]// Real-Time Fraud Correlation Core[/]", id="app-title")
        if settings.show_host:
            hostname = settings.hostname or "localhost"
            yield Label(hostname, id="app-user-host")
        self.set_class(not settings.visible, "hidden")


class AppBody(Vertical):
    pass


class SugivaWorkspace(Vertical):
    DEFAULT_CSS = """
    SugivaWorkspace {
        height: 1fr;
        layout: horizontal;
    }
    SugivaWorkspace #left-panel {
        width: 2fr;
        height: 1fr;
    }
    SugivaWorkspace #right-panel {
        width: 1fr;
        height: 1fr;
        border-left: solid $primary-darken-2;
    }
    """

    def compose(self) -> ComposeResult:
        with Vertical(id="left-panel"):
            with TabbedContent():
                with TabPane("Telemetry Log", id="telemetry-pane"):
                    yield TelemetryLogPane()
                with TabPane("Security Mesh", id="mesh-pane"):
                    yield SecurityMeshPane()
                with TabPane("Authentication", id="auth-pane"):
                    yield AuthMonitorPane()
                with TabPane("Database", id="db-pane"):
                    yield DatabasePane()
                with TabPane("Crypto Engine", id="crypto-pane"):
                    yield CryptoEnginePane()
                with TabPane("Quantum Guard", id="quantum-pane"):
                    yield QuantumGuardPane()
                with TabPane("Incident & Audit", id="audit-pane"):
                    yield AuditPane()
        with Vertical(id="right-panel"):
            yield SugivaRiskPanel()


class MainScreen(Screen[None]):
    AUTO_FOCUS = None
    BINDING_GROUP_TITLE = "Sugriva Dashboard"
    BINDINGS = [
        Binding(
            "ctrl+o",
            "toggle_jump_mode",
            description="Jump",
            tooltip="Activate jump mode to quickly move focus between widgets.",
            id="jump",
        ),
        Binding(
            "ctrl+1",
            "inject_stuffing",
            "Stuffing",
            tooltip="Inject credential stuffing attack simulation.",
            id="attack-1",
        ),
        Binding(
            "ctrl+2",
            "inject_liquidation",
            "Liquidation",
            tooltip="Inject asset liquidation anomaly event.",
            id="attack-2",
        ),
        Binding(
            "ctrl+3",
            "inject_flood",
            "TX Flood",
            tooltip="Trigger transaction velocity flood within 200ms.",
            id="attack-3",
        ),
        Binding(
            "ctrl+4",
            "inject_quantum",
            "Quantum Attack",
            tooltip="Trigger Post-Quantum signature spoofing & coherence collapse.",
            id="attack-4",
        ),
        Binding(
            "ctrl+right",
            "next_tab",
            "Next Tab",
            tooltip="Switch to the next tab pane.",
            id="next-tab",
        ),
        Binding(
            "ctrl+left",
            "prev_tab",
            "Prev Tab",
            tooltip="Switch to the previous tab pane.",
            id="prev-tab",
        ),
        Binding(
            "ctrl+h",
            "toggle_rail_browser",
            "Toggle Rails",
            show=False,
            tooltip="Toggle the payment rail browser.",
            id="toggle-rails",
        ),
        Binding(
            "ctrl+p,ctrl+shift+p",
            "open_command_palette",
            "Commands",
            show=True,
            id="open-palette",
        ),
    ]

    _jumping: Reactive[bool] = reactive(False, init=False, bindings=True)

    def __init__(self, layout: PostingLayout) -> None:
        super().__init__()
        self._initial_layout: PostingLayout = layout
        self.jumper: Jumper | None = None

    def _init_jumper(self) -> None:
        self.jumper = Jumper(
            {
                "sugriva-telemetry-tree": "tab",
                "query-input": "2",
                "telemetry-pane": "a",
                "mesh-pane": "s",
                "auth-pane": "d",
            },
            screen=self,
        )

    def on_mount(self) -> None:
        is_header_visible = self.app.settings.heading.visible
        self.app.set_class(not is_header_visible, "-header-hidden")
        self._init_jumper()
        start_simulator()

    def on_unmount(self) -> None:
        stop_simulator()

    def on_screen_resume(self) -> None:
        self._init_jumper()

    def compose(self) -> ComposeResult:
        yield AppHeader()
        yield ContextBar()
        with AppBody():
            rail_browser = SugrivaTelemetryTree("Rails", id="sugriva-telemetry-tree")
            try:
                rail_browser.display = self.app.settings.collection_browser.show_on_startup
            except Exception:
                rail_browser.display = True
            yield rail_browser
            yield SugivaWorkspace()
        footer = Footer(show_command_palette=False)
        footer.compact = self.app.spacing == "compact"
        yield footer

    @on(Input.Submitted, selector="#query-input")
    def handle_query_submitted(self, event: Input.Submitted) -> None:
        cmd = event.value.strip()
        event.input.clear()
        if cmd:
            self.run_command_async(cmd)

    @work(thread=True)
    def run_command_async(self, cmd: str) -> None:
        from tui.widgets.sugriva.engine import get_role, set_role, set_threshold, write_audit, verify_admin_password
        
        if cmd.startswith("login "):
            parts = cmd.split(" ")
            if len(parts) >= 3 and parts[1].lower() == "admin":
                password = parts[2]
                if verify_admin_password(password):
                    set_role("ADMIN")
                    self.notify("Authentication tier: ADMIN", title="Access Granted")
                else:
                    write_audit("Failed login attempt as ADMIN (incorrect password)", status="DENIED")
                    self.notify("Invalid Password: Access Denied", title="Security Warning", severity="error")
            elif len(parts) >= 2 and parts[1].lower() == "analyst":
                set_role("ANALYST")
                self.notify("Authentication tier: ANALYST", title="Access Granted")
            else:
                self.notify("Usage: 'login admin <password>' or 'login analyst'", title="Error", severity="error")
        elif cmd.startswith("fetch "):
            vpa = cmd.split(" ", 1)[1].strip()
            self.notify(f"Fetching topology for {vpa}", title="Mesh Query")
            write_audit(f"Queried topology for: {vpa}")
        elif cmd == "breaker trip":
            if get_role() != "ADMIN":
                write_audit("Unauthorized attempt to trip breaker", status="DENIED")
                self.notify("Access Denied: ADMIN role required.", title="Security Warning", severity="error")
            else:
                write_audit("Manual breaker trip triggered")
                self.notify("Circuit breaker forced OPEN", title="Breaker Status", severity="warning")
        elif cmd == "breaker reset":
            if get_role() != "ADMIN":
                write_audit("Unauthorized attempt to reset breaker", status="DENIED")
                self.notify("Access Denied: ADMIN role required.", title="Security Warning", severity="error")
            else:
                write_audit("Manual breaker reset triggered")
                self.notify("Circuit breaker reset to CLOSED", title="Breaker Status", severity="information")
        elif cmd.startswith("set threshold "):
            if get_role() != "ADMIN":
                write_audit("Unauthorized attempt to change threshold", status="DENIED")
                self.notify("Access Denied: ADMIN role required.", title="Security Warning", severity="error")
            else:
                try:
                    val = float(cmd.split(" ")[2])
                    set_threshold(val)
                    self.notify(f"Threshold set to {val}", title="Config Updated")
                except Exception:
                    self.notify("Invalid threshold value", title="Error", severity="error")
        elif cmd.startswith("unfreeze "):
            if get_role() != "ADMIN":
                write_audit("Unauthorized attempt to unfreeze VPA", status="DENIED")
                self.notify("Access Denied: ADMIN role required.", title="Security Warning", severity="error")
            else:
                from tui.widgets.sugriva.engine import unfreeze_vpa
                vpa = cmd.split(" ", 1)[1].strip()
                if unfreeze_vpa(vpa):
                    self.notify(f"VPA {vpa} successfully unfrozen", title="Security Override")
                else:
                    self.notify(f"VPA {vpa} is not currently frozen", title="Security Override", severity="warning")
        elif cmd == "help":
            help_msg = (
                "Sugriva Analyst Console Commands:\n"
                "  login admin <password> - Switch to ADMIN (pwd: adminpassword)\n"
                "  login analyst          - Switch to ANALYST (view-only)\n"
                "  fetch <vpa>            - Search accounts and fetch graph nodes\n"
                "  unfreeze <vpa>         - Release quarantine locks on frozen VPA (ADMIN)\n"
                "  breaker [trip/reset]   - Toggle security circuit breaker (ADMIN)\n"
                "  set threshold <float>  - Update risk isolation boundary (ADMIN)\n"
                "  help                   - Display this guide menu"
            )
            self.notify(help_msg, title="Analyst Help Guide", severity="information")
            write_audit("Requested help instructions")
        else:
            self.notify(f"Unknown command: {cmd}", title="Error", severity="error")

    def action_inject_stuffing(self) -> None:
        from tui.widgets.sugriva.engine import get_role, write_audit
        if get_role() != "ADMIN":
            write_audit("Unauthorized attack simulation trigger (stuffing)", status="DENIED")
            self.notify("Access Denied: ADMIN role required.", title="Security Warning", severity="error")
            return
        threading.Thread(target=inject_credential_stuffing, daemon=True).start()
        self.notify("Credential stuffing simulation injected", title="Attack Sim [1]", severity="warning")

    def action_inject_liquidation(self) -> None:
        from tui.widgets.sugriva.engine import get_role, write_audit
        if get_role() != "ADMIN":
            write_audit("Unauthorized attack simulation trigger (liquidation)", status="DENIED")
            self.notify("Access Denied: ADMIN role required.", title="Security Warning", severity="error")
            return
        threading.Thread(target=inject_asset_liquidation, daemon=True).start()
        self.notify("Asset liquidation event injected", title="Attack Sim [2]", severity="error")

    def action_inject_flood(self) -> None:
        from tui.widgets.sugriva.engine import get_role, write_audit
        if get_role() != "ADMIN":
            write_audit("Unauthorized attack simulation trigger (flood)", status="DENIED")
            self.notify("Access Denied: ADMIN role required.", title="Security Warning", severity="error")
            return
        threading.Thread(target=inject_velocity_flood, daemon=True).start()
        self.notify("Transaction velocity flood injected", title="Attack Sim [3]", severity="warning")

    def action_inject_quantum(self) -> None:
        from tui.widgets.sugriva.engine import get_role, write_audit, inject_quantum_exploit
        if get_role() != "ADMIN":
            write_audit("Unauthorized quantum exploit trigger attempt", status="DENIED")
            self.notify("Access Denied: ADMIN role required.", title="Security Warning", severity="error")
            return
        threading.Thread(target=inject_quantum_exploit, daemon=True).start()
        self.notify("Quantum signature spoofing & QKD coherence breach injected", title="Attack Sim [4]", severity="error")

    def action_toggle_rail_browser(self) -> None:
        try:
            tree = self.query_one(SugrivaTelemetryTree)
            tree.display = not tree.display
        except NoMatches:
            pass

    def action_toggle_jump_mode(self) -> None:
        if self._jumping:
            self._jumping = False
            return
        if not self.jumper:
            self._init_jumper()
        if not self.jumper:
            return
        self._jumping = True
        self.app.push_screen(
            JumpOverlay(jumper=self.jumper),
            callback=self.handle_jump_selection,
        )

    def handle_jump_selection(self, target: Widget | str | None) -> None:
        self._jumping = False
        if target is not None:
            self.set_focus(target)

    def action_open_command_palette(self) -> None:
        self.app.action_command_palette()

    def action_next_tab(self) -> None:
        try:
            tabbed = self.query_one(TabbedContent)
            tabs = ["telemetry-pane", "mesh-pane", "auth-pane", "db-pane", "crypto-pane", "quantum-pane", "audit-pane"]
            current_idx = tabs.index(tabbed.active)
            next_idx = (current_idx + 1) % len(tabs)
            tabbed.active = tabs[next_idx]
        except Exception:
            pass

    def action_prev_tab(self) -> None:
        try:
            tabbed = self.query_one(TabbedContent)
            tabs = ["telemetry-pane", "mesh-pane", "auth-pane", "db-pane", "crypto-pane", "quantum-pane", "audit-pane"]
            current_idx = tabs.index(tabbed.active)
            prev_idx = (current_idx - 1) % len(tabs)
            tabbed.active = tabs[prev_idx]
        except Exception:
            pass


class PostingTUI(App[None], inherit_bindings=False):
    ALLOW_SELECT = False
    AUTO_FOCUS = None
    COMMANDS = {PostingProvider}
    CSS_PATH = Path(__file__).parent / "sugriva.tcss"
    BINDING_GROUP_TITLE = "Global Keybinds"
    BINDINGS = [
        Binding(
            "ctrl+p",
            "command_palette",
            description="Commands",
            tooltip="Open the command palette.",
            id="commands",
        ),
        Binding(
            "ctrl+c",
            "app.quit",
            description="Quit",
            tooltip="Quit the application.",
            priority=True,
            id="quit",
        ),
        Binding(
            "f1,ctrl+question_mark,ctrl+shift+slash",
            "help",
            "Help",
            tooltip="Open the help dialog.",
            id="help",
        ),
        Binding("f8", "save_screenshot", "Save screenshot.", show=False),
    ]

    spacing: Reactive[str] = reactive("standard", init=False, always_update=True)

    def __init__(self, backend: BaseTUIBackend) -> None:
        super().__init__()
        self.backend = backend
        self.settings = backend.get_settings()
        self.collection = backend.get_collection()
        self.ansi_color = False
        self.env_changed_signal = Signal[None](self, "env-changed")
        self.animation_level = self.settings.animation
        self.set_reactive(PostingTUI.spacing, self.settings.spacing)

    def on_ready(self) -> None:
        log.debug("Sugriva TUI started.")

    def watch_spacing(self, spacing: Literal["standard", "compact"]) -> None:
        is_compact = spacing == "compact"
        self.app.set_class(is_compact, "-compact")
        try:
            footer = self.screen.query_one(Footer)
        except NoMatches:
            pass
        else:
            footer.compact = is_compact

    def on_mount(self) -> None:
        available_themes: dict[str, Theme] = BUILTIN_THEMES
        for theme in available_themes.values():
            self.register_theme(theme)
        unwanted_themes = ["textual-ansi"]
        for theme_name in unwanted_themes:
            try:
                self.unregister_theme(theme_name)
            except Exception:
                pass
        try:
            self.theme = self.settings.theme
        except InvalidThemeError:
            self.theme = "galaxy"
        self.spacing = self.settings.spacing

    def get_default_screen(self) -> MainScreen:
        self.main_screen = MainScreen(layout=self.settings.layout)
        return self.main_screen

    def command_toggle_spacing(self) -> None:
        self.spacing = "compact" if self.spacing == "standard" else "standard"

    def action_save_screenshot(self) -> str:
        return self.save_screenshot()

    @on(CommandPalette.Opened)
    def palette_opened(self) -> None:
        if not self.settings.command_palette.theme_preview:
            return
        self._original_theme = self.theme

    @on(CommandPalette.OptionHighlighted)
    def palette_option_highlighted(self, event: CommandPalette.OptionHighlighted) -> None:
        if not self.settings.command_palette.theme_preview:
            return
        prompt = event.highlighted_event.option.prompt
        themes = self.available_themes.keys()
        if isinstance(prompt, Content):
            candidate = prompt.plain
            if candidate in themes:
                self.theme = candidate
            else:
                self.theme = self._original_theme
            self.call_next(self.screen._update_styles)

    @on(CommandPalette.Closed)
    def palette_closed(self, event: CommandPalette.Closed) -> None:
        if not self.settings.command_palette.theme_preview:
            return
        if not event.option_selected:
            self.theme = self._original_theme

    def search_commands(
        self,
        commands: Sequence[CommandListItem],
        placeholder: str = "Search for commands...",
        palette_id: str = "",
    ) -> AwaitMount:
        palette = CommandPalette(
            providers=[SimpleProvider(self.screen, commands)],
            placeholder=placeholder,
            id=palette_id or None,
        )
        return self.push_screen(palette)

    async def action_help(self) -> None:
        focused = self.focused

        def reset_focus(_) -> None:
            if focused:
                self.screen.set_focus(focused)

        self.set_focus(None)
        from tui.help_screen import HelpScreen
        await self.push_screen(HelpScreen(widget=focused), callback=reset_focus)

    def action_change_theme(self) -> None:
        pass

    def action_hide_help_panel(self) -> None:
        pass

    def action_show_help_panel(self) -> None:
        pass


Posting = PostingTUI
