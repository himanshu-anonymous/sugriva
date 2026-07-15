from __future__ import annotations
from textual.widgets import Tree
from textual.widgets.tree import TreeNode
from textual.binding import Binding


RAIL_MAP: dict[str, list[str]] = {
    "Domestic": ["NEFT", "RTGS", "UPI"],
    "International": ["Visa", "Mastercard", "PayPal"],
}


class SugrivaTelemetryTree(Tree[str]):
    BORDER_TITLE = "Payment Rails"
    BINDINGS = [
        Binding("j", "cursor_down", "Down", show=False),
        Binding("k", "cursor_up", "Up", show=False),
    ]

    def on_mount(self) -> None:
        self.border_title = "Payment Rails"
        self.add_class("section")
        self.app.call_after_refresh(self._populate_rails)

    def _populate_rails(self) -> None:
        self.root.expand()
        for category, rails in RAIL_MAP.items():
            branch: TreeNode[str] = self.root.add(category, expand=True)
            for rail in rails:
                branch.add_leaf(rail, data=rail)
