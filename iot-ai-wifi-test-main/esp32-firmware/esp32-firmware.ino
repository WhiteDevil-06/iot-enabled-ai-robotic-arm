#include <WiFi.h>
#include <WebServer.h>

// =====================================================
// WiFi Configuration
// =====================================================
const char* ssid = "RoboticArm_Network";
const char* password = "password123";

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

// =====================================================
// PWM Channels
// =====================================================
const int BASE_CH = 0;
const int SHOULDER_CH = 1;
const int ELBOW_CH = 2;
const int CLAW_CH = 3;
const int CONVEYOR_CH = 4;

// =====================================================
// Servo Settings
// =====================================================
const int PWM_FREQ = 50;
const int PWM_RES = 16;

const int SERVO_MIN = 1638;
const int SERVO_MAX = 8192;

// =====================================================
// Target Position System (Servo Smoothing)
// =====================================================
int currentBase = 90;
int currentShoulder = 90;
int currentElbow = 90;
int currentClaw = 90;

int targetBase = 90;
int targetShoulder = 90;
int targetElbow = 90;
int targetClaw = 90;

int homingStage = 0; // 0: Idle, 1: Claw, 2: Elbow, 3: Shoulder, 4: Base

unsigned long lastServoUpdate = 0;
unsigned long servoInterval = 8; // ms per 1-degree step (dynamic)

// =====================================================
// Conveyor Settings
// =====================================================
const int CONVEYOR_FREQ = 1000;
const int CONVEYOR_RES = 8;
int currentConveyorSpeed = 50; // Dynamic speed

bool isConveyorRunning = false;
bool isConveyorReversing = false;

// Time tracking for Uptime
unsigned long bootTime = 0;

// =====================================================
// Servo Function (Hardware Abstraction)
// =====================================================
void writeServoDutyCycle(int channel, int angle) {
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;

  int dutyCycle = map(
    angle,
    0,
    180,
    SERVO_MIN,
    SERVO_MAX
  );

  ledcWrite(channel, dutyCycle);
}

// =====================================================
// Conveyor Functions
// =====================================================
void conveyorStart() {
  isConveyorRunning = true;
  isConveyorReversing = false;
  ledcWrite(CONVEYOR_CH, currentConveyorSpeed);
  digitalWrite(CONVEYOR_IN2, LOW);
  Serial.println("Conveyor Started");
}

void conveyorStop() {
  isConveyorRunning = false;
  isConveyorReversing = false;
  ledcWrite(CONVEYOR_CH, 0);
  digitalWrite(CONVEYOR_IN2, LOW);
  Serial.println("Conveyor Stopped");
}

void conveyorReverse() {
  isConveyorRunning = false;
  isConveyorReversing = true;
  ledcWrite(CONVEYOR_CH, 255 - currentConveyorSpeed); // Invert PWM for reverse
  digitalWrite(CONVEYOR_IN1, LOW);
  digitalWrite(CONVEYOR_IN2, HIGH);
  Serial.println("Conveyor Reversed");
}

