import io
import json
import os
from typing import List

import face_recognition
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

FACE_DISTANCE_THRESHOLD = float(os.getenv("FACE_DISTANCE_THRESHOLD", "0.6"))

app = FastAPI(title="AMS Face Recognition", version="1.0.0")

_origins = os.getenv("CORS_ORIGINS", "http://localhost:5000,http://127.0.0.1:5000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_image_bytes(data: bytes) -> np.ndarray:
    return face_recognition.load_image_file(io.BytesIO(data))


def _one_face_encoding(rgb: np.ndarray) -> np.ndarray:
    locs = face_recognition.face_locations(rgb)
    if len(locs) == 0:
        raise HTTPException(status_code=400, detail="No face detected")
    if len(locs) > 1:
        raise HTTPException(status_code=400, detail="Multiple faces detected; only one face allowed")
    encs = face_recognition.face_encodings(rgb, locs)
    if not encs:
        raise HTTPException(status_code=400, detail="Could not encode face")
    return encs[0]


@app.get("/health")
def health():
    return {"status": "ok", "service": "face-recognition-api"}


@app.post("/encode-face")
async def encode_face(images: List[UploadFile] = File(...)):
    if not images or len(images) < 5 or len(images) > 10:
        raise HTTPException(
            status_code=400,
            detail="Provide between 5 and 10 images",
        )

    embeddings: List[List[float]] = []
    errors: List[str] = []

    for idx, up in enumerate(images):
        raw = await up.read()
        if not raw:
            errors.append(f"Frame {idx}: empty file")
            continue
        try:
            rgb = _load_image_bytes(raw)
            enc = _one_face_encoding(rgb)
            embeddings.append(enc.tolist())
        except HTTPException as e:
            errors.append(f"Frame {idx}: {e.detail}")

    if len(embeddings) < 5:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 5 valid single-face images. Errors: {errors}",
        )

    return {"embeddings": embeddings, "valid_frames": len(embeddings)}


@app.post("/recognize-face")
async def recognize_face(
    image: UploadFile = File(...),
    known_embeddings: str = Form(...),
):
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image")

    try:
        known = json.loads(known_embeddings)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="known_embeddings must be valid JSON")

    if not isinstance(known, list) or len(known) == 0:
        raise HTTPException(status_code=400, detail="known_embeddings must be a non-empty array")

    try:
        rgb = _load_image_bytes(raw)
        unknown = _one_face_encoding(rgb)
    except HTTPException:
        raise

    known_arr = np.array(known, dtype=np.float64)
    if known_arr.ndim == 1:
        known_arr = known_arr.reshape(1, -1)
    if known_arr.ndim != 2 or known_arr.shape[1] != 128:
        raise HTTPException(
            status_code=400,
            detail="Each known embedding must be a 128-dimensional vector",
        )

    distances = face_recognition.face_distance(known_arr, unknown)
    min_d = float(np.min(distances))
    match = min_d <= FACE_DISTANCE_THRESHOLD
    confidence = max(0.0, min(1.0, 1.0 - min_d))

    return {
        "match": match,
        "confidence": round(confidence, 6),
        "distance": round(min_d, 6),
    }


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=False)
