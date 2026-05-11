#include <WiFi.h>
#include <WebServer.h>

// --- Configuration ---
// The ESP32 will create its own Wi-Fi network with these details
const char* ssid = "RoboticArm_Network";
const char* password = "password123"; // Must be at least 8 characters

WebServer server(80);

// Define the GPIO Pins
const int BASE_PIN = 5;
const int SHOULDER_PIN = 16;
const int ELBOW_PIN = 17;
const int CLAW_PIN = 18;

// Define PWM Channels for the ESP32
const int BASE_CH = 0;
const int SHOULDER_CH = 1;
const int ELBOW_CH = 2;
const int CLAW_CH = 3;

// PWM Settings for standard 180-degree servos (50Hz)
const int PWM_FREQ = 50;       
const int PWM_RES = 16;        
const int SERVO_MIN = 1638; // ~0.5ms pulse (0 degrees)
const int SERVO_MAX = 8192; // ~2.5ms pulse (180 degrees)

void moveServo(int channel, int angle) {
  // Clamp angle to valid servo range
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  
  int dutyCycle = map(angle, 0, 180, SERVO_MIN, SERVO_MAX);
  ledcWrite(channel, dutyCycle);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // 1. Setup PWM Channels and Attach Pins
  ledcSetup(BASE_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(BASE_PIN, BASE_CH);
  
  ledcSetup(SHOULDER_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(SHOULDER_PIN, SHOULDER_CH);
  
  ledcSetup(ELBOW_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(ELBOW_PIN, ELBOW_CH);
  
  ledcSetup(CLAW_CH, PWM_FREQ, PWM_RES);
  ledcAttachPin(CLAW_PIN, CLAW_CH);

  // Initialize servos to 90 degrees (center position)
  moveServo(BASE_CH, 90);
  moveServo(SHOULDER_CH, 90);
  moveServo(ELBOW_CH, 90);
  moveServo(CLAW_CH, 90);

  // 2. Start Access Point (AP Mode)
  Serial.println("\nStarting Wi-Fi Access Point...");
  
  // Set ESP32 as an Access Point
  WiFi.softAP(ssid, password);

  // In AP Mode, the ESP32 usually defaults to 192.168.4.1
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP Address: ");
  Serial.println(IP);

  // 3. Define HTTP API Routes
  server.on("/move", HTTP_GET, []() {
    // Crucial for browser-based fetch() to avoid CORS errors
    server.sendHeader("Access-Control-Allow-Origin", "*");

    if (server.hasArg("base")) {
      moveServo(BASE_CH, server.arg("base").toInt());
    }
    if (server.hasArg("shoulder")) {
      moveServo(SHOULDER_CH, server.arg("shoulder").toInt());
    }
    if (server.hasArg("elbow")) {
      moveServo(ELBOW_CH, server.arg("elbow").toInt());
    }
    if (server.hasArg("claw")) {
      moveServo(CLAW_CH, server.arg("claw").toInt());
    }

    server.send(200, "text/plain", "OK");
  });

  server.on("/", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "text/plain", "Robotic Arm Controller is Online!");
  });

  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  // Listen for incoming HTTP requests
  server.handleClient();
}
