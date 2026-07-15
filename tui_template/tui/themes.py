from pathlib import Path
from typing import NamedTuple, Optional
import uuid
from pydantic import BaseModel, Field
from rich.style import Style
from textual.app import InvalidThemeError
from textual.color import Color
from textual.theme import Theme as TextualTheme
from textual.widgets.text_area import TextAreaTheme
import yaml


class PostingTextAreaTheme(BaseModel):
    gutter: str | None = Field(default=None)
    cursor: str | None = Field(default=None)
    cursor_line: str | None = Field(default=None)
    cursor_line_gutter: str | None = Field(default=None)
    matched_bracket: str | None = Field(default=None)
    selection: str | None = Field(default=None)


class SyntaxTheme(BaseModel):
    json_key: str | None = Field(default=None)
    json_string: str | None = Field(default=None)
    json_number: str | None = Field(default=None)
    json_boolean: str | None = Field(default=None)
    json_null: str | None = Field(default=None)


class VariableStyles(BaseModel):
    resolved: str | None = Field(default=None)
    unresolved: str | None = Field(default=None)

    def fill_with_defaults(self, theme: "Theme") -> "VariableStyles":
        return VariableStyles(
            resolved=self.resolved or theme.success,
            unresolved=self.unresolved or theme.error,
        )


class UrlStyles(BaseModel):
    base: str | None = Field(default=None)
    protocol: str | None = Field(default=None)
    separator: str | None = Field(default="dim")

    def fill_with_defaults(self, theme: "Theme") -> "UrlStyles":
        return UrlStyles(
            base=self.base or theme.secondary,
            protocol=self.protocol or theme.accent,
            separator=self.separator or "dim",
        )


class MethodStyles(BaseModel):
    get: str | None = Field(default="#0ea5e9")
    post: str | None = Field(default="#22c55e")
    put: str | None = Field(default="#f59e0b")
    delete: str | None = Field(default="#ef4444")
    patch: str | None = Field(default="#14b8a6")
    options: str | None = Field(default="#8b5cf6")
    head: str | None = Field(default="#d946ef")


