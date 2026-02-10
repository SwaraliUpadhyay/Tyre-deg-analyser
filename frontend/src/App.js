import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Brush, Legend, ReferenceLine 
} from 'recharts';

function App() {
  const [allDrivers, setAllDrivers] = useState([]); 
  const [selectedDrivers, setSelectedDrivers] = useState([]); 
  const [multiData, setMultiData] = useState({}); 
  const [circuits, setCircuits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState({ year: '2024', gp: 'Bahrain Grand Prix', session: 'R' });
  const [focusDriver, setFocusDriver] = useState(null);

  const compoundColors = {
    SOFT: '#ff3333',
    MEDIUM: '#ffff00',
    HARD: '#ffffff',
    INTERMEDIATE: '#43b02a',
    WET: '#0067ad',
  };

  useEffect(() => {
    axios.get(`http://127.0.0.1:8000/circuits/${search.year}`).then(res => {
      setCircuits(res.data.circuits);
      if (!res.data.circuits.includes(search.gp)) setSearch(s => ({ ...s, gp: res.data.circuits[0] }));
    });
  }, [search.year]);

  useEffect(() => {
    if (!search.gp) return;
    setLoading(true);
    axios.get(`http://127.0.0.1:8000/drivers/${search.year}/${search.gp}/${search.session}`).then(res => {
      setAllDrivers(res.data.drivers);
      setSelectedDrivers([]); 
      setMultiData({});
      setFocusDriver(null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search.year, search.gp, search.session]);

  const toggleDriver = async (driverObj) => {
    const isSelected = selectedDrivers.find(d => d.abbr === driverObj.abbr);
    if (isSelected) {
      setSelectedDrivers(selectedDrivers.filter(d => d.abbr !== driverObj.abbr));
      const newMultiData = { ...multiData };
      delete newMultiData[driverObj.abbr];
      setMultiData(newMultiData);
      if (focusDriver === driverObj.abbr) setFocusDriver(null);
    } else {
      if (selectedDrivers.length >= 10) return alert("Max 10 drivers");
      setLoading(true);
      try {
        const res = await axios.get(`http://127.0.0.1:8000/deg-data/${search.year}/${search.gp}/${search.session}/${driverObj.abbr}`);
        setMultiData(prev => ({ ...prev, [driverObj.abbr]: res.data.data }));
        setSelectedDrivers(prev => [...prev, driverObj]);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
  };

  const handleFocusToggle = (abbr) => {
    setFocusDriver(prev => (prev === abbr ? null : abbr));
  };

  const getDriverInsights = (abbr) => {
    const laps = multiData[abbr];
    if (!laps || laps.length === 0) return null;
    
    const fastestLapObj = laps.reduce((prev, curr) => (prev.lapTime < curr.lapTime) ? prev : curr);
    const startingTyre = laps[0].compound;
    
    // Determine last session reached in Quali
    const lastPart = laps[laps.length - 1].sessionPart; 
    const isOut = search.session === 'Q' && (lastPart === 'Q1' || lastPart === 'Q2');

    const stops = [];
    for (let i = 1; i < laps.length; i++) {
      if (laps[i].compound !== laps[i - 1].compound) {
        stops.push({ lap: laps[i].lap, from: laps[i-1].compound, to: laps[i].compound });
      }
    }

    return { 
      startingTyre, 
      fastestLap: fastestLapObj.lapTime.toFixed(3), 
      fastestLapNum: fastestLapObj.lap,
      stopCount: stops.length, 
      stops,
      lastPart,
      isOut
    };
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#111', border: '1px solid #444', padding: '10px', borderRadius: '5px' }}>
          <p style={{ margin: '0 0 5px 0', color: '#888', fontWeight: 'bold' }}>LAP {label}</p>
          {payload.map((entry, index) => {
            const isDimmed = focusDriver && focusDriver !== entry.name;
            return (
              <div key={index} style={{ marginBottom: '8px', opacity: isDimmed ? 0.3 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: entry.color, fontWeight: 'bold' }}>{entry.name}:</span>
                  <span>{entry.value.toFixed(3)}s</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      style={{ backgroundColor: '#0b0b0b', color: '#fff', minHeight: '100vh', padding: '40px', fontFamily: '"Segoe UI", sans-serif' }}
      onClick={() => setFocusDriver(null)}
    >
      <style>{`
        .recharts-brush > rect:first-child { fill: #111 !important; stroke: #444 !important; rx: 15; ry: 15; }
        .recharts-brush-slide { fill: #333 !important; fill-opacity: 0.4; rx: 10; ry: 10; }
        .driver-btn { padding: 8px 12px; border-radius: 0px 10px 0px 10px; border: 1px solid #333; background: #1a1a1a; color: #fff; cursor: pointer; transition: 0.2s; font-weight: bold; }
        .driver-btn:hover { border-color: #666; background: #222; }
        .active-driver { border-color: #e10600 !important; background: #e10600 !important; color: white !important; }
        .insight-card { background: #111; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #222; transition: 0.3s; cursor: pointer; }
        .focused-card { border: 1px solid #e10600 !important; box-shadow: 0 0 10px rgba(225, 6, 0, 0.2); }
        .knockout-badge { background: #e10600; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
      `}</style>

      <header style={{ borderLeft: '6px solid #e10600', paddingLeft: '20px', marginBottom: '20px' }}>
        <h1 style={{ letterSpacing: '2px', fontSize: '2rem', margin: 0, fontWeight: 'bold' }}>TYRE DEGRADATION ANALYSER</h1>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <select style={selectStyle} value={search.year} onChange={(e) => setSearch({...search, year: e.target.value})} onClick={(e) => e.stopPropagation()}>
            {['2025', '2024', '2023', '2022'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select style={selectStyle} value={search.gp} onChange={(e) => setSearch({...search, gp: e.target.value})} onClick={(e) => e.stopPropagation()}>
            {circuits.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={selectStyle} value={search.session} onChange={(e) => setSearch({...search, session: e.target.value})} onClick={(e) => e.stopPropagation()}>
            <option value="R">Race</option>
            <option value="Q">Qualifying</option>
          </select>
        </div>
      </header>

      <div style={{ marginBottom: '30px' }} onClick={(e) => e.stopPropagation()}>
        <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>SELECT UP TO 10 DRIVERS:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '15px', background: '#111', borderRadius: '10px' }}>
          {allDrivers.map(d => (
            <button key={d.abbr} className={`driver-btn ${selectedDrivers.find(s => s.abbr === d.abbr) ? 'active-driver' : ''}`} onClick={() => toggleDriver(d)} style={{ borderLeft: `4px solid ${d.color}` }}>{d.abbr}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ flex: 3, background: 'rgba(255,255,255,0.02)', borderRadius: '15px', padding: '30px', border: '1px solid #333', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          {loading && <div style={loadingOverlayStyle}>FETCHING TELEMETRY...</div>}
          <ResponsiveContainer width="100%" height={600}>
            <LineChart margin={{ top: 20, right: 30, left: 40, bottom: 110 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="lap" stroke="#666" type="number" domain={[1, 'dataMax']} interval={0} tickCount={20} minTickGap={5} tick={{fontSize: 11}} />
              <YAxis domain={['auto', 'auto']} stroke="#666" />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36}/>
              
              {search.session === 'Q' && selectedDrivers.length > 0 && (
                (() => {
                  const data = multiData[selectedDrivers[0].abbr] || [];
                  return data.map((lap, i) => {
                    if (i > 0 && lap.sessionPart !== data[i-1].sessionPart) {
                      return <ReferenceLine key={`q-${lap.lap}`} x={lap.lap} stroke="#e10600" strokeWidth={2} label={{ value: lap.sessionPart, position: 'top', fill: '#e10600', fontWeight: 'bold' }} />;
                    }
                    return null;
                  });
                })()
              )}

              {selectedDrivers.map(d => (
                <Line 
                    key={d.abbr} 
                    data={multiData[d.abbr]} 
                    name={d.abbr} 
                    type="monotone" 
                    dataKey="lapTime" 
                    stroke={d.color} 
                    strokeWidth={focusDriver === d.abbr ? 5 : 3} 
                    strokeOpacity={focusDriver && focusDriver !== d.abbr ? 0.1 : 1}
                    dot={false} 
                    activeDot={{ r: 8 }} 
                    onClick={(e) => { e.stopPropagation(); handleFocusToggle(d.abbr); }}
                    style={{ cursor: 'pointer' }}
                />
              ))}
              <Brush height={40} stroke="#444" fill="transparent" y={530} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1, maxHeight: '700px', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
          <h2 style={{ fontSize: '1.2rem', margin: '0', color: '#e10600', letterSpacing: '1px' }}>
            {search.session === 'Q' ? 'QUALIFYING ANALYSIS' : 'RACE STRATEGY'}
          </h2>
          <p style={{ fontSize: '0.7rem', color: '#666', marginBottom: '15px', textTransform: 'uppercase' }}>Click card to toggle Focus Mode</p>
          
          {selectedDrivers.map(d => {
            const info = getDriverInsights(d.abbr);
            if (!info) return null;
            return (
              <div 
                key={d.abbr} 
                className={`insight-card ${focusDriver === d.abbr ? 'focused-card' : ''}`} 
                style={{ borderTop: `3px solid ${d.color}`, opacity: (focusDriver && focusDriver !== d.abbr) ? 0.4 : 1 }}
                onClick={(e) => { e.stopPropagation(); handleFocusToggle(d.abbr); }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{d.abbr}</span>
                  {search.session === 'Q' && info.isOut && <span className="knockout-badge">OUT IN {info.lastPart}</span>}
                  {search.session === 'R' && <span style={{ fontSize: '0.8rem', color: '#888' }}>{info.stopCount}-STOP</span>}
                </div>

                {search.session === 'R' ? (
                  /* RACE VIEW: ORIGINAL STRATEGY CARDS */
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                      <div>
                        <div style={{ color: '#555', textTransform: 'uppercase', fontSize: '0.7rem' }}>Start Tyre</div>
                        <div style={{ fontWeight: 'bold' }}>{info.startingTyre}</div>
                      </div>
                      <div>
                        <div style={{ color: '#555', textTransform: 'uppercase', fontSize: '0.7rem' }}>Fastest Lap</div>
                        <div style={{ fontWeight: 'bold' }}>{info.fastestLap}s</div>
                      </div>
                    </div>
                    {info.stops.length > 0 && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid #222', paddingTop: '8px' }}>
                        <div style={{ color: '#555', textTransform: 'uppercase', fontSize: '0.7rem', marginBottom: '5px' }}>Pit History</div>
                        {info.stops.map((stop, idx) => (
                          <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Lap {stop.lap}:</span>
                            <span style={{ color: '#aaa' }}>{stop.from} ➔ {stop.to}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* QUALI VIEW: PERFORMANCE CARDS */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                    <div>
                      <div style={{ color: '#555', textTransform: 'uppercase', fontSize: '0.7rem' }}>Best Session</div>
                      <div style={{ fontWeight: 'bold' }}>{info.lastPart}</div>
                    </div>
                    <div>
                      <div style={{ color: '#555', textTransform: 'uppercase', fontSize: '0.7rem' }}>Best Lap</div>
                      <div style={{ fontWeight: 'bold', color: '#e10600' }}>{info.fastestLap}s</div>
                      <div style={{ fontSize: '0.7rem', color: '#888' }}>on Lap {info.fastestLapNum}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const selectStyle = { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '10px 15px', borderRadius: '8px', outline: 'none', cursor: 'pointer' };
const loadingOverlayStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: '15px', color: '#e10600', fontWeight: 'bold' };

export default App;