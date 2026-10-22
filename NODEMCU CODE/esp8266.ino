#include <ESP8266WiFi.h>
#include <Wire.h>
#include <SoftwareSerial.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <time.h>

#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#define WIFI_SSID ""  //Your 2.4GHz WiFi SSID
#define WIFI_PASSWORD ""  //Your WiFi Password

#define FIREBASE_API_KEY ""   //FIREBASE API KEY
#define FIREBASE_DATABASE_URL ""   //FIREBASE DATABASE URL

#define FIREBASE_USER_EMAIL ""   //LOGIN EMAIL - IN AUTHENTACITON >> Providers >> Email and Password
#define FIREBASE_USER_PASSWORD ""   //Password

#define DHT_PIN D4  //DHT sensor pin
#define DHT_TYPE DHT22

#define SDS_RX_PIN D6
#define SDS_TX_PIN D7

#define LCD_ADDRESS 0x27
#define LCD_SDA D2   //LCD I2C Lines
#define LCD_SCL D1
#define LCD_COLS 16
#define LCD_ROWS 2

//ADJUST THE TIMINGS HERE (NO NEED TO CHNAGE UNLESS REQUIRED)
const unsigned long DHT_READ_INTERVAL      = 2000;
const unsigned long LCD_UPDATE_INTERVAL    = 500;
const unsigned long LCD_PAGE_INTERVAL      = 3000;
const unsigned long MIN_UPLOAD_INTERVAL    = 3000;
const unsigned long WIFI_RETRY_INTERVAL    = 10000;
const unsigned long WIFI_CONNECT_TIMEOUT   = 20000;
const unsigned long SDS011_BAUD            = 9600;
const unsigned long ERROR_DISPLAY_DURATION = 5000;
const unsigned long FIREBASE_AUTH_TIMEOUT  = 15000;

const uint32_t HEAP_RESTART_THRESHOLD = 6000;   // bytes
const unsigned long HEAP_CHECK_INTERVAL = 5000; // ms

// Thresholds for the data update.
const float TEMPERATURE_CHANGE_THRESHOLD = 0.1;
const float HUMIDITY_CHANGE_THRESHOLD    = 0.5;
const float PM25_CHANGE_THRESHOLD        = 0.3;
const float PM10_CHANGE_THRESHOLD        = 0.3;

// TIME Setup 
const char *NTP_SERVER_1     = "pool.ntp.org";
const char *NTP_SERVER_2     = "time.nist.gov";
const long  GMT_OFFSET_SEC   = 19800;  // IST +5:30 for INDIA
const int   DAYLIGHT_OFFSET_SEC = 0;
const time_t NTP_VALID_THRESHOLD = 1680000000;

DHT dht(DHT_PIN, DHT_TYPE);
SoftwareSerial sdsSerial(SDS_RX_PIN, SDS_TX_PIN);
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool firebaseReady = false;
unsigned long firebaseBeginTime = 0;
bool firebaseAuthFailureLogged = false;

unsigned long lastDhtReadTime = 0;
unsigned long lastLcdUpdateTime = 0;
unsigned long lastLcdPageChangeTime = 0;
uint8_t lcdPageIndex = 0;
unsigned long lastWifiRetryTime = 0;
unsigned long wifiConnectStartTime = 0;
bool lastWifiConnectedLogged = false;
bool wifiTimeoutLogged = false;
unsigned long lastHeapCheckTime = 0;

bool ntpStarted = false;
bool ntpSynced = false;
bool lastNtpSyncedLogged = false;

char lastErrorTag[8]  = "";
char lastErrorMsg[LCD_COLS + 1] = "";
unsigned long lastErrorTime = 0;
bool errorActive = false;

struct SensorValueState {
  float latestValue;
  float lastUploadedValue;
  bool hasValidValue;
  bool pendingUpload;
  unsigned long lastUploadTime;
};

SensorValueState temperatureState = {0, 0, false, false, 0};
SensorValueState humidityState    = {0, 0, false, false, 0};
SensorValueState pm25State        = {0, 0, false, false, 0};
SensorValueState pm10State        = {0, 0, false, false, 0};

