#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <PZEM004Tv30.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// --- Configuration Écran OLED ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- Configuration Wi-Fi ---
const char* ssid = "MFCPOLE_GUEST";         
const char* password = "welcometoneotex."; 

// --- Configuration HiveMQ Cloud ---
const char* mqtt_server = "c2fc45f10b334380bd1c75d41d839425.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "WattLab";       
const char* mqtt_password = "WattLab@123"; 

WiFiClientSecure espClient;
PubSubClient client(espClient);
PZEM004Tv30 pzem(Serial2, 16, 17); // RX2 = 16, TX2 = 17

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP32_WattLab_Client", mqtt_user, mqtt_password)) {
      Serial.println("connected");
      client.subscribe("wattlab/telemetry");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  // Initialisation de l'écran OLED (Ma3adech fama for(;;) bech el carte matوقفش ken l'écran mouch mawjouda)
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed! Check wiring or I2C address (try 0x3D)."));
  } else {
    // Affichage de "WattLab" pendant 5 secondes (Splash Screen)
    display.clearDisplay();
    display.setTextSize(2);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(15, 25);
    display.println(F("WattLab"));
    display.display();
    delay(5000); // 5 secondes d'attente
  }

  setup_wifi();
  
  espClient.setInsecure(); // Bypass cert verification lel test
  client.setServer(mqtt_server, mqtt_port);
}

unsigned long lastMsg = 0;
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 200) { // Kol 200ms wela 2 ثواني حسب ما تحب
    lastMsg = now;

    float voltage = pzem.voltage();
    float current = pzem.current();
    float power = pzem.power();
    float energy = pzem.energy();
    float frequency = pzem.frequency();
    float pf = pzem.pf();

    if (isnan(voltage)) {
      Serial.println("Erreur f qeraa el PZEM!");
      
      // Affichage erreur fel OLED
      display.clearDisplay();
      display.setTextSize(1);
      display.setTextColor(SSD1306_WHITE);
      display.setCursor(0, 20);
      display.println(F("Erreur Lecture PZEM!"));
      display.display();
    } else {
      // Creer payload JSON
      StaticJsonDocument<256> doc;
      doc["voltage"] = voltage;
      doc["current"] = current;
      doc["power"] = power;
      doc["energy"] = energy;
      doc["frequency"] = frequency;
      doc["cos_phi"] = pf;

      char jsonBuffer[256];
      serializeJson(doc, jsonBuffer);

      // Publish lel HiveMQ
      client.publish("wattlab/telemetry", jsonBuffer);
      Serial.println("Data sent to HiveMQ: " + String(jsonBuffer));

      // --- Mettre à jour l'affichage sur l'OLED ---
      display.clearDisplay();
      
      // Titre
      display.setTextSize(1);
      display.setTextColor(SSD1306_WHITE);
      display.setCursor(0, 0);
      display.println(F("--- WATT LAB MONITOR ---"));

      // Voltage
      display.setCursor(0, 20);
      display.print(F("Volt: "));
      display.print(voltage, 1);
      display.println(F(" V"));

      // Courant
      display.setCursor(0, 40);
      display.print(F("Current: "));
      display.print(current, 2);
      display.println(F(" A"));

      display.display();
    }
  }
}