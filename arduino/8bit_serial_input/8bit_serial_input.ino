const int buttons[8] = {2, 3, 4, 5, 6, 7, 8, 9};

int values[8] = {0, 0, 0, 0, 0, 0, 0, 0};
int lastValues[8] = {0, 0, 0, 0, 0, 0, 0, 0};

unsigned long lastCheck = 0;
unsigned long lastPrint = 0;

const unsigned long CHECK_INTERVAL = 100;    // 10 FPS
const unsigned long PRINT_INTERVAL = 1000;   // 1 second

void printValues() {
  Serial.print("[");

  for (int i = 0; i < 8; i++) {
    Serial.print(values[i]);

    if (i < 7) {
      Serial.print(",");
    }
  }

  Serial.println("]");
}

void setup() {
  Serial.begin(9600);

  for (int i = 0; i < 8; i++) {
    pinMode(buttons[i], INPUT_PULLUP);
  }

  // Initial state
  for (int i = 0; i < 8; i++) {
    values[i] = (digitalRead(buttons[i]) == LOW) ? 1 : 0;
    lastValues[i] = values[i];
  }

  printValues();
  lastPrint = millis();
}

void loop() {
  unsigned long now = millis();

  // Check inputs at 10 FPS
  if (now - lastCheck >= CHECK_INTERVAL) {
    lastCheck = now;

    bool changed = false;

    for (int i = 0; i < 8; i++) {
      values[i] = (digitalRead(buttons[i]) == LOW) ? 1 : 0;

      if (values[i] != lastValues[i]) {
        changed = true;
        lastValues[i] = values[i];
      }
    }

    // Change detected → print immediately
    if (changed) {
      printValues();
      lastPrint = now;
    }
  }

  // No change → print once every second
  if (now - lastPrint >= PRINT_INTERVAL) {
    printValues();
    lastPrint = now;
  }
}