// =====================================================
// Setup
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  // -------------------------------------------------
  // Servo PWM Setup
  // -------------------------------------------------
  ledcSetup(BASE_CH, PWM_FREQ, PWM_RES);
  writeServoDutyCycle(BASE_CH, 90);
  ledcAttachPin(BASE_PIN, BASE_CH);
  delay(100);

  ledcSetup(SHOULDER_CH, PWM_FREQ, PWM_RES);
  writeServoDutyCycle(SHOULDER_CH, 90);
  ledcAttachPin(SHOULDER_PIN, SHOULDER_CH);
  delay(100);

  ledcSetup(ELBOW_CH, PWM_FREQ, PWM_RES);
  writeServoDutyCycle(ELBOW_CH, 90);
  ledcAttachPin(ELBOW_PIN, ELBOW_CH);
  delay(100);

  ledcSetup(CLAW_CH, PWM_FREQ, PWM_RES);
  writeServoDutyCycle(CLAW_CH, 90);
  ledcAttachPin(CLAW_PIN, CLAW_CH);
  delay(100);

  // -------------------------------------------------
  // Conveyor Setup
  // -------------------------------------------------
  pinMode(CONVEYOR_IN1, OUTPUT);
  pinMode(CONVEYOR_IN2, OUTPUT);

  ledcSetup(CONVEYOR_CH, CONVEYOR_FREQ, CONVEYOR_RES);
  ledcAttachPin(CONVEYOR_IN1, CONVEYOR_CH);

  digitalWrite(CONVEYOR_IN2, LOW);
  conveyorStop();

  // -------------------------------------------------
  // Start WiFi AP
  // -------------------------------------------------
  Serial.println("\nStarting WiFi Access Point...");
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);

  IPAddress IP = WiFi.softAPIP();

  Serial.print("AP IP Address: ");
  Serial.println(IP);

  bootTime = millis();

  // =================================================
  // API: STATUS
  // =================================================
  server.on("/status", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    unsigned long uptime = (millis() - bootTime) / 1000;
    String convStatus = isConveyorRunning ? "running" : (isConveyorReversing ? "reversing" : "stopped");
    String json = "{\"connected\":true,\"uptime\":" + String(uptime) + 
                  ",\"conveyor\":\"" + convStatus + "\"" +
                  ",\"speed\":" + String(currentConveyorSpeed) +
                  ",\"base\":" + String(currentBase) +
                  ",\"shoulder\":" + String(currentShoulder) +
                  ",\"elbow\":" + String(currentElbow) +
                  ",\"claw\":" + String(currentClaw) +
                  ",\"mode\":\"web\"}";
    server.send(200, "application/json", json);
  });

  // =================================================
  // API: ARM CONTROL (Set Targets Only)
  // =================================================
  server.on("/move", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");

    if (server.hasArg("base")) targetBase = server.arg("base").toInt();
    if (server.hasArg("shoulder")) targetShoulder = server.arg("shoulder").toInt();
    if (server.hasArg("elbow")) targetElbow = server.arg("elbow").toInt();
    if (server.hasArg("claw")) targetClaw = server.arg("claw").toInt();
    if (server.hasArg("speed")) servoInterval = server.arg("speed").toInt();

    // No blocking delays here, just return instantly
    server.send(200, "text/plain", "OK");
  });

  // =================================================
  // API: HOME EXPLICIT
  // =================================================
  server.on("/home", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    homingStage = 1;
    targetClaw = 90;
    targetElbow = currentElbow;
    targetShoulder = currentShoulder;
    targetBase = currentBase;
    server.send(200, "text/plain", "Homing initiated sequentially");
  });

  // =================================================
  // CONVEYOR ENDPOINTS
  // =================================================
  server.on("/conveyor/start", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    conveyorStart();
    server.send(200, "text/plain", "Conveyor Started");
  });

  server.on("/conveyor/stop", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    conveyorStop();
    server.send(200, "text/plain", "Conveyor Stopped");
  });

  server.on("/conveyor/reverse", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    conveyorReverse();
    server.send(200, "text/plain", "Conveyor Reversed");
  });

  server.on("/conveyor/speed", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    if (server.hasArg("value")) {
      currentConveyorSpeed = server.arg("value").toInt();
      // Apply immediately if running or reversing
      if (isConveyorRunning) {
        ledcWrite(CONVEYOR_CH, currentConveyorSpeed);
      } else if (isConveyorReversing) {
        ledcWrite(CONVEYOR_CH, 255 - currentConveyorSpeed);
      }
    }
    server.send(200, "text/plain", "Speed updated");
  });

  // =================================================
  // ROOT
  // =================================================
  server.on("/", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "text/plain", "Robotic Arm + Conveyor Controller Online!");
  });

  server.begin();
  Serial.println("HTTP Server Started");
}

// =====================================================
// Loop (Non-Blocking State Machine)
// =====================================================
void loop() {
  server.handleClient(); // Process incoming HTTP requests instantly

  unsigned long currentMillis = millis();

  // Servo Smoothing Logic: step 1 degree every servoInterval
  if (currentMillis - lastServoUpdate >= servoInterval) {
    lastServoUpdate = currentMillis;

    // Sequential Homing State Machine
    if (homingStage == 1 && currentClaw == targetClaw) { homingStage = 2; targetElbow = 90; }
    else if (homingStage == 2 && currentElbow == targetElbow) { homingStage = 3; targetShoulder = 90; }
    else if (homingStage == 3 && currentShoulder == targetShoulder) { homingStage = 4; targetBase = 90; }
    else if (homingStage == 4 && currentBase == targetBase) { homingStage = 0; }

    bool moved = false;

    if (currentBase < targetBase) { currentBase++; moved = true; writeServoDutyCycle(BASE_CH, currentBase); }
    else if (currentBase > targetBase) { currentBase--; moved = true; writeServoDutyCycle(BASE_CH, currentBase); }

    if (currentShoulder < targetShoulder) { currentShoulder++; moved = true; writeServoDutyCycle(SHOULDER_CH, currentShoulder); }
    else if (currentShoulder > targetShoulder) { currentShoulder--; moved = true; writeServoDutyCycle(SHOULDER_CH, currentShoulder); }

    if (currentElbow < targetElbow) { currentElbow++; moved = true; writeServoDutyCycle(ELBOW_CH, currentElbow); }
    else if (currentElbow > targetElbow) { currentElbow--; moved = true; writeServoDutyCycle(ELBOW_CH, currentElbow); }

    if (currentClaw < targetClaw) { currentClaw++; moved = true; writeServoDutyCycle(CLAW_CH, currentClaw); }
    else if (currentClaw > targetClaw) { currentClaw--; moved = true; writeServoDutyCycle(CLAW_CH, currentClaw); }
  }
}
