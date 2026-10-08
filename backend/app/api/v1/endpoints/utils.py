import aiosmtplib
from email.message import EmailMessage
import os
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr

SMTP_USER = "thisteambloomnet@gmail.com"
SMTP_PASS = "eisc sory iyhr iaen"  #App passwords
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
async def send_verification_code(to_email: str, code: str):
    message = EmailMessage()
    message["From"] = SMTP_USER
    message["To"] = to_email
    message["Subject"] = "🌿 BloomNet Verification Code"
    message.set_content(
        f"""
    Hi there 🌱,

    Your verification code for BloomNet is: {code}
    This code will expire in 10 minutes.
    If you didn’t request this, please ignore this email.

    — BloomNet Team
    """
    )
    await aiosmtplib.send(
        message,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        start_tls=True,
        username=SMTP_USER,
        password=SMTP_PASS,
    )


SECRET_KEY = os.getenv("JWT_SECRET", "supersecret")
ALGORITHM = "HS256"

def create_jwt_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=12)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

class EmailRequest(BaseModel):
    email: EmailStr

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    username: str
    code: str
