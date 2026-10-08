from datetime import datetime
from typing import Any, Dict, List
from bson import ObjectId

import socketio

from app.core.config import settings
from app.core.database import get_database
from app.models.chat import UserType
from app.services.chat_service import mark_messages_as_read, save_message

# Create Socket.IO server
cors_origins = settings.SOCKETIO_CORS_ORIGINS.split(',') if settings.SOCKETIO_CORS_ORIGINS else []
# Clean up origins (remove empty strings and strip whitespace)
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

# Configure Socket.IO with Redis adapter if available (for multi-instance support)
socketio_kwargs = {
    'async_mode': 'asgi',
    'cors_allowed_origins': cors_origins,
    'logger': True,
    'engineio_logger': True,
}

# Add Redis adapter if REDIS_URL is configured (for multi-instance deployments)
if settings.REDIS_URL:
    try:
        import socketio.redis_manager
        socketio_kwargs['client_manager'] = socketio.AsyncRedisManager(settings.REDIS_URL)
        print(f"[Socket.IO] Using Redis adapter: {settings.REDIS_URL}")
    except ImportError:
        print("[Socket.IO] Redis adapter not available, using in-memory manager")
    except Exception as e:
        print(f"[Socket.IO] Failed to initialize Redis adapter: {e}, using in-memory manager")

sio = socketio.AsyncServer(**socketio_kwargs)

# Connected users: {user_id: sid}
connected_users = {}


@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    # Allow all connections for now (can add authentication later if needed)
    print(f"[Socket.IO] Client attempting to connect: {sid}")
    print(f"[Socket.IO] Connection headers: {environ.get('HTTP_ORIGIN', 'N/A')}")
    
    # Allow connection (remove any auth check for now)
    await sio.emit('connection_established', {'sid': sid}, to=sid)
    print(f"[Socket.IO] Client connected successfully: {sid}")
    return True  # Explicitly return True to allow connection


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    # Remove from connected users
    user_id_to_remove = None
    for user_id, user_sid in connected_users.items():
        if user_sid == sid:
            user_id_to_remove = user_id
            break
    
    if user_id_to_remove:
        del connected_users[user_id_to_remove]
        print(f"User {user_id_to_remove} disconnected")
    
    print(f"Client disconnected: {sid}")


@sio.event
async def authenticate(sid, data):
    """Authenticate user and register connection"""
    user_id = data.get('user_id')
    if user_id:
        connected_users[user_id] = sid
        await sio.emit('authenticated', {'user_id': user_id}, to=sid)
        print(f"User {user_id} authenticated with sid {sid}")


@sio.event
async def join_conversation(sid, data):
    """Join a conversation room"""
    conversation_id = data.get('conversation_id')
    if conversation_id:
        await sio.enter_room(sid, conversation_id)
        print(f"Client {sid} joined conversation {conversation_id}")


@sio.event
async def leave_conversation(sid, data):
    """Leave a conversation room"""
    conversation_id = data.get('conversation_id')
    if conversation_id:
        await sio.leave_room(sid, conversation_id)
        print(f"Client {sid} left conversation {conversation_id}")


