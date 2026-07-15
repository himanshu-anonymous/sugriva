from __future__ import annotations
from textual.app import ComposeResult
from textual.containers import Horizontal
from textual.widgets import Input, Label
from tui.widgets.sugriva.engine import get_role


class ContextBar(Horizontal):
    DEFAULT_CSS = """
    ContextBar {
        height: 3;
        padding: 0 1;
        border-bottom: solid $primary-darken-2;
    }
    ContextBar #pipeline-badge {
        width: auto;
        padding: 0 1;
        color: $success;
        text-style: bold;
        content-align: center middle;
        height: 3;
    }
    ContextBar #role-badge {
        width: auto;
        padding: 0 1;
        color: $warning;
        text-style: bold;
        content-align: center middle;
        height: 3;
        border-left: solid $border;
    }
    ContextBar #query-input {
        width: 1fr;
        height: 3;
        border: none;
        background: transparent;
    }
    """

    def compose(self) -> ComposeResult:
        yield Label("[CONTEXT]: PIPELINE_ACTIVE", id="pipeline-badge")
        yield Label(f"[ROLE: {get_role()}]", id="role-badge")
        yield Input(
            placeholder="login [admin/analyst]  |  fetch <vpa>  |  breaker trip  |  help",
            id="query-input",
        )

    def on_mount(self) -> None:
        self.set_interval(0.5, self._refresh)

    def _refresh(self) -> None:
        role = get_role()
        badge = self.query_one("#role-badge", Label)
        badge.update(f"[ROLE: {role}]")
        if role == "ADMIN":
            badge.styles.color = "red"
        else:
            badge.styles.color = "yellow"
