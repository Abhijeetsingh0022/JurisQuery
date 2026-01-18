"""
Pytest configuration and fixtures.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
async def client():
    """Async test client fixture."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client


@pytest.fixture
def mock_user():
    """Mock user fixture."""
    return {
        "id": "test_user_123",
        "email": "test@example.com",
        "clerk_id": "clerk_test_123",
    }