class Theme(BaseModel):
    name: str = Field(exclude=True)
    primary: str
    secondary: str | None = None
    background: str | None = None
    surface: str | None = None
    panel: str | None = None
    warning: str | None = None
    error: str | None = None
    success: str | None = None
    accent: str | None = None
    dark: bool = True

    text_area: PostingTextAreaTheme = Field(default_factory=PostingTextAreaTheme)
    syntax: str | SyntaxTheme = Field(default="posting", exclude=True)
    url: UrlStyles | None = Field(default_factory=UrlStyles)
    variable: VariableStyles | None = Field(default_factory=VariableStyles)
    method: MethodStyles | None = Field(default_factory=MethodStyles)

    # Optional metadata
    author: str | None = Field(default=None, exclude=True)
    description: str | None = Field(default=None, exclude=True)
    homepage: str | None = Field(default=None, exclude=True)

    def to_textual_theme(self) -> TextualTheme:
        theme_data = {
            "name": self.name,
            "dark": self.dark,
        }
        colors = {
            "primary": self.primary,
            "secondary": self.secondary,
            "background": self.background,
            "surface": self.surface,
            "panel": self.panel,
            "warning": self.warning,
            "error": self.error,
            "success": self.success,
            "accent": self.accent,
        }

        # Validate the colors before converting to a Textual theme.
        for color in colors.values():
            if color is not None:
                Color.parse(color)

        theme_data = {**colors, **theme_data}

        variables = {}
        if self.url:
            url_styles = self.url.fill_with_defaults(self)
            variables.update(
                {
                    "url-base": url_styles.base,
                    "url-protocol": url_styles.protocol,
                    "url-separator": url_styles.separator,
                }
            )

        if self.variable:
            var_styles = self.variable.fill_with_defaults(self)
            variables.update(
                {
                    "variable-resolved": var_styles.resolved,
                    "variable-unresolved": var_styles.unresolved,
                }
            )

        if self.method:
            variables.update(
                {
                    "method-get": self.method.get,
                    "method-post": self.method.post,
                    "method-put": self.method.put,
                    "method-delete": self.method.delete,
                    "method-patch": self.method.patch,
                    "method-options": self.method.options,
                    "method-head": self.method.head,
                }
            )

        if self.text_area:
            if self.text_area.gutter:
                variables["text-area-gutter"] = self.text_area.gutter
            if self.text_area.cursor:
                variables["text-area-cursor"] = self.text_area.cursor
            if self.text_area.cursor_line:
                variables["text-area-cursor-line"] = self.text_area.cursor_line
            if self.text_area.cursor_line_gutter:
                variables["text-area-cursor-line-gutter"] = (
                    self.text_area.cursor_line_gutter
                )
            if self.text_area.matched_bracket:
                variables["text-area-matched-bracket"] = self.text_area.matched_bracket
            if self.text_area.selection:
                variables["text-area-selection"] = self.text_area.selection

        if isinstance(self.syntax, SyntaxTheme):
            if self.syntax.json_key:
                variables["syntax-json-key"] = self.syntax.json_key
            if self.syntax.json_string:
                variables["syntax-json-string"] = self.syntax.json_string
            if self.syntax.json_number:
                variables["syntax-json-number"] = self.syntax.json_number
            if self.syntax.json_boolean:
                variables["syntax-json-boolean"] = self.syntax.json_boolean
            if self.syntax.json_null:
                variables["syntax-json-null"] = self.syntax.json_null
        elif isinstance(self.syntax, str):
            variables["syntax-theme"] = self.syntax
        else:
            variables["syntax-theme"] = "css"

        theme_data = {k: v for k, v in theme_data.items() if v is not None}
        theme_data["variables"] = {k: v for k, v in variables.items() if v is not None}

        textual_theme = TextualTheme(**theme_data)
        return textual_theme

    @staticmethod
    def text_area_theme_from_theme_variables(
        theme_variables: dict[str, str],
    ) -> TextAreaTheme:
        variables = theme_variables or {}

        # Infer reasonable default syntax styles from the theme variables.
        syntax_styles = {
            "string": Style.parse(
                variables.get("syntax-json-string", variables.get("text-accent", ""))
            ),
            "number": Style.parse(
                variables.get("syntax-json-number", variables.get("text-secondary", ""))
            ),
            "boolean": Style.parse(
                variables.get("syntax-json-boolean", variables.get("text-success", ""))
            ),
            "json.null": Style.parse(
                variables.get("syntax-json-null", variables.get("text-warning", ""))
            ),
            "json.label": Style.parse(
                variables.get("syntax-json-key", variables.get("text-primary", ""))
            ),
        }

        return TextAreaTheme(
            name=uuid.uuid4().hex,
            syntax_styles=syntax_styles,
            gutter_style=Style.parse(variables.get("text-area-gutter"))
            if "text-area-gutter" in variables
            else None,
            cursor_style=Style.parse(variables.get("text-area-cursor"))
            if "text-area-cursor" in variables
            else None,
            cursor_line_style=Style.parse(variables.get("text-area-cursor-line"))
            if "text-area-cursor-line" in variables
            else None,
            cursor_line_gutter_style=Style.parse(
                variables.get("text-area-cursor-line-gutter")
            )
            if "text-area-cursor-line-gutter" in variables
            else None,
            bracket_matching_style=Style.parse(
                variables.get("text-area-matched-bracket")
            )
            if "text-area-matched-bracket" in variables
            else None,
            selection_style=Style.parse(variables.get("text-area-selection"))
            if "text-area-selection" in variables
            else None,
        )


class UserThemeLoadResult(NamedTuple):
    loaded_themes: dict[str, TextualTheme]
    failed_themes: list[tuple[Path, Exception]]


