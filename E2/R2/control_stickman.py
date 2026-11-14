import time
import threading
import serial
from collections import deque
from pynput import keyboard

PUERTO = "COM14"
BAUDIOS = 9600

VENTANA = 3.0
TIEMPO_PARADA = 2.0

pulsaciones = deque()
bloqueo = threading.Lock()

def detectar_tecla(tecla):
    if tecla == keyboard.Key.esc:
        return False

    if tecla == keyboard.Key.space or (
        hasattr(tecla, "char") and tecla.char is not None
    ):
        with bloqueo:
            pulsaciones.append(time.monotonic())

arduino = serial.Serial(PUERTO, BAUDIOS, timeout=1)
time.sleep(2)

escuchador = keyboard.Listener(on_press=detectar_tecla)
escuchador.start()

print("CONTROL ACTIVADO")
print("ESC para finalizar")

anterior = None
ultimo_envio = 0

try:
    while escuchador.is_alive():
        ahora = time.monotonic()

        with bloqueo:
            while pulsaciones and ahora - pulsaciones[0] > VENTANA:
                pulsaciones.popleft()

            cantidad = len(pulsaciones)
            ultima = pulsaciones[-1] if pulsaciones else None

        teclas_segundo = cantidad / VENTANA

        if ultima is None or ahora - ultima >= TIEMPO_PARADA:
            velocidad = "0"
            nombre = "DETENIDO"
        elif teclas_segundo < 3:
            velocidad = "1"
            nombre = "BAJA"
        elif teclas_segundo < 6:
            velocidad = "2"
            nombre = "MEDIA"
        else:
            velocidad = "3"
            nombre = "ALTA"

        if velocidad != anterior or ahora - ultimo_envio >= 0.5:
            arduino.write(velocidad.encode())
            anterior = velocidad
            ultimo_envio = ahora

        print(
            f"\rTeclas/s: {teclas_segundo:.1f} | Motor: {nombre}       ",
            end="",
            flush=True
        )

        time.sleep(0.1)

except KeyboardInterrupt:
    pass

finally:
    arduino.write(b"0")
    escuchador.stop()
    arduino.close()
    print("\nControl finalizado.")