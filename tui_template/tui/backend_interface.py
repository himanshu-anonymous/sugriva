from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Callable, Dict, Optional, Tuple

class BaseTUIBackend(ABC):
    """
    Abstract Base Class defining the operations that the decoupled TUI requires
    from the host application.
    """

    @abstractmethod
    def get_variables(self) -> Dict[str, str]:
        """
        Return the active environment and session variables.
        Used for autocomplete suggestions and syntax highlighting previews.
        """
        pass

    @abstractmethod
    def get_settings(self) -> Any:
        """
        Return the configuration/settings object.
        Used to control UI features like blinking cursor, positioning, and layout.
        """
        pass

    @abstractmethod
    def get_collection(self) -> Any:
        """
        Return the requests collection tree (folders and requests) to display in the sidebar.
        """
        pass

    @abstractmethod
    def get_collection_root(self) -> Path:
        """
        Return the base/root directory path of the active collection.
        Used to resolve relative script paths, etc.
        """
        pass

    @abstractmethod
    async def send_request(
        self,
        request_model: Any,
        request_options: Any,
        on_progress: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ) -> Any:
        """
        Execute an HTTP request asynchronously and return the response.

        Args:
            request_model: The request details gathered from the UI widgets.
            request_options: The request options.
            on_progress: Callback function to report trace events (e.g. DNS resolved, headers sent) to the TUI.
        """
        pass

    @abstractmethod
    def save_request(self, request_model: Any, save_path: Optional[Path] = None) -> Path:
        """
        Save/persist a request model (e.g., to YAML on disk, or a database).
        Returns the path or identifier where it was saved.
        """
        pass

    @abstractmethod
    def delete_request(self, request_model: Any) -> None:
        """
        Delete a request from storage.
        """
        pass

    @abstractmethod
    def duplicate_request(self, request_model: Any, new_name: Optional[str] = None) -> Any:
        """
        Duplicate a request and return the newly created request model.
        """
        pass
