
import json
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import serial
from serial.tools import list_ports

ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = 8765
BAUDIOS = 9600


class Arduino:
    def __init__(self):
        self.lock = threading.RLock()
        self.port = None
        self.command = "0"
        self.last_request = 0.0
        self.last_try = 0.0
        self.ready_at = 0.0

    def status(self):
        with self.lock:
            return {
                "connected": (
                    self.port is not None
                    and self.port.is_open
                )
            }

    def set_command(self, command):
        if command not in ("0", "1", "2", "3"):
            return False

        with self.lock:
            self.command = command
            self.last_request = time.monotonic()

        return True

    def tick(self):
        now = time.monotonic()

        with self.lock:
            if self.port is None:
                if now - self.last_try < 2:
                    return

                self.last_try = now
                ports = list(list_ports.comports())

                candidates = [
                    p for p in ports
                    if (
                        "VID:PID=2341:8036" in p.hwid.upper()
                        or "arduino" in p.description.lower()
                        or "leonardo" in p.description.lower()
                        or "arduino" in (p.manufacturer or "").lower()
                    )
                ]

                if not candidates:
                    return

                try:
                    self.port = serial.Serial(
                        candidates[0].device,
                        BAUDIOS,
                        timeout=0.3,
                        write_timeout=0.3
                    )

                    self.ready_at = now + 2.5
                    self.command = "0"
                    self.last_request = 0

                    print(
                        "Arduino detectado:",
                        candidates[0].device
                    )

                except serial.SerialException as error:
                    self.port = None
                    print(
                        "No se pudo abrir el puerto:",
                        error
                    )

                return

            if now < self.ready_at:
                return

            safe_command = (
                self.command
                if now - self.last_request < 2
                else "0"
            )

            try:
                self.port.write(
                    safe_command.encode("ascii")
                )

            except (serial.SerialException, OSError):
                try:
                    self.port.close()
                except Exception:
                    pass

                self.port = None
                self.command = "0"
                print("Arduino desconectado")


arduino = Arduino()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(
            *args,
            directory=str(ROOT),
            **kwargs
        )

    def do_GET(self):
        if urlparse(self.path).path == "/api/status":
            self.send_json(arduino.status())
        else:
            super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/command":
            self.send_error(404)
            return

        try:
            length = int(
                self.headers.get("Content-Length", "0")
            )

            if length < 1 or length > 1024:
                raise ValueError("Tamaño inválido")

            data = json.loads(
                self.rfile.read(length)
            )

            if not arduino.set_command(
                data.get("command")
            ):
                raise ValueError("Comando inválido")

            self.send_json({
                "ok": True,
                **arduino.status()
            })

        except (ValueError, TypeError, json.JSONDecodeError):
            self.send_json(
                {"error": "Solicitud inválida"},
                400
            )

    def send_json(self, data, status=200):
        payload = json.dumps(data).encode("utf-8")

        self.send_response(status)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header(
            "Cache-Control",
            "no-store"
        )
        self.send_header(
            "Content-Length",
            str(len(payload))
        )
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        pass


def loop_serial():
    while True:
        arduino.tick()
        time.sleep(0.4)


if __name__ == "__main__":
    threading.Thread(
        target=loop_serial,
        daemon=True
    ).start()

    url = f"http://{HOST}:{PORT}"

    servidor = ThreadingHTTPServer(
        (HOST, PORT),
        Handler
    )

    print(f"R3 disponible en {url}")
    print("Abriendo visualización...")
    print("Pulsa Ctrl+C para finalizar.")

    webbrowser.open(url)

    try:
        servidor.serve_forever()

    except KeyboardInterrupt:
        print("\nDeteniendo motor y cerrando servidor...")

    finally:
        arduino.set_command("0")
        arduino.tick()
        servidor.server_close()
        print("Servidor detenido.")
