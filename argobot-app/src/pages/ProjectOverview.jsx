import { useState, useEffect } from 'react';
import { Code, Users, Cpu, Layers, Globe, Bot, Video, Activity, GraduationCap } from 'lucide-react';
import './ProjectOverview.css';

const teamMembers = [
  { name: 'SAAKSHI V P', initials: 'SV', role: 'UI/UX Frontend Developer, CNN Model Training & Hardware Assembly', image: '/member_sv.jpg' },
  { name: 'MONICA K G', initials: 'MK', role: 'UI/UX Frontend Developer, CNN Model Training & Hardware Assembly', image: '/member_mk.jpg' },
  { name: 'SIDDHARTH DHANUSH R', initials: 'SD', role: 'Embedded Firmware Developer, System Integration & Hardware Assembly', image: '/member_sd.jpg' },
  { name: 'RAKSHITH RAGHAVENDRA', initials: 'RR', role: 'Lead System Architect, Backend API Developer & Hardware Assembly', image: '/member_rr.jpg' },
];

const mentors = [
  { name: 'Viswavardhan Reddy', initials: 'VR', role: 'Professor & Mentor', image: '/mentor_viswa.png' },
  { name: 'Rajesh R M', initials: 'RR', role: 'Professor & Mentor', image: '/mentor_rajesh.png' },
  { name: 'Manasa M', initials: 'MM', role: 'Professor & Mentor', image: '/mentor_manasa.png' },
];

