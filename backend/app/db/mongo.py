from __future__ import annotations

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings


_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def init_mongo() -> None:
    """Initialize MongoDB connection with error handling."""
    global _client, _db
    settings = get_settings()
    
    try:
        _client = AsyncIOMotorClient(
            settings.MONGO_URL,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=5000,
            socketTimeoutMS=5000
        )
        _db = _client[settings.MONGO_DB]
        
        # Test the connection
        await _client.admin.command('ping')
        print(f"Connected to MongoDB: {settings.MONGO_DB}")
        
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise


async def ensure_indexes() -> None:
    """Create database indexes for optimal performance."""
    if _db is None:
        return
        
    try:
        # Users indexes
        await _db.users.create_index("email", unique=True)
        await _db.users.create_index("role")
        await _db.users.create_index("created_at")
        
        # Estimates indexes
        await _db.estimates.create_index("project.name")
        await _db.estimates.create_index("project.estimator.name")
        await _db.estimates.create_index("created_at")
        await _db.estimates.create_index("summary.total_hours")
        await _db.estimates.create_index([("rows.platform", 1), ("rows.complexity", 1)])
        
        # Audit logs indexes
        await _db.audit_logs.create_index("user_id")
        await _db.audit_logs.create_index("action")
        await _db.audit_logs.create_index("timestamp")
        await _db.audit_logs.create_index("resource_id")
        
        # Legacy indexes (for backwards compatibility)
        await _db.estimations.create_index("client")
        await _db.estimations.create_index("status")
        await _db.estimations.create_index("title", unique=True)
        await _db.pricing_rates.create_index([("role", 1), ("region", 1), ("version", -1)])
        
        print("Database indexes created successfully")
        
    except Exception as e:
        print(f"Failed to create indexes: {e}")


async def close_mongo() -> None:
    """Close MongoDB connection gracefully."""
    global _client, _db
    
    if _client is not None:
        try:
            print("Closing MongoDB connection...")
            _client.close()
            print("MongoDB connection closed successfully")
        except Exception as e:
            print(f"Error closing MongoDB connection: {e}")
        finally:
            _client = None
            _db = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("MongoDB is not initialized. Call init_mongo() first.")
    return _db