void connectWiFi();
void maintainWiFi();
void initializeFirebase();
void maintainFirebase();
void initializeNTP();
void maintainNTP();
void checkHeap();
void readDHT22();
void processSDS011();
bool parseSDS011Packet(const uint8_t *buf);
void updateSensorState(SensorValueState &state, float newValue, float threshold);
void processPendingFirebaseUploads();
bool uploadField(const char *path, SensorValueState &state);
void updateLCD();
void logError(const char *tag, const char *msg);

void setup() {
  Serial.begin(115200); // kept only for optional external debugging; unused otherwise

  Wire.begin(LCD_SDA, LCD_SCL);
  lcd.begin();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(F("Booting..."));

  dht.begin();
  sdsSerial.begin(SDS011_BAUD);

  connectWiFi();
  initializeFirebase();
}

void loop() {
  maintainWiFi();
  maintainFirebase();
  maintainNTP();
  checkHeap();

  processSDS011();

  if (millis() - lastDhtReadTime >= DHT_READ_INTERVAL) {
    lastDhtReadTime = millis();
    readDHT22();
  }

  processPendingFirebaseUploads();

  if (millis() - lastLcdUpdateTime >= LCD_UPDATE_INTERVAL) {
    lastLcdUpdateTime = millis();
    updateLCD();
  }
}

void logError(const char *tag, const char *msg) {
  strncpy(lastErrorTag, tag, sizeof(lastErrorTag) - 1);
  lastErrorTag[sizeof(lastErrorTag) - 1] = '\0';

  strncpy(lastErrorMsg, msg, sizeof(lastErrorMsg) - 1);
  lastErrorMsg[sizeof(lastErrorMsg) - 1] = '\0';

  lastErrorTime = millis();
  errorActive = true;

  updateLCD(); // show immediately, don't wait for next tick
}

void checkHeap() {
  if (millis() - lastHeapCheckTime < HEAP_CHECK_INTERVAL) return;
  lastHeapCheckTime = millis();

  if (ESP.getFreeHeap() < HEAP_RESTART_THRESHOLD) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(F("Low memory"));
    lcd.setCursor(0, 1);
    lcd.print(F("Restarting..."));
    delay(1000); // brief, intentional - only path allowed to pause before a restart
    ESP.restart();
  }
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiRetryTime = millis();
  wifiConnectStartTime = millis();
  wifiTimeoutLogged = false;
}

const char *wifiStatusReason(wl_status_t status) {
  switch (status) {
    case WL_NO_SSID_AVAIL:  return "No SSID found";
    case WL_CONNECT_FAILED: return "Bad password";
    case WL_IDLE_STATUS:    return "Idle";
    case WL_DISCONNECTED:   return "Disconnected";
    default:                return "Unknown";
  }
}

void maintainWiFi() {
  bool connected = (WiFi.status() == WL_CONNECTED);

  if (connected && !lastWifiConnectedLogged) {
    lastWifiConnectedLogged = true;
    wifiTimeoutLogged = false;
    initializeNTP();
  }

  if (!connected) {
    if (lastWifiConnectedLogged) {
      lastWifiConnectedLogged = false;
      wifiConnectStartTime = millis();
      wifiTimeoutLogged = false;
    }

    if (!wifiTimeoutLogged && (millis() - wifiConnectStartTime >= WIFI_CONNECT_TIMEOUT)) {
      wifiTimeoutLogged = true;
      char msg[LCD_COLS + 1];
      snprintf(msg, sizeof(msg), "%s", wifiStatusReason(WiFi.status()));
      logError("WIFI", msg);
    }

    if (millis() - lastWifiRetryTime >= WIFI_RETRY_INTERVAL) {
      lastWifiRetryTime = millis();
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  }
}

void initializeFirebase() {
  config.api_key = FIREBASE_API_KEY;
  config.database_url = FIREBASE_DATABASE_URL;

  auth.user.email = FIREBASE_USER_EMAIL;
  auth.user.password = FIREBASE_USER_PASSWORD;

  Firebase.reconnectWiFi(true);
  fbdo.setResponseSize(2048);

  Firebase.begin(&config, &auth);
  firebaseBeginTime = millis();
}

void maintainFirebase() {
  firebaseReady = Firebase.ready();

  if (firebaseReady) {
    firebaseAuthFailureLogged = false;
  }

  if (!firebaseReady && !firebaseAuthFailureLogged &&
      WiFi.status() == WL_CONNECTED &&
      (millis() - firebaseBeginTime >= FIREBASE_AUTH_TIMEOUT)) {

    logError("FBAUTH", "Check API/URL");
    firebaseAuthFailureLogged = true;
  }
}

void initializeNTP() {
  if (ntpStarted) return;
  ntpStarted = true;
  ntpSynced = false;
  lastNtpSyncedLogged = false;
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);
}