def load_user_themes(theme_directory: Optional[Path] = None) -> UserThemeLoadResult:
    themes: dict[str, TextualTheme] = {}
    failed_themes: list[tuple[Path, Exception]] = []
    
    if theme_directory is None:
        return UserThemeLoadResult(loaded_themes=themes, failed_themes=failed_themes)

    for path in theme_directory.iterdir():
        path_suffix = path.suffix
        if path_suffix == ".yaml" or path_suffix == ".yml":
            try:
                theme = load_user_theme(path)
                if theme:
                    themes[theme.name] = theme
            except Exception as e:
                failed_themes.append((path, e))

    return UserThemeLoadResult(loaded_themes=themes, failed_themes=failed_themes)


def load_user_theme(path: Path) -> TextualTheme | None:
    with path.open() as theme_file:
        try:
            theme_content = yaml.load(theme_file, Loader=yaml.FullLoader) or {}
        except Exception as e:
            raise InvalidThemeError(f"Could not parse theme file: {str(e)}.")

        try:
            return Theme(**theme_content).to_textual_theme()
        except Exception:
            raise InvalidThemeError(f"Invalid theme file at {str(path)}.")


galaxy_primary = Color.parse("#C45AFF")
galaxy_secondary = Color.parse("#a684e8")
galaxy_warning = Color.parse("#FFD700")
galaxy_error = Color.parse("#FF4500")
galaxy_success = Color.parse("#00FA9A")
galaxy_accent = Color.parse("#FF69B4")
galaxy_background = Color.parse("#0F0F1F")
galaxy_surface = Color.parse("#1E1E3F")
galaxy_panel = Color.parse("#2D2B55")
galaxy_contrast_text = galaxy_background.get_contrast_text(1.0)

