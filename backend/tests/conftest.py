import os

# Set env vars before any app imports so Settings loads without errors
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://cao.khoa@localhost:5432/sales_leads")
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ENVIRONMENT", "test")
