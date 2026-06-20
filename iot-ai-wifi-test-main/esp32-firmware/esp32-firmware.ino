#include <WiFi.h>
#include <WebServer.h>

// =====================================================
// WiFi Configuration
// =====================================================
const char* ssid = "RoboticArm_Network";
const char* password = "password123"; // Must be at least 8 characters

WebServer server(80);

// =====================================================
// Servo Pins
// =====================================================
const int BASE_PIN = 5;
const int SHOULDER_PIN = 16;
const int ELBOW_PIN = 17;
const int CLAW_PIN = 18;

// =====================================================
// Conveyor Pins
// =====================================================
const int CONVEYOR_IN1 = 25;
const int CONVEYOR_IN2 = 26;
const int CONVEYOR_ENA = 27;

// =====================================================
// Physical Analog Joystick Pins (ADC1 channels)
// =====================================================
const int JOY_BASE_PIN = 34;      // Left Joystick X
const int JOY_SHOULDER_PIN = 35;  // Left Joystick Y
const int JOY_ELBOW_PIN = 32;     // Right Joystick Y
const int JOY_CLAW_PIN = 33;      // Right Joystick X

// =====================================================
// PWM Channels
// =====================================================
const int BASE_CH = 0;
const int SHOULDER_CH = 1;
const int ELBOW_CH = 2;
const int CLAW_CH = 3;
const int CONVEYOR_CH = 4;

// =====================================================
// Servo PWM Settings (50Hz)
// =====================================================
const int PWM_FREQ = 50;       
const int PWM_RES = 16;        
const int SERVO_MIN = 1638; // ~0.5ms pulse (0 degrees)
const int SERVO_MAX = 8192; // ~2.5ms pulse (180 degrees)

// =====================================================
// Conveyor Settings
// =====================================================
const int CONVEYOR_FREQ = 1000;
const int CONVEYOR_RES = 8;
const int CONVEYOR_SPEED = 220; // 0 to 255

// =====================================================
// Control State Variables
// =====================================================
bool webMode = true; // True: website/AI control, False: physical hardware joysticks

// Target positions (where the arm is commanded to go)
float targetBase = 90.0;
float targetShoulder = 90.0;
float targetElbow = 90.0;
float targetClaw = 90.0;

// Current positions (for smoothing/interpolation)
float currentBase = 90.0;
float currentShoulder = 90.0;
float currentElbow = 90.0;
float currentClaw = 90.0;

// Loop timing control
unsigned long lastSmoothUpdate = 0;
const unsigned long smoothUpdateInterval = 15; // Interpolate every 15ms

unsigned long lastPhysUpdate = 0;
const unsigned long physUpdateInterval = 20;   // Read physical joysticks every 20ms

// =====================================================
// Utility Helper Functions
// =====================================================
float constr(float val, float minVal, float maxVal) {
  if (val < minVal) return minVal;
  if (val > maxVal) return maxVal;
  return val;
}

float approach(float target, float current, float step) {
  if (abs(target - current) < step) {
    return target;
  }
  if (current < target) {
    return current + step;
  } else {
    return current - step;
  }
}

// Low-level write to LEDC PWM channel
void writeServoAngle(int channel, int angle) {
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  int dutyCycle = map(angle, 0, 180, SERVO_MIN, SERVO_MAX);
  ledcWrite(channel, dutyCycle);
}

// =====================================================
// Conveyor Functions
// =====================================================
void conveyorStart() {
  digitalWrite(CONVEYOR_IN1, HIGH);
  digitalWrite(CONVEYOR_IN2, LOW);
  ledcWrite(CONVEYOR_CH, CONVEYOR_SPEED);
}

void conveyorStop() {
  digitalWrite(CONVEYOR_IN1, LOW);
  digitalWrite(CONVEYOR_IN2, LOW);
  ledcWrite(CONVEYOR_CH, 0);
}

void conveyorReverse() {
  digitalWrite(CONVEYOR_IN1, LOW);
  digitalWrite(CONVEYOR_IN2, HIGH);
  ledcWrite(CONVEYOR_CH, CONVEYOR_SPEED);
}

