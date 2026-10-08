from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import socketio

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.v1.api import api_router
from app.core.socketio_server import sio


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="JHU Plant Care Platform API",
    description="API for JHU Plant Care Community Platform",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount Socket.IO app
socket_app = socketio.ASGIApp(sio, app)


@app.get("/")
async def root():
    return {"message": "JHU Plant Care Platform API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Export socket_app for uvicorn to run
# This allows Socket.IO to work alongside FastAPI
__all__ = ['socket_app', 'app']
