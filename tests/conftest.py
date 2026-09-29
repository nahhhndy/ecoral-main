import asyncio
import pytest
from backend.app.db.session import create_tables


@pytest.fixture(autouse=True, scope="session")
def setup_test_database():
    """Ensure database tables exist before tests run."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    loop.run_until_complete(create_tables())