void maintainNTP() {
  if (!ntpStarted) return;

  time_t now = time(nullptr);
  bool synced = (now >= NTP_VALID_THRESHOLD);

  if (synced && !lastNtpSyncedLogged) {
    ntpSynced = true;
    lastNtpSyncedLogged = true;
  } else if (!synced && ntpSynced) {
    ntpSynced = false;
  }
}

void readDHT22() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    logError("DHT", "Read failed");
    return;
  }

  updateSensorState(temperatureState, temperature, TEMPERATURE_CHANGE_THRESHOLD);
  updateSensorState(humidityState, humidity, HUMIDITY_CHANGE_THRESHOLD);
}

static uint8_t sdsBuffer[10];
static uint8_t sdsIndex = 0;

void processSDS011() {
  while (sdsSerial.available()) {
    uint8_t b = (uint8_t)sdsSerial.read();

    if (sdsIndex == 0) {
      if (b == 0xAA) {
        sdsBuffer[sdsIndex++] = b;
      }
    } else {
      sdsBuffer[sdsIndex++] = b;
      if (sdsIndex >= 10) {
        parseSDS011Packet(sdsBuffer);
        sdsIndex = 0;  
      }
    }
  }
}

bool parseSDS011Packet(const uint8_t *buf) {
  if (buf[0] != 0xAA) return false;
  if (buf[1] != 0xC0) return false;
  if (buf[9] != 0xAB) return false;

  uint16_t sum = 0;
  for (int i = 2; i <= 7; i++) sum += buf[i];
  uint8_t checksum = (uint8_t)(sum & 0xFF);
  if (checksum != buf[8]) return false;

  uint16_t pm25Raw = buf[2] | (buf[3] << 8);
  uint16_t pm10Raw = buf[4] | (buf[5] << 8);

  float pm25 = pm25Raw / 10.0f;
  float pm10 = pm10Raw / 10.0f;

  updateSensorState(pm25State, pm25, PM25_CHANGE_THRESHOLD);
  updateSensorState(pm10State, pm10, PM10_CHANGE_THRESHOLD);

  return true;
}

void updateSensorState(SensorValueState &state, float newValue, float threshold) {
  state.latestValue = newValue;

  bool meaningfullyChanged;
  if (!state.hasValidValue) {
    meaningfullyChanged = true;
    state.hasValidValue = true;
  } else {
    meaningfullyChanged = fabs(newValue - state.lastUploadedValue) >= threshold;
  }

  if (meaningfullyChanged) {
    state.pendingUpload = true;
  }
}

void processPendingFirebaseUploads() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (!firebaseReady) return;

  if (temperatureState.pendingUpload &&
      (millis() - temperatureState.lastUploadTime >= MIN_UPLOAD_INTERVAL)) {
    uploadField("/sensors/temperature", temperatureState);
  }
  if (humidityState.pendingUpload &&
      (millis() - humidityState.lastUploadTime >= MIN_UPLOAD_INTERVAL)) {
    uploadField("/sensors/humidity", humidityState);
  }
  if (pm25State.pendingUpload &&
      (millis() - pm25State.lastUploadTime >= MIN_UPLOAD_INTERVAL)) {
    uploadField("/sensors/pm25", pm25State);
  }
  if (pm10State.pendingUpload &&
      (millis() - pm10State.lastUploadTime >= MIN_UPLOAD_INTERVAL)) {
    uploadField("/sensors/pm10", pm10State);
  }
}

