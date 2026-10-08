'''import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", "10000"))
    environment = os.getenv("ENVIRONMENT", "production")
    
    # Force disable reload in production
    reload = False if environment == "production" else True
    
    print(f"Starting server on 0.0.0.0:{port}")
    print(f"Environment: {environment}")
    print(f"Reload: {reload}")
    
    # Note: Cannot use workers with reload mode
    if reload:
        uvicorn.run(
            "app.main:socket_app",
            host="0.0.0.0",
            port=port,
            reload=True,
            log_level="info"
        )
    else:
        uvicorn.run(
            "app.main:socket_app",
            host="0.0.0.0",
            port=port,
            log_level="info",
            workers=1
        )
'''
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "app.main:socket_app",
        host="0.0.0.0",
        port=port,
        reload=True,
        #reload=False,
        log_level="info"
    )