// =====================================================
// Main Setup
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  // 1. Setup PWM Channels and Attach Servo Pins
  ledcSetup(BASE_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(BASE_PIN, BASE_CH);
  
  ledcSetup(SHOULDER_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(SHOULDER_PIN, SHOULDER_CH);
  
  ledcSetup(ELBOW_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(ELBOW_PIN, ELBOW_CH);
  
  ledcSetup(CLAW_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(CLAW_PIN, CLAW_CH);

  // Initialize servos to center instantly at startup
  writeServoAngle(BASE_CH, 90);
  writeServoAngle(SHOULDER_CH, 90);
  writeServoAngle(ELBOW_CH, 90);
  writeServoAngle(CLAW_CH, 90);

  // 2. Setup Conveyor Output Pins & PWM
  pinMode(CONVEYOR_IN1, OUTPUT);
  pinMode(CONVEYOR_IN2, OUTPUT);
  ledcSetup(CONVEYOR_CH, CONVEYOR_FREQ, CONVEYOR_RES);
  ledcAttachPin(CONVEYOR_ENA, CONVEYOR_CH);
  conveyorStop();

  // 3. Setup Physical Joystick Pins
  pinMode(JOY_BASE_PIN, INPUT);
  pinMode(JOY_SHOULDER_PIN, INPUT);
  pinMode(JOY_ELBOW_PIN, INPUT);
  pinMode(JOY_CLAW_PIN, INPUT);

  // 4. Start Access Point (AP Mode)
  Serial.println("\nStarting Wi-Fi Access Point...");
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP Address: ");
  Serial.println(IP);

  // 5. Define HTTP API Routes
  
  // Set target angles (Move Arm)
  server.on("/move", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");

    // Only accept movement payloads when website/AI control is active
    if (webMode) {
      if (server.hasArg("base")) {
        targetBase = server.arg("base").toFloat();
      }
      if (server.hasArg("shoulder")) {
        targetShoulder = server.arg("shoulder").toFloat();
      }
      if (server.hasArg("elbow")) {
        targetElbow = server.arg("elbow").toFloat();
      }
      if (server.hasArg("claw")) {
        targetClaw = server.arg("claw").toFloat();
      }
    }
    server.send(200, "text/plain", "OK");
  });

  // Switch control modes (Web vs Physical)
  server.on("/setMode", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    if (server.hasArg("mode")) {
      String modeVal = server.arg("mode");
      if (modeVal == "web" || modeVal == "1") {
        webMode = true;
        Serial.println("Control Mode: Website (Manual) Mode Enabled");
      } else if (modeVal == "physical" || modeVal == "0") {
        webMode = false;
        Serial.println("Control Mode: Physical Hardware Joysticks Enabled");
      }
    }
    server.send(200, "text/plain", webMode ? "web" : "physical");
  });

  // Get current status (JSON)
  server.on("/status", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    String json = "{\"base\":" + String((int)currentBase) + 
                  ",\"shoulder\":" + String((int)currentShoulder) + 
                  ",\"elbow\":" + String((int)currentElbow) + 
                  ",\"claw\":" + String((int)currentClaw) + 
                  ",\"mode\":" + (webMode ? "\"web\"" : "\"physical\"") + "}";
    server.send(200, "application/json", json);
  });

  // Conveyor Belt API
  server.on("/conveyor", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    if (server.hasArg("action")) {
      String action = server.arg("action");
      if (action == "start") {
        conveyorStart();
        Serial.println("Conveyor: START");
      } else if (action == "stop") {
        conveyorStop();
        Serial.println("Conveyor: STOP");
      } else if (action == "reverse") {
        conveyorReverse();
        Serial.println("Conveyor: REVERSE");
      }
    }
    server.send(200, "text/plain", "OK");
  });

  // Root Page
  server.on("/", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "text/plain", "Robotic Arm + Conveyor Controller Online!");
  });

  server.begin();
  Serial.println("HTTP Server started");
}

// =====================================================
// Loop Logic
// =====================================================

// Interpolate servo positions toward their targets
void updateServoInterpolation() {
  if (millis() - lastSmoothUpdate < smoothUpdateInterval) return;
  lastSmoothUpdate = millis();

  // Speed factor: how many degrees to move per 15ms step.
  // 1.5 degrees per 15ms = 100 degrees/sec. This is smooth yet responsive.
  const float stepRate = 1.5;

  currentBase = approach(targetBase, currentBase, stepRate);
  currentShoulder = approach(targetShoulder, currentShoulder, stepRate);
  currentElbow = approach(targetElbow, currentElbow, stepRate);
  currentClaw = approach(targetClaw, currentClaw, stepRate);

  writeServoAngle(BASE_CH, (int)currentBase);
  writeServoAngle(SHOULDER_CH, (int)currentShoulder);
  writeServoAngle(ELBOW_CH, (int)currentElbow);
  writeServoAngle(CLAW_CH, (int)currentClaw);
}

// Read physical hardware joysticks and increment targets
void handlePhysicalJoysticks() {
  if (millis() - lastPhysUpdate < physUpdateInterval) return;
  lastPhysUpdate = millis();

  // Read analog voltages (0 to 4095)
  int valBase = analogRead(JOY_BASE_PIN);
  int valShoulder = analogRead(JOY_SHOULDER_PIN);
  int valElbow = analogRead(JOY_ELBOW_PIN);
  int valClaw = analogRead(JOY_CLAW_PIN);

  // Center is ~2048. Implement a deadzone of ~200 to prevent drifting.
  float dispBase = 0.0;
  float dispShoulder = 0.0;
  float dispElbow = 0.0;
  float dispClaw = 0.0;

  if (abs(valBase - 2048) > 200) {
    dispBase = (valBase - 2048) / 2048.0;
  }
  if (abs(valShoulder - 2048) > 200) {
    dispShoulder = (valShoulder - 2048) / 2048.0;
  }
  if (abs(valElbow - 2048) > 200) {
    dispElbow = (valElbow - 2048) / 2048.0;
  }
  if (abs(valClaw - 2048) > 200) {
    dispClaw = (valClaw - 2048) / 2048.0;
  }

  // Adjust target angles by a speed multiplier
  const float speedMultiplier = 1.2;

  // Change target angles incrementally
  targetBase = constr(targetBase + (dispBase * speedMultiplier), 0, 180);
  targetShoulder = constr(targetShoulder + (dispShoulder * speedMultiplier), 0, 180);
  targetElbow = constr(targetElbow + (dispElbow * speedMultiplier), 0, 180);
  targetClaw = constr(targetClaw + (dispClaw * speedMultiplier), 0, 180);
}

void loop() {
  // 1. Process network commands
  server.handleClient();

  // 2. Read physical joysticks if physical mode is enabled
  if (!webMode) {
    handlePhysicalJoysticks();
  }

  // 3. Smoothly interpolate servos to their targets (always active)
  updateServoInterpolation();
}
