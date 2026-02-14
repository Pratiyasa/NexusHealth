from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import random
import json
import os
import io
from datetime import datetime
from typing import List

# AI Vision & Image Processing
import google.generativeai as genai
from PIL import Image

GEMINI_API_KEY = "AIzaSyALrhKiWSYFKFgyuWwCzY8RhkfBZPjnT6Q"

client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- GLOBAL STATE ----------------
SYSTEM_ALERT_ACTIVE = False
STABILIZATION_MODE = False
STABILIZATION_TARGET = 75
SCRUB_IN_VERIFIED = False

ACCESS_LOGS = [
    {
        "id": 1,
        "user": "Dr. Aris Thorne",
        "role": "Lead Surgeon",
        "status": "Bio-Verified",
        "time": "18:42:01",
        "action": "Neural Interface Connected",
    },
    {
        "id": 2,
        "user": "System Admin",
        "role": "Database Sync",
        "status": "Internal",
        "time": "14:20:55",
        "action": "Federated Weights Merged",
    },
]

TELEMETRY_CACHE = []
AI_SESSION_HISTORY = []


# ---------------- HELPER ----------------
def generate_neural_heatmap(size: int = 8):
    return [[round(random.uniform(0.1, 0.9), 2) for _ in range(size)] for _ in range(size)]


# ---------------- WEBSOCKET ----------------
@app.websocket("/ws/vitals")
async def websocket_vitals(websocket: WebSocket):
    await websocket.accept()
    current_hr = 80

    try:
        while True:
            baseline_hr = 72

            if STABILIZATION_MODE:
                if current_hr > STABILIZATION_TARGET:
                    current_hr -= random.randint(1, 3)
                elif current_hr < STABILIZATION_TARGET:
                    current_hr += random.randint(1, 2)
                hr = current_hr

            elif SYSTEM_ALERT_ACTIVE:
                hr = random.randint(120, 140)
                current_hr = hr

            else:
                hr = random.randint(60, 110)
                current_hr = hr

            vitals_data = {
                "heart_rate": hr,
                "baseline_ghost": baseline_hr,
                "bp": f"{random.randint(110,130)}/{random.randint(70,90)}",
                "accuracy": round(random.uniform(80.5, 84.9), 1),
                "system_alert": SYSTEM_ALERT_ACTIVE,
                "intervention_active": STABILIZATION_MODE,
                "neural_heatmap": generate_neural_heatmap(),
            }

            TELEMETRY_CACHE.append(hr)
            if len(TELEMETRY_CACHE) > 15:
                TELEMETRY_CACHE.pop(0)

            await websocket.send_text(json.dumps(vitals_data))
            await asyncio.sleep(2)

    except Exception:
        pass


# ---------------- AI ENDPOINT ----------------
@app.post("/ask-ai")
async def ask_ai(data: dict):
    vitals = data.get("vitals", {})
    hr = vitals.get("heart_rate", 0)
    bp = vitals.get("bp", "0/0")
    user_query = data.get("query", "Analyze current status.")

    if hr > 100:
        new_id = max([log["id"] for log in ACCESS_LOGS]) + 1 if ACCESS_LOGS else 1
        ACCESS_LOGS.insert(0, {
            "id": new_id,
            "user": "AI MONITOR",
            "role": "Emergency Protocol",
            "status": "CRITICAL",
            "time": datetime.now().strftime("%H:%M:%S"),
            "action": f"Tachycardia Alert: HR {hr} BPM detected during AI Analysis."
        })

    history_context = "\n".join([f"Interaction: {h}" for h in AI_SESSION_HISTORY])

    try:
        prompt = (
            f"You are a Clinical AI Panel. History: {history_context}\n"
            f"Vitals: HR {hr}, BP {bp}. Query: {user_query}.\n"
            "Provide a brief 'Huddle Response' with a Cardiologist and Neurologist perspective in 2 short sentences."
        )

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )

        report = response.text.strip()

        AI_SESSION_HISTORY.append(f"Q: {user_query} | A: {report}")
        if len(AI_SESSION_HISTORY) > 3:
            AI_SESSION_HISTORY.pop(0)

    except Exception:
        report = f"STABLE: specialist panel suggests monitoring HR {hr} BPM."

    return {"report": report}


# ---------------- IMAGE ANALYSIS ----------------
@app.post("/analyze-scan")
async def analyze_scan(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    contents = await file.read()

    try:
        img = Image.open(io.BytesIO(contents))
        prompt = "Analyze this medical scan image for abnormalities. Provide a concise summary."

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[prompt, img]
        )

        return {
            "analysis": f"Vision Engine: {response.text}",
            "confidence": 0.98
        }

    except Exception as e:
        return {
            "analysis": f"Vision Engine Error: {str(e)}",
            "confidence": 0.0
        }


# ---------------- DIGITAL TWIN ----------------
@app.get("/digital-twin/predict")
async def predict_trend():
    avg_hr = sum(TELEMETRY_CACHE) / len(TELEMETRY_CACHE) if TELEMETRY_CACHE else 75
    spike_risk_pct = round(min(99.0, (avg_hr / 115) * 100), 1)
    visual_warning = spike_risk_pct > 80.0 or SYSTEM_ALERT_ACTIVE

    prediction = [
        {"time": "+30m", "spike_probability": f"{spike_risk_pct}%"},
        {"time": "+1h", "stability": random.randint(85, 95)},
        {"time": "+2h", "stability": random.randint(80, 90)},
    ]

    return {
        "forecast": prediction,
        "risk_level": "CRITICAL" if visual_warning else "Moderate",
        "visual_alert": visual_warning,
        "recommendation": "IMMEDIATE REVIEW REQUIRED" if visual_warning else "Maintain settings."
    }


# ---------------- AUTH ----------------
@app.get("/auth-logs")
async def get_auth_logs():
    return {"logs": ACCESS_LOGS}


@app.post("/auth/scrub-in")
async def scrub_in(auth_data: dict):
    global SCRUB_IN_VERIFIED
    signature = auth_data.get("neural_sig")

    if signature == "VERIFY_THORNE_01":
        SCRUB_IN_VERIFIED = True
        return {"auth": "SUCCESS", "message": "Neural link scrubbed in."}

    raise HTTPException(status_code=403, detail="Biometric Mismatch")


@app.post("/intervention/stabilize")
async def trigger_stabilization():
    global STABILIZATION_MODE, SYSTEM_ALERT_ACTIVE
    STABILIZATION_MODE = True
    SYSTEM_ALERT_ACTIVE = False
    return {"status": "Automated Infusion Active", "target": "75 BPM"}


@app.post("/emergency/code-blue")
async def trigger_code_blue():
    global SYSTEM_ALERT_ACTIVE, STABILIZATION_MODE
    SYSTEM_ALERT_ACTIVE = True
    STABILIZATION_MODE = False
    return {"status": "CODE BLUE ACTIVATED", "system_alert": True}
