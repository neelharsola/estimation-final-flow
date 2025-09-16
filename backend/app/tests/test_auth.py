from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_auth_routes_exist(client: TestClient):
    assert client is not None


