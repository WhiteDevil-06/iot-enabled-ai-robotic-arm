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
// Conveyor Settings
// =====================================================
const int CONVEYOR_FREQ = 1000;
const int CONVEYOR_RES = 8;
const int CONVEYOR_SPEED = 50;

bool isConveyorRunning = false;
bool isConveyorReversing = false;

// Time tracking for Uptime
unsigned long bootTime = 0;

// Current angles for status API
int currentBase = 90;
int currentShoulder = 90;
int currentElbow = 90;
int currentClaw = 90;

// =====================================================
// Servo Function
// =====================================================
void moveServo(int channel, int angle)
{
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;

  // Track the current angle for the /status endpoint
  if (channel == BASE_CH) currentBase = angle;
  else if (channel == SHOULDER_CH) currentShoulder = angle;
  else if (channel == ELBOW_CH) currentElbow = angle;
  else if (channel == CLAW_CH) currentClaw = angle;

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
// PWM on IN1
// =====================================================
void conveyorStart()
{
  isConveyorRunning = true;
  isConveyorReversing = false;
  ledcWrite(CONVEYOR_CH, CONVEYOR_SPEED);
  digitalWrite(CONVEYOR_IN2, LOW);
  Serial.println("Conveyor Started");
}

void conveyorStop()
{
  isConveyorRunning = false;
  isConveyorReversing = false;
  ledcWrite(CONVEYOR_CH, 0);
  digitalWrite(CONVEYOR_IN2, LOW);
  Serial.println("Conveyor Stopped");
}

void conveyorReverse()
{
  isConveyorRunning = false;
  isConveyorReversing = true;
  ledcWrite(CONVEYOR_CH, 0);
  digitalWrite(CONVEYOR_IN1, LOW);
  digitalWrite(CONVEYOR_IN2, HIGH);
  Serial.println("Conveyor Reversed");
}

// =====================================================
// Setup
// =====================================================
void setup()
{
  Serial.begin(115200);
  delay(1000);

  // -------------------------------------------------
  // Servo PWM Setup (Safely)
  // -------------------------------------------------
  // We MUST set the duty cycle to 90 degrees BEFORE attaching the pin!
  // If we attach the pin first, it sends a 0% duty cycle, causing the servos 
  // to violently jump and draw massive current, crashing the ESP32 (Brownout).
  
  ledcSetup(BASE_CH, PWM_FREQ, PWM_RES);
  moveServo(BASE_CH, 90);
  ledcAttachPin(BASE_PIN, BASE_CH);
  delay(300); // Stagger power draw

  ledcSetup(SHOULDER_CH, PWM_FREQ, PWM_RES);
  moveServo(SHOULDER_CH, 90);
  ledcAttachPin(SHOULDER_PIN, SHOULDER_CH);
  delay(300);

  ledcSetup(ELBOW_CH, PWM_FREQ, PWM_RES);
  moveServo(ELBOW_CH, 90);
  ledcAttachPin(ELBOW_PIN, ELBOW_CH);
  delay(300);

  ledcSetup(CLAW_CH, PWM_FREQ, PWM_RES);
  moveServo(CLAW_CH, 90);
  ledcAttachPin(CLAW_PIN, CLAW_CH);
  delay(300);

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
  WiFi.mode(WIFI_AP); // Force AP mode to fix broadcasting issues
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
                  ",\"base\":" + String(currentBase) +
                  ",\"shoulder\":" + String(currentShoulder) +
                  ",\"elbow\":" + String(currentElbow) +
                  ",\"claw\":" + String(currentClaw) +
                  ",\"mode\":\"web\"}";
    server.send(200, "application/json", json);
  });

  // =================================================
  // ARM CONTROL API
  // =================================================
  server.on("/move", HTTP_GET, []()
  {
    server.sendHeader("Access-Control-Allow-Origin", "*");

    bool isHoming = false;
    if (server.hasArg("base") && server.hasArg("shoulder") && server.hasArg("elbow") && server.hasArg("claw")) {
      if (server.arg("base").toInt() == 90 && server.arg("shoulder").toInt() == 90 && server.arg("elbow").toInt() == 90 && server.arg("claw").toInt() == 90) {
        isHoming = true;
      }
    }

    if (isHoming) {
      // Sequential Homing Logic: Claw -> Elbow -> Shoulder -> Base
      moveServo(CLAW_CH, 90);
      delay(300); 
      moveServo(ELBOW_CH, 90);
      delay(300);
      moveServo(SHOULDER_CH, 90);
      delay(300);
      moveServo(BASE_CH, 90);
    } else {
      // Fast, instantaneous movement
      if (server.hasArg("base")) moveServo(BASE_CH, server.arg("base").toInt());
      if (server.hasArg("shoulder")) moveServo(SHOULDER_CH, server.arg("shoulder").toInt());
      if (server.hasArg("elbow")) moveServo(ELBOW_CH, server.arg("elbow").toInt());
      if (server.hasArg("claw")) moveServo(CLAW_CH, server.arg("claw").toInt());
    }

    server.send(200, "text/plain", "OK");
  });

  // =================================================
  // CONVEYOR START
  // =================================================
  server.on("/conveyor/start", HTTP_GET, []()
  {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    conveyorStart();
    server.send(200, "text/plain", "Conveyor Started");
  });

  // =================================================
  // CONVEYOR STOP
  // =================================================
  server.on("/conveyor/stop", HTTP_GET, []()
  {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    conveyorStop();
    server.send(200, "text/plain", "Conveyor Stopped");
  });

  // =================================================
  // CONVEYOR REVERSE
  // =================================================
  server.on("/conveyor/reverse", HTTP_GET, []()
  {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    conveyorReverse();
    server.send(200, "text/plain", "Conveyor Reversed");
  });

  // =================================================
  // ROOT
  // =================================================
  server.on("/", HTTP_GET, []()
  {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "text/plain", "Robotic Arm + Conveyor Controller Online!");
  });

  server.begin();

  Serial.println("HTTP Server Started");
}

// =====================================================
// Loop
// =====================================================
void loop()
{
  server.handleClient();
}
