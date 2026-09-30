/* =========================================================================
   Sonificación — "el gato trabajando" (Web Audio API, sin librerías)

   El sonido es lo que se escucharía al lado del gato: un teclado.
   Suena de forma continua mientras el sonido está activado y cambia en
   cuanto cambia el tramo o el país elegido.

   1. RITMO DEL TECLEO  -> productividad promedio del tramo.
      teclas por segundo = productividad / 10  (57 pts ≈ 5,7 teclas/s;
      90 pts ≈ 9 teclas/s). Es EXACTAMENTE el mismo factor que acelera el
      video del gato (productividad / 75): se oye y se ve la misma velocidad.
   2. SONIDO DE ERROR   -> % de trabajadores bajo 60 puntos.
      Cada tecla suma "probabilidad de error" = %bajo60 × 0,25; al llegar a 1
      hay un error. Así la frecuencia de errores es exactamente proporcional:
      suena un "bonk" de error del computador y el marco del gato parpadea
      en rojo. Con 4 h de sueño hay un error cada ~1,5 s; con 6 h, cada ~4 s;
      con 9 h, casi nunca (uno cada ~2 minutos).
      Es un ícono auditivo: no hay que aprender qué significa.
   3. ESPACIO (paneo)   -> ubicación del país en el mapa. América a la
      izquierda, Europa al centro, Asia/Oceanía a la derecha.

   Técnica: "lookahead scheduling". Cada 25 ms se programan las teclas de
   los próximos 120 ms con el reloj del AudioContext, así el ritmo es
   estable aunque el navegador esté ocupado dibujando.
   ========================================================================= */

const Sonido = (() => {
    let ctx = null;
    let salida = null;
    let paneo = null;
    let ruido = null;
    let activo = false;
    let reloj = null;

    // estado sonoro actual
    let teclasPorSegundo = 7.5;
    let probError = 0;
    let acumuladoError = 0.5;
    let proximaTecla = 0;
    let teclasHastaEspacio = 5;
    let alError = () => {};

    const ADELANTO = 0.12;          // segundos que se programan por adelantado
    const FACTOR_ERROR = 0.25;      // errores por tecla = %bajo60 × 0,25

    function iniciar() {
        if (ctx) {
            if (ctx.state === "suspended") ctx.resume();
            return;
        }
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const compresor = ctx.createDynamicsCompressor();
        salida = ctx.createGain();
        salida.gain.value = 0.9;
        paneo = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
        salida.connect(paneo).connect(compresor).connect(ctx.destination);

        // ruido blanco corto, reutilizado por todas las teclas
        const largo = Math.floor(ctx.sampleRate * 0.05);
        ruido = ctx.createBuffer(1, largo, ctx.sampleRate);
        const canal = ruido.getChannelData(0);
        for (let i = 0; i < largo; i++) canal[i] = Math.random() * 2 - 1;
    }

    // Una tecla = golpe agudo de plástico (ruido filtrado) + "tope" grave.
    function tecla(t, esEspacio) {
        const fuente = ctx.createBufferSource();
        fuente.buffer = ruido;
        const filtro = ctx.createBiquadFilter();
        filtro.type = "bandpass";
        filtro.frequency.value = esEspacio ? 900 : 2200 + Math.random() * 1600;
        filtro.Q.value = esEspacio ? 1.2 : 2.5;
        const g = ctx.createGain();
        const vol = (esEspacio ? 0.7 : 0.45) * (0.75 + Math.random() * 0.5);
        const dur = esEspacio ? 0.06 : 0.035;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        fuente.connect(filtro).connect(g).connect(salida);
        fuente.start(t);
        fuente.stop(t + dur + 0.01);

        const tope = ctx.createOscillator();
        tope.frequency.setValueAtTime(esEspacio ? 110 : 170, t);
        tope.frequency.exponentialRampToValueAtTime(60, t + 0.03);
        const gt = ctx.createGain();
        gt.gain.setValueAtTime(esEspacio ? 0.35 : 0.18, t);
        gt.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        tope.connect(gt).connect(salida);
        tope.start(t);
        tope.stop(t + 0.05);
    }

    // Error: dos notas descendentes tipo "bonk" del sistema operativo.
    function error(t) {
        [[392, 0], [294, 0.11]].forEach(([f, d]) => {
            const o = ctx.createOscillator();
            o.type = "triangle";
            o.frequency.value = f;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t + d);
            g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.16);
            o.connect(g).connect(salida);
            o.start(t + d);
            o.stop(t + d + 0.18);
        });
        const espera = Math.max(0, (t - ctx.currentTime) * 1000);
        setTimeout(() => alError(), espera);
    }

    function programar() {
        if (!activo) return;
        if (proximaTecla < ctx.currentTime) proximaTecla = ctx.currentTime + 0.02;
        while (proximaTecla < ctx.currentTime + ADELANTO) {
            const esEspacio = --teclasHastaEspacio <= 0;
            if (esEspacio) teclasHastaEspacio = 3 + Math.floor(Math.random() * 5);
            tecla(proximaTecla, esEspacio);
            // acumulador (no azar): la frecuencia de errores es exactamente proporcional al dato
            if (!esEspacio) {
                acumuladoError += probError;
                if (acumuladoError >= 1) { acumuladoError -= 1; error(proximaTecla + 0.04); }
            }
            // intervalo irregular (humano) pero con promedio exacto = 1 / teclasPorSegundo
            proximaTecla += (1 / teclasPorSegundo) * (0.7 + Math.random() * 0.6);
        }
    }

    return {
        get activo() { return activo; },
        activar() {
            iniciar();
            if (activo) return;
            activo = true;
            proximaTecla = ctx.currentTime + 0.05;
            reloj = setInterval(programar, 25);
        },
        desactivar() {
            activo = false;
            clearInterval(reloj);
        },
        /** Cambia lo que suena. prod 0–100, bajo60 0–1, pan -1..1 */
        actualizar(prod, bajo60, pan = 0) {
            teclasPorSegundo = Math.max(1, prod / 10);
            probError = bajo60 * FACTOR_ERROR;
            if (ctx && paneo.pan) paneo.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime, 0.05);
        },
        alError(fn) { alError = fn; },
    };
})();
