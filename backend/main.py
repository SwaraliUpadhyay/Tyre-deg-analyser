import fastf1
import gc
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from scipy import stats

# Enable cache to avoid re-downloading data
cache_dir = "/tmp/fastf1_cache"
os.makedirs(cache_dir, exist_ok=True)
fastf1.Cache.enable_cache(cache_dir)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/circuits/{year}")
def get_circuits(year: int):
    try:
        schedule = fastf1.get_event_schedule(year)
        gps = schedule[schedule['EventFormat'] != 'testing']['EventName'].tolist()
        return {"circuits": gps}
    except Exception as e:
        return {"error": str(e), "circuits": []}
    finally:
        gc.collect()

@app.get("/drivers/{year}/{gp}/{identifier}")
def get_drivers(year: int, gp: str, identifier: str):
    session = None
    try:
        session = fastf1.get_session(year, gp, identifier)
        session.load(laps=False, telemetry=False, weather=False)
        
        driver_list = []
        if hasattr(session, 'results') and not session.results.empty:
            for _, row in session.results.iterrows():
                pos = row['Position']
                driver_list.append({
                    "abbr": row['Abbreviation'],
                    "team": row['TeamName'],
                    "color": f"#{row['TeamColor']}" if row['TeamColor'] else "#888888",
                    "position": int(pos) if not pd.isna(pos) else 0
                })
        return {"drivers": driver_list}
    except Exception as e:
        print(f"Error loading drivers: {e}")
        return {"drivers": []}
    finally:
        del session
        gc.collect()

@app.get("/deg-data/{year}/{gp}/{identifier}/{driver}")
def get_tyre_data(year: int, gp: str, identifier: str, driver: str):
    session = None
    try:
        session = fastf1.get_session(year, gp, identifier)
        session.load(laps=True, telemetry=False, weather=False)
        
        driver_laps = session.laps.pick_driver(driver).pick_accurate()
        
        results = []
        for _, lap in driver_laps.iterrows():
            tyre_life = lap['TyreLife'] if 'TyreLife' in lap and not pd.isna(lap['TyreLife']) else 0
            speed_st = lap['SpeedST'] if 'SpeedST' in lap and not pd.isna(lap['SpeedST']) else 0
            results.append({
                "lap": int(lap['LapNumber']),
                "lapTime": float(lap['LapTime'].total_seconds()),
                "compound": str(lap['Compound']),
                "tyreLife": int(tyre_life),
                "speedST": float(speed_st)
            })
        return {"data": results}
    except Exception as e:
        print(f"Error loading tyre data for {driver}: {e}")
        return {"data": []}
    finally:
        del session
        gc.collect()

@app.get("/global-deg/{year}/{gp}/{identifier}")
def get_global_deg(year: int, gp: str, identifier: str):
    session = None
    try:
        session = fastf1.get_session(year, gp, identifier)
        session.load(laps=True, telemetry=False, weather=False)
        
        laps = session.laps.pick_accurate().pick_wo_box()
        compound_stats = []
        
        for compound in laps['Compound'].unique():
            if not compound:
                continue
            
            comp_laps = laps[laps['Compound'] == compound]
            if len(comp_laps) < 10:
                continue

            x = comp_laps['TyreLife'].values
            y = comp_laps['LapTime'].dt.total_seconds().values
            
            mask = ~np.isnan(x) & ~np.isnan(y)
            if np.sum(mask) < 10:
                continue
                
            slope, intercept, r_value, p_value, std_err = stats.linregress(x[mask], y[mask])
            
            compound_stats.append({
                "compound": str(compound),
                "avgSlope": float(slope),
                "sampleSize": int(len(comp_laps))
            })
            
        return {"globalDeg": compound_stats}
    except Exception as e:
        print(f"Error calculating global deg: {e}")
        return {"globalDeg": []}
    finally:
        del session
        gc.collect()

@app.get("/weather/{year}/{gp}/{identifier}")
def get_weather(year: int, gp: str, identifier: str):
    session = None
    try:
        session = fastf1.get_session(year, gp, identifier)
        session.load(laps=True, telemetry=False, weather=True)
        
        weather_df = session.laps.get_weather_data()
        
        if weather_df.empty:
            return {"weather": []}

        grouped = weather_df.groupby('LapNumber')[['TrackTemp', 'AirTemp', 'Humidity']].mean().reset_index()
        
        results = []
        for _, row in grouped.iterrows():
            if pd.isna(row['TrackTemp']) or pd.isna(row['AirTemp']):
                continue
            results.append({
                "lap": int(row['LapNumber']),
                "trackTemp": float(row['TrackTemp']),
                "airTemp": float(row['AirTemp']),
                "humidity": float(row['Humidity'])
            })
        
        return {"weather": results}
    except Exception as e:
        print(f"Error loading weather: {e}")
        return {"weather": []}
    finally:
        del session
        gc.collect()

@app.get("/health")
def health():
    return {"status": "ok"}
