from __future__ import annotations
from functools import total_ordering
from pathlib import Path
from typing import Any, Literal, Optional, List
import httpx
from pydantic import BaseModel, Field

HttpRequestMethod = Literal["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]

class HttpxBearerTokenAuth(httpx.Auth):
    def __init__(self, token: str):
        self.token = token

    def auth_flow(self, request: httpx.Request):
        request.headers["Authorization"] = f"Bearer {self.token}"
        yield request

class BasicAuth(BaseModel):
    username: str = Field(default="")
    password: str = Field(default="")

class DigestAuth(BaseModel):
    username: str = Field(default="")
    password: str = Field(default="")

class BearerTokenAuth(BaseModel):
    token: str = Field(default="")

class Auth(BaseModel):
    type: Optional[Literal["basic", "digest", "bearer_token"]] = Field(default=None)
    basic: Optional[BasicAuth] = Field(default=None)
    digest: Optional[DigestAuth] = Field(default=None)
    bearer_token: Optional[BearerTokenAuth] = Field(default=None)

    def to_httpx_auth(self) -> Optional[httpx.Auth]:
        if self.type == "basic" and self.basic is not None:
            return httpx.BasicAuth(self.basic.username, self.basic.password)
        elif self.type == "digest" and self.digest is not None:
            return httpx.DigestAuth(self.digest.username, self.digest.password)
        elif self.type == "bearer_token" and self.bearer_token is not None:
            return HttpxBearerTokenAuth(self.bearer_token.token)
        return None

class PathParam(BaseModel):
    name: str
    value: str

class Header(BaseModel):
    name: str
    value: str
    enabled: bool = Field(default=True)

class FormItem(BaseModel):
    name: str
    value: str
    enabled: bool = Field(default=True)

class QueryParam(BaseModel):
    name: str
    value: str
    enabled: bool = Field(default=True)

class Cookie(BaseModel):
    name: str
    value: str
    enabled: bool = Field(default=True)

    @classmethod
    def from_httpx(cls, cookies: httpx.Cookies) -> List[Cookie]:
        return [Cookie(name=name, value=value) for name, value in cookies.items()]

class Options(BaseModel):
    follow_redirects: bool = Field(default=True)
    verify_ssl: bool = Field(default=True)
    attach_cookies: bool = Field(default=True)
    proxy_url: str = Field(default="")
    timeout: float = Field(default=5.0)

class RequestBody(BaseModel):
    content: Optional[str] = Field(default=None)
    form_data: Optional[List[FormItem]] = Field(default=None)
    content_type: Optional[str] = Field(default=None)

class Scripts(BaseModel):
    setup: Optional[str] = Field(default=None)
    on_request: Optional[str] = Field(default=None)
    on_response: Optional[str] = Field(default=None)

@total_ordering
class RequestModel(BaseModel):
    name: str = Field(default="")
    description: str = Field(default="")
    method: HttpRequestMethod = Field(default="GET")
    url: str = Field(default="")
    path: Optional[Path] = Field(default=None)
    body: Optional[RequestBody] = Field(default=None)
    auth: Optional[Auth] = Field(default=None)
    headers: List[Header] = Field(default_factory=list)
    params: List[QueryParam] = Field(default_factory=list)
    path_params: List[PathParam] = Field(default_factory=list)
    cookies: List[Cookie] = Field(default_factory=list)
    scripts: Scripts = Field(default_factory=Scripts)

    def __lt__(self, other: RequestModel) -> bool:
        method_order = {"GET": 0, "POST": 1, "PUT": 2, "PATCH": 3, "DELETE": 4}
        self_order = (method_order.get(self.method.upper(), 5), self.name)
        other_order = (method_order.get(other.method.upper(), 5), other.name)
        return self_order < other_order

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, RequestModel):
            return NotImplemented
        return self.path == other.path and self.name == other.name

class Collection(BaseModel):
    path: Path
    name: str = Field(default="__default__")
    requests: List[RequestModel] = Field(default_factory=list)
    children: List[Collection] = Field(default_factory=list)
    readme: Optional[str] = Field(default=None)
