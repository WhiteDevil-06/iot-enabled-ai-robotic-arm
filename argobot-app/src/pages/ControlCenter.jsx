import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Play, Square, RefreshCcw, Save, Trash2, FastForward, Package, Box, PlayCircle, Disc, Cpu } from 'lucide-react';
import nipplejs from 'nipplejs';
import { readStoredString, writeStoredString } from '../utils/storage';
import './ControlCenter.css';

const ControlCenter = () => {
  // --- Persisted and General App States ---
  const [espIp, setEspIp] = useState(() => readStoredString('esp_ip', '192.168.4.1'));
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('arm'); // 'arm' | 'conveyor'
  const [isSystemActive, setIsSystemActive] = useState(true);

  // --- Robotic Arm State (angles 0-180) ---
  const [armState, setArmState] = useState({
    base: 90,
    shoulder: 90,
    elbow: 90,
    claw: 90
  });

  // --- Memory System Replay State ---
  const [savedActions, setSavedActions] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Bin Memory System ---
  const [recordingBin, setRecordingBin] = useState(null); // 'A' | 'B' | null
  const [tempBinSequence, setTempBinSequence] = useState([]);
  const [binASequence, setBinASequence] = useState(() => JSON.parse(localStorage.getItem('binA')) || []);
  const [binBSequence, setBinBSequence] = useState(() => JSON.parse(localStorage.getItem('binB')) || []);

  // --- Conveyor Belt State ---
  const [conveyorStatus, setConveyorStatus] = useState('stopped'); // 'stopped' | 'running' | 'reversing'
  const [conveyorSpeed, setConveyorSpeed] = useState(50);
  const [speedInputValue, setSpeedInputValue] = useState('50');

  // --- Toast Notifications State ---
  const [toasts, setToasts] = useState([]);

  // --- Refs for Joystick DOM and movement control loop ---
  const leftJoystickZoneRef = useRef(null);
  const rightJoystickZoneRef = useRef(null);
  // Refs for keyboard events (prevent stale closures)
  const armStateRef = useRef(armState);
  const recordingBinRef = useRef(recordingBin);
  const tempBinSequenceRef = useRef(tempBinSequence);
  
  // Keep refs in sync with state
  useEffect(() => { armStateRef.current = armState; }, [armState]);
  useEffect(() => { recordingBinRef.current = recordingBin; }, [recordingBin]);
  useEffect(() => { tempBinSequenceRef.current = tempBinSequence; }, [tempBinSequence]);

  const displacementsRef = useRef({ base: 0, shoulder: 0, elbow: 0, claw: 0 });
  const joystickIntervalRef = useRef(null);
  const activeKeysRef = useRef(new Set());

  // --- Comms network throttle refs ---
  const lastRequestTimeRef = useRef(0);
  const pendingStateRef = useRef(null);
  const sendTimerRef = useRef(null);

  // --- Toast Helper function ---
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // --- Handle IP configuration changes ---
  const handleIpChange = (e) => {
    const val = e.target.value.trim();
    setEspIp(val);
    writeStoredString('esp_ip', val);
  };

  // --- Reset All Robotic Arm Angles ---
  const handleResetArm = useCallback(() => {
    if (isPlaying) return;
    setArmState({ base: 90, shoulder: 90, elbow: 90, claw: 90 });
    showToast("Robotic Arm Reset to Center Position", "warning");
  }, [isPlaying, showToast]);

  // --- Save current position to memory buffer ---
  const handleSaveAction = useCallback(() => {
    if (isPlaying) return;
    setSavedActions((prev) => [...prev, { ...armState }]);
    showToast(`Position saved in memory buffer (Total: ${savedActions.length + 1})`, "success");
  }, [armState, savedActions, isPlaying, showToast]);

  // --- Clear memory buffer ---
  const handleClearActions = useCallback(() => {
    if (isPlaying) return;
    setSavedActions([]);
    showToast("Memory buffer cleared", "warning");
  }, [isPlaying, showToast]);

  // --- Replay saved positions sequential playback ---
  const handleRunReplay = useCallback(async () => {
    if (isPlaying || savedActions.length === 0) return;
    setIsPlaying(true);
    showToast("Starting action replay playback...", "success");

    for (let i = 0; i < savedActions.length; i++) {
      const targetState = savedActions[i];
      setArmState({ ...targetState });
      // Replay delay 800ms
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    setIsPlaying(false);
    showToast("Action replay playback finished", "success");
  }, [isPlaying, savedActions, showToast]);

  // --- Bin Sequence Action Dispatchers ---
  const handleRecordBin = useCallback((bin) => {
    setRecordingBin(bin);
    setTempBinSequence([]);
  }, []);

  const handlePlayBin = useCallback(async (bin) => {
    const seq = bin === 'A' ? binASequence : binBSequence;
    if (isPlaying || seq.length === 0) return;
    setIsPlaying(true);
    showToast(`Starting Bin ${bin} playback...`, "success");

    for (let i = 0; i < seq.length; i++) {
      setArmState({ ...seq[i] });
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    setIsPlaying(false);
    showToast(`Bin ${bin} playback finished`, "success");
  }, [isPlaying, binASequence, binBSequence, showToast]);

  const handleClearBin = useCallback((bin) => {
    if (bin === 'A') {
      setBinASequence([]);
      localStorage.removeItem('binA');
    } else {
      setBinBSequence([]);
      localStorage.removeItem('binB');
    }
    showToast(`Bin ${bin} memory cleared`, "warning");
  }, [showToast]);

  // --- Throttled ESP32 fetch move dispatcher ---
  const throttleSendMove = useCallback((state) => {
    if (!isSystemActive) return;
    pendingStateRef.current = state;
    if (sendTimerRef.current) return;

    const now = Date.now();
    const timeSinceLast = now - lastRequestTimeRef.current;
    const delay = Math.max(0, 150 - timeSinceLast);

    sendTimerRef.current = setTimeout(async () => {
      sendTimerRef.current = null;
      const target = pendingStateRef.current;
      if (!target) return;

      const url = `http://${espIp}/move?base=${target.base}&shoulder=${target.shoulder}&elbow=${target.elbow}&claw=${target.claw}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        setIsConnected(res.ok);
      } catch (err) {
        console.warn("ESP32 move error:", err);
        setIsConnected(false);
      }
      lastRequestTimeRef.current = Date.now();
    }, delay);
  }, [espIp, isSystemActive]);

  // --- Effect listening to armState updates to push to ESP32 ---
  useEffect(() => {
    throttleSendMove(armState);
  }, [armState, throttleSendMove]);

  // --- Toggle Mode Switch handler (Safety Lock) ---
  const handleModeToggle = () => {
    const nextMode = !isSystemActive;
    setIsSystemActive(nextMode);
    
    if (nextMode) {
      showToast("System Unlocked - Arm Active", "success");
    } else {
      showToast("System Locked - Controls Disabled", "warning");
    }
  };

  // --- Conveyor belt action handlers ---
  const sendConveyorAction = async (action) => {
    const url = `http://${espIp}/conveyor/${action}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        showToast(`Conveyor: ${action.toUpperCase()}`, "success");
        setConveyorStatus(action === 'start' ? 'running' : (action === 'reverse' ? 'reversing' : 'stopped'));
      } else {
        showToast(`Failed to execute conveyor action: ${action}`, "warning");
      }
    } catch (err) {
      console.warn("Conveyor action error:", err);
      showToast("Error connecting to ESP32 conveyor service", "warning");
    }
  };

  const handleSetConveyorSpeed = useCallback(async (value) => {
    const speed = parseInt(value, 10);
    if (isNaN(speed) || speed < 0 || speed > 255) {
      showToast("Speed must be between 0 and 255", "warning");
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const response = await fetch(`http://${espIp}/conveyor/speed?value=${speed}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        const finalSpeed = parseInt(text, 10) || speed;
        setConveyorSpeed(finalSpeed);
        setSpeedInputValue(String(finalSpeed));
        showToast(`Conveyor speed set to ${finalSpeed}`, "success");
      } else {
        showToast("Failed to set conveyor speed", "warning");
      }
    } catch (err) {
      console.warn("Conveyor speed error:", err);
      showToast("Error updating conveyor speed", "warning");
    }
  }, [espIp, showToast]);

  // --- Status and state synchronization polling (1s) ---
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      if (!espIp) return;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 950);
        const res = await fetch(`http://${espIp}/status`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok && active) {
          setIsConnected(true);
          const data = await res.json();

          // Sync Website Mode switch
          // (Removed because ESP32 no longer stores mode)

          // Sync conveyor speed
          if (data.speed !== undefined) {
            setConveyorSpeed(data.speed);
            if (document.activeElement?.id !== 'input-conveyor-speed') {
              setSpeedInputValue(String(data.speed));
            }
          }

          // Sync physical servo values in physical controller mode
          // (Removed because physical controllers are gone)
        } else if (active) {
          setIsConnected(false);
        }
      } catch (err) {
        if (active) {
          console.warn("ESP32 status poll error:", err);
          setIsConnected(false);
        }
      }
    }, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [espIp]);

  // --- Joystick continuous coordinate tracking logic loop ---
  const startJoystickLoop = useCallback(() => {
    if (joystickIntervalRef.current) return;
    joystickIntervalRef.current = setInterval(() => {
      const d = displacementsRef.current;
      if (d.base !== 0 || d.shoulder !== 0 || d.elbow !== 0 || d.claw !== 0) {
        setArmState((prev) => {
          // Speed factor mapping: displacements are -1.0 to 1.0
          const speedFactor = 2.5;
          const baseDelta = d.base * speedFactor;
          const shoulderDelta = d.shoulder * speedFactor;
          const elbowDelta = d.elbow * speedFactor;
          const clawDelta = d.claw * speedFactor;

          // Align base and shoulder directions with the physical controller rules
          return {
            base: Math.max(0, Math.min(180, Math.round(prev.base - baseDelta))),
            shoulder: Math.max(0, Math.min(180, Math.round(prev.shoulder - shoulderDelta))),
            elbow: Math.max(0, Math.min(180, Math.round(prev.elbow + elbowDelta))),
            claw: Math.max(0, Math.min(180, Math.round(prev.claw + clawDelta)))
          };
        });
      }
    }, 50);
  }, []);

  const stopJoystickLoop = useCallback(() => {
    if (joystickIntervalRef.current) {
      clearInterval(joystickIntervalRef.current);
      joystickIntervalRef.current = null;
    }
    displacementsRef.current = { base: 0, shoulder: 0, elbow: 0, claw: 0 };
  }, []);

  const checkStopJoystickLoop = useCallback(() => {
    const d = displacementsRef.current;
    if (d.base === 0 && d.shoulder === 0 && d.elbow === 0 && d.claw === 0) {
      stopJoystickLoop();
    }
  }, [stopJoystickLoop]);

  // --- Instantiate NippleJS on page mount / tab toggle ---
  useEffect(() => {
    if (activeTab !== 'arm' || !leftJoystickZoneRef.current || !rightJoystickZoneRef.current) {
      return;
    }

    const optionsLeft = {
      zone: leftJoystickZoneRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#3b82f6',
      size: 140
    };

    const optionsRight = {
      zone: rightJoystickZoneRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#10b981',
      size: 140
    };

    const managerLeft = nipplejs.create(optionsLeft);
    const managerRight = nipplejs.create(optionsRight);

    // Bind left joystick movement coordinates (Base & Shoulder)
    managerLeft.on('move', (evt, data) => {
      if (data.vector) {
        displacementsRef.current.base = data.vector.x;
        displacementsRef.current.shoulder = data.vector.y;
        startJoystickLoop();
      }
    });

    managerLeft.on('end', () => {
      displacementsRef.current.base = 0;
      displacementsRef.current.shoulder = 0;
      checkStopJoystickLoop();
    });

    // Bind right joystick movement coordinates (Elbow & Claw)
    managerRight.on('move', (evt, data) => {
      if (data.vector) {
        displacementsRef.current.claw = data.vector.x;
        displacementsRef.current.elbow = data.vector.y;
        startJoystickLoop();
      }
    });

    managerRight.on('end', () => {
      displacementsRef.current.claw = 0;
      displacementsRef.current.elbow = 0;
      checkStopJoystickLoop();
    });

    // Clean up instances on unmount / navigation
    return () => {
      managerLeft.destroy();
      managerRight.destroy();
      stopJoystickLoop();
    };
  }, [activeTab, startJoystickLoop, stopJoystickLoop, checkStopJoystickLoop]);

  // --- Keyboard listeners setup ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return; // Prevent double firing on held keys
      if (document.activeElement.tagName.toLowerCase() === 'input') return;
      if (!isSystemActive || isPlaying) return;

      const key = e.key.toLowerCase();

      // Prevent window scroll for arrow keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
      }

      if (activeKeysRef.current.has(key)) return;
      activeKeysRef.current.add(key);

      let movementKey = true;

      switch (key) {
        case 'w':
          displacementsRef.current.shoulder = 1.0;
          break;
        case 's':
          displacementsRef.current.shoulder = -1.0;
          break;
        case 'a':
          displacementsRef.current.base = -1.0;
          break;
        case 'd':
          displacementsRef.current.base = 1.0;
          break;
        case 'arrowup':
          displacementsRef.current.elbow = 1.0;
          break;
        case 'arrowdown':
          displacementsRef.current.elbow = -1.0;
          break;
        case 'arrowleft':
          displacementsRef.current.claw = -1.0;
          break;
        case 'arrowright':
          displacementsRef.current.claw = 1.0;
          break;
        case 'q':
          movementKey = false;
          if (recordingBinRef.current) {
             if (tempBinSequenceRef.current.length >= 20) {
                 showToast(`Max limit of 20 steps reached for Bin ${recordingBinRef.current}!`, "warning");
             } else {
                 const currentCoords = { ...armStateRef.current };
                 setTempBinSequence(prev => [...prev, currentCoords]);
                 // No toast spam here!
             }
          } else {
             handleSaveAction();
          }
          break;
        case 't':
          movementKey = false;
          if (!recordingBinRef.current) handleRunReplay();
          break;
        case 'r':
          movementKey = false;
          if (!recordingBinRef.current) handleClearActions();
          break;
        case 'escape':
          movementKey = false;
          if (recordingBinRef.current) {
             const bin = recordingBinRef.current;
             const seq = tempBinSequenceRef.current;
             if (bin === 'A') {
                setBinASequence(seq);
                localStorage.setItem('binA', JSON.stringify(seq));
             } else {
                setBinBSequence(seq);
                localStorage.setItem('binB', JSON.stringify(seq));
             }
             setRecordingBin(null);
             showToast(`Bin ${bin} sequence saved!`, "success");
          }
          break;
        default:
          movementKey = false;
      }

      if (movementKey) {
        startJoystickLoop();
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();

      // Action keys (q, escape, r, t) are already handled in handleKeyDown
      // We only need to process movement key release here
      activeKeysRef.current.delete(key);

      switch (key) {
        case 'w':
        case 's':
          displacementsRef.current.shoulder = 0;
          break;
        case 'a':
        case 'd':
          displacementsRef.current.base = 0;
          break;
        case 'arrowup':
        case 'arrowdown':
          displacementsRef.current.elbow = 0;
          break;
        case 'arrowleft':
        case 'arrowright':
          displacementsRef.current.claw = 0;
          break;
        default:
          break;
      }

      checkStopJoystickLoop();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSystemActive, isPlaying, handleSaveAction, handleRunReplay, handleClearActions, startJoystickLoop, checkStopJoystickLoop, recordingBin, armState, tempBinSequence]);

  // --- Slider input changes handler ---
  const handleSliderChange = (axis, value) => {
    if (!isSystemActive || isPlaying) return;
    setArmState((prev) => ({
      ...prev,
      [axis]: parseInt(value, 10)
    }));
  };

  return (
    <div className="control-center-wrapper">
      {/* Floating Recording Banner */}
      {recordingBin && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, background: '#ef4444', color: 'white', padding: '16px',
          textAlign: 'center', zIndex: 9999, fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '3rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', fontSize: '1.1rem'
        }}>
          <span>🔴 RECORDING BIN {recordingBin}</span>
          <span>Steps Saved: {tempBinSequence.length}</span>
          <span>Press [Q] to Save Step &nbsp; | &nbsp; Press [Esc] to Finish Recording</span>
        </div>
      )}

      {/* Toast notifications container */}
      <div className="react-toasts-notification-container" role="log">
        {toasts.map((t) => (
          <div key={t.id} className={`dynamic-toast-banner ${t.type}`} role="status">
            <span>{t.type === 'success' ? '✅' : t.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header bar and IP config section */}
      <div className="page-header flex justify-between items-center border-b pb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control Center</h1>
          <p className="text-sm text-secondary mt-1">Configure telemetry interfaces, run manual arm movement overrides, and speed conveyor cycles.</p>
        </div>

        <div className="header-actions-strip">
          {/* Sub-tab Selectors */}
          <div className="control-tabs-bar">
            <button
              onClick={() => setActiveTab('arm')}
              className={`control-tab-button ${activeTab === 'arm' ? 'active' : ''}`}
            >
              <Cpu size={16} /> Robotic Arm
            </button>
            <button
              className={`control-tab-button ${activeTab === 'conveyor' ? 'active' : ''}`}
              onClick={() => setActiveTab('conveyor')}
            >
              <Activity size={16} /> Conveyor Belt
            </button>
            <button
              className={`control-tab-button ${activeTab === 'bins' ? 'active' : ''}`}
              onClick={() => setActiveTab('bins')}
            >
              <Save size={16} /> Bin Positions
            </button>
          </div>

          <div className="connection-panel">
            <input
              type="text"
              id="esp-ip"
              value={espIp}
              onChange={handleIpChange}
              placeholder="ESP32 IP Address"
              className="ip-config-input"
              title="Enter your ESP32 controller IP address"
            />
            <div className={`connection-status ${isConnected ? 'is-connected' : ''}`}>
              <span className="status-dot-indicator" />
              <span className="status-text-label">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>

      {recordingBin && (
        <div style={{
          backgroundColor: '#ef4444', 
          color: 'white', 
          padding: '10px 20px', 
          textAlign: 'center', 
          fontWeight: 'bold', 
          fontSize: '1.2rem',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>🔴 RECORDING BIN {recordingBin} | Steps Saved: {tempBinSequence.length}</span>
          <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Press [Q] to Save Step | Press [Esc] to Finish</span>
        </div>
      )}

      {/* Main Controllers Tab Display */}
      <div className="control-panels-grid">
        {activeTab === 'arm' ? (
          <div className="flex-col gap-6 w-full">
            {/* Joysticks Panel Row */}
            <div className="joysticks-flex-row">
              {/* Left Panel: Base & Shoulder */}
              <div className="joystick-card-panel card">
                <div className="panel-header">
                  <h2>Base & Shoulder</h2>
                  <span className="axis-hint-badge">X: Base | Y: Shoulder</span>
                </div>

                <div className="joystick-visual-container">
                  <div
                    ref={leftJoystickZoneRef}
                    id="joystick-left"
                    className={`nipplejs-container-target ${!isSystemActive || isPlaying ? 'disabled-control-component' : ''}`}
                  />
                </div>

                <div className="manual-ranges-wrapper">
                  <div className="control-input-group">
                    <div className="control-input-header">
                      <label htmlFor="slider-base">Base Axis</label>
                      <span className="angle-value-display">{armState.base}°</span>
                    </div>
                    <input
                      type="range"
                      id="slider-base"
                      className="arm-slider-range"
                      min="0"
                      max="180"
                      value={armState.base}
                      onChange={(e) => handleSliderChange('base', e.target.value)}
                      disabled={!isSystemActive || isPlaying}
                    />
                  </div>

                  <div className="control-input-group">
                    <div className="control-input-header">
                      <label htmlFor="slider-shoulder">Shoulder Axis</label>
                      <span className="angle-value-display">{armState.shoulder}°</span>
                    </div>
                    <input
                      type="range"
                      id="slider-shoulder"
                      className="arm-slider-range"
                      min="0"
                      max="180"
                      value={armState.shoulder}
                      onChange={(e) => handleSliderChange('shoulder', e.target.value)}
                      disabled={!isSystemActive || isPlaying}
                    />
                  </div>
                </div>
              </div>

              {/* Right Panel: Elbow & Claw */}
              <div className="joystick-card-panel card">
                <div className="panel-header">
                  <h2>Elbow & Claw</h2>
                  <span className="axis-hint-badge">X: Claw | Y: Elbow</span>
                </div>

                <div className="joystick-visual-container">
                  <div
                    ref={rightJoystickZoneRef}
                    id="joystick-right"
                    className={`nipplejs-container-target ${!isSystemActive || isPlaying ? 'disabled-control-component' : ''}`}
                  />
                </div>

                <div className="manual-ranges-wrapper">
                  <div className="control-input-group">
                    <div className="control-input-header">
                      <label htmlFor="slider-elbow">Elbow Axis</label>
                      <span className="angle-value-display">{armState.elbow}°</span>
                    </div>
                    <input
                      type="range"
                      id="slider-elbow"
                      className="arm-slider-range"
                      min="0"
                      max="180"
                      value={armState.elbow}
                      onChange={(e) => handleSliderChange('elbow', e.target.value)}
                      disabled={!isSystemActive || isPlaying}
                    />
                  </div>

                  <div className="control-input-group">
                    <div className="control-input-header">
                      <label htmlFor="slider-claw">Claw Axis</label>
                      <span className="angle-value-display">{armState.claw}°</span>
                    </div>
                    <input
                      type="range"
                      id="slider-claw"
                      className="arm-slider-range"
                      min="0"
                      max="180"
                      value={armState.claw}
                      onChange={(e) => handleSliderChange('claw', e.target.value)}
                      disabled={!isSystemActive || isPlaying}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Arm Tab Actions Footer */}
            <div className="arm-panel-footer-actions">
              <div className="memory-action-buttons-group">
                <button
                  id="btn-reset"
                  className="btn btn-outline"
                  onClick={handleResetArm}
                  disabled={!isSystemActive || isPlaying}
                >
                  <RefreshCcw size={16} /> Reset
                </button>

                <button
                  id="btn-save-action"
                  className="btn btn-outline"
                  onClick={handleSaveAction}
                  disabled={!isSystemActive || isPlaying}
                  title="Save current arm coordinates to replay buffer (Shortcut: Q)"
                >
                  <Save size={16} /> Save Action
                </button>

                <button
                  id="btn-run-actions"
                  className="btn btn-primary"
                  onClick={handleRunReplay}
                  disabled={!isSystemActive || isPlaying || savedActions.length === 0}
                  title="Replay all buffered coordinates sequentially (Shortcut: T)"
                >
                  <Play size={16} /> Play Actions
                </button>

                <button
                  id="btn-clear-actions"
                  className="btn btn-outline"
                  onClick={handleClearActions}
                  disabled={!isSystemActive || isPlaying}
                  title="Clear all buffered coordinates in replay memory (Shortcut: R)"
                >
                  <Trash2 size={16} /> Clear Actions
                </button>

                <span id="memory-count" className="memory-counter-badge">
                  {savedActions.length} saved
                </span>
              </div>

              {/* Mode Toggle Switch */}
              <div className="mode-toggle-switch-container">
                <span className="mode-toggle-state-label" id="mode-label" style={{ color: isSystemActive ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                  {isSystemActive ? '🔓 Arm Active' : '🔒 Arm Locked'}
                </span>
                <label className="custom-mode-switch">
                  <input
                    type="checkbox"
                    id="mode-toggle"
                    checked={isSystemActive}
                    onChange={handleModeToggle}
                    disabled={isPlaying}
                  />
                  <span className="custom-mode-slider-element" />
                </label>
              </div>
            </div>

            {/* Keyboard Shortcuts Legend Layout */}
            <div className="keyboard-shortcuts-legend-panel">
              <div className="legend-column-helper">
                <span className="column-section-title">Base &amp; Shoulder</span>
                <span><b>W / S</b> Shoulder ↑↓</span>
                <span><b>A / D</b> Base ←→</span>
              </div>

              <div className="legend-column-helper">
                <span className="column-section-title">Elbow &amp; Claw</span>
                <span><b>↑ / ↓</b> Elbow ↑↓</span>
                <span><b>← / →</b> Claw Open/Close</span>
              </div>

              <div className="legend-column-helper memory-col-helper">
                <span className="column-section-title">Memory Operations</span>
                <span><b>Q</b> Save Position</span>
                <span><b>T</b> Replay Memory Buffer</span>
                <span><b>R</b> Clear Buffer Memory</span>
              </div>
            </div>
          </div>
        ) : activeTab === 'bins' ? (
          /* Bins Dashboard Panel View */
          <div className="bins-dashboard-panel card">
             <div className="panel-header text-center border-b pb-4 mb-6">
                <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                  <Package className="text-primary" size={24} /> Bin Positions
                </h2>
                <span className="text-sm text-secondary">Record drop-off points for sorted fruits</span>
             </div>
             
             <div className="bins-cards-container">
                {/* Bin A Card */}
                <div className="bin-card">
                   <div className="bin-icon-wrapper">
                     <Box size={48} className="text-blue-400" />
                   </div>
                   <h3 className="bin-card-title">Bin A</h3>
                   <p className="bin-card-subtitle">
                      Steps Recorded: <strong className="bin-card-count">{binASequence.length}</strong>
                   </p>
                   <div className="bin-card-actions">
                      <button className="btn btn-outline bin-btn-record" onClick={() => handleRecordBin('A')}>
                         <Disc size={18} className="animate-pulse" /> Record Sequence
                      </button>
                      <button className="btn btn-primary bin-btn-play" onClick={() => handlePlayBin('A')} disabled={binASequence.length === 0}>
                         <PlayCircle size={18} /> Play Sequence
                      </button>
                      <button className="btn btn-outline bin-btn-clear" onClick={() => handleClearBin('A')} disabled={binASequence.length === 0}>
                         <Trash2 size={18} /> Clear Memory
                      </button>
                   </div>
                </div>

                {/* Bin B Card */}
                <div className="bin-card">
                   <div className="bin-icon-wrapper">
                     <Trash2 size={48} className="text-emerald-400" />
                   </div>
                   <h3 className="bin-card-title">Bin B</h3>
                   <p className="bin-card-subtitle">
                      Steps Recorded: <strong className="bin-card-count">{binBSequence.length}</strong>
                   </p>
                   <div className="bin-card-actions">
                      <button className="btn btn-outline bin-btn-record" onClick={() => handleRecordBin('B')}>
                         <Disc size={18} className="animate-pulse" /> Record Sequence
                      </button>
                      <button className="btn btn-primary bin-btn-play" onClick={() => handlePlayBin('B')} disabled={binBSequence.length === 0}>
                         <PlayCircle size={18} /> Play Sequence
                      </button>
                      <button className="btn btn-outline bin-btn-clear" onClick={() => handleClearBin('B')} disabled={binBSequence.length === 0}>
                         <Trash2 size={18} /> Clear Memory
                      </button>
                   </div>
                </div>
             </div>
          </div>
        ) : activeTab === 'conveyor' ? (
          /* Conveyor Belt Controls Panel View */
          <div className="conveyor-belt-dashboard-panel card">
            <div className="panel-header text-center flex justify-between items-center border-b pb-2">
              <div>
                <h2 className="text-xl font-bold">Conveyor Belt Override</h2>
                <span className="text-xs text-secondary">Control conveyor telemetry cycles directly</span>
              </div>
              <Activity className={conveyorStatus !== 'stopped' ? 'text-success animate-pulse' : 'text-muted'} size={24} />
            </div>

            <div className="conveyor-belt-telemetry-visualizer">
              <div className="conveyor-belt-animated-track">
                <div
                  className={`conveyor-belt-animated-surface ${
                    conveyorStatus === 'running'
                      ? 'is-moving-forward'
                      : conveyorStatus === 'reversing'
                      ? 'is-moving-reverse'
                      : ''
                  }`}
                  id="conveyor-surface"
                >
                  <span className="conveyor-arrows-indicators">➔</span>
                  <span className="conveyor-arrows-indicators">➔</span>
                  <span className="conveyor-arrows-indicators">➔</span>
                  <span className="conveyor-arrows-indicators">➔</span>
                  <span className="conveyor-arrows-indicators">➔</span>
                </div>
              </div>

              <div className="conveyor-telemetry-status-lightbar">
                <span className="text-sm font-semibold text-secondary">Operational Status:</span>
                <span
                  id="conveyor-status-light"
                  className={`conveyor-telemetry-status-badge ${
                    conveyorStatus === 'running'
                      ? 'status-forward'
                      : conveyorStatus === 'reversing'
                      ? 'status-reverse'
                      : 'status-stopped'
                  }`}
                >
                  {conveyorStatus === 'running' ? 'Running' : conveyorStatus === 'reversing' ? 'Reversing' : 'Stopped'}
                </span>
              </div>
            </div>

            {/* Conveyor cycle override buttons */}
            <div className="conveyor-action-controls-row">
              <button
                id="btn-conveyor-start"
                className="btn conveyor-btn-action start"
                onClick={() => sendConveyorAction('start')}
              >
                <Play size={16} /> Start
              </button>
              <button
                id="btn-conveyor-stop"
                className="btn conveyor-btn-action stop"
                onClick={() => sendConveyorAction('stop')}
              >
                <Square size={16} /> Stop
              </button>
              <button
                id="btn-conveyor-reverse"
                className="btn conveyor-btn-action reverse"
                onClick={() => sendConveyorAction('reverse')}
              >
                <FastForward size={16} /> Reverse
              </button>
            </div>

            {/* Conveyor Belt Speed Configuration layout */}
            <div className="conveyor-speed-configuration-group">
              <div className="flex justify-between items-center">
                <label htmlFor="input-conveyor-speed" className="text-sm font-semibold text-secondary">
                  Conveyor Duty Speed Cycle (0 - 255)
                </label>
                <span className="font-bold text-primary-blue text-sm" id="conveyor-speed-val">
                  {conveyorSpeed}
                </span>
              </div>
              <div className="conveyor-speed-input-flexbox">
                <input
                  type="number"
                  id="input-conveyor-speed"
                  min="0"
                  max="255"
                  value={speedInputValue}
                  onChange={(e) => setSpeedInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetConveyorSpeed(speedInputValue)}
                  placeholder="Speed (0-255)"
                  className="conveyor-speed-numeric-input"
                />
                <button
                  id="btn-conveyor-speed-set"
                  className="btn btn-primary"
                  onClick={() => handleSetConveyorSpeed(speedInputValue)}
                >
                  Set Speed
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ControlCenter;
