import asyncio
from pathlib import Path
from typing import Any, Callable, Dict, Optional
import httpx

from tui.backend_interface import BaseTUIBackend
from tui.config import Settings
from tui.models import Collection, RequestModel, Header, QueryParam, Options


class MockBackend(BaseTUIBackend):
    """
    A concrete implementation of BaseTUIBackend that provides static mock collection
    data, settings, and variable suggestions, and uses `httpx` to execute requests.
    """

    def __init__(self) -> None:
        self.settings = Settings()
        self.variables = {
            "base_url": "https://httpbin.org",
            "auth_token": "bearer_mock_token_xyz123",
            "user_id": "99",
        }
        self.collection_root = Path.cwd()
        self.collection = self._build_mock_collection()

    def _build_mock_collection(self) -> Collection:
        """Create a mock collection of requests to display in the TUI sidebar."""
        req_get = RequestModel(
            name="Get User Details",
            description="Fetch information for the current user.",
            method="GET",
            url="{{base_url}}/get?id={{user_id}}",
            headers=[
                Header(name="Accept", value="application/json"),
                Header(name="Authorization", value="Bearer {{auth_token}}"),
            ],
            params=[QueryParam(name="id", value="{{user_id}}")],
        )

        req_post = RequestModel(
            name="Create User Profile",
            description="Submit user registration details.",
            method="POST",
            url="{{base_url}}/post",
            headers=[Header(name="Content-Type", value="application/json")],
        )

        sub_collection = Collection(
            path=self.collection_root / "User Management",
            name="User Management",
            requests=[req_get, req_post],
        )

        root = Collection(
            path=self.collection_root,
            name="Mock API Collection",
            children=[sub_collection],
        )
        return root

    def get_variables(self) -> Dict[str, str]:
        return self.variables

    def get_settings(self) -> Settings:
        return self.settings

    def get_collection(self) -> Collection:
        return self.collection

    def get_collection_root(self) -> Path:
        return self.collection_root

    async def send_request(
        self,
        request_model: RequestModel,
        request_options: Options,
        on_progress: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ) -> httpx.Response:
        """
        Send a real HTTP request using `httpx` by substituting template variables.
        """
        # Substitute mock variables in URL and headers
        url = request_model.url
        for k, v in self.variables.items():
            placeholder = "{{" + k + "}}"
            url = url.replace(placeholder, str(v))
            # Also support standard $var or ${var} syntax
            url = url.replace(f"${k}", str(v))
            url = url.replace(f"${{{k}}}", str(v))

        # Build headers dictionary
        headers = {}
        for h in request_model.headers:
            if h.enabled:
                val = h.value
                for k, v in self.variables.items():
                    val = val.replace("{{" + k + "}}", str(v))
                    val = val.replace(f"${k}", str(v))
                    val = val.replace(f"${{{k}}}", str(v))
                headers[h.name] = val

        # Prepare HTTPX client
        if on_progress:
            # Emit mock trace progress events to the TUI trace view
            on_progress("http11.send_request_headers.started", {})
            await asyncio.sleep(0.1)
            on_progress("http11.send_request_headers.complete", {})
            on_progress("http11.send_request_body.started", {})
            await asyncio.sleep(0.05)
            on_progress("http11.send_request_body.complete", {})

        # Execute HTTP request
        async with httpx.AsyncClient(
            verify=request_options.verify_ssl,
            follow_redirects=request_options.follow_redirects,
            timeout=request_options.timeout,
        ) as client:
            # Simple content body mapping
            content = None
            if request_model.body and request_model.body.content:
                content = request_model.body.content

            response = await client.request(
                method=request_model.method,
                url=url,
                headers=headers,
                content=content,
            )
            return response

    def save_request(self, request_model: RequestModel, save_path: Optional[Path] = None) -> Path:
        """Mock save operation: updates the local collection model."""
        target_path = save_path or request_model.path or (self.collection_root / f"{request_model.name}.posting.yaml")
        request_model.path = target_path
        
        # Traverse and find the request in our tree and update it
        def _update_tree(col: Collection):
            for i, req in enumerate(col.requests):
                if req.name == request_model.name:
                    col.requests[i] = request_model
                    return True
            for child in col.children:
                if _update_tree(child):
                    return True
            return False

        _update_tree(self.collection)
        return target_path

    def delete_request(self, request_model: RequestModel) -> None:
        """Mock delete operation."""
        def _delete_from_tree(col: Collection):
            for i, req in enumerate(col.requests):
                if req.name == request_model.name:
                    col.requests.pop(i)
                    return True
            for child in col.children:
                if _delete_from_tree(child):
                    return True
            return False

        _delete_from_tree(self.collection)

    def duplicate_request(self, request_model: RequestModel, new_name: Optional[str] = None) -> RequestModel:
        """Mock duplicate operation."""
        name = new_name or f"{request_model.name} (Copy)"
        copied = request_model.model_copy()
        copied.name = name
        if copied.path:
            copied.path = copied.path.parent / f"{name.lower().replace(' ', '_')}.posting.yaml"
        return copied