bool uploadField(const char *path, SensorValueState &state) {
  float valueToSend = state.latestValue;

  bool success = Firebase.RTDB.setFloat(&fbdo, path, valueToSend);
  state.lastUploadTime = millis();

  if (success) {
    state.lastUploadedValue = valueToSend;
    if (fabs(state.latestValue - valueToSend) < 0.0001f) {
      state.pendingUpload = false;
    }
  } else {
    char msg[LCD_COLS + 1];
    snprintf(msg, sizeof(msg), "%s", fbdo.errorReason().c_str());
    logError("FBWR", msg);
  }

  return success;
}

void formatValueOrDash(char *out, size_t outSize, bool hasValid, float value, const char *suffix) {
  if (hasValid) {
    dtostrf(value, 4, 1, out);
    strncat(out, suffix, outSize - strlen(out) - 1);
  } else {
    strncpy(out, "--", outSize);
    out[outSize - 1] = '\0';
  }
}

void printLcdLine(uint8_t row, const char *text) {
  char padded[LCD_COLS + 1];
  size_t len = strlen(text);
  if (len > LCD_COLS) len = LCD_COLS;
  memcpy(padded, text, len);
  for (size_t i = len; i < LCD_COLS; i++) padded[i] = ' ';
  padded[LCD_COLS] = '\0';

  lcd.setCursor(0, row);
  lcd.print(padded);
}

void updateLCD() {
  if (millis() - lastLcdPageChangeTime >= LCD_PAGE_INTERVAL) {
    lastLcdPageChangeTime = millis();
    lcdPageIndex = (lcdPageIndex + 1) % 4;
  }

  char line0[LCD_COLS + 1];
  char line1[LCD_COLS + 1];

  bool showError = errorActive && (millis() - lastErrorTime < ERROR_DISPLAY_DURATION);
  if (!showError) errorActive = false;

  if (showError) {
    snprintf(line0, sizeof(line0), "ERR:%s", lastErrorTag);
    snprintf(line1, sizeof(line1), "%s", lastErrorMsg);
    printLcdLine(0, line0);
    printLcdLine(1, line1);
    return;
  }

  bool wifiOnline = (WiFi.status() == WL_CONNECTED);

  if (lcdPageIndex == 0) {
    const char *firebaseStatusStr;
    if (!wifiOnline) firebaseStatusStr = "Offline";
    else if (firebaseReady) firebaseStatusStr = "Online";
    else firebaseStatusStr = "Connecting";

    snprintf(line0, sizeof(line0), "WiFi:%s", wifiOnline ? "Online" : "Offline");
    snprintf(line1, sizeof(line1), "FB:%s", firebaseStatusStr);

  } else if (lcdPageIndex == 1) {
    if (ntpSynced) {
      time_t now = time(nullptr);
      struct tm timeInfo;
      localtime_r(&now, &timeInfo);
      char dateStr[LCD_COLS + 1];
      char timeStr[LCD_COLS + 1];
      strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeInfo);
      strftime(timeStr, sizeof(timeStr), "Time:%H:%M:%S", &timeInfo);
      snprintf(line0, sizeof(line0), "%s", dateStr);
      snprintf(line1, sizeof(line1), "%s", timeStr);
    } else {
      snprintf(line0, sizeof(line0), "Time: syncing");
      snprintf(line1, sizeof(line1), ntpStarted ? "NTP: waiting" : "NTP: no WiFi");
    }

  } else if (lcdPageIndex == 2) {
    char tempStr[16];
    char humStr[16];
    formatValueOrDash(tempStr, sizeof(tempStr), temperatureState.hasValidValue, temperatureState.latestValue, "C");
    formatValueOrDash(humStr, sizeof(humStr), humidityState.hasValidValue, humidityState.latestValue, "%");
    snprintf(line0, sizeof(line0), "Temp:%s", tempStr);
    snprintf(line1, sizeof(line1), "Hum:%s", humStr);

  } else {
    char pm25Str[16];
    char pm10Str[16];
    formatValueOrDash(pm25Str, sizeof(pm25Str), pm25State.hasValidValue, pm25State.latestValue, "");
    formatValueOrDash(pm10Str, sizeof(pm10Str), pm10State.hasValidValue, pm10State.latestValue, "");
    snprintf(line0, sizeof(line0), "PM2.5:%s", pm25Str);
    snprintf(line1, sizeof(line1), "PM10:%s", pm10Str);
  }

  printLcdLine(0, line0);
  printLcdLine(1, line1);
}