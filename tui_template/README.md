# Posting TUI Template

This folder contains a fully decoupled extraction of the Textual-based TUI from the `posting` HTTP client repository. 

By separating the UI logic from the original project's file operations, execution scripting, and HTTP client dependencies, this directory serves as a generic TUI template that can be embedded into other programs or adapted for other protocol clients (e.g., gRPC, GraphQL, WebSockets, or a database query editor).

## Directory Structure

- `tui/`: The standalone UI package containing screens, widgets, stylesheets, and models.
  - `backend_interface.py`: Defines `BaseTUIBackend`, the contract between the TUI and your custom business logic.
  - `app.py`: The `PostingTUI` class (subclass of Textual `App`) and the `MainScreen`.
  - `models.py`: Pydantic models for transferring request, response, collection, and option data.
  - `posting.scss`: The layout styling sheet.
  - `widgets/`: Decoupled components for URL input, query tables, header grids, response displays, etc.
- `mock_backend.py`: A fully functional demonstration backend implementing `BaseTUIBackend` using `httpx`.
- `run_demo.py`: A runner script to start the decoupled TUI with the `MockBackend`.

## Architectural Decoupling

In the original `posting` codebase, UI widgets made direct imports to global configuration contexts, file-system handlers, and local scripting modules. In this template, those couplings have been resolved:

1. **Pluggable Backend**: The main `PostingTUI` Textual `App` accepts a `backend` parameter implementing `BaseTUIBackend`.
2. **Context-Free Config**: All widgets look up user settings dynamically through the app instance (`self.app.settings`), rather than reading from a global config module on disk.
3. **No Direct OS Operations**: Sidebar collection trees, save keys, duplicate flows, and deletes query the backend contract instead of calling local file paths directly.

## How to Integrate the TUI in Another Program

To use this TUI in your own application:

1. Copy the `tui/` directory into your project.
2. Implement a subclass of `BaseTUIBackend`:

```python
from pathlib import Path
from typing import Dict, Any, Optional, Callable
from tui.backend_interface import BaseTUIBackend
from tui.models import Collection, RequestModel, Options

class MyCustomBackend(BaseTUIBackend):
    def get_variables(self) -> Dict[str, str]:
        # Return environment variables for autocomplete and formatting
        return {"server_url": "http://my-internal-server.local"}

    def get_settings(self) -> Any:
        # Return settings configuration mapping layout/spacing
        from tui.config import Settings
        return Settings()

    def get_collection(self) -> Collection:
        # Load request models from your database or file-system structure
        return Collection(path=Path("."), name="My Collection")

    def get_collection_root(self) -> Path:
        return Path(".")

    async def send_request(
        self,
        request_model: RequestModel,
        request_options: Options,
        on_progress: Optional[Callable[[str, Dict[str, Any]], None]] = None
    ) -> Any:
        # Execute the request. Can return a custom response or standard httpx.Response
        import httpx
        async with httpx.AsyncClient() as client:
            return await client.get(request_model.url)

    def save_request(self, request_model: RequestModel, save_path: Optional[Path] = None) -> Path:
        # Handle saving to your custom storage format/location
        return Path("saved_request.yaml")

    def delete_request(self, request_model: RequestModel) -> None:
        # Handle request deletion
        pass

    def duplicate_request(self, request_model: RequestModel, new_name: Optional[str] = None) -> RequestModel:
        # Handle cloning logic
        return request_model.model_copy()
```

3. Run the app:

```python
from tui import PostingTUI
from my_backend import MyCustomBackend

if __name__ == "__main__":
    backend = MyCustomBackend()
    app = PostingTUI(backend=backend)
    app.run()
```

## Running the Standalone Demo

To verify and run the demo template locally using the fast `uv` environment manager:

```bash
uv run python tui_template/run_demo.py
```
