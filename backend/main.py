from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import pandas as pd

app = FastAPI()

# This allows your JS frontend to talk to this Python backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/deg-data/{year}/{gp}/{driver}")
def get_tyre_data(year: int, gp: str, driver: str):
    # 1. Load the F1 Session
    session = fastf1.get_session(year, gp, 'R')
    session.load(laps=True, telemetry=False, weather=False)
    
    # 2. Get laps for the specific driver
    driver_laps = session.laps.pick_driver(driver).pick_accurate()
    
    # 3. Clean the data for the frontend
    # We want LapNumber, TyreLife (age), and LapTime in seconds
    results = []
    for _, lap in driver_laps.iterrows():
        results.append({
            "lap": int(lap['LapNumber']),
            "tyreAge": int(lap['TyreLife']),
            "lapTime": lap['LapTime'].total_seconds(),
            "compound": lap['Compound']
        })
        
    return {"driver": driver, "data": results}