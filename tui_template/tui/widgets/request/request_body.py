from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import ContentSwitcher, Label
from tui.help_data import HelpData

from tui.widgets.center_middle import CenterMiddle
from tui.widgets.request.form_editor import FormEditor
from tui.widgets.select import PostingSelect
from tui.widgets.text_area import PostingTextArea, TextAreaFooter, TextEditor


class RequestBodyEditor(Vertical):
    """
    A container for the request body text area and the request body type selector.
    """

    def compose(self) -> ComposeResult:
        with Horizontal(id="request-body-type-select-container"):
            yield PostingSelect(
                # These values are also referred to inside MainScreen.
                # When we load a request, we need to set the correct
                # value in the select.
                options=[
                    ("None", "no-body-label"),
                    ("Raw (json, text, etc.)", "text-body-editor"),
                    ("Form data (x-www-form-urlencoded)", "form-body-editor"),
                ],
                id="request-body-type-select",
                allow_blank=False,
            )
        with ContentSwitcher(
            initial="no-body-label",
            id="request-body-type-content-switcher",
        ):
            yield CenterMiddle(
                Label("No request body"),
                id="no-body-label",
            )
            text_area = RequestBodyTextArea(language="json")
            yield TextEditor(
                text_area=text_area,
                footer=TextAreaFooter(text_area),
                id="text-body-editor",
            )
            yield FormEditor(
                id="form-body-editor",
            )


class RequestBodyTextArea(PostingTextArea):
    """
    For editing request bodies.
    """

    BINDING_GROUP_TITLE = "Request Body Text Area"

    help = HelpData(
        title="Request Body Text Area",
        description="""\
A text area for entering the request body.
Press `ESC` to focus the text area footer bar.

Hold `shift` and move the cursor or click and drag to select text.
""",
    )

    def on_mount(self):
        self.tab_behavior = "indent"
        self.show_line_numbers = True
