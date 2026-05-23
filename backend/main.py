import os
from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scheduler import start_scheduler, run_full_pipeline, get_last_run, get_settings, update_settings
from db.supabase_client import get_client
from ai.api_key import set_request_key, reset_request_key


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield


app = FastAPI(title="RMIDT Brain", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Gemini-API-Key"],
    expose_headers=["*"],
)


@app.middleware("http")
async def gemini_key_middleware(request: Request, call_next):
    """Inject X-Gemini-API-Key header value into the per-request ContextVar."""
    key = request.headers.get("x-gemini-api-key") or request.headers.get("X-Gemini-API-Key")
    token = set_request_key(key or None)
    try:
        response = await call_next(request)
    finally:
        reset_request_key(token)
    return response


@app.get("/health")
async def health():
    return {"status": "ok", "pipeline": get_last_run()}


@app.get("/pipeline/run")
async def trigger_pipeline():
    result = await run_full_pipeline()
    return result


@app.get("/regime/latest")
async def regime_latest():
    db = get_client()
    result = (
        db.table("regime_classifications")
        .select("*")
        .order("classified_at", desc=True)
        .limit(10)
        .execute()
    )
    return {"data": result.data}


@app.get("/predictions/latest")
async def predictions_latest(limit: int = 20):
    db = get_client()
    result = (
        db.table("predictions")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"data": result.data}


@app.get("/market/snapshot")
async def market_snapshot():
    db = get_client()
    result = (
        db.table("market_data")
        .select("*")
        .order("captured_at", desc=True)
        .limit(100)
        .execute()
    )
    return {"data": result.data}


class StressTestRequest(BaseModel):
    scenario: str
    user_id: str | None = None


@app.post("/stress-test")
async def stress_test(body: StressTestRequest):
    from ai.reasoning_engine import run_stress_test
    result = run_stress_test(body.scenario, user_id=body.user_id)
    return result


class ChatRequest(BaseModel):
    question: str


@app.post("/chat")
async def chat(body: ChatRequest):
    from ai.chat_engine import answer_question
    result = answer_question(body.question)
    return result


class AgentRequest(BaseModel):
    task: str


@app.post("/agent/run")
async def agent_run(body: AgentRequest):
    from ai.agent import run_agent
    result = run_agent(body.task)
    return result


@app.get("/pipeline/info")
async def pipeline_info():
    from ml.regime_detector import preprocessor
    return preprocessor.get_info()


class SettingsUpdate(BaseModel):
    ai_enabled: bool


@app.get("/settings")
async def settings_get():
    return get_settings()


@app.post("/settings")
async def settings_update(body: SettingsUpdate):
    update_settings({"ai_enabled": body.ai_enabled})
    return get_settings()


@app.get("/news/latest")
async def news_latest(limit: int = 30):
    db = get_client()
    result = (
        db.table("news_headlines")
        .select("*")
        .order("captured_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"data": result.data}
