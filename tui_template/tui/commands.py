from functools import partial
from typing import TYPE_CHECKING, cast
from textual.command import DiscoveryHit, Hit, Hits, Provider
from textual.types import IgnoreReturnCallbackType

if TYPE_CHECKING:
    from tui.app import PostingTUI, MainScreen

CommandType = tuple[str, IgnoreReturnCallbackType, str, bool]


class PostingProvider(Provider):
    @property
    def commands(
        self,
    ) -> tuple[tuple[str, IgnoreReturnCallbackType, str, bool], ...]:
        app = self.posting
        screen = self.screen

        commands_to_show: list[tuple[str, IgnoreReturnCallbackType, str, bool]] = []

        from tui.app import MainScreen

        if isinstance(screen, MainScreen):
            # Attack commands
            commands_to_show.append(
                (
                    "attack: Inject Credential Stuffing",
                    screen.action_inject_stuffing,
                    "Simulate 5 auth failures and UPI cash-out",
                    True,
                )
            )
            commands_to_show.append(
                (
                    "attack: Inject Corporate Asset Liquidation",
                    screen.action_inject_liquidation,
                    "Simulate unauthorized RTGS cross-border corporate trade liquidation",
                    True,
                )
            )
            commands_to_show.append(
                (
                    "attack: Trigger Transaction Flood",
                    screen.action_inject_flood,
                    "Simulate rapid UPI velocity flood inside 200ms",
                    True,
                )
            )

            # Sidebar toggle
            commands_to_show.append(
                (
                    "view: Toggle Payment Rail Browser",
                    screen.action_toggle_rail_browser,
                    "Toggle visibility of the sidebar rail browser",
                    True,
                )
            )

            # Spacing
            toggle_spacing_callback: IgnoreReturnCallbackType = partial[None](
                app.command_toggle_spacing
            )
            title = (
                "spacing: Enable compact mode"
                if app.spacing == "standard"
                else "spacing: Enable standard mode"
            )
            help_text = (
                "Reduce user interface spacing"
                if app.spacing == "standard"
                else "Increase user interface spacing"
            )
            commands_to_show.append(
                (
                    title,
                    toggle_spacing_callback,
                    help_text,
                    True,
                )
            )

        # Quit
        commands_to_show.append(
            (
                "app: Quit Sugriva",
                app.exit,
                "Quit the security dashboard",
                True,
            )
        )

        return tuple(commands_to_show)

    async def discover(self) -> Hits:
        for name, runnable, help_text, show_discovery in self.commands:
            if show_discovery:
                yield DiscoveryHit(
                    name,
                    runnable,
                    help=help_text,
                )

    async def search(self, query: str) -> Hits:
        matcher = self.matcher(query)
        for name, runnable, help_text, _ in self.commands:
            if (match := matcher.match(name)) > 0:
                yield Hit(
                    match,
                    matcher.highlight(name),
                    runnable,
                    help=help_text,
                )

    @property
    def posting(self) -> "PostingTUI":
        return cast("PostingTUI", self.screen.app)
