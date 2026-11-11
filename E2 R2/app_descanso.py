import tkinter as tk
from collections import deque
import time
import os
import numpy as np
import pygame
import serial
from serial.tools import list_ports

FONDO = "#151933"
PANEL = "#1e2344"
PANEL_OSCURO = "#171c38"
BORDE = "#353b61"
TEXTO = "#eceaf4"
SECUNDARIO = "#a4a9c4"
AMARILLO = "#f2b544"
TURQUESA = "#67c7ce"
VERDE = "#2ecc71"
ROSA = "#e88f9c"
ROJO = "#e8705f"

VENTANA = 3.0
TIEMPO_PARADA = 1.5
LIMPIEZA_TEXTO_MS = 1200

VELOCIDADES_AUDIO = {
    "BAJA": 0.9,
    "MEDIA": 1.75,
    "ALTA": 2.85
}

VOLUMENES_AUDIO = {
    "BAJA": 0.28,
    "MEDIA": 0.58,
    "ALTA": 0.95
}

ARCHIVO_AUDIO = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "audio.mp3"
)

DATOS = {
    "BAJA": {
        "horas": 5.51,
        "rango": "30–68",
        "registros": 10550,
        "comando": "1",
        "color": ROSA
    },
    "MEDIA": {
        "horas": 6.53,
        "rango": "69–84",
        "registros": 9674,
        "comando": "2",
        "color": AMARILLO
    },
    "ALTA": {
        "horas": 7.55,
        "rango": "85–100",
        "registros": 9776,
        "comando": "3",
        "color": VERDE
    }
}


