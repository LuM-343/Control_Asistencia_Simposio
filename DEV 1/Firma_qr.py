"""Firma y verificación de QR usando clave asimétrica RS256."""
from __future__ import annotations
import os
import time
import uuid
import jwt

ALGORITHM = "RS256"
ISSUER = "simposio-ing-xix"

def _private_key() -> str:
    # Primero busca la variable de entorno, si no existe, lee el archivo local
    if "QR_PRIVATE_KEY" in os.environ:
        return os.environ["QR_PRIVATE_KEY"].replace('\\n', '\n')
    try:
        with open("private_key.pem", "r") as f:
            return f.read()
    except FileNotFoundError:
        raise RuntimeError("No se encontró private_key.pem en la carpeta actual.")

def _public_key() -> str:
    if "QR_PUBLIC_KEY" in os.environ:
        return os.environ["QR_PUBLIC_KEY"].replace('\\n', '\n')
    try:
        with open("public_key.pem", "r") as f:
            return f.read()
    except FileNotFoundError:
        raise RuntimeError("No se encontró public_key.pem en la carpeta actual.")

def sign_qr(carnet: str, valid_until_epoch: int, private_key: str | None = None) -> str:
    now = int(time.time())
    payload = {
        "iss": ISSUER,
        "sub": str(carnet),
        "iat": now,
        "exp": int(valid_until_epoch),
        "jti": uuid.uuid4().hex[:12],
    }
    return jwt.encode(payload, private_key or _private_key(), algorithm=ALGORITHM)

def verify_qr(token: str, public_key: str | None = None) -> dict:
    """La PWA consumirá esta lógica utilizando únicamente la clave pública."""
    return jwt.decode(
        token, public_key or _public_key(), algorithms=[ALGORITHM], issuer=ISSUER,
        options={"require": ["exp", "sub", "iss"]},
    )