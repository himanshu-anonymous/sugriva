from pathlib import Path

def config_directory() -> Path:
    """Return the application config directory."""
    path = Path.home() / ".config" / "posting"
    try:
        path.mkdir(exist_ok=True, parents=True)
    except Exception:
        pass
    return path

def data_directory() -> Path:
    """Return the application data directory."""
    path = Path.home() / ".local" / "share" / "posting"
    try:
        path.mkdir(exist_ok=True, parents=True)
    except Exception:
        pass
    return path

def theme_directory() -> Path:
    """Return the themes directory."""
    path = data_directory() / "themes"
    try:
        path.mkdir(exist_ok=True, parents=True)
    except Exception:
        pass
    return path