const ProjectOverview = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 6);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container project-overview-page">
      {/* Academic Header Banner */}
      <header className="academic-header-banner flex-col items-start gap-3">
        <div className="academic-meta-badge">
          <GraduationCap size={14} className="mr-1" /> MAIN EL
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
          IoT-Enabled AI Robotic Arm for Object Classification & Sorting
        </h1>
        <p className="text-sm text-secondary max-w-3xl leading-relaxed mt-1">
          A multi-disciplinary project integrating Computer Vision (Convolutional Neural Networks), 
          embedded IoT control (ESP32 microcontrollers), active conveyor belt transport, and precise 
          robotic coordinate actuation.
        </p>
      </header>

      {/* Main Content Grid */}
      <main className="overview-card-grid">
        {/* Abstract Card */}
        <section className="card flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="benefit-icon-wrapper bg-blue-light">
              <Layers size={20} className="text-primary-blue" />
            </div>
            <h2 className="text-lg font-bold text-white">Project Abstract</h2>
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            Automating sorting on production lines requires reliable object categorization and fast coordinate responses. 
            This project presents an end-to-end sorting pipeline. An industrial webcam captures live feed of items on 
            a moving conveyor belt. A Convolutional Neural Network (CNN) running on a host computer performs real-time classification. 
            The system then dispatches computed coordinate commands to an ESP32 microcontroller over local WiFi. 
            The ESP32 drives the 4-DOF mechanical arm to accept or reject items. By offloading resource-heavy machine 
            learning processing to the host laptop and executing lightweight telemetry commands on the ESP32 node, we achieve 
            both accurate sorting and safe, high-speed controller response times.
          </p>
        </section>

        {/* Objectives Card */}
        <section className="card flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="benefit-icon-wrapper bg-blue-light">
              <Bot size={20} className="text-primary-blue" />
            </div>
            <h2 className="text-lg font-bold text-white">Key Objectives</h2>
          </div>
          <ul className="flex-col gap-3 p-0 m-0 text-sm text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-primary-blue font-bold">1.</span>
              <span><strong>AI Classification:</strong> Train and deploy a high-accuracy CNN model for real-time item sorting and status telemetry reporting.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-blue font-bold">2.</span>
              <span><strong>WiFi Integration:</strong> Establish a low-latency local communication link using the ESP32 Access Point mode.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-blue font-bold">3.</span>
              <span><strong>Robotic Sweeps:</strong> Calibrate and actuate a 4-DOF robotic arm using precise PWM duty cycles via ledcWrite.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-blue font-bold">4.</span>
              <span><strong>Web Interface:</strong> Design a glassmorphism web panel for live telemetry metrics, direct joysticks, and conveyor speed configuration.</span>
            </li>
          </ul>
        </section>
      </main>

      {/* System Flow Diagram */}
      <section className="card flex-col gap-6 mb-12">
        <div className="flex items-center gap-3">
          <div className="benefit-icon-wrapper bg-blue-light">
            <Activity size={20} className="text-primary-blue" />
          </div>
          <h2 className="text-lg font-bold text-white">System Flow & Pipeline</h2>
        </div>
        <p className="text-sm text-secondary">
          The diagram below highlights the real-time feedback and control loop. Computer vision feeds coordinates into the decision layer, dispatching REST calls to drive the physical robotic arm.
        </p>

        <div className="mermaid-flow-wrapper">
          {/* Row 1 */}
          <div className="mermaid-step-row">
            <div className={`mermaid-step-node ${activeStep === 0 ? 'active-step' : 'inactive-step'}`}>
              <Video className="text-primary-blue mx-auto mb-1" size={20} />
              <div className="mermaid-step-node-title">Frame Acquisition</div>
              <div className="mermaid-step-node-desc">Camera logs video feeds at 30 FPS</div>
            </div>
            <div className="mermaid-step-arrow">➜</div>
            <div className={`mermaid-step-node ${activeStep === 1 ? 'active-step' : 'inactive-step'}`}>
              <Cpu className="text-primary-blue mx-auto mb-1" size={20} />
              <div className="mermaid-step-node-title">CNN Classification</div>
              <div className="mermaid-step-node-desc">Laptop model classifies quality grade</div>
            </div>
            <div className="mermaid-step-arrow">➜</div>
            <div className={`mermaid-step-node ${activeStep === 2 ? 'active-step' : 'inactive-step'}`}>
              <Globe className="text-primary-blue mx-auto mb-1" size={20} />
              <div className="mermaid-step-node-title">REST Command Dispatch</div>
              <div className="mermaid-step-node-desc">GET request triggered over local WiFi</div>
            </div>
          </div>
          {/* Row 2 */}
          <div className="mermaid-step-row mt-4">
            <div className={`mermaid-step-node ${activeStep === 3 ? 'active-step' : 'inactive-step'}`}>
              <Code className="text-primary-blue mx-auto mb-1" size={20} />
              <div className="mermaid-step-node-title">ESP32 Handlers</div>
              <div className="mermaid-step-node-desc">Parse query arguments (Angles & Duty)</div>
            </div>
            <div className="mermaid-step-arrow">➜</div>
            <div className={`mermaid-step-node ${activeStep === 4 ? 'active-step' : 'inactive-step'}`}>
              <Bot className="text-primary-blue mx-auto mb-1" size={20} />
              <div className="mermaid-step-node-title">Robotic Arm Actuation</div>
              <div className="mermaid-step-node-desc">LEDC PWM drives the 4-DOF servos</div>
            </div>
            <div className="mermaid-step-arrow">➜</div>
            <div className={`mermaid-step-node ${activeStep === 5 ? 'active-step' : 'inactive-step'}`}>
              <Activity className="text-primary-blue mx-auto mb-1" size={20} />
              <div className="mermaid-step-node-title">Telemetry Sync</div>
              <div className="mermaid-step-node-desc">Status polling refreshes UI dashboards</div>
            </div>
          </div>
        </div>
      </section>

      {/* API Contract section */}
      <section className="card flex-col gap-6 mb-12">
        <div className="flex items-center gap-3">
          <div className="benefit-icon-wrapper bg-blue-light">
            <Code size={20} className="text-primary-blue" />
          </div>
          <h2 className="text-lg font-bold text-white">System API Contract (ESP32 Integration)</h2>
        </div>
        <p className="text-sm text-secondary">
          The host laptop controls the ESP32 client acts using a structured GET API. These requests are throttled at 150ms in the frontend to avoid brownout-inducing current draw:
        </p>

        <div className="api-spec-table-container">
          <table className="api-spec-table">
            <thead>
              <tr>
                <th>HTTP Request</th>
                <th>Description</th>
                <th>Key Query Parameters</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="api-method-badge get">GET</span> <span className="api-path-code">/move</span>
                </td>
                <td>Pushes target angles to base, shoulder, elbow, and claw servos.</td>
                <td><span className="api-path-code">base=0..180</span>, <span className="api-path-code">shoulder</span>, <span className="api-path-code">elbow</span>, <span className="api-path-code">claw</span></td>
              </tr>
              <tr>
                <td>
                  <span className="api-method-badge get">GET</span> <span className="api-path-code">/status</span>
                </td>
                <td>Returns JSON status telemetry containing active arm angles and conveyor state.</td>
                <td>None (Returns JSON payload)</td>
              </tr>
              <tr>
                <td>
                  <span className="api-method-badge get">GET</span> <span className="api-path-code">/conveyor/start</span>
                </td>
                <td>Starts the DC conveyor belt forward cycle.</td>
                <td>None</td>
              </tr>
              <tr>
                <td>
                  <span className="api-method-badge get">GET</span> <span className="api-path-code">/conveyor/stop</span>
                </td>
                <td>Stops the DC conveyor belt cycle.</td>
                <td>None</td>
              </tr>
              <tr>
                <td>
                  <span className="api-method-badge get">GET</span> <span className="api-path-code">/conveyor/reverse</span>
                </td>
                <td>Reverses the conveyor belt cycle.</td>
                <td>None</td>
              </tr>
              <tr>
                <td>
                  <span className="api-method-badge get">GET</span> <span className="api-path-code">/conveyor/speed</span>
                </td>
                <td>Dynamically updates the conveyor PWM duty cycle.</td>
                <td><span className="api-path-code">value=0..255</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Hardware Specifications Card */}
      <section className="card flex-col gap-6 mb-12">
        <div className="flex items-center gap-3">
          <div className="benefit-icon-wrapper bg-blue-light">
            <Cpu size={20} className="text-primary-blue" />
          </div>
          <h2 className="text-lg font-bold text-white">Hardware Component Specifications</h2>
        </div>
        <p className="text-sm text-secondary">
          The physical sorting rig is composed of the following core hardware components:
        </p>

        <div className="api-spec-table-container">
          <table className="api-spec-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Specification & Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>ESP32 DevKit V1</strong></td>
                <td>32-bit dual-core microcontroller acting as Wi-Fi Access Point, API server, robotic arm controller, and conveyor controller.</td>
              </tr>
              <tr>
                <td><strong>ACEBOTT ESP32 Expansion Board</strong></td>
                <td>Expansion board used for servo power distribution, GPIO breakout, joystick connections, and ESP32 mounting.</td>
              </tr>
              <tr>
                <td><strong>4-DOF Robotic Arm</strong></td>
                <td>Four-axis robotic arm consisting of Base (Chassis), Shoulder, Elbow, and Claw joints used for pick-and-place operations.</td>
              </tr>
              <tr>
                <td><strong>MG90S Metal Gear Servo Motors</strong></td>
                <td>Servo motors driving Base, Shoulder, Elbow, and Claw joints of the robotic arm.</td>
              </tr>
              <tr>
                <td><strong>Dual Analog Joystick Module</strong></td>
                <td>Used during manual teaching mode and bin-position recording. Connected to GPIO 32, 33, 34, 35, 36, and 39.</td>
              </tr>
              <tr>
                <td><strong>L298N Motor Driver</strong></td>
                <td>H-Bridge motor driver receiving PWM signals from ESP32 and controlling conveyor motor direction and speed.</td>
              </tr>
              <tr>
                <td><strong>TT DC Geared Motor (3V - 6V)</strong></td>
                <td>A micro DC geared motor (typically 1:48 gear ratio) with an integrated gearbox used to drive the conveyor belt transport subsystem.</td>
              </tr>
              <tr>
                <td><strong>USB Webcam</strong></td>
                <td>Captures real-time images of fruits for OpenCV preprocessing and CNN/AI-based classification.</td>
              </tr>
              <tr>
                <td><strong>Lithium-ion 18650 Battery Pack</strong></td>
                <td>Dual-cell rechargeable battery pack supplying power to robotic arm and controller circuitry.</td>
              </tr>
              <tr>
                <td><strong>Conveyor Belt Assembly</strong></td>
                <td>Mechanical subsystem used to move fruits from loading area to detection and sorting zones.</td>
              </tr>
              <tr>
                <td><strong>Wi-Fi Access Point Network</strong></td>
                <td>ESP32-hosted wireless network enabling communication between dashboard and robotic arm.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Software Specifications Card */}
      <section className="card flex-col gap-6 mb-12">
        <div className="flex items-center gap-3">
          <div className="benefit-icon-wrapper bg-blue-light">
            <Code size={20} className="text-primary-blue" />
          </div>
          <h2 className="text-lg font-bold text-white">Software Component Specifications</h2>
        </div>
        <p className="text-sm text-secondary">
          The software pipeline consists of the following layers and frameworks:
        </p>

        <div className="api-spec-table-container">
          <table className="api-spec-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Python 3.x</strong></td>
                <td>Backend processing environment.</td>
              </tr>
              <tr>
                <td><strong>OpenCV</strong></td>
                <td>Fruit detection and image preprocessing.</td>
              </tr>
              <tr>
                <td><strong>TensorFlow / Keras CNN Model</strong></td>
                <td>Fruit classification and quality grading inference.</td>
              </tr>
              <tr>
                <td><strong>React.js</strong></td>
                <td>Interactive web dashboard frontend.</td>
              </tr>
              <tr>
                <td><strong>Vite</strong></td>
                <td>High-performance frontend build system.</td>
              </tr>
              <tr>
                <td><strong>ESP32 Arduino Framework</strong></td>
                <td>Embedded C++ firmware development for the microcontroller.</td>
              </tr>
              <tr>
                <td><strong>REST API</strong></td>
                <td>Communication protocol between host dashboard and ESP32 client.</td>
              </tr>
              <tr>
                <td><strong>Web Browser Dashboard</strong></td>
                <td>Arm control, conveyor control, and bin recording interface.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Team Members Section */}
      <section className="people-section mb-12">
        <h2 className="section-title text-white">Project Team</h2>
        <div className="people-grid">
          {teamMembers.map((member) => (
            <div key={member.name} className="person-card">
              <div className="person-avatar">
                {member.image ? (
                  <img src={member.image} alt={member.name} className="person-avatar-img" />
                ) : (
                  member.initials
                )}
              </div>
              <h3 className="person-name">{member.name}</h3>
              <p className="person-role">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mentors Section */}
      <section className="people-section">
        <h2 className="section-title text-white">Project Mentors</h2>
        <div className="mentor-grid">
          {mentors.map((mentor) => (
            <div key={mentor.name} className="person-card mentor">
              <div className="person-avatar mentor-avatar">
                {mentor.image ? (
                  <img src={mentor.image} alt={mentor.name} className="person-avatar-img" />
                ) : (
                  mentor.initials
                )}
              </div>
              <h3 className="person-name">{mentor.name}</h3>
              <p className="person-role">{mentor.role}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ProjectOverview;
