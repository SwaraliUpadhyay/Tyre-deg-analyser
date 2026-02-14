import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Brush, Legend, ReferenceLine,
  BarChart, Bar, Cell, AreaChart, Area
} from 'recharts';

// ==========================================================
// 1. UI HELPER COMPONENTS
// ==========================================================

const CustomTooltip = ({ active, payload, label, focusDriver, getDriverInsights, compoundColors }) => {
  if (active && payload && payload.length) {
    return (
      <div style={styles.tooltipContainer}>
        <p style={styles.tooltipHeader}>LAP {label}</p>
        {payload.map((entry, index) => {
          if (entry.dataKey === 'ghost') {
             return (
               <div key="ghost" style={{ marginBottom: '8px', borderBottom: '1px dashed #666', paddingBottom: '4px' }}>
                 <span style={{ color: '#aaa', fontWeight: 'bold' }}>GHOST ({entry.name}): </span>
                 <span style={{ color: '#fff' }}>{entry.value.toFixed(3)}s</span>
               </div>
             );
          }
          
          // Weather Tooltip
          if (entry.dataKey === 'trackTemp' || entry.dataKey === 'airTemp') {
            return (
               <div key={index} style={{ marginBottom: '4px' }}>
                 <span style={{ color: entry.color, fontWeight: 'bold' }}>{entry.name}: </span>
                 <span style={{ color: '#fff' }}>{entry.value.toFixed(1)}°C</span>
               </div>
            );
          }

          const isDimmed = focusDriver && focusDriver !== entry.name;
          const driverInfo = getDriverInsights(entry.name);
          const pitStop = driverInfo?.stops.find(s => s.lap === label);
          const tyreLife = entry.payload.tyreLife;
          const isTraffic = entry.payload.isTraffic;
          const speed = entry.payload.speedST;

          return (
            <div key={index} style={{ marginBottom: '8px', opacity: isDimmed ? 0.3 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: entry.color, fontWeight: 'bold' }}>{entry.name}:</span>
                  <span style={{ fontWeight: 'bold' }}>{entry.value.toFixed(3)}s</span>
                  <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '5px' }}>
                     (Age: {tyreLife}L) {speed > 0 && `| ${speed.toFixed(0)} km/h`}
                  </span>
                  {isTraffic && <span style={{ color: '#ffa500', fontSize: '10px', fontWeight: 'bold' }}>⚠ TRAFFIC</span>}
                </div>
                
                {pitStop && (
                  <span style={{ 
                    ...styles.pitBadge,
                    backgroundColor: compoundColors[pitStop.to] || '#444', 
                    color: (pitStop.to === 'HARD' || pitStop.to === 'MEDIUM') ? '#000' : '#fff',
                  }}>
                    {pitStop.from} ➔ {pitStop.to}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const CustomizedDot = (props) => {
  const { cx, cy, payload, showTraffic, showDRS } = props;
  
  if (showTraffic && payload.isTraffic) {
    return (
      <svg x={cx - 5} y={cy - 5} width={10} height={10} fill="#ffa500" viewBox="0 0 1024 1024">
        <path d="M512 64l448 896H64L512 64zm0 640c-35.3 0-64 28.7-64 64s28.7 64 64 64 64-28.7 64-64-28.7-64-64-64zm0-448c-35.3 0-64 28.7-64 64v256c0 35.3 28.7 64 64 64s64-28.7 64-64V320c0-35.3-28.7-64-64-64z" />
      </svg>
    );
  }

  // DRS / High Speed Indicator
  if (showDRS && payload.speedST > 300) {
    // Determine opacity/color intensity based on speed. Max speed roughly 350.
    // 300 -> 0.2 opacity, 340+ -> 1.0 opacity
    const intensity = Math.min(1, Math.max(0.2, (payload.speedST - 280) / 70));
    return (
      <circle cx={cx} cy={cy} r={3} fill={`rgba(0, 255, 255, ${intensity})`} stroke="none" />
    );
  }

  return null;
};

const DriverInsightCard = ({ driver, info, isFocused, isQualy, onToggle }) => {
  if (!info) return null;
  const getStatusText = () => {
    if (!isQualy) return `${driver.position ? 'P' + driver.position : ''}`; 
    if (driver.position > 15) return 'Knocked out in Q1';
    if (driver.position > 10) return 'Knocked out in Q2';
    return 'Q3 Finalist';
  };
  
  return (
    <div 
      className={`insight-card ${isFocused ? 'focused-card' : ''}`} 
      style={{ borderTop: `3px solid ${driver.color}`, opacity: isFocused ? 1 : 0.6 }}
      onClick={(e) => { e.stopPropagation(); onToggle(driver.abbr); }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{driver.abbr}</span>
        {!isQualy && <span style={{ fontSize: '0.8rem', color: '#888' }}>{info.stopCount}-STOP</span>}
        {isQualy && <span className="knockout-badge">{getStatusText()}</span>}
      </div>
      <div style={styles.cardGrid}>
        <div>
          <div style={styles.labelSmall}>{isQualy ? 'Finish Pos' : 'Start Tyre'}</div>
          <div style={{ fontWeight: 'bold' }}>
            {isQualy ? `P${driver.position}` : info.startingTyre}
          </div>
          {!isQualy && (
            <div style={{ fontSize: '0.7rem', color: info.startStatus === 'NEW' ? '#43b02a' : '#e10600' }}>
              {info.startStatus}
            </div>
          )}
        </div>
        <div>
          <div style={styles.labelSmall}>Fastest Lap</div>
          <div style={{ fontWeight: 'bold' }}>{info.fastestLap}s</div>
        </div>
      </div>
      {!isQualy && info.stops.length > 0 && (
        <div style={styles.pitHistoryContainer}>
          <div style={styles.labelSmall}>Pit History</div>
          {info.stops.map((stop, idx) => (
            <div key={idx} style={styles.pitHistoryRow}>
              <span>Lap {stop.lap}:</span>
              <span>
                <span style={{ color: '#aaa' }}>{stop.from} ➔ {stop.to}</span>
                <span style={{ 
                  fontSize: '0.65rem', marginLeft: '5px',
                  color: stop.tyreStatus === 'NEW' ? '#43b02a' : '#e10600',
                  border: '1px solid #333', padding: '1px 3px', borderRadius: '3px'
                }}>
                  {stop.tyreStatus}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================================
// 2. MAIN APPLICATION
// ==========================================================

function App() {
  const [allDrivers, setAllDrivers] = useState([]);
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [multiData, setMultiData] = useState({});
  const [weatherData, setWeatherData] = useState([]);
  const [globalDegData, setGlobalDegData] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState({ year: '2024', gp: 'Bahrain Grand Prix', session: 'R' });
  const [focusDriver, setFocusDriver] = useState(null);
  
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [ghostDriver, setGhostDriver] = useState(null);
  const [ghostData, setGhostData] = useState([]);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showDRS, setShowDRS] = useState(false);

  const API_URL = 'http://127.0.0.1:8000';
  const compoundColors = { SOFT: '#ff3333', MEDIUM: '#ffff00', HARD: '#ffffff', INTERMEDIATE: '#43b02a', WET: '#0067ad' };

  // --- DATA FETCHING ---

  useEffect(() => {
    axios.get(`${API_URL}/circuits/${search.year}`)
      .then(res => {
        setCircuits(res.data.circuits);
        if (res.data.circuits.length > 0 && !res.data.circuits.includes(search.gp)) {
          setSearch(s => ({ ...s, gp: res.data.circuits[0] }));
        }
      })
      .catch(err => console.error("Error fetching circuits:", err));
  }, [search.year]);

  useEffect(() => {
    if (!search.gp) return;
    setLoading(true);
    // Fetch drivers
    axios.get(`${API_URL}/drivers/${search.year}/${search.gp}/${search.session}`)
      .then(res => {
        setAllDrivers(res.data.drivers);
        setSelectedDrivers([]);
        setMultiData({});
        setFocusDriver(null);
        setGhostDriver(null);
        setGhostData([]);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching drivers:", err);
        setLoading(false);
      });

    // Fetch Weather Data
    axios.get(`${API_URL}/weather/${search.year}/${search.gp}/${search.session}`)
      .then(res => setWeatherData(res.data.weather))
      .catch(err => console.error("Error fetching weather:", err));

    // Fetch Global Degradation Stats (All Drivers)
    axios.get(`${API_URL}/global-deg/${search.year}/${search.gp}/${search.session}`)
      .then(res => {
        const formatted = res.data.globalDeg.map(d => ({
            ...d,
            color: compoundColors[d.compound] || '#888'
        }));
        setGlobalDegData(formatted);
      })
      .catch(err => console.error("Error fetching global deg:", err));

  }, [search.year, search.gp, search.session]);

  useEffect(() => {
    if (ghostDriver) {
      if (multiData[ghostDriver]) {
        setGhostData(multiData[ghostDriver]);
      } else {
        axios.get(`${API_URL}/deg-data/${search.year}/${search.gp}/${search.session}/${ghostDriver}`)
          .then(res => setGhostData(res.data.data))
          .catch(e => console.error("Ghost fetch error", e));
      }
    } else {
      setGhostData([]);
    }
  }, [ghostDriver, multiData, search]);

  const toggleDriver = async (driverObj) => {
    const isSelected = selectedDrivers.find(d => d.abbr === driverObj.abbr);
    if (isSelected) {
      setSelectedDrivers(selectedDrivers.filter(d => d.abbr !== driverObj.abbr));
      const { [driverObj.abbr]: _, ...rest } = multiData;
      setMultiData(rest);
      if (focusDriver === driverObj.abbr) setFocusDriver(null);
    } else {
      if (selectedDrivers.length >= 10) return alert("Max 10 drivers");
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/deg-data/${search.year}/${search.gp}/${search.session}/${driverObj.abbr}`);
        const processedData = detectTraffic(res.data.data);
        setMultiData(prev => ({ ...prev, [driverObj.abbr]: processedData }));
        setSelectedDrivers(prev => [...prev, driverObj]);
      } catch (e) { 
        console.error(e); 
        alert(`Could not load data for ${driverObj.abbr}`);
      }
      setLoading(false);
    }
  };

  // --- ANALYTICS LOGIC ---

  const detectTraffic = (laps) => {
    if (!laps || laps.length < 5) return laps;
    const lapsWithTraffic = laps.map((lap, i) => {
      if (i === 0 || lap.lapTime > 150) return lap;
      const prev = laps[i-1];
      const next = laps[i+1];
      let neighbors = [prev.lapTime];
      if (next) neighbors.push(next.lapTime);
      const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
      const isTraffic = lap.lapTime > (avgNeighbor * 1.07);
      return { ...lap, isTraffic };
    });
    return lapsWithTraffic;
  };

  const getDriverInsights = (abbr) => {
    const laps = multiData[abbr];
    if (!laps || laps.length === 0) return null;
    const fastestLapObj = laps.reduce((prev, curr) => (prev.lapTime < curr.lapTime) ? prev : curr);
    const stops = [];
    const getTyreStatus = (life) => life < 4 ? "NEW" : `USED (${life}L)`;
    const startLife = laps[0].tyreLife;
    const startStatus = getTyreStatus(startLife);
    for (let i = 1; i < laps.length; i++) {
      if (laps[i].compound !== laps[i - 1].compound) {
        stops.push({ 
          lap: laps[i].lap, 
          from: laps[i - 1].compound, 
          to: laps[i].compound,
          tyreStatus: getTyreStatus(laps[i].tyreLife)
        });
      }
    }
    return {
      startingTyre: laps[0].compound,
      startStatus: startStatus,
      fastestLap: fastestLapObj.lapTime.toFixed(3),
      fastestLapNum: fastestLapObj.lap,
      stopCount: stops.length,
      stops
    };
  };

  const calculateDegradationSlopes = () => {
    const slopeData = [];
    selectedDrivers.forEach(driver => {
      const laps = multiData[driver.abbr];
      if (!laps || laps.length < 3) return;
      let currentStint = [];
      let currentCompound = laps[0].compound;
      laps.forEach((lap, idx) => {
        if (lap.compound === currentCompound) currentStint.push(lap);
        if (lap.compound !== currentCompound || idx === laps.length - 1) {
          if (currentStint.length > 3) {
            const n = currentStint.length;
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            currentStint.forEach((l, i) => {
              const x = i; const y = l.lapTime;
              sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
            });
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            slopeData.push({
              driver: driver.abbr,
              compound: currentCompound,
              color: driver.color,
              slope: Math.max(0, slope),
              label: `${driver.abbr} (${currentCompound})`
            });
          }
          currentStint = [lap];
          currentCompound = lap.compound;
        }
      });
    });
    return slopeData;
  };

  const degSlopes = calculateDegradationSlopes();

  return (
    <div style={styles.appContainer} onClick={() => setFocusDriver(null)}>
      <style>{globalCSS}</style>

      {/* HEADER */}
      <header style={styles.header}>
        <h1 style={{ letterSpacing: '2px', fontSize: '2rem', margin: 0, fontWeight: 'bold' }}>TYRE DEGRADATION ANALYSER</h1>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <select style={styles.select} value={search.year} onChange={(e) => setSearch({ ...search, year: e.target.value })} onClick={e => e.stopPropagation()}>
            {['2025', '2024', '2023', '2022', '2021'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select style={styles.select} value={search.gp} onChange={(e) => setSearch({ ...search, gp: e.target.value })} onClick={e => e.stopPropagation()}>
            {circuits.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={styles.select} value={search.session} onChange={(e) => setSearch({ ...search, session: e.target.value })} onClick={e => e.stopPropagation()}>
            <option value="R">Race</option>
            <option value="Q">Qualifying</option>
          </select>
        </div>
      </header>

      {/* DRIVER SELECT */}
      <div style={styles.selectionBar} onClick={e => e.stopPropagation()}>
        <p style={styles.labelSmallBold}>SELECT UP TO 10 DRIVERS:</p>
        <div style={styles.btnGrid}>
          {allDrivers.length === 0 && !loading && <span style={{color: '#666'}}>No drivers found for this session.</span>}
          {allDrivers.map(d => (
            <button 
              key={d.abbr} 
              className={`driver-btn ${selectedDrivers.find(s => s.abbr === d.abbr) ? 'active-driver' : ''}`} 
              onClick={() => toggleDriver(d)} 
              style={{ borderLeft: `4px solid ${d.color}` }}
            >
              {d.abbr}
            </button>
          ))}
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{ marginBottom: '20px' }} onClick={e => e.stopPropagation()}>
        <div 
          style={{ ...styles.analysisHeader, backgroundColor: showAnalysis ? '#222' : '#111' }} 
          onClick={() => setShowAnalysis(!showAnalysis)}
        >
          <span style={{ fontWeight: 'bold', color: showAnalysis ? '#fff' : '#888' }}>
            {showAnalysis ? '▼' : '▶'} ANALYSIS CONTROLS
          </span>
          {!showAnalysis && <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#555' }}>Ghost Lap, Traffic, DRS...</span>}
        </div>
        
        {showAnalysis && (
          <div style={styles.analysisPanel}>
            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>GHOST REFERENCE:</label>
              <select 
                style={styles.controlSelect} 
                value={ghostDriver || ''} 
                onChange={(e) => setGhostDriver(e.target.value || null)}
              >
                <option value="">None (Select to compare)</option>
                {allDrivers.map(d => <option key={d.abbr} value={d.abbr}>{d.abbr} - {d.team}</option>)}
              </select>
            </div>
            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>
                <input 
                  type="checkbox" 
                  checked={showTraffic} 
                  onChange={() => setShowTraffic(!showTraffic)} 
                  style={{ marginRight: '8px' }}
                />
                SHOW TRAFFIC (ORANGE)
              </label>
              <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px' }}>
                Highlights laps 7% slower than pace.
              </div>
            </div>
            {/* NEW DRS / SPEED CONTROL */}
            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>
                <input 
                  type="checkbox" 
                  checked={showDRS} 
                  onChange={() => setShowDRS(!showDRS)} 
                  style={{ marginRight: '8px' }}
                />
                SHOW SPEED / DRS (CYAN)
              </label>
              <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px' }}>
                Highlights high-speed zones (proxy for DRS).
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* CHART COLUMN */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. MAIN LAP TIME CHART */}
          <div style={styles.chartWrapper} onClick={e => e.stopPropagation()}>
            <h3 style={styles.chartTitle}>LAP TIME TRENDS</h3>
            {loading && <div style={styles.loadingOverlay}>FETCHING TELEMETRY...</div>}
            <ResponsiveContainer width="100%" height={450}>
              <LineChart margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="lap" stroke="#666" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} stroke="#666" />
                <Tooltip content={<CustomTooltip focusDriver={focusDriver} getDriverInsights={getDriverInsights} compoundColors={compoundColors} />} />
                <Legend verticalAlign="top" height={36} />
                
                {/* PIT STOP LINES */}
                {selectedDrivers.map(d => {
                  const info = getDriverInsights(d.abbr);
                  if (!info) return null;
                  return info.stops.map((stop, idx) => (
                    <ReferenceLine 
                      key={`${d.abbr}-stop-${idx}`} 
                      x={stop.lap} 
                      stroke={d.color} 
                      strokeDasharray="3 3" 
                      strokeWidth={2}
                      label={{ value: 'PIT', position: 'insideTop', fill: d.color, fontSize: 10 }}
                    />
                  ));
                })}

                {ghostDriver && ghostData.length > 0 && (
                   <Line data={ghostData} name={ghostDriver} dataKey="lapTime" type="monotone" stroke="#666" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} key="ghost" />
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
                    dot={<CustomizedDot showTraffic={showTraffic} showDRS={showDRS} />}
                    onClick={(e) => { e.stopPropagation(); setFocusDriver(focusDriver === d.abbr ? null : d.abbr); }}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
                <Brush height={30} stroke="#444" fill="transparent" y={410} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 2. DRIVER DEGRADATION (VERTICAL BARS) */}
          <div style={styles.chartWrapper} onClick={e => e.stopPropagation()}>
            <h3 style={styles.chartTitle}>DEGRADATION SLOPE BY DRIVER (S/LAP)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={degSlopes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="label" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis stroke="#666" />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #444', color: '#fff' }}
                  formatter={(value) => [`${value.toFixed(2)} s/lap`, 'Degradation']}
                />
                <Bar dataKey="slope">
                  {degSlopes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 3. AVG DEGRADATION BY COMPOUND (GLOBAL) */}
          <div style={styles.chartWrapper} onClick={e => e.stopPropagation()}>
            <h3 style={styles.chartTitle}>AVG DEGRADATION BY COMPOUND (ALL DRIVERS)</h3>
            <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '-10px' }}>
              Calculated using regression on all accurate laps in the session.
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={globalDegData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="compound" stroke="#666" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                <YAxis stroke="#666" />
                <Tooltip 
                   cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                   contentStyle={{ backgroundColor: '#111', border: '1px solid #444', color: '#fff' }}
                   formatter={(value) => [`${value.toFixed(2)} s/lap`, 'Avg Slope']}
                />
                <Bar dataKey="avgSlope" barSize={60}>
                  {globalDegData.map((entry, index) => (
                    <Cell key={`cell-c-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 4. WEATHER CHART */}
          <div style={styles.chartWrapper} onClick={e => e.stopPropagation()}>
            <h3 style={styles.chartTitle}>WEATHER EVOLUTION</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weatherData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrack" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7300" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ff7300" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00c9ff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00c9ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="lap" stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Lap', position: 'insideBottomRight', offset: -5 }} />
                <YAxis stroke="#666" unit="°C" />
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" />
                <Area type="monotone" dataKey="trackTemp" stroke="#ff7300" fillOpacity={1} fill="url(#colorTrack)" name="Track Temp" />
                <Area type="monotone" dataKey="airTemp" stroke="#00c9ff" fillOpacity={1} fill="url(#colorAir)" name="Air Temp" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* SIDEBAR */}
        <div style={{ flex: 1, maxHeight: '1600px', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          <h2 style={styles.sidebarTitle}>{search.session === 'Q' ? 'QUALIFYING ANALYSIS' : 'RACE STRATEGY'}</h2>
          <p style={styles.sidebarSubtitle}>Click card to focus</p>
          {selectedDrivers.map(d => (
            <DriverInsightCard 
              key={d.abbr} 
              driver={d} 
              info={getDriverInsights(d.abbr)} 
              isFocused={focusDriver === d.abbr}
              isQualy={search.session === 'Q'}
              onToggle={setFocusDriver}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  appContainer: { backgroundColor: '#0b0b0b', color: '#fff', minHeight: '100vh', padding: '40px', fontFamily: '"Segoe UI", sans-serif' },
  header: { borderLeft: '6px solid #e10600', paddingLeft: '20px', marginBottom: '20px' },
  select: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '10px 15px', borderRadius: '8px', outline: 'none', cursor: 'pointer' },
  selectionBar: { marginBottom: '30px' },
  btnGrid: { display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '15px', background: '#111', borderRadius: '10px' },
  chartWrapper: { background: 'rgba(255,255,255,0.02)', borderRadius: '15px', padding: '25px', border: '1px solid #333', position: 'relative' },
  chartTitle: { margin: '0 0 20px 0', fontSize: '1rem', color: '#e10600', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: '15px', color: '#e10600', fontWeight: 'bold' },
  tooltipContainer: { backgroundColor: '#111', border: '1px solid #444', padding: '10px', borderRadius: '5px' },
  tooltipHeader: { margin: '0 0 5px 0', color: '#888', fontWeight: 'bold' },
  pitBadge: { padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '900', marginLeft: '5px', border: '1px solid #555' },
  sidebarTitle: { fontSize: '1.2rem', margin: '0', color: '#e10600', letterSpacing: '1px' },
  sidebarSubtitle: { fontSize: '0.7rem', color: '#666', marginBottom: '15px', textTransform: 'uppercase' },
  cardGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' },
  labelSmall: { color: '#555', textTransform: 'uppercase', fontSize: '0.7rem' },
  labelSmallBold: { color: '#888', fontSize: '0.8rem', marginBottom: '10px', fontWeight: 'bold', letterSpacing: '1px' },
  pitHistoryContainer: { marginTop: '12px', borderTop: '1px solid #222', paddingTop: '8px' },
  pitHistoryRow: { fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  analysisHeader: { padding: '15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #333', transition: '0.2s' },
  analysisPanel: { backgroundColor: '#161616', padding: '20px', border: '1px solid #333', borderTop: 'none', borderRadius: '0 0 8px 8px', display: 'flex', gap: '30px', flexWrap: 'wrap' },
  controlGroup: { display: 'flex', flexDirection: 'column', minWidth: '200px' },
  controlLabel: { fontSize: '0.8rem', fontWeight: 'bold', color: '#ccc', marginBottom: '8px', display: 'flex', alignItems: 'center' },
  controlSelect: { background: '#222', border: '1px solid #444', color: '#fff', padding: '8px', borderRadius: '5px' }
};

const globalCSS = `
  .recharts-brush > rect:first-child { fill: #111 !important; stroke: #444 !important; rx: 15; ry: 15; }
  .recharts-brush-slide { fill: #333 !important; fill-opacity: 0.4; rx: 10; ry: 10; }
  .driver-btn { padding: 8px 12px; border-radius: 0px 10px 0px 10px; border: 1px solid #333; background: #1a1a1a; color: #fff; cursor: pointer; transition: 0.2s; font-weight: bold; }
  .driver-btn:hover { border-color: #666; background: #222; }
  .active-driver { border-color: #e10600 !important; background: #e10600 !important; color: white !important; }
  .insight-card { background: #111; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #222; transition: 0.3s; cursor: pointer; }
  .focused-card { border: 1px solid #e10600 !important; box-shadow: 0 0 10px rgba(225, 6, 0, 0.2); }
  .knockout-badge { background: #e10600; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
`;

export default App;