BUILTIN_THEMES: dict[str, TextualTheme] = {
    "galaxy": TextualTheme(
        name="galaxy",
        primary=galaxy_primary.hex,
        secondary=galaxy_secondary.hex,
        warning=galaxy_warning.hex,
        error=galaxy_error.hex,
        success=galaxy_success.hex,
        accent=galaxy_accent.hex,
        background=galaxy_background.hex,
        surface=galaxy_surface.hex,
        panel=galaxy_panel.hex,
        dark=True,
        variables={
            "input-cursor-background": "#C45AFF",
            "footer-background": "transparent",
        },
    ),
    "nebula": TextualTheme(
        name="nebula",
        primary="#4A9CFF",
        secondary="#66D9EF",
        warning="#FFB454",
        error="#FF5555",
        success="#50FA7B",
        accent="#FF79C6",
        surface="#193549",
        panel="#1F4662",
        background="#0D2137",
        dark=True,
        variables={
            "input-selection-background": "#4A9CFF 35%",
        },
    ),
    "sunset": TextualTheme(
        name="sunset",
        primary="#FF7E5F",
        secondary="#FEB47B",
        warning="#FFD93D",
        error="#FF5757",
        success="#98D8AA",
        accent="#B983FF",
        background="#2B2139",
        surface="#362C47",
        panel="#413555",
        dark=True,
        variables={
            "input-cursor-background": "#FF7E5F",
            "input-selection-background": "#FF7E5F 35%",
            "footer-background": "transparent",
            "button-color-foreground": "#2B2139",
            "method-get": "#FF7E5F",
        },
    ),
    "aurora": TextualTheme(
        name="aurora",
        primary="#45FFB3",
        secondary="#A1FCDF",
        accent="#DF7BFF",
        warning="#FFE156",
        error="#FF6B6B",
        success="#64FFDA",
        background="#0A1A2F",
        surface="#142942",
        panel="#1E3655",
        dark=True,
        variables={
            "input-cursor-background": "#45FFB3",
            "input-selection-background": "#45FFB3 35%",
            "footer-background": "transparent",
            "button-color-foreground": "#0A1A2F",
            "method-post": "#DF7BFF",
        },
    ),
    "nautilus": TextualTheme(
        name="nautilus",
        primary="#0077BE",
        secondary="#20B2AA",
        warning="#FFD700",
        error="#FF6347",
        success="#32CD32",
        accent="#FF8C00",
        background="#001F3F",
        surface="#003366",
        panel="#005A8C",
        dark=True,
    ),
    "cobalt": TextualTheme(
        name="cobalt",
        primary="#334D5C",
        secondary="#66B2FF",
        warning="#FFAA22",
        error="#E63946",
        success="#4CAF50",
        accent="#D94E64",
        surface="#27343B",
        panel="#2D3E46",
        background="#1F262A",
        dark=True,
        variables={
            "input-selection-background": "#4A9CFF 35%",
        },
    ),
    "twilight": TextualTheme(
        name="twilight",
        primary="#367588",
        secondary="#5F9EA0",
        warning="#FFD700",
        error="#FF6347",
        success="#00FA9A",
        accent="#FF7F50",
        background="#191970",
        surface="#3B3B6D",
        panel="#4C516D",
        dark=True,
    ),
    "hacker": TextualTheme(
        name="hacker",
        primary="#00FF00",
        secondary="#3A9F3A",
        warning="#00FF66",
        error="#FF0000",
        success="#00DD00",
        accent="#00FF33",
        background="#000000",
        surface="#0A0A0A",
        panel="#111111",
        dark=True,
        variables={
            "method-get": "#00FF00",
            "method-post": "#00DD00",
            "method-put": "#00BB00",
            "method-delete": "#FF0000",
            "method-patch": "#00FF33",
            "method-options": "#3A9F3A",
            "method-head": "#00FF66",
        },
    ),
    "manuscript": TextualTheme(
        name="manuscript",
        primary="#2C4251",
        secondary="#6B4423",
        accent="#8B4513",
        warning="#B4846C",
        error="#A94442",
        success="#2D5A27",
        background="#F5F1E9",
        surface="#EBE6D9",
        panel="#E0DAC8",
        dark=False,
        variables={
            "input-cursor-background": "#2C4251",
            "input-selection-background": "#2C4251 25%",
            "footer-background": "#2C4251",
            "footer-key-foreground": "#F5F1E9",
            "footer-description-foreground": "#F5F1E9",
            "button-color-foreground": "#F5F1E9",
            "method-get": "#2C4251",
            "method-post": "#2D5A27",
            "method-put": "#6B4423",
            "method-delete": "#A94442",
            "method-patch": "#8B4513",
            "method-options": "#4A4A4A",
            "method-head": "#5C5C5C",
        },
    ),
    "hypernova": TextualTheme(
        name="hypernova",
        primary="#00F5D4",
        secondary="#7B2FF7",
        warning="#FEE440",
        error="#F72585",
        success="#80FF72",
        accent="#4CC9F0",
        background="#0B0B12",
        surface="#121225",
        panel="#1A1A32",
        dark=True,
        variables={
            "input-cursor-background": "#4CC9F0",
            "input-selection-background": "#4CC9F0 30%",
            "footer-background": "transparent",
            "button-color-foreground": "#0B0B12",
            "method-get": "#00F5D4",
            "method-post": "#80FF72",
            "method-put": "#FEE440",
            "method-delete": "#F72585",
            "method-patch": "#7B2FF7",
            "method-options": "#4CC9F0",
            "method-head": "#F15BB5",
        },
    ),
    "synthwave": TextualTheme(
        name="synthwave",
        primary="#FF006E",
        secondary="#8338EC",
        warning="#FFBE0B",
        error="#FB5607",
        success="#06FFA5",
        accent="#3A86FF",
        background="#0F0A19",
        surface="#1A0F26",
        panel="#251833",
        dark=True,
        variables={
            "input-cursor-background": "#FF006E",
            "input-selection-background": "#FF006E 25%",
            "footer-background": "transparent",
            "button-color-foreground": "#0F0A19",
            "method-get": "#3A86FF",
            "method-post": "#06FFA5",
            "method-put": "#FFBE0B",
            "method-delete": "#FB5607",
            "method-patch": "#8338EC",
            "method-options": "#FF006E",
            "method-head": "#C77DFF",
        },
    ),
}
