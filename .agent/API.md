# API & Communication Architecture

## 1. ESP32 API Structure
The ESP32 runs an asynchronous web server that listens for basic HTTP GET requests to move the robotic arm's servos to specific angles.

### Main Endpoint
`GET http://<ESP32_IP>/move`

**Query Parameters:**
- `base`: Angle for the base servo (0-180)
- `shoulder`: Angle for the shoulder servo (0-180)
- `elbow`: Angle for the elbow servo (0-180)
- `claw`: Angle for the claw servo (0-180)
- `speed` (optional): Set the dynamic servoInterval speed (default: 8ms for fast manual, 16ms for smooth playback)

**Example Request:**
`GET http://192.168.1.100/move?base=120&shoulder=90&elbow=45&claw=10&speed=8`

**Response Format:**
- **Status 200 OK**: Command received successfully.
- No complex JSON response required.

### Additional Endpoints
- **Homing Reset**: `GET http://<ESP32_IP>/home`
  - Instantly begins a sequential homing sequence on the hardware.
- **Mode Toggle**: `GET http://<ESP32_IP>/setMode?mode=web|physical`
  - Switches between web-controlled movement and physical joystick control.
- **Conveyor Control**:
  - `GET http://<ESP32_IP>/conveyor/start`
  - `GET http://<ESP32_IP>/conveyor/stop`
  - `GET http://<ESP32_IP>/conveyor/reverse`
  - `GET http://<ESP32_IP>/conveyor/speed?value={0-255}` for PWM speed control.
- **Telemetry**: `GET http://<ESP32_IP>/status`
  - Returns a JSON object with the current interpolated angles of the servos, current mode, and conveyor state/speed.

## 2. Prediction-to-Action Mapping
The logic is entirely handled by the laptop (brain). The ESP32 is treated as a "dumb" actuator.

1. **Prediction: Fresh Fruit** (`fresh_apple`, `fresh_grape`, `fresh_strawberry`)
   - Backend calculates "ACCEPT" bin angles.
   - Example: `base=120, shoulder=90, elbow=45, claw=10`
   - Action: Backend sends `GET /move?base=120&shoulder=90...`

2. **Prediction: Rotten Fruit** (`rotten_apple`, `rotten_grape`, `rotten_strawberry`)
   - Backend calculates "REJECT" bin angles.
   - Example: `base=60, shoulder=90, elbow=45, claw=10`
   - Action: Backend sends `GET /move?base=60&shoulder=90...`

3. **Prediction: Unknown** (Confidence < 0.7)
   - Do nothing, or trigger an alert.
