"""Wardrobe AI tagging backend.

POST /tag  — upload a clothing photo, get back structured tags as JSON.
GET  /health — liveness check.

Uses Groq's free-tier vision models. Get a key at https://console.groq.com
and set GROQ_API_KEY in the environment (or a .env file loaded by your shell).
"""

import base64
import json
import os
import re

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Vision-capable Groq model. Swap this constant if Groq deprecates it
# (check https://console.groq.com/docs/models for current vision models).
MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# Enum values MUST stay in sync with mobile/src/types.ts.
ENUMS = {
    "type": ["top", "bottom", "dress", "outerwear", "shoes", "accessory", "bag"],
    "color": [
        "black", "white", "grey", "beige", "brown", "denim", "red", "orange",
        "yellow", "green", "teal", "blue", "navy", "purple", "pink",
    ],
    "pattern": [
        "solid", "striped", "plaid", "floral", "polka-dot", "graphic", "animal-print",
    ],
    "style": ["casual", "formal", "business", "sporty", "boho", "party"],
    "season": ["all", "spring", "summer", "fall", "winter"],
}

PROMPT = f"""You are a fashion tagging assistant. Look at this photo of a single
clothing item and return ONLY a JSON object (no markdown, no commentary) with
exactly these keys and allowed values:

- "type": one of {ENUMS['type']}
- "primary_color": the dominant color, one of {ENUMS['color']}
- "secondary_color": the second most prominent color, one of {ENUMS['color']}, or null if the item is essentially one color
- "pattern": one of {ENUMS['pattern']}
- "style": one of {ENUMS['style']}
- "season": the season it suits best, one of {ENUMS['season']} ("all" if year-round)

Pick the closest allowed value; never invent new values."""

app = FastAPI(title="Wardrobe AI tagger")

# CORS wide open for development only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL}


def _extract_json(text: str) -> dict:
    """Defensively pull a JSON object out of the model response."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError(f"No JSON object found in model response: {text[:200]!r}")


def _sanitize(raw: dict) -> dict:
    """Clamp every field to the allowed enums; fall back to safe defaults."""

    def pick(value, allowed, default):
        return value if isinstance(value, str) and value in allowed else default

    secondary = raw.get("secondary_color")
    if secondary is not None and secondary not in ENUMS["color"]:
        secondary = None

    return {
        "type": pick(raw.get("type"), ENUMS["type"], "top"),
        "primary_color": pick(raw.get("primary_color"), ENUMS["color"], "black"),
        "secondary_color": secondary,
        "pattern": pick(raw.get("pattern"), ENUMS["pattern"], "solid"),
        "style": pick(raw.get("style"), ENUMS["style"], "casual"),
        "season": pick(raw.get("season"), ENUMS["season"], "all"),
    }


@app.post("/tag")
async def tag_item(request: Request, image: UploadFile = File(...)):
    # Optional shared secret: when APP_SECRET is set (production), only
    # requests carrying the matching x-app-secret header are served, so
    # strangers can't burn the Groq quota. Unset (local dev) = open.
    expected_secret = os.environ.get("APP_SECRET")
    if expected_secret and request.headers.get("x-app-secret") != expected_secret:
        raise HTTPException(status_code=401, detail="Invalid or missing x-app-secret header.")

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "GROQ_API_KEY is not set. Get a free key at "
                "https://console.groq.com and set it in the environment "
                "before starting the server."
            ),
        )

    from groq import Groq  # imported lazily so /health works without the key

    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image upload.")

    media_type = image.content_type or "image/jpeg"
    if not media_type.startswith("image/"):
        media_type = "image/jpeg"
    data_url = f"data:{media_type};base64,{base64.b64encode(data).decode()}"

    client = Groq(api_key=api_key)
    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": PROMPT},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=300,
        )
    except Exception as exc:  # network / auth / rate-limit errors
        raise HTTPException(status_code=502, detail=f"Groq API error: {exc}") from exc

    text = completion.choices[0].message.content or ""
    try:
        parsed = _extract_json(text)
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=502, detail=f"Model returned unparseable output: {exc}"
        ) from exc

    return _sanitize(parsed)
