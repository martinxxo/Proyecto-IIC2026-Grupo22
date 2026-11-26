import json
import threading
import time
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
        self.last_request = 0
        self.last_try = 0
        self.ready_at = 0

    def status(self):

        with self.lock:

            connected = (
                self.port is not None
                and self.port.is_open
            )

            return {
                "connected": connected,
                "port": self.port.port if connected else None
            }

    def set_command(self, command):

        if command not in ("0", "1", "2", "3"):
            return False

        with self.lock:
            self.command = command
            self.last_request = time.monotonic()

        return True

    def detectar(self):

        ports = list(list_ports.comports())

        candidates = []

        for p in ports:

            description = (
                (p.description or "") + " " +
                (p.manufacturer or "") + " " +
                (p.hwid or "")
            ).lower()

            if (
                "arduino" in description
                or "leonardo" in description
                or p.vid in (0x2341, 0x2A03)
            ):

                candidates.append(p)

        candidates.sort(
            key=lambda p: (
                "leonardo" not in
                (p.description or "").lower()
            )
        )

        for candidate in candidates:

            try:

                print(
                    f"Probando Arduino en {candidate.device}"
                )

                self.port = serial.Serial(
                    candidate.device,
                    BAUDIOS,
                    timeout=0.3,
                    write_timeout=0.3
                )

                self.ready_at = time.monotonic() + 2.5
                self.command = "0"
                self.last_request = 0

                print(
                    f"Arduino conectado: {candidate.device}"
                )

                return

            except (serial.SerialException, OSError) as error:

                self.port = None

                print(
                    f"No se pudo abrir {candidate.device}: {error}"
                )

    def tick(self):

        now = time.monotonic()

        with self.lock:

            if self.port is None:

                if now - self.last_try < 2:
                    return

                self.last_try = now

                self.detectar()

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

    def close(self):

        with self.lock:

            if self.port is not None:

                try:
                    self.port.write(b"0")
                    self.port.flush()
                except Exception:
                    pass

                try:
                    self.port.close()
                except Exception:
                    pass

                self.port = None


arduino = Arduino()


class Handler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):

        super().__init__(
            *args,
            directory=str(ROOT),
            **kwargs
        )

    def end_headers(self):

        origin = self.headers.get("Origin", "")

        parsed = urlparse(origin)

        if (
            parsed.scheme in ("http", "https")
            and parsed.hostname in ("127.0.0.1", "localhost")
        ):

            self.send_header(
                "Access-Control-Allow-Origin",
                origin
            )

            self.send_header(
                "Vary",
                "Origin"
            )

        self.send_header(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        )

        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type"
        )

        super().end_headers()

    def do_OPTIONS(self):

        self.send_response(204)
        self.end_headers()

    def do_GET(self):

        if urlparse(self.path).path == "/api/status":

            self.send_json(
                arduino.status()
            )

        else:

            super().do_GET()

    def do_POST(self):

        if urlparse(self.path).path != "/api/command":

            self.send_error(404)
            return

        origin = self.headers.get("Origin")

        if origin:

            parsed = urlparse(origin)

            if (
                parsed.scheme not in ("http", "https")
                or parsed.hostname not in (
                    "127.0.0.1",
                    "localhost"
                )
            ):

                self.send_json(
                    {"error": "Origen no permitido"},
                    403
                )

                return

        try:

            length = int(
                self.headers.get("Content-Length", "0")
            )

            if length < 1 or length > 1024:
                raise ValueError()

            data = json.loads(
                self.rfile.read(length)
            )

            if not isinstance(data, dict):
                raise ValueError()

            if not arduino.set_command(
                data.get("command")
            ):
                raise ValueError()

            self.send_json({
                "ok": True,
                **arduino.status()
            })

        except (ValueError, TypeError):

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


detener = threading.Event()


def loop_serial():

    while not detener.is_set():

        arduino.tick()

        detener.wait(0.4)


if __name__ == "__main__":

    servidor = ThreadingHTTPServer(
        (HOST, PORT),
        Handler
    )

    hilo = threading.Thread(
        target=loop_serial,
        daemon=True
    )

    hilo.start()

    print("V4 - Puente Arduino")
    print(f"Servidor: http://{HOST}:{PORT}")
    print("Buscando Arduino automáticamente...")
    print("Puedes abrir index.html con Live Server.")
    print("Pulsa Ctrl+C para finalizar.")

    try:

        servidor.serve_forever()

    except KeyboardInterrupt:

        print("\nDeteniendo servidor...")

    finally:

        detener.set()
        hilo.join(timeout=2)

        arduino.close()
        servidor.server_close()

        print("Servidor detenido.")