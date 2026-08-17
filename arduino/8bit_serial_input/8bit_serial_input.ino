// Define analog input pins for the 5 active optical channels
const int SENSOR_PINS[5] = {A0, A1, A2, A3, A4};

// Calibrated threshold values calculated from optical testing
const int THRESHOLDS[5] = {477, 462, 869, 487, 428};

// 8-bit state storage arrays
byte currentState[8] = {0, 0, 0, 0, 0, 0, 0, 0};
byte lastWrittenState[8] = {0, 0, 0, 0, 0, 0, 0, 0};

// Timing and verification configurations
unsigned long lastWriteTime = 0;
const unsigned long NORMAL_INTERVAL = 1000; // Default 1-second transmission heartbeat
const unsigned long DEBOUNCE_INTERVAL = 100; // 0.1-second verification sampling interval

// Function to read all 5 analog sensors with default state zero-override
void readSensors(byte *arr) {
  arr[0] = 0;
  arr[1] = 0;
  arr[2] = 0;

  bool allUnblocked = true;

  for (int i = 0; i < 5; i++) {
    int analogVal = analogRead(SENSOR_PINS[i]);
    
    // Check light contact condition
    if (analogVal < THRESHOLDS[i]) {
      arr[i + 3] = 1; // Light received (Unblocked)
    } else {
      arr[i + 3] = 0; // Light interrupted (Blocked)
      allUnblocked = false; // At least one channel is blocked
    }
  }

  // Override logic: If all 5 sensors are unblocked (1,1,1,1,1), set all to 0
  if (allUnblocked) {
    for (int i = 3; i < 8; i++) {
      arr[i] = 0;
    }
  }
}

// Helper function to compare two 8-bit arrays
bool areArraysEqual(byte *arr1, byte *arr2) {
  for (int i = 0; i < 8; i++) {
    if (arr1[i] != arr2[i]) return false;
  }
  return true;
}

// Helper function to copy array content
void copyArray(byte *src, byte *dest) {
  for (int i = 0; i < 8; i++) {
    dest[i] = src[i];
  }
}

// Helper function to print 8-bit array via Serial Monitor
void printArray(byte *arr) {
  Serial.print("[");
  for (int i = 0; i < 8; i++) {
    Serial.print(arr[i]);
    if (i < 7) {
      Serial.print(", ");
    }
  }
  Serial.println("]");
}

void setup() {
  Serial.begin(9600);

  // Configure internal pull-up resistors for all active channels
  for (int i = 0; i < 5; i++) {
    pinMode(SENSOR_PINS[i], INPUT_PULLUP);
  }

  // Initial read and baseline broadcast
  readSensors(lastWrittenState);
  printArray(lastWrittenState);
  lastWriteTime = millis();
}

void loop() {
  readSensors(currentState);

  // Check if current sensor readings differ from the last transmitted output
  if (!areArraysEqual(currentState, lastWrittenState)) {
    byte candidateState[8];
    copyArray(currentState, candidateState);
    int matchCount = 1; // First sample recorded
    unsigned long verifyStartTime = millis();

    // Fast verification loop running every 0.1 seconds
    while (true) {
      delay(DEBOUNCE_INTERVAL);
      byte checkState[8];
      readSensors(checkState);

      if (areArraysEqual(checkState, candidateState)) {
        matchCount++;
      } else {
        // Reset match counter if signal fluctuates
        copyArray(checkState, candidateState);
        matchCount = 1;
      }

      // Verification Success: 3 consecutive matching samples verified (~0.2s total)
      if (matchCount >= 3) {
        copyArray(candidateState, lastWrittenState);
        printArray(lastWrittenState);
        lastWriteTime = millis();
        break;
      }

      // Safety Timeout: Exit loop if verification takes longer than 1 second
      if (millis() - verifyStartTime >= NORMAL_INTERVAL) {
        copyArray(checkState, lastWrittenState);
        printArray(lastWrittenState);
        lastWriteTime = millis();
        break;
      }
    }
  } else {
    // Normal state: Heartbeat transmission every 1 second
    if (millis() - lastWriteTime >= NORMAL_INTERVAL) {
      printArray(lastWrittenState);
      lastWriteTime = millis();
    }
  }

  delay(20); // Small loop stability delay
}