from __future__ import annotations
from textual.app import ComposeResult
from textual.containers import Horizontal
from textual.widgets import Input, Label


class ContextBar(Horizontal):
    DEFAULT_CSS = """
    ContextBar {
        height: 3;
        padding: 0 1;
        border-bottom: solid $primary-darken-2;
    }
    ContextBar #pipeline-badge {
        width: auto;
        padding: 0 2;
        color: $success;
        text-style: bold;
        content-align: center middle;
        height: 3;
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
        yield Input(
            placeholder="fetch <vpa>  |  breaker trip  |  breaker reset",
            id="query-input",
        )
