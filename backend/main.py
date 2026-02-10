import fastf1
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/circuits/{year}")
def get_circuits(year: int):
    schedule = fastf1.get_event_schedule(year)
    gps = schedule[schedule['EventFormat'] != 'testing']['EventName'].tolist()
    return {"circuits": gps}

@app.get("/drivers/{year}/{gp}/{session_type}")
def get_drivers(year: int, gp: str, session_type: str):
    session = fastf1.get_session(year, gp, session_type)
    session.load(laps=False, telemetry=False, weather=False)
    
    driver_list = []
    for _, row in session.results.iterrows():
        driver_list.append({
            "abbr": row['Abbreviation'],
            "team": row['TeamName'],
            "color": f"#{row['TeamColor']}" if row['TeamColor'] else "#888888"
        })
    return {"drivers": driver_list}

@app.get("/deg-data/{year}/{gp}/{session_type}/{driver}")
def get_tyre_data(year: int, gp: str, session_type: str, driver: str):
    session = fastf1.get_session(year, gp, session_type)
    session.load(laps=True, telemetry=False, weather=False)
    
    # We use pick_accurate to ensure we have valid lap times
    driver_laps = session.laps.pick_driver(driver).pick_accurate()
    
    results = []
    for _, lap in driver_laps.iterrows():
        # IMPORTANT: Force sessionPart to a string to ensure frontend can read it
        s_part = str(lap['SessionPart']) if 'SessionPart' in lap else 'R'
        
        results.append({
            "lap": int(lap['LapNumber']),
            "lapTime": float(lap['LapTime'].total_seconds()),
            "compound": str(lap['Compound']),
            "sessionPart": s_part
        })
    return {"data": results}