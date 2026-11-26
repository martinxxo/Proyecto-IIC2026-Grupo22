
#include <Servo.h>

Servo motor;

unsigned long ultimoComando = 0;
int pulsoActual = 1500;

void setup() {
  Serial.begin(9600);
  motor.attach(9);
  motor.writeMicroseconds(1500);
  ultimoComando = millis();
}

void loop() {
  while (Serial.available() > 0) {
    char comando = Serial.read();
    int nuevoPulso = pulsoActual;

    switch (comando) {
      case '0':
        nuevoPulso = 1500;
        break;
      case '1':
        nuevoPulso = 1580;
        break;
      case '2':
        nuevoPulso = 1750;
        break;
      case '3':
        nuevoPulso = 2000;
        break;
      default:
        continue;
    }

    pulsoActual = nuevoPulso;
    motor.writeMicroseconds(pulsoActual);
    ultimoComando = millis();
  }

  if (millis() - ultimoComando > 2000 && pulsoActual != 1500) {
    pulsoActual = 1500;
    motor.writeMicroseconds(1500);
  }
}
