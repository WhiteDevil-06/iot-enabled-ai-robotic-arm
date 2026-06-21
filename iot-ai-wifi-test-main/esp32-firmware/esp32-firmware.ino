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
// Conveyor Settings (conveyorSpeed is dynamic)
// =====================================================
const int CONVEYOR_FREQ = 1000;
const int CONVEYOR_RES = 8;
int conveyorSpeed = 50;         // Dynamic speed (0 to 255)
bool isConveyorRunning = false;  // Tracks running state for speed updates (forward)
bool isConveyorReversing = false; // Tracks running state for speed updates (reverse)

// State tracking for status API
int baseAngle = 90;
int shoulderAngle = 90;
int elbowAngle = 90;
int clawAngle = 90;
bool webMode = true;

// =====================================================
// Servo Function
// =====================================================
void moveServo(int channel, int angle)
{
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
// Conveyor Functions (Dynamic PWM Pin Routing)
// =====================================================
void conveyorStart()
{
  isConveyorRunning = true;
  isConveyorReversing = false;

  // Detach IN2 from PWM if it was attached for reverse, and set it LOW
  ledcDetachPin(CONVEYOR_IN2);
  pinMode(CONVEYOR_IN2, OUTPUT);
  digitalWrite(CONVEYOR_IN2, LOW);

  // Attach IN1 to PWM and write speed
  ledcAttachPin(CONVEYOR_IN1, CONVEYOR_CH);
  ledcWrite(CONVEYOR_CH, conveyorSpeed);

  Serial.println("Conveyor Started");
}

void conveyorStop()
{
  isConveyorRunning = false;
  isConveyorReversing = false;

  ledcWrite(CONVEYOR_CH, 0);

  // Ensure both pins are detached from PWM and written LOW
  ledcDetachPin(CONVEYOR_IN1);
  ledcDetachPin(CONVEYOR_IN2);
  pinMode(CONVEYOR_IN1, OUTPUT);
  pinMode(CONVEYOR_IN2, OUTPUT);
  digitalWrite(CONVEYOR_IN1, LOW);
  digitalWrite(CONVEYOR_IN2, LOW);

  Serial.println("Conveyor Stopped");
}

void conveyorReverse()
{
  isConveyorRunning = false;
  isConveyorReversing = true;

  // Detach IN1 from PWM if it was attached for forward, and set it LOW
  ledcDetachPin(CONVEYOR_IN1);
  pinMode(CONVEYOR_IN1, OUTPUT);
  digitalWrite(CONVEYOR_IN1, LOW);

  // Attach IN2 to PWM and write speed
  ledcAttachPin(CONVEYOR_IN2, CONVEYOR_CH);
  ledcWrite(CONVEYOR_CH, conveyorSpeed);

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
  // Servo PWM Setup
  // -------------------------------------------------
  ledcSetup(BASE_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(BASE_PIN, BASE_CH);

  ledcSetup(SHOULDER_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(SHOULDER_PIN, SHOULDER_CH);

  ledcSetup(ELBOW_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(ELBOW_PIN, ELBOW_CH);

  ledcSetup(CLAW_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(CLAW_PIN, CLAW_CH);

  // -------------------------------------------------
  // Center Servos
  // -------------------------------------------------
  moveServo(BASE_CH, baseAngle);
  moveServo(SHOULDER_CH, shoulderAngle);
  moveServo(ELBOW_CH, elbowAngle);
  moveServo(CLAW_CH, clawAngle);

  // -------------------------------------------------
  // Conveyor Setup
  // -------------------------------------------------
  pinMode(CONVEYOR_IN1, OUTPUT);
  pinMode(CONVEYOR_IN2, OUTPUT);

  ledcSetup(CONVEYOR_CH, CONVEYOR_FREQ, CONVEYOR_RES);

  // PWM attached to IN1
  ledcAttachPin(CONVEYOR_IN1, CONVEYOR_CH);

  digitalWrite(CONVEYOR_IN2, LOW);

  conveyorStop();

  // -------------------------------------------------
  // Start WiFi AP
  // -------------------------------------------------
  Serial.println("\nStarting WiFi Access Point...");

  WiFi.softAP(ssid, password);

  IPAddress IP = WiFi.softAPIP();

  Serial.print("AP IP Address: ");
  Serial.println(IP);

  // =================================================
  // ARM CONTROL API
  // =================================================
  server.on("/move", HTTP_GET, []()
  {
    server.sendHeader("Access-Control-Allow-Origin", "*");

    if (server.hasArg("base"))
    {
      baseAngle = server.arg("base").toInt();
      moveServo(BASE_CH, baseAngle);
    }

    if (server.hasArg("shoulder"))
    {
      shoulderAngle = server.arg("shoulder").toInt();
      moveServo(SHOULDER_CH, shoulderAngle);
    }

    if (server.hasArg("elbow"))
    {
      elbowAngle = server.arg("elbow").toInt();
      moveServo(ELBOW_CH, elbowAngle);
    }

    if (server.hasArg("claw"))
    {
      clawAngle = server.arg("claw").toInt();
      moveServo(CLAW_CH, clawAngle);
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
  // CONVEYOR SPEED
  // =================================================
  server.on("/conveyor/speed", HTTP_GET, []()
  {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    if (server.hasArg("value"))
    {
      conveyorSpeed = server.arg("value").toInt();
      conveyorSpeed = constrain(conveyorSpeed, 0, 255);
      if (isConveyorRunning || isConveyorReversing)
      {
        ledcWrite(CONVEYOR_CH, conveyorSpeed);
      }
    }
    server.send(200, "text/plain", String(conveyorSpeed));
  });

  // =================================================
  // GET CURRENT STATUS (JSON compatibility)
  // =================================================
  server.on("/status", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    String json = "{\"base\":" + String(baseAngle) + 
                  ",\"shoulder\":" + String(shoulderAngle) + 
                  ",\"elbow\":" + String(elbowAngle) + 
                  ",\"claw\":" + String(clawAngle) + 
                  ",\"mode\":" + (webMode ? "\"web\"" : "\"physical\"") + 
                  ",\"speed\":" + String(conveyorSpeed) + "}";
    server.send(200, "application/json", json);
  });

  // =================================================
  // SET MODE (Manual/Web Toggle compatibility)
  // =================================================
  server.on("/setMode", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    if (server.hasArg("mode")) {
      String modeVal = server.arg("mode");
      if (modeVal == "web" || modeVal == "1") {
        webMode = true;
      } else {
        webMode = false;
      }
    }
    server.send(200, "text/plain", webMode ? "web" : "physical");
  });

  // =================================================
  // ROOT
  // =================================================
  server.on("/", HTTP_GET, []()
  {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(
      200,
      "text/plain",
      "Robotic Arm + Conveyor Controller Online!"
    );
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
