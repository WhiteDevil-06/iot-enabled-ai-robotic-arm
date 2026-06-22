import { useState, useEffect } from 'react';
import { Wifi, Cpu, Video, Settings, Activity, Play, Square, RefreshCcw, CheckCircle, XCircle, Box, Apple } from 'lucide-react';
import './Dashboard.css';
import { INITIAL_HISTORY, INITIAL_STATS, isHistory, isStats, readStoredJson, readStoredString, writeStoredJson, writeStoredString } from '../utils/storage';

const Dashboard = () => {
  const [isRunning, setIsRunning] = useState(() => readStoredString('system_running', 'true') !== 'false');

  // Statistics State
  const [stats, setStats] = useState(() => {
    return readStoredJson('sorting_stats', INITIAL_STATS, isStats);
  });

  // Latest fruit being processed in the UI
  const [activeItem, setActiveItem] = useState(() => isRunning ? {
    fruit: 'Apple', quality: 'Fresh', confidence: '98.45%', decision: 'ACCEPTED', time: '10:24:36 AM'
  } : {
    fruit: 'None', quality: 'None', confidence: '0.00%', decision: 'STANDBY', time: '—'
  });

  // Recent Event Logs State
  const [events, setEvents] = useState(() => {
    return readStoredJson('recent_events', [
      { id: 'initial-1', time: '10:24:40 AM', text: 'Conveyor resumed', type: 'Conveyor' },
      { id: 'initial-2', time: '10:24:38 AM', text: 'Robot arm placed in Accept bin', type: 'Robot' },
      { id: 'initial-3', time: '10:24:37 AM', text: 'Sorting decision: Accepted', type: 'System' },
      { id: 'initial-4', time: '10:24:36 AM', text: 'AI prediction: Fresh (98.45%)', type: 'AI Model' },
      { id: 'initial-5', time: '10:24:30 AM', text: 'Apple detected', type: 'Detection' }
    ], Array.isArray);
  });

  const setRunningState = (running) => {
    setIsRunning(running);
    writeStoredString('system_running', String(running));
    if (!running) {
      setActiveItem({
        fruit: 'None',
        quality: 'None',
        confidence: '0.00%',
        decision: 'STANDBY',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    }
  };

  // Simulation Interval Effect
  useEffect(() => {
    if (!isRunning) return;

    const fruits = ['Apple', 'Banana', 'Orange', 'Guava'];

    const interval = setInterval(() => {
      const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];
      // 90% Fresh, 10% Rotten
      const randomQuality = Math.random() < 0.90 ? 'Fresh' : 'Rotten';
      const confidenceVal = (91 + Math.random() * 8.8).toFixed(2) + '%';
      const decision = randomQuality === 'Fresh' ? 'ACCEPTED' : 'REJECTED';
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Update active fruit overlay & activity
      setActiveItem({
        fruit: randomFruit,
        quality: randomQuality,
        confidence: confidenceVal,
        decision: decision,
        time: timeStr
      });

      // Update events log
      setEvents((prevEvents) => {
        const newEventsList = [
          { id: `evt-${Date.now()}-5`, time: timeStr, text: `Conveyor resumed`, type: 'Conveyor' },
          { id: `evt-${Date.now()}-4`, time: timeStr, text: `Robot arm placed in ${randomQuality === 'Fresh' ? 'Accept' : 'Reject'} bin`, type: 'Robot' },
          { id: `evt-${Date.now()}-3`, time: timeStr, text: `Sorting decision: ${randomQuality === 'Fresh' ? 'Accepted' : 'Rejected'}`, type: 'System' },
          { id: `evt-${Date.now()}-2`, time: timeStr, text: `AI prediction: ${randomQuality} (${confidenceVal})`, type: 'AI Model' },
          { id: `evt-${Date.now()}-1`, time: timeStr, text: `${randomFruit} detected`, type: 'Detection' },
          ...prevEvents
        ].slice(0, 20); // Keep last 20 logs
        writeStoredJson('recent_events', newEventsList);
        return newEventsList;
      });

      // Update statistics
      setStats((prevStats) => {
        const newStats = {
          accepted: prevStats.accepted + (randomQuality === 'Fresh' ? 1 : 0),
          rejected: prevStats.rejected + (randomQuality === 'Rotten' ? 1 : 0),
          currentBatch: prevStats.currentBatch + 1
        };
        writeStoredJson('sorting_stats', newStats);
        return newStats;
      });

      // Update shared reports history list in localStorage
      const historyList = readStoredJson('sort_history', INITIAL_HISTORY, isHistory);

      const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      const reportDateStr = new Date().toLocaleString('en-US', dateOptions);

      const newHistoryItem = {
        id: Date.now(),
        time: reportDateStr,
        fruit: randomFruit,
        prediction: randomQuality,
        confidence: confidenceVal,
        action: randomQuality === 'Fresh' ? 'Accepted' : 'Rejected',
        response: randomQuality === 'Fresh' ? 'Placed in Accept Bin' : 'Placed in Reject Bin'
      };

      const updatedHistory = [newHistoryItem, ...historyList].slice(0, 100);
      writeStoredJson('sort_history', updatedHistory);

    }, 5000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // System Reset Handler
  const handleReset = () => {
    setRunningState(false);
    const initialStats = {
      accepted: 0,
      rejected: 0,
      currentBatch: 0
    };
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const resetEvents = [
      { id: `reset-${Date.now()}`, time: timeStr, text: 'System reset performed. Statistics cleared.', type: 'System' }
    ];

    setStats(initialStats);
    setEvents(resetEvents);
    setActiveItem({
      fruit: 'None',
      quality: 'None',
      confidence: '0.00%',
      decision: 'STANDBY',
      time: timeStr
    });
    writeStoredJson('sorting_stats', initialStats);
    writeStoredJson('recent_events', resetEvents);
    writeStoredJson('sort_history', []);
  };

  return (
    <div className="dashboard-page container py-6 flex-col gap-6">
      {/* Page Header */}
      <div className="page-header flex justify-between items-center border-b pb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Dashboard</h1>
          <p className="text-sm text-secondary mt-1">Monitor real-time classification, conveyor telemetry, and robotic sorting operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-pill flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${isRunning ? 'bg-success-bg text-success' : 'bg-purple-light text-purple'}`}>
            <span className={`status-dot w-2 h-2 rounded-full ${isRunning ? 'bg-success' : 'bg-purple'}`} />
            System {isRunning ? 'Running' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Top Status Strip */}
      <div className="status-strip grid grid-cols-5 gap-4">
        <div className="status-card card flex items-center gap-3">
          <Wifi className={isRunning ? 'text-success' : 'text-secondary'} size={24} />
          <div>
            <div className="text-sm font-semibold">ESP32</div>
            <div className="text-xs text-secondary">{isRunning ? 'Connected' : 'Standby'}</div>
          </div>
        </div>
        <div className="status-card card flex items-center gap-3">
          <Cpu className={isRunning ? 'text-success' : 'text-secondary'} size={24} />
          <div>
            <div className="text-sm font-semibold">AI Model</div>
            <div className="text-xs text-secondary">{isRunning ? 'Online' : 'Standby'}</div>
          </div>
        </div>
        <div className="status-card card flex items-center gap-3">
          <Video className={isRunning ? 'text-success' : 'text-secondary'} size={24} />
          <div>
            <div className="text-sm font-semibold">Camera</div>
            <div className="text-xs text-secondary">{isRunning ? 'Active' : 'Paused'}</div>
          </div>
        </div>
        <div className="status-card card flex items-center gap-3">
          <Settings className={isRunning ? 'text-success' : 'text-secondary'} size={24} />
          <div>
            <div className="text-sm font-semibold">Robot Arm</div>
            <div className="text-xs text-secondary">{isRunning ? 'Ready' : 'Idle'}</div>
          </div>
        </div>
        <div className="status-card card flex items-center gap-3">
          <Activity className={isRunning ? "text-success" : "text-muted"} size={24} />
          <div>
            <div className="text-sm font-semibold">Conveyor</div>
            <div className="text-xs text-secondary">{isRunning ? 'Running' : 'Stopped'}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content grid gap-6">
        {/* Left Side: Camera Feed (70%) */}
        <div className="camera-section">
          <div className="camera-card card p-0 overflow-hidden relative">
            <div className={`live-indicator ${isRunning ? 'is-live' : 'is-paused'}`}>{isRunning ? 'LIVE' : 'PAUSED'}</div>
            {/* Camera Feed Placeholder */}
            <div className="camera-feed-placeholder flex flex-col items-center justify-center gap-4">
              <div className="telemetry-grid-pattern" />
              <Video className={`text-muted ${isRunning ? 'animate-pulse' : ''}`} size={48} />
              <div className="text-center">
                <p className="text-sm font-semibold text-primary">AgroBot AI Telemetry Feed</p>
                <p className="text-xs text-muted mt-1">Resolution: 1080p | FPS: 30 | Status: {isRunning ? 'Streaming' : 'Standby'}</p>
              </div>
            </div>
            <div className="camera-overlay card absolute bottom-4 left-4 right-4 flex justify-between items-center p-4">
              <div className="flex items-center gap-4">
                <div className={`fruit-icon-wrapper ${activeItem.decision === 'ACCEPTED' ? 'bg-success-bg text-success' : activeItem.decision === 'REJECTED' ? 'bg-error-bg text-error' : 'bg-gray-light text-secondary'}`}>
                  <Apple size={28} />
                </div>
                <div>
                  <div className="text-xs text-secondary">Fruit</div>
                  <div className="font-semibold text-lg">{activeItem.fruit}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-secondary">Quality</div>
                <div className={`font-semibold text-lg ${activeItem.quality === 'Fresh' ? 'text-success' : activeItem.quality === 'Rotten' ? 'text-error' : ''}`}>{activeItem.quality}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Confidence</div>
                <div className="font-semibold text-lg">{activeItem.confidence}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-secondary">Decision</div>
                <div className={`font-bold text-xl ${activeItem.decision === 'ACCEPTED' ? 'text-success' : activeItem.decision === 'REJECTED' ? 'text-error' : 'text-secondary'}`}>{activeItem.decision}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Activity & Control (30%) */}
        <div className="sidebar-section flex-col gap-6">
          <div className="activity-panel card flex-col gap-4">
            <h3 className="font-semibold border-b pb-2">System Activity</h3>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Latest Detection</span>
              <span className="font-medium">{activeItem.fruit}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Quality Result</span>
              <span className={`font-medium ${activeItem.quality === 'Fresh' ? 'text-success' : activeItem.quality === 'Rotten' ? 'text-error' : ''}`}>{activeItem.quality}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Confidence</span>
              <span className="font-medium">{activeItem.confidence}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Sorting Decision</span>
              <span className={`font-medium ${activeItem.decision === 'ACCEPTED' ? 'text-success' : activeItem.decision === 'REJECTED' ? 'text-error' : 'text-secondary'}`}>{activeItem.decision === 'ACCEPTED' ? 'Accepted' : activeItem.decision === 'REJECTED' ? 'Rejected' : 'Standby'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Robot Action</span>
              <span className="font-medium">{activeItem.decision === 'ACCEPTED' ? 'Placed in Accept Bin' : activeItem.decision === 'REJECTED' ? 'Placed in Reject Bin' : 'Idle'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Time</span>
              <span className="font-medium">{activeItem.time}</span>
            </div>
          </div>

          <div className="control-panel card flex-col gap-4">
            <h3 className="font-semibold border-b pb-2">Control Panel</h3>
            <button className={`btn btn-primary w-full justify-center ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => setRunningState(true)} disabled={isRunning}>
              <Play size={18} /> Start System
            </button>
            <button className={`btn btn-error w-full justify-center ${!isRunning ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => setRunningState(false)} disabled={!isRunning}>
              <Square size={18} /> Stop System
            </button>
            <button className="btn btn-outline w-full justify-center" onClick={handleReset}>
              <RefreshCcw size={18} /> Reset System
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Stats & Logs */}
      <div className="bottom-section grid gap-6">
        <div className="live-statistics card">
          <h3 className="font-semibold mb-4">Live Statistics</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="stat-item flex items-center gap-4">
              <div className="stat-icon bg-success-bg text-success"><CheckCircle size={24} /></div>
              <div>
                <div className="text-xs text-secondary">Accepted Fruits</div>
                <div className="text-2xl font-bold">{stats.accepted.toLocaleString()}</div>
              </div>
            </div>
            <div className="stat-item flex items-center gap-4">
              <div className="stat-icon bg-error-bg text-error"><XCircle size={24} /></div>
              <div>
                <div className="text-xs text-secondary">Rejected Fruits</div>
                <div className="text-2xl font-bold">{stats.rejected.toLocaleString()}</div>
              </div>
            </div>
            <div className="stat-item flex items-center gap-4">
              <div className="stat-icon bg-blue-light text-primary-blue"><Box size={24} /></div>
              <div>
                <div className="text-xs text-secondary">Current Batch</div>
                <div className="text-2xl font-bold">{stats.currentBatch.toLocaleString()}</div>
              </div>
            </div>
            <div className="stat-item flex items-center gap-4">
              <div className="stat-icon bg-gray-light text-secondary"><Apple size={24} /></div>
              <div>
                <div className="text-xs text-secondary">Active Fruit</div>
                <div className="text-2xl font-bold">{activeItem.fruit}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="recent-events card">
          <h3 className="font-semibold mb-4">Recent Events Log</h3>
          <div className="event-list flex-col gap-3">
            {events.map((event) => (
              <div key={event.id} className="event-row flex items-center gap-4 py-2 border-b last:border-b-0">
                <span className="text-sm text-secondary w-24">{event.time}</span>
                <span className="text-sm font-medium flex-grow">{event.text}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  event.type === 'AI Model' ? 'bg-blue-light text-primary-blue' :
                  event.type === 'System' ? 'bg-purple-light text-purple' :
                  'bg-gray-light text-secondary'
                }`}>
                  {event.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