class Aplicacion:
    def __init__(self, root):
        self.root = root
        self.root.title("La paradoja del descanso - E2")
        self.root.configure(bg=FONDO)

        ancho = self.root.winfo_screenwidth()
        alto = self.root.winfo_screenheight()

        self.root.geometry(
            f"{min(1250, ancho - 50)}x{min(800, alto - 80)}"
        )
        self.root.minsize(750, 570)

        self.arduino = None
        self.pulsaciones = deque()
        self.ultima_tecla = None
        self.nivel = "DETENIDO"
        self.ultimo_envio = 0
        self.ultimo_intento = 0
        self.sonido_activo = True
        self.cerrando = False
        self.limpieza_pendiente = None

        self.sonidos = {}
        self.canal_audio = None
        self.error_audio = None

        self.preparar_audio()
        self.crear_interfaz()
        self.conectar()
        self.actualizar()

        self.root.protocol(
            "WM_DELETE_WINDOW",
            self.cerrar
        )

    def etiqueta(
        self,
        padre,
        texto,
        tamano=11,
        color=TEXTO,
        negrita=False
    ):
        return tk.Label(
            padre,
            text=texto,
            font=(
                "Segoe UI",
                tamano,
                "bold" if negrita else "normal"
            ),
            fg=color,
            bg=padre.cget("bg"),
            anchor="w"
        )

    def crear_panel(self, padre):
        panel = tk.Frame(
            padre,
            bg=PANEL,
            highlightbackground=BORDE,
            highlightthickness=1,
            padx=28,
            pady=20
        )

        panel.grid_columnconfigure(0, weight=1)
        panel.grid_rowconfigure(0, weight=3)
        panel.grid_rowconfigure(2, weight=1)

        return panel

    def crear_interfaz(self):
        principal = tk.Frame(
            self.root,
            bg=FONDO,
            padx=32,
            pady=20
        )

        principal.pack(
            fill="both",
            expand=True
        )

        principal.grid_columnconfigure(
            0,
            weight=1
        )

        principal.grid_rowconfigure(
            1,
            weight=1
        )

        encabezado = tk.Frame(
            principal,
            bg=FONDO
        )

        encabezado.grid(
            row=0,
            column=0,
            sticky="ew",
            pady=(0, 16)
        )

        self.etiqueta(
            encabezado,
            "LA PARADOJA DEL DESCANSO",
            34,
            TEXTO,
            True
        ).pack(anchor="w")

        self.etiqueta(
            encabezado,
            "¿Cuánto descanso hay detrás de tu productividad?",
            15,
            AMARILLO
        ).pack(
            anchor="w",
            pady=(4, 10)
        )

        self.estado = self.etiqueta(
            encabezado,
            "Buscando Arduino...",
            11,
            AMARILLO,
            True
        )

        self.estado.pack(anchor="w")

        contenido = tk.Frame(
            principal,
            bg=FONDO
        )

        contenido.grid(
            row=1,
            column=0,
            sticky="nsew"
        )

        contenido.grid_columnconfigure(
            0,
            weight=1,
            uniform="columnas"
        )

        contenido.grid_columnconfigure(
            1,
            weight=1,
            uniform="columnas"
        )

        contenido.grid_rowconfigure(
            0,
            weight=1
        )

        izquierda = self.crear_panel(
            contenido
        )

        izquierda.grid(
            row=0,
            column=0,
            sticky="nsew",
            padx=(0, 8)
        )

        derecha = self.crear_panel(
            contenido
        )

        derecha.grid(
            row=0,
            column=1,
            sticky="nsew",
            padx=(8, 0)
        )

        self.crear_panel_productividad(
            izquierda
        )

        self.crear_panel_descanso(
            derecha
        )

        pie = tk.Frame(
            principal,
            bg=FONDO
        )

        pie.grid(
            row=2,
            column=0,
            sticky="ew",
            pady=(14, 0)
        )

        pie.grid_columnconfigure(
            0,
            weight=1
        )

        tk.Frame(
            pie,
            bg=BORDE,
            height=1
        ).grid(
            row=0,
            column=0,
            columnspan=2,
            sticky="ew",
            pady=(0, 10)
        )

        self.etiqueta(
            pie,
            "ESCRIBE AQUÍ PARA ACTIVAR EL LEGO",
            10,
            SECUNDARIO,
            True
        ).grid(
            row=1,
            column=0,
            sticky="w",
            pady=(0, 5)
        )

        self.entrada = tk.Text(
            pie,
            height=1,
            wrap="none",
            font=("Segoe UI", 11),
            bg=PANEL_OSCURO,
            fg=TEXTO,
            insertbackground=AMARILLO,
            relief="flat",
            padx=12,
            pady=8,
            highlightthickness=1,
            highlightbackground=BORDE,
            highlightcolor=TURQUESA
        )

        self.entrada.grid(
            row=2,
            column=0,
            sticky="ew",
            padx=(0, 12)
        )

        self.entrada.bind(
            "<KeyPress>",
            self.detectar_tecla
        )

        self.boton_sonido = tk.Button(
            pie,
            text="Sonido: ACTIVADO",
            command=self.alternar_sonido,
            bg=PANEL,
            fg=TURQUESA,
            activebackground=BORDE,
            activeforeground=TURQUESA,
            relief="flat",
            padx=14,
            pady=8,
            cursor="hand2"
        )

        self.boton_sonido.grid(
            row=2,
            column=1,
            sticky="e"
        )

        self.etiqueta(
            pie,
            "Fuente: Work Productivity · 30.000 registros sintéticos · "
            "La escritura simula productividad, no mide el sueño personal.",
            9,
            SECUNDARIO
        ).grid(
            row=3,
            column=0,
            columnspan=2,
            sticky="w",
            pady=(8, 0)
        )

        self.root.after(
            200,
            self.entrada.focus_set
        )

    def crear_panel_productividad(self, panel):
        principal = tk.Frame(
            panel,
            bg=PANEL
        )

        principal.grid(
            row=0,
            column=0,
            sticky="nsew"
        )

        self.etiqueta(
            principal,
            "PRODUCTIVIDAD SIMULADA",
            14,
            SECUNDARIO,
            True
        ).pack(
            anchor="w",
            pady=(8, 20)
        )

        self.valor_nivel = self.etiqueta(
            principal,
            "DETENIDO",
            54,
            SECUNDARIO,
            True
        )

        self.valor_nivel.pack(
            anchor="w",
            pady=(0, 18)
        )

        self.valor_rango = self.etiqueta(
            principal,
            "Sin actividad",
            15,
            SECUNDARIO
        )

        self.valor_rango.pack(anchor="w")

        self.barra = tk.Canvas(
            principal,
            height=16,
            bg=PANEL_OSCURO,
            highlightthickness=0
        )

        self.barra.pack(
            fill="x",
            pady=(24, 0)
        )

        self.barra.bind(
            "<Configure>",
            lambda evento: self.actualizar_barra()
        )

        tk.Frame(
            panel,
            bg=BORDE,
            height=1
        ).grid(
            row=1,
            column=0,
            sticky="ew",
            pady=(10, 12)
        )

        secundario = tk.Frame(
            panel,
            bg=PANEL
        )

        secundario.grid(
            row=2,
            column=0,
            sticky="new"
        )

        fila = tk.Frame(
            secundario,
            bg=PANEL
        )

        fila.pack(fill="x")

        self.etiqueta(
            fila,
            "RITMO DE ESCRITURA",
            10,
            SECUNDARIO,
            True
        ).pack(side="left")

        self.valor_ritmo = self.etiqueta(
            fila,
            "0.0 teclas/s",
            15,
            TEXTO,
            True
        )

        self.valor_ritmo.pack(side="right")

    def crear_panel_descanso(self, panel):
        principal = tk.Frame(
            panel,
            bg=PANEL
        )

        principal.grid(
            row=0,
            column=0,
            sticky="nsew"
        )

        self.etiqueta(
            principal,
            "DESCANSO PROMEDIO ASOCIADO",
            14,
            SECUNDARIO,
            True
        ).pack(
            anchor="w",
            pady=(8, 20)
        )

        self.valor_sueno = self.etiqueta(
            principal,
            "-- horas",
            54,
            TURQUESA,
            True
        )

        self.valor_sueno.pack(
            anchor="w",
            pady=(0, 18)
        )

        self.valor_registros = self.etiqueta(
            principal,
            "30.000 registros sintéticos",
            15,
            SECUNDARIO
        )

        self.valor_registros.pack(anchor="w")

        tk.Frame(
            panel,
            bg=BORDE,
            height=1
        ).grid(
            row=1,
            column=0,
            sticky="ew",
            pady=(10, 12)
        )

        secundario = tk.Frame(
            panel,
            bg=PANEL
        )

        secundario.grid(
            row=2,
            column=0,
            sticky="new"
        )

        self.etiqueta(
            secundario,
            "¿QUÉ SIGNIFICA?",
            10,
            SECUNDARIO,
            True
        ).pack(anchor="w")

        self.descripcion = tk.Label(
            secundario,
            text=(
                "Descanso promedio asociado al nivel "
                "de productividad simulado."
            ),
            font=("Segoe UI", 10),
            fg=SECUNDARIO,
            bg=PANEL,
            justify="left",
            anchor="nw",
            wraplength=400
        )

        self.descripcion.pack(
            anchor="w",
            fill="x",
            pady=(5, 0)
        )

        secundario.bind(
            "<Configure>",
            lambda e: self.descripcion.config(
                wraplength=max(150, e.width - 10)
            )
        )

    def buscar_puerto(self):
        puertos = list(
            list_ports.comports()
        )

        for puerto in puertos:
            if (
                puerto.vid == 0x2341
                and puerto.pid == 0x8036
            ):
                return puerto.device

        for puerto in puertos:
            if "leonardo" in puerto.description.lower():
                return puerto.device

        return None

    def conectar(self):
        self.ultimo_intento = time.monotonic()
        puerto = self.buscar_puerto()

        if puerto is None:
            self.estado.config(
                text="Arduino no detectado. Conecta el USB.",
                fg=ROJO
            )
            return

        try:
            self.arduino = serial.Serial(
                puerto,
                9600,
                timeout=0,
                write_timeout=0.3
            )

            self.estado.config(
                text=f"Arduino conectado - {puerto}",
                fg=TURQUESA
            )

            self.ultimo_envio = 0

        except (serial.SerialException, OSError):
            self.arduino = None

            self.estado.config(
                text="Puerto ocupado. Cierra el Monitor Serie.",
                fg=ROJO
            )

    def detectar_tecla(self, evento):
        if evento.char and evento.char.isprintable():
            ahora = time.monotonic()

            self.pulsaciones.append(ahora)
            self.ultima_tecla = ahora

            if self.limpieza_pendiente is not None:
                self.root.after_cancel(
                    self.limpieza_pendiente
                )

            self.limpieza_pendiente = self.root.after(
                LIMPIEZA_TEXTO_MS,
                self.limpiar_texto_automaticamente
            )

            if len(
                self.entrada.get("1.0", "end-1c")
            ) > 80:
                self.root.after_idle(
                    self.limpiar_texto_automaticamente
                )

    def limpiar_texto_automaticamente(self):
        self.limpieza_pendiente = None
        self.entrada.delete(
            "1.0",
            "end"
        )

    def calcular(self):
        ahora = time.monotonic()

        while (
            self.pulsaciones
            and ahora - self.pulsaciones[0] > VENTANA
        ):
            self.pulsaciones.popleft()

        ritmo = len(self.pulsaciones) / VENTANA

        if (
            self.ultima_tecla is None
            or ahora - self.ultima_tecla >= TIEMPO_PARADA
        ):
            return "DETENIDO", ritmo

        if ritmo < 3:
            return "BAJA", ritmo

        if ritmo < 6:
            return "MEDIA", ritmo

        return "ALTA", ritmo

    def preparar_audio(self):
        try:
            if not os.path.isfile(ARCHIVO_AUDIO):
                raise FileNotFoundError(
                    f"No se encontró {ARCHIVO_AUDIO}"
                )

            pygame.mixer.init(
                frequency=44100,
                size=-16,
                channels=2,
                buffer=1024
            )

            sonido_original = pygame.mixer.Sound(
                ARCHIVO_AUDIO
            )

            muestras = pygame.sndarray.array(
                sonido_original
            )

            if muestras.ndim == 1:
                muestras = np.column_stack(
                    (muestras, muestras)
                )

            for nivel, velocidad in VELOCIDADES_AUDIO.items():
                longitud = max(
                    1,
                    int(len(muestras) / velocidad)
                )

                posiciones = np.linspace(
                    0,
                    len(muestras) - 1,
                    longitud
                )

                indices = np.clip(
                    posiciones.astype(np.int64),
                    0,
                    len(muestras) - 1
                )

                muestras_ajustadas = np.ascontiguousarray(
                    muestras[indices],
                    dtype=np.int16
                )

                sonido = pygame.sndarray.make_sound(
                    muestras_ajustadas
                )

                sonido.set_volume(VOLUMENES_AUDIO.get(nivel, 0.5))
                self.sonidos[nivel] = sonido

            self.canal_audio = pygame.mixer.Channel(0)

        except Exception as error:
            self.error_audio = str(error)
            self.canal_audio = None
            print(
                "No se pudo preparar el audio:",
                error
            )

    def reproducir_sonido(self, nivel, ritmo=0.0):
        if self.canal_audio is None:
            return

        if (
            not self.sonido_activo
            or nivel == "DETENIDO"
        ):
            self.canal_audio.stop()
            return

        sonido = self.sonidos.get(nivel)

        if sonido is not None:
            factor_ritmo = min(1.0, max(0.0, ritmo / 8.0))
            vol_base = VOLUMENES_AUDIO.get(nivel, 0.5)
            volumen = min(1.0, max(0.18, vol_base * 0.7 + (0.2 + factor_ritmo * 0.8) * 0.3))
            sonido.set_volume(volumen)
            self.canal_audio.play(
                sonido,
                loops=-1
            )

    def enviar(self, comando):
        if self.arduino is None:
            return

        try:
            self.arduino.write(
                comando.encode("ascii")
            )

            self.ultimo_envio = time.monotonic()

        except (serial.SerialException, OSError):
            try:
                self.arduino.close()
            except Exception:
                pass

            self.arduino = None

            self.estado.config(
                text="Arduino desconectado",
                fg=ROJO
            )

    def actualizar_barra(self):
        self.barra.delete("all")

        porcentajes = {
            "DETENIDO": 0,
            "BAJA": 25,
            "MEDIA": 60,
            "ALTA": 100
        }

        porcentaje = porcentajes[self.nivel]

        if porcentaje == 0:
            return

        ancho = self.barra.winfo_width()
        alto = self.barra.winfo_height()

        color = DATOS[self.nivel]["color"]

        self.barra.create_rectangle(
            0,
            0,
            ancho * porcentaje / 100,
            alto,
            fill=color,
            outline=""
        )

    def actualizar(self):
        if self.cerrando:
            return

        ahora = time.monotonic()

        if (
            self.arduino is None
            and ahora - self.ultimo_intento >= 2
        ):
            self.conectar()

        nivel, ritmo = self.calcular()

        self.valor_ritmo.config(
            text=f"{ritmo:.1f} teclas/s"
        )

        if nivel == "DETENIDO":
            comando = "0"

            self.valor_nivel.config(
                text="DETENIDO",
                fg=SECUNDARIO
            )

            self.valor_sueno.config(
                text="-- horas",
                fg=TURQUESA
            )

            self.valor_ritmo.config(
                fg=TEXTO
            )

            self.valor_rango.config(
                text="Sin actividad"
            )

            self.valor_registros.config(
                text="30.000 registros sintéticos"
            )

            self.descripcion.config(
                text=(
                    "Escribe para descubrir el descanso "
                    "promedio asociado a distintos niveles "
                    "de productividad."
                )
            )

            if self.sonido_activo:
                self.boton_sonido.config(fg=TURQUESA)

        else:
            datos = DATOS[nivel]
            comando = datos["comando"]
            es_alta = nivel == "ALTA"

            self.valor_nivel.config(
                text=nivel,
                fg=datos["color"]
            )

            self.valor_sueno.config(
                text=f'{datos["horas"]:.2f} horas',
                fg=datos["color"] if es_alta else TURQUESA
            )

            self.valor_ritmo.config(
                fg=datos["color"] if es_alta else TEXTO
            )

            if self.sonido_activo:
                self.boton_sonido.config(
                    fg=datos["color"] if es_alta else TURQUESA
                )

            self.valor_rango.config(
                text=(
                    "Productividad del dataset: "
                    f'{datos["rango"]}'
                )
            )

            self.valor_registros.config(
                text=(
                    f'{datos["registros"]:,} '
                    "registros del grupo"
                )
            )

            self.descripcion.config(
                text=(
                    "En los datos de E1, el grupo de "
                    f"productividad {nivel.lower()} presenta "
                    f"un promedio de {datos['horas']:.2f} "
                    "horas de sueño."
                )
            )

            if self.sonido_activo and self.canal_audio is not None:
                sonido_actual = self.sonidos.get(nivel)
                if sonido_actual is not None:
                    factor_ritmo = min(1.0, max(0.0, ritmo / 8.0))
                    vol_base = VOLUMENES_AUDIO.get(nivel, 0.5)
                    volumen = min(1.0, max(0.18, vol_base * 0.7 + (0.2 + factor_ritmo * 0.8) * 0.3))
                    sonido_actual.set_volume(volumen)

        if nivel != self.nivel:
            self.nivel = nivel

            self.reproducir_sonido(nivel, ritmo)
            self.enviar(comando)
            self.actualizar_barra()

        elif ahora - self.ultimo_envio >= 0.5:
            self.enviar(comando)

        self.root.after(
            100,
            self.actualizar
        )

    def alternar_sonido(self):
        self.sonido_activo = not self.sonido_activo

        color_activo = (
            DATOS["ALTA"]["color"]
            if self.nivel == "ALTA"
            else TURQUESA
        )

        self.boton_sonido.config(
            text=(
                "Sonido: ACTIVADO"
                if self.sonido_activo
                else "Sonido: DESACTIVADO"
            ),
            fg=(
                color_activo
                if self.sonido_activo
                else SECUNDARIO
            )
        )

        self.reproducir_sonido(self.nivel)

    def cerrar(self):
        self.cerrando = True

        if self.limpieza_pendiente is not None:
            self.root.after_cancel(
                self.limpieza_pendiente
            )

        if self.canal_audio is not None:
            self.canal_audio.stop()

        if pygame.mixer.get_init():
            pygame.mixer.quit()

        if self.arduino is not None:
            try:
                self.arduino.write(b"0")
                self.arduino.flush()
                self.arduino.close()
            except Exception:
                pass

        self.root.destroy()


if __name__ == "__main__":
    root = tk.Tk()
    app = Aplicacion(root)
    root.mainloop()