@sio.event
async def send_message(sid, data):
    """Handle incoming message"""
    print(f"[Socket.IO] send_message event received from sid={sid}, data={data}")
    
    conversation_id = data.get('conversation_id')
    sender_id = data.get('sender_id')
    content = data.get('content')
    message_id = data.get('message_id')
    sender_type = data.get('sender_type')
    timestamp = data.get('timestamp')
    
    if not (conversation_id and sender_id and content):
        missing = []
        if not conversation_id:
            missing.append('conversation_id')
        if not sender_id:
            missing.append('sender_id')
        if not content:
            missing.append('content')
        print(f"[Socket.IO] send_message aborted: missing fields: {missing}")
        return
    
    print(f"[Socket.IO] Processing message: conversation_id={conversation_id}, sender_id={sender_id}, sender_type={sender_type}, content={content[:50]}...")

    # Convert sender_type string to UserType enum
    if sender_type:
        try:
            # Try to convert to UserType enum
            sender_type_enum = UserType(sender_type.lower())  # Convert to lowercase and validate
        except ValueError:
            # Invalid sender_type, default to user
            sender_type_enum = UserType.USER
    else:
        # Default to user if not provided to maintain backwards compatibility
        sender_type_enum = UserType.USER

    # Verify and correct sender_id by checking the conversation
    # This ensures we use the correct ID (conversation's sitter_id or user_id)
    db = await get_database()
    try:
        conversation_obj_id = ObjectId(conversation_id)
    except:
        print(f"[Socket.IO] Invalid conversation_id: {conversation_id}")
        return
    
    conversation = await db.conversations.find_one({"_id": conversation_obj_id})
    if conversation:
        # For sitter, use conversation's sitter_id; for user, use conversation's user_id
        if sender_type_enum == UserType.SITTER:
            correct_sender_id = conversation.get("sitter_id")
            if correct_sender_id and str(correct_sender_id) != str(sender_id):
                print(f"[Socket.IO] Correcting sitter sender_id from {sender_id} to {correct_sender_id}")
                sender_id = str(correct_sender_id)
        elif sender_type_enum == UserType.USER:
            correct_sender_id = conversation.get("user_id")
            if correct_sender_id and str(correct_sender_id) != str(sender_id):
                print(f"[Socket.IO] Correcting user sender_id from {sender_id} to {correct_sender_id}")
                sender_id = str(correct_sender_id)
    else:
        print(f"[Socket.IO] Conversation {conversation_id} not found")
        return

    created_at = None
    if timestamp:
        try:
            created_at = datetime.fromisoformat(timestamp)
        except ValueError:
            created_at = None

    try:
        print(f"[Socket.IO] Calling save_message with sender_id={sender_id}, sender_type={sender_type_enum.value}")
        stored = await save_message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            sender_type=sender_type_enum.value,  # Pass UserType enum value as string
            content=content,
            created_at=created_at,
            client_message_id=message_id,
        )
        print(f"[Socket.IO] Message saved successfully: id={stored['id']}")
    except ValueError as exc:
        print(f"[Socket.IO] Failed to persist message: {exc}")
        return
    except Exception as exc:
        print(f"[Socket.IO] Unexpected error saving message: {type(exc).__name__}: {exc}")
        import traceback
        traceback.print_exc()
        return

    payload = {
        "id": stored["id"],
        "conversation_id": stored["conversation_id"],
        "sender_id": stored["sender_id"],
        "sender_type": stored["sender_type"],
        "content": stored["content"],
        "created_at": stored["created_at"].isoformat(),
        "status": stored.get("status", "sent"),
    }

    print(f"[Socket.IO] Broadcasting new_message to room={conversation_id}, payload={payload}")
    await sio.emit("new_message", payload, room=conversation_id)
    print(f"[Socket.IO] Message broadcasted successfully in conversation {conversation_id} from {sender_id}")


@sio.event
async def typing(sid, data):
    """Handle typing indicator"""
    conversation_id = data.get('conversation_id')
    user_id = data.get('user_id')
    is_typing = data.get('is_typing', False)
    
    if conversation_id and user_id:
        # Broadcast typing status to others in the conversation
        await sio.emit('user_typing', {
            'conversation_id': conversation_id,
            'user_id': user_id,
            'is_typing': is_typing
        }, room=conversation_id, skip_sid=sid)


@sio.event
async def message_read(sid, data):
    """Handle message read receipt"""
    conversation_id = data.get('conversation_id')
    user_id = data.get('user_id')
    message_ids = data.get('message_ids', [])
    user_type = data.get('user_type')
    
    if not (conversation_id and user_id):
        return

    reader_type = user_type or data.get("reader_type")
    try:
        reader_enum = UserType(reader_type) if reader_type else UserType.USER
    except ValueError:
        reader_enum = UserType.USER

    try:
        await mark_messages_as_read(
            conversation_id=conversation_id,
            message_ids=message_ids,
            reader_type=reader_enum,
        )
    except ValueError as exc:
        print(f"Failed to mark messages as read: {exc}")
        return

    await sio.emit(
        'messages_read',
        {
            'conversation_id': conversation_id,
            'user_id': user_id,
            'message_ids': message_ids,
        },
        room=conversation_id,
        skip_sid=sid,
    )


# Export the socket instance
__all__ = ['sio', 'connected_users']
