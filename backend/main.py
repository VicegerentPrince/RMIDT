import os
from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scheduler import start_scheduler, run_full_pipeline, get_last_run
from db.supabase_client import get_client


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
    allow_headers=["*"],
)


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


@app.post("/stress-test")
async def stress_test(body: StressTestRequest):
    from ai.reasoning_engine import run_stress_test
    result = run_stress_test(body.scenario)
    return result
