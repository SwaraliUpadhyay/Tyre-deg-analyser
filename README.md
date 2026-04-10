# Tyre Degradation Analyser

A full-stack web application for analyzing Formula 1 tire degradation patterns in races or qualifyings across drivers, circuits, and seasons.

## Overview

Tyre Degradation Analyser is a tool that leverages FastF1 data to provide insights into how tire compounds degrade throughout a race session. The application visualizes tire performance metrics, lap times, and degradation trends with interactive charts.

## Features

- 📊 **Interactive Visualizations**: Recharts-based dashboards for tire degradation analysis
- 🏎️ **Multi-Driver Support**: Compare tire degradation patterns across multiple drivers
- 🌍 **Season & Circuit Selection**: Browse any F1 season and circuit with real race data
- 📈 **Global & Individual Metrics**: View both global circuit degradation and driver-specific trends
- 🌡️ **Weather Data Integration**: Correlate weather conditions with tire performance
- 🔄 **Real-time Data**: Powered by FastF1 for up-to-date F1 telemetry and race data

### Frontend
- **React 19.2.4**: Modern UI framework
- **Axios**: HTTP client for API communication
- **Recharts 3.7.0**: Interactive charting library
- **React Scripts 5.0.1**: Create React App tooling

### Backend
- **FastAPI**: High-performance Python web framework
- **FastF1**: F1 data and telemetry library
- **Pandas & NumPy**: Data manipulation and analysis
- **SciPy**: Statistical analysis for degradation calculations
- **CORS Middleware**: Cross-origin request support

## Project Structure
Tyre-Deg-Analyser/
│
├── frontend/                 # React application
│   ├── src/                  # React components and pages
│   ├── public/               # Static assets
│   ├── package.json          # NPM dependencies
│   └── README.md             # Frontend setup guide
│
├── backend/                  # FastAPI server
│   └── main.py               # API endpoints and logic
│
└── .gitignore                # Git ignore rules


## Getting Started

### Prerequisites
- Node.js (v14+) for frontend
- Python 3.8+ for backend
- pip package manager

### Backend Setup

1. Navigate to the backend directory:
cd backend

2.Install dependencies:
pip install fastapi uvicorn fastf1 pandas numpy scipy python-multipart

3. Activate python environment
   .\venv\Scripts\activate
   
4.Start the FastAPI server:
uvicorn main:app --reload

### Frontend Setup
1.Navigate to the frontend directory:
cd frontend

2.Install dependencies:
npm install

3.Start the development server:
npm start


## Data Source
Data is sourced from FastF1, which provides access to F1 telemetry, session results, and race statistics.

## Disclaimer
This project is a fan-made tool and is not affiliated with Formula 1 or any official F1 sources.
