import os
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from textual.types import AnimationLevel

PostingLayout = Literal["horizontal", "vertical"]


class HeadingSettings(BaseModel):
    visible: bool = Field(default=True)
    show_host: bool = Field(default=True)
    show_version: bool = Field(default=True)
    hostname: str | None = Field(default=None)


class UrlBarSettings(BaseModel):
    show_value_preview: bool = Field(default=True)
    hide_secrets_in_value_preview: bool = Field(default=True)


class ResponseSettings(BaseModel):
    prettify_json: bool = Field(default=True)
    show_size_and_time: bool = Field(default=True)


class FocusSettings(BaseModel):
    on_startup: Literal["url", "method", "collection"] = Field(default="url")
    on_response: Literal["body", "tabs"] | None = Field(default=None)
    on_request_open: (
        Literal["headers", "body", "query", "info", "url", "method", "path"] | None
    ) = Field(default=None)


class CertificateSettings(BaseModel):
    ca_bundle: str | None = Field(default=None)
    certificate_path: str | None = Field(default=None)
    key_file: str | None = Field(default=None)
    password: SecretStr | None = Field(default=None)


class TextInputSettings(BaseModel):
    blinking_cursor: bool = Field(default=True)


class CommandPaletteSettings(BaseModel):
    theme_preview: bool = Field(default=False)


class CollectionBrowserSettings(BaseModel):
    position: Literal["left", "right"] = Field(default="left")
    show_on_startup: bool = Field(default=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="posting_",
        env_nested_delimiter="__",
        env_ignore_empty=True,
        extra="allow",
    )

    theme: str = Field(default="galaxy")
    theme_directory: Path = Field(default=Path("themes"))
    load_user_themes: bool = Field(default=False)
    load_builtin_themes: bool = Field(default=True)
    layout: PostingLayout = Field(default="vertical")
    use_host_environment: bool = Field(default=False)
    watch_env_files: bool = Field(default=False)
    watch_collection_files: bool = Field(default=False)
    watch_themes: bool = Field(default=False)

    text_input: TextInputSettings = Field(default_factory=TextInputSettings)
    animation: AnimationLevel = Field(default="none")
    response: ResponseSettings = Field(default_factory=ResponseSettings)
    heading: HeadingSettings = Field(default_factory=HeadingSettings)
    url_bar: UrlBarSettings = Field(default_factory=UrlBarSettings)
    collection_browser: CollectionBrowserSettings = Field(
        default_factory=CollectionBrowserSettings
    )
    command_palette: CommandPaletteSettings = Field(
        default_factory=CommandPaletteSettings
    )

    pager: str | None = Field(default=os.getenv("PAGER"))
    pager_json: str | None = Field(default=None)
    editor: str | None = Field(default=os.getenv("EDITOR"))
    use_xresources: bool = Field(default=False)
    ssl: CertificateSettings = Field(default_factory=CertificateSettings)
    focus: FocusSettings = Field(default_factory=FocusSettings)
    keymap: dict[str, str] = Field(default_factory=dict)
    curl_export_extra_args: str = Field(default="")
    spacing: Literal["standard", "compact"] = Field(default="standard")
