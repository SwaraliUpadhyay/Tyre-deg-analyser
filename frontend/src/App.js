import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// F1 Pirelli Colors
const COMPOUND_COLORS = {
  SOFT: '#ff3333',
  MEDIUM: '#fff200',
  HARD: '#ffffff',
  INTERMEDIATE: '#43b02a',
  WET: '#0067ad'
};

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Make sure your Python backend is running (uvicorn main:app --reload)
    axios.get('http://127.0.0.1:8000/deg-data/2024/Silverstone/VER')
      .then(res => setData(res.data.data))
      .catch(err => console.error("Engine not started!", err));
  }, []);

  return (
    <div style={{ backgroundColor: '#0b0b0b', color: '#fff', minHeight: '100vh', padding: '40px', fontFamily: '"Segoe UI", Roboto, mono' }}>
      <header style={{ borderLeft: '6px solid #e10600', paddingLeft: '20px', marginBottom: '40px' }}>
        <h1 style={{ letterSpacing: '2px', fontSize: '2.5rem', margin: 0 }}>TYRE DEGRADATION <span style={{ fontWeight: 100 }}>// ANALYSER</span></h1>
        <p style={{ color: '#888', marginTop: '5px' }}>CIRCUIT: SILVERSTONE | SESSION: RACE | DRIVER: VERSTAPPEN</p>
      </header>
      
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '15px', padding: '30px', border: '1px solid #333', backdropFilter: 'blur(10px)' }}>
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="lap" stroke="#666" label={{ value: 'LAP NUMBER', position: 'insideBottom', offset: -10, fill: '#666', fontSize: 12 }} />
            <YAxis domain={['auto', 'auto']} stroke="#666" label={{ value: 'LAP TIME (s)', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #e10600', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Line 
              type="monotone" 
              dataKey="lapTime" 
              stroke="#e10600" 
              strokeWidth={4} 
              dot={(props) => {
                const { payload, cx, cy } = props;
                return <circle cx={cx} cy={cy} r={6} fill={COMPOUND_COLORS[payload.compound] || '#888'} stroke="#000" />;
              }}
              activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default App;