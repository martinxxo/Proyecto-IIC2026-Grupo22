
"use strict";

const DATA = {
    total: 30000,
    matrix: [
        [{n:682,p:48.42,low:81.52},{n:661,p:54.18,low:65.96},{n:661,p:60.65,low:46.29},{n:641,p:65.89,low:30.42}],
        [{n:764,p:52.95,low:67.67},{n:769,p:58.53,low:54.23},{n:751,p:64.61,low:36.75},{n:735,p:71.00,low:18.50}],
        [{n:754,p:55.69,low:60.48},{n:787,p:62.64,low:39.52},{n:683,p:68.37,low:25.33},{n:731,p:74.29,low:12.59}],
        [{n:846,p:60.56,low:45.39},{n:701,p:66.22,low:32.67},{n:779,p:71.85,low:16.69},{n:717,p:78.63,low:6.56}],
        [{n:782,p:63.96,low:37.21},{n:760,p:70.84,low:20.26},{n:756,p:76.19,low:9.66},{n:706,p:81.44,low:5.38}],
        [{n:756,p:69.07,low:25.26},{n:750,p:75.24,low:11.33},{n:764,p:80.38,low:4.45},{n:677,p:85.62,low:1.62}],
        [{n:784,p:73.01,low:16.96},{n:764,p:78.54,low:7.07},{n:800,p:83.93,low:1.50},{n:728,p:89.48,low:0.14}],
        [{n:787,p:75.46,low:11.69},{n:694,p:82.35,low:2.74},{n:798,p:87.30,low:1.00},{n:727,p:91.88,low:0.00}],
        [{n:831,p:80.43,low:5.29},{n:713,p:85.92,low:1.12},{n:792,p:90.57,low:0.00},{n:708,p:93.65,low:0.00}],
        [{n:835,p:83.74,low:2.51},{n:794,p:89.24,low:0.13},{n:841,p:93.32,low:0.12},{n:791,p:95.63,low:0.00}]
    ],
    ageLines: [
        [{n:690,p:57.36},{n:813,p:61.62},{n:796,p:65.01},{n:854,p:69.04},{n:823,p:71.86},{n:800,p:77.74},{n:884,p:80.94},{n:814,p:84.30},{n:787,p:87.50},{n:868,p:90.98}],
        [{n:853,p:57.30},{n:923,p:61.28},{n:927,p:65.40},{n:889,p:68.56},{n:959,p:73.25},{n:889,p:77.24},{n:939,p:80.77},{n:935,p:83.77},{n:951,p:87.45},{n:992,p:90.21}],
        [{n:1102,p:56.90},{n:1283,p:61.97},{n:1232,p:64.87},{n:1300,p:69.30},{n:1222,p:73.29},{n:1258,p:77.24},{n:1253,p:81.51},{n:1257,p:84.37},{n:1306,p:87.37},{n:1401,p:90.25}]
    ]
};

const $ = id => document.getElementById(id);

const fmt = n => n.toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
});

const SLEEP_LABELS = Array.from(
    {length: 10},
    (_, i) => `${fmt(4 + i * 0.5)} – ${fmt(4.5 + i * 0.5)} horas`
);

const EX_LABELS = [
    "0 – 1,5 horas",
    ">1,5 – 3 horas",
    ">3 – 4,5 horas",
    ">4,5 – 6 horas"
];

const AGE_LABELS = ["22 – 30", "31 – 40", "41 – 54"];
const COLORS = ["#f2b544", "#67c7ce", "#e88f9c"];

const SLEEP_MS_PER_HOUR = 1500;
const ENERGY_PER_PRESS = 8;
const ENERGY_DECAY_PER_SECOND = 12;
const EXERCISE_CONFIRM_MS = 2500;
const EXERCISE_SECTORS = 4;
const MOTOR_INTERVAL_MS = 500;

const COIN_INTERVALS = {
    BAJA: 3000,
    MEDIA: 1000,
    ALTA: 600
};

const COIN_VOLUME = 0.35;
const MAX_COIN_VOICES = 5;

const state = {
    sleep: 0,
    exercise: 0,
    soundEnabled: false,
    selectedAge: "all"
};

let sleepConfirmed = false;
let exerciseConfirmed = false;
let motorEnabled = true;
let bridgeConnected = false;

let sleepHeld = false;
let sleepStart = 0;
let sleepBase = 0;

let exerciseEnergy = 0;
let exercisePresses = 0;
let exerciseLocked = false;
let exerciseSector = -1;
let exerciseSectorStart = null;
let exerciseHoldProgress = 0;

let lastFrame = performance.now();
let lastSent = "";
let sending = false;

const workAudio = $("workAudio");
const soundButton = $("soundButton");
const motorButton = $("motorButton");
const dial = $("exerciseDial");

workAudio.pause();
workAudio.loop = false;
workAudio.playbackRate = 1;
workAudio.volume = COIN_VOLUME;
workAudio.preload = "auto";

const coinVoices = Array.from(
    {length: MAX_COIN_VOICES},
    () => {
        const audio = new Audio();
        audio.preload = "auto";
        audio.loop = false;
        audio.volume = COIN_VOLUME;
        audio.playbackRate = 1;
        return audio;
    }
);

let nextCoinVoice = 0;
let coinTimer = null;
let coinAudioReady = false;
let currentCoinInterval = null;

function coinAudioSource() {
    return workAudio.currentSrc ||
        workAudio.getAttribute("src") ||
        workAudio.querySelector("source")?.src ||
        "./audio.mp3";
}

function prepareCoinAudio() {
    const source = coinAudioSource();

    for (const audio of coinVoices) {
        audio.src = source;
        audio.load();
    }

    coinAudioReady = true;
}

function current() {
    return DATA.matrix[state.sleep][state.exercise];
}

function productivityLevel(value) {
    if (value < 60) return "Productividad baja";
    if (value < 80) return "Productividad media";
    return "Productividad alta";
}

function shortProductivityLevel(value) {
    if (value < 60) return "Baja";
    if (value < 80) return "Media";
    return "Alta";
}

function audioLevel() {
    const p = current().p;

    if (p < 60) return "BAJA";
    if (p < 80) return "MEDIA";
    return "ALTA";
}

function motorCommand() {
    if (
        !motorEnabled ||
        !sleepConfirmed ||
        !exerciseConfirmed
    ) {
        return "0";
    }

    const p = current().p;

    if (p < 60) return "1";
    if (p < 80) return "2";
    return "3";
}

function canPlayCoins() {
    return (
        state.soundEnabled &&
        motorEnabled &&
        sleepConfirmed &&
        exerciseConfirmed &&
        bridgeConnected &&
        motorCommand() !== "0"
    );
}

function stopCoinAudio() {
    if (coinTimer !== null) {
        clearInterval(coinTimer);
        coinTimer = null;
    }

    for (const audio of coinVoices) {
        audio.pause();
        audio.currentTime = 0;
    }

    currentCoinInterval = null;
}

function playCoin() {
    if (!canPlayCoins() || !coinAudioReady) return;

    const audio = coinVoices[nextCoinVoice];

    nextCoinVoice =
        (nextCoinVoice + 1) % coinVoices.length;

    audio.pause();
    audio.currentTime = 0;
    audio.playbackRate = 1;

    const playback = audio.play();

    if (playback && typeof playback.catch === "function") {
        playback.catch(error => {
            if (error.name !== "AbortError") {
                console.warn(
                    "No se pudo reproducir la moneda:",
                    error
                );
            }
        });
    }
}

function updateCoinAudio() {
    if (!canPlayCoins()) {
        if (coinTimer !== null) {
            stopCoinAudio();
        }
        return;
    }

    if (!coinAudioReady) return;

    const interval = COIN_INTERVALS[audioLevel()];

    if (
        coinTimer !== null &&
        currentCoinInterval === interval
    ) {
        return;
    }

    if (coinTimer !== null) {
        stopCoinAudio();
    }

    currentCoinInterval = interval;

    playCoin();

    coinTimer = setInterval(() => {
        if (!canPlayCoins()) {
            stopCoinAudio();
            return;
        }

        playCoin();
    }, interval);
}

async function sendMotor(force = false) {
    if (sending) return;

    const command = motorCommand();

    if (!force && command === lastSent) return;

    sending = true;

    try {
        const response = await fetch("/api/command", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({command})
        });

        if (!response.ok) {
            throw new Error("Puente no disponible");
        }

        const result = await response.json();

        bridgeConnected = Boolean(result.connected);
        lastSent = command;

    } catch (error) {
        bridgeConnected = false;
        lastSent = "";
    } finally {
        sending = false;
        updateCoinAudio();
    }
}

async function checkArduino() {
    try {
        const response = await fetch("/api/status", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Sin conexión");
        }

        const status = await response.json();
        bridgeConnected = Boolean(status.connected);

    } catch (error) {
        bridgeConnected = false;
    }

    $("arduinoStatus").textContent = bridgeConnected
        ? "● Arduino conectado"
        : "● Arduino desconectado";

    $("arduinoStatus").classList.toggle(
        "connected",
        bridgeConnected
    );

    updateCoinAudio();
}

function updateMediaSpeed() {
    updateCoinAudio();
}

function updateSoundButton() {
    $("soundIcon").textContent =
        state.soundEnabled ? "♫" : "♪";

    $("soundLabel").textContent =
        state.soundEnabled ? "Silenciar" : "Sonido";

    soundButton.setAttribute(
        "aria-pressed",
        String(state.soundEnabled)
    );

    soundButton.classList.toggle(
        "active",
        state.soundEnabled
    );
}

soundButton.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;

    if (state.soundEnabled && !coinAudioReady) {
        prepareCoinAudio();
    }

    if (!state.soundEnabled) {
        stopCoinAudio();
    } else {
        updateCoinAudio();
    }

    updateSoundButton();
});

function updateMotorButton() {
    motorButton.textContent = motorEnabled
        ? "■ Detener"
        : "▶ Reactivar";

    motorButton.setAttribute(
        "aria-pressed",
        String(!motorEnabled)
    );
}

motorButton.addEventListener("click", () => {
    motorEnabled = !motorEnabled;

    updateMotorButton();

    if (!motorEnabled) {
        stopCoinAudio();
    }

    sendMotor(true);
    updateCoinAudio();
});

function createResetButton() {
    const actions = document.querySelector(".rhythm-actions");

    if (!actions) return;

    let button = $("resetButton");

    if (!button) {
        button = document.createElement("button");
        button.id = "resetButton";
        button.className = "media-button";
        button.type = "button";
        button.textContent = "↺ Reiniciar";
        actions.append(button);
    }

    actions.style.display = "grid";
    actions.style.gridTemplateColumns =
        "repeat(3, minmax(0, 1fr))";
    actions.style.gap = "5px";

    actions.querySelectorAll(".media-button").forEach(btn => {
        btn.style.width = "100%";
        btn.style.minWidth = "0";
        btn.style.padding = "4px 2px";
        btn.style.fontSize = "10px";
        btn.style.whiteSpace = "nowrap";
        btn.style.height = "30px";
        btn.style.minHeight = "30px";
    });

    button.addEventListener("click", resetAll);
}

function resetAll() {
    stopCoinAudio();

    sleepHeld = false;
    sleepStart = 0;
    sleepBase = 0;

    exerciseEnergy = 0;
    exercisePresses = 0;
    exerciseLocked = false;
    exerciseSector = -1;
    exerciseSectorStart = null;
    exerciseHoldProgress = 0;

    sleepConfirmed = false;
    exerciseConfirmed = false;

    state.sleep = 0;
    state.exercise = 0;

    motorEnabled = true;
    lastSent = "";

    updateMotorButton();
    update();
    sendMotor(true);
}

function sectorFromEnergy(energy) {
    if (energy <= 0) return -1;

    return Math.min(
        EXERCISE_SECTORS - 1,
        Math.floor((energy - 0.000001) / 25)
    );
}

function updateDial() {
    const fraction = Math.max(
        0,
        Math.min(100, exerciseEnergy)
    );

    dial.style.setProperty(
        "--dial-progress",
        `${fraction}%`
    );

    const activeColor = "#f2b544";
    const inactiveColor = "#3c446b";
    const stops = [];

    for (let i = 0; i < EXERCISE_SECTORS; i++) {
        const start = i * 25;
        const end = (i + 1) * 25;

        const fillEnd = Math.max(
            start,
            Math.min(end, fraction)
        );

        if (fillEnd > start) {
            stops.push(
                `${activeColor} ${start}% ${fillEnd}%`
            );
        }

        if (fillEnd < end) {
            stops.push(
                `${inactiveColor} ${fillEnd}% ${end}%`
            );
        }
    }

    dial.style.backgroundImage = `
        repeating-conic-gradient(
            transparent 0deg 89deg,
            rgba(21,25,51,0.95) 89deg 90deg
        ),
        conic-gradient(${stops.join(", ")})
    `;

    $("exerciseCounter").textContent =
        exerciseLocked
            ? "Rango confirmado"
            : `${exercisePresses} pulsaciones`;

    if (exerciseConfirmed) {
        $("exerciseConfirm").textContent =
            "✓ Ejercicio confirmado";
    } else if (
        exerciseSector >= 0 &&
        exerciseSectorStart !== null
    ) {
        $("exerciseConfirm").textContent =
            `Mantén el rango: ${exerciseHoldProgress.toFixed(1)} / 2,5 s`;
    } else {
        $("exerciseConfirm").textContent =
            "Ejercicio sin confirmar";
    }

    $("selectionStatus").textContent =
        `${Number(sleepConfirmed) + Number(exerciseConfirmed)}/2 seleccionados`;
}

function pressExercise() {
    if (exerciseLocked) {
        exerciseLocked = false;
        exerciseConfirmed = false;
        exerciseSector = -1;
        exerciseSectorStart = null;
        exerciseHoldProgress = 0;

        stopCoinAudio();
        sendMotor(true);
    }

    exercisePresses++;

    exerciseEnergy = Math.min(
        100,
        exerciseEnergy + ENERGY_PER_PRESS
    );

    updateExerciseSelection(performance.now());
    update();
}

function updateExerciseSelection(now) {
    if (exerciseLocked) return;

    const sector = sectorFromEnergy(exerciseEnergy);

    if (sector !== exerciseSector) {
        exerciseSector = sector;
        exerciseSectorStart =
            sector >= 0 ? now : null;
        exerciseHoldProgress = 0;
    }

    if (
        sector < 0 ||
        exerciseSectorStart === null
    ) {
        return;
    }

    exerciseHoldProgress = Math.min(
        EXERCISE_CONFIRM_MS / 1000,
        (now - exerciseSectorStart) / 1000
    );

    if (
        now - exerciseSectorStart >=
        EXERCISE_CONFIRM_MS
    ) {
        exerciseLocked = true;
        exerciseConfirmed = true;
        state.exercise = sector;

        exerciseEnergy = Math.min(
            100,
            sector * 25 + 12.5
        );

        exerciseHoldProgress =
            EXERCISE_CONFIRM_MS / 1000;

        update();
        sendMotor(true);
        updateCoinAudio();
    }
}

function finishSleep() {
    if (!sleepHeld) return;

    sleepHeld = false;
    sleepConfirmed = true;

    updateDial();
    sendMotor(true);
    updateCoinAudio();
}

document.addEventListener("keydown", event => {
    if (
        event.target instanceof Element &&
        event.target.closest(
            "input, textarea, select, button, a"
        )
    ) {
        return;
    }

    if (event.code === "Space") {
        event.preventDefault();

        if (!sleepHeld && !event.repeat) {
            if (state.sleep === 9) {
                state.sleep = 0;
                sleepConfirmed = false;
                update();
            }

            sleepHeld = true;
            sleepStart = performance.now();
            sleepBase = state.sleep;
        }
    }

    if (
        event.code === "KeyE" &&
        !event.repeat &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
    ) {
        pressExercise();
    }
});

document.addEventListener("keyup", event => {
    if (event.code === "Space") {
        event.preventDefault();
        finishSleep();
    }
});

window.addEventListener("blur", finishSleep);

document.addEventListener(
    "visibilitychange",
    () => {
        if (document.hidden) {
            finishSleep();
        }
    }
);

function updateSimulation(now) {
    const elapsed = Math.min(
        0.25,
        Math.max(0, (now - lastFrame) / 1000)
    );

    lastFrame = now;

    if (sleepHeld) {
        const steps = Math.floor(
            (now - sleepStart) /
            (SLEEP_MS_PER_HOUR / 2)
        );

        const next = Math.min(
            9,
            sleepBase + steps
        );

        if (next !== state.sleep) {
            state.sleep = next;
            sleepConfirmed = false;

            stopCoinAudio();
            update();
        }
    }

    if (!exerciseLocked) {
        const oldEnergy = exerciseEnergy;

        exerciseEnergy = Math.max(
            0,
            exerciseEnergy -
            ENERGY_DECAY_PER_SECOND * elapsed
        );

        if (
            oldEnergy !== exerciseEnergy ||
            exerciseSector >= 0
        ) {
            updateExerciseSelection(now);
            updateDial();
        }
    }

    requestAnimationFrame(updateSimulation);
}

setInterval(() => {
    sendMotor(true);
    checkArduino();
}, MOTOR_INTERVAL_MS);

function svg(tag, attrs = {}, content = "") {
    const element = document.createElementNS(
        "http://www.w3.org/2000/svg",
        tag
    );

    Object.entries(attrs).forEach(
        ([key, value]) => {
            element.setAttribute(key, value);
        }
    );

    if (content) {
        element.textContent = content;
    }

    return element;
}

function updateConvergenceStrip() {
    const index = state.sleep;
    const start = 4 + index * 0.5;
    const end = start + 0.5;

    if ($("convSleepLabel")) {
        $("convSleepLabel").textContent =
            `${fmt(start)}–${fmt(end)} h`;
    }

    DATA.ageLines.forEach((line, i) => {
        const target = $(`convAge${i}`);

        if (target) {
            target.textContent =
                shortProductivityLevel(
                    line[index].p
                );
        }
    });
}

function update() {
    const data = current();

    const sleepText =
        SLEEP_LABELS[state.sleep];

    const exText =
        EX_LABELS[state.exercise];

    $("sleepValue").textContent = sleepText;
    $("exerciseValue").textContent = exText;

    const context = $("contextSummary");

    if (context) {
        context.innerHTML =
            `Evaluando a trabajadores que duermen <strong>${sleepText}</strong> al día ` +
            `y hacen <strong>${exText}</strong> de ejercicio semanal.`;
    }

    const sample = $("sampleCount");

    if (sample) {
        sample.textContent =
            `Muestra: n = ${data.n.toLocaleString("es-CL")} trabajadores`;
    }

    $("prodValue").textContent = fmt(data.p);

    const color =
        data.p < 60 ? "#e8705f" :
        data.p < 80 ? "#f2b544" :
        "#58ba8b";

    $("prodBar").style.width =
        `${data.p}%`;

    $("prodBar").style.backgroundColor =
        color;

    const category =
        productivityLevel(data.p);

    const threshold = document.querySelector(
        ".metric-main-card .threshold-label"
    );

    if (threshold) {
        threshold.textContent = category;
        threshold.style.color = color;
    }

    const low = Math.round(data.low);

    $("lowValue").textContent = low;

    if ($("okValue")) {
        $("okValue").textContent = 100 - low;
    }

    const persons = $("persons");
    persons.replaceChildren();

    for (let i = 0; i < 100; i++) {
        const person = document.createElement("span");

        person.className =
            "person" + (i < low ? " low" : "");

        person.textContent = "●";

        persons.append(person);
    }

    $("sleepRange").value = state.sleep;

    $("sleepRange").style.setProperty(
        "--range-progress",
        `${state.sleep / 9 * 100}%`
    );

    updateMediaSpeed();
    updateDial();
    updateConvergenceStrip();
    drawChart();
    sendMotor();
}

function drawChart() {
    const host = $("chart");
    host.replaceChildren();

    const W = 1040;
    const H = 370;

    const left = 64;
    const right = 28;
    const top = 30;
    const bottom = 54;

    const sx = i =>
        left + i * (W - left - right) / 9;

    const sy = value =>
        H - bottom -
        (value - 50) / 50 *
        (H - top - bottom);

    const root = svg("svg", {
        viewBox: `0 0 ${W} ${H}`,
        role: "img",
        "aria-label":
            "Productividad según horas de sueño y edad"
    });

    for (let value = 50; value <= 100; value += 10) {
        const threshold =
            value === 60 || value === 80;

        const color =
            value === 60 ? "#e8705f" :
            value === 80 ? "#58ba8b" :
            "#343b61";

        root.append(svg("line", {
            x1: left,
            x2: W - right,
            y1: sy(value),
            y2: sy(value),
            stroke: color,
            "stroke-width": threshold ? 1.5 : 1,
            "stroke-dasharray":
                threshold ? "5 4" : ""
        }));

        root.append(svg("text", {
            x: left - 12,
            y: sy(value) + 4,
            "text-anchor": "end",
            fill: threshold ? color : "#a4a9c4",
            "font-size": 13
        }, String(value)));
    }

    [
        [60, "Límite de productividad baja", "#e8705f"],
        [80, "Límite de productividad alta", "#58ba8b"]
    ].forEach(([value, label, color]) => {
        root.append(svg("text", {
            x: W - right - 4,
            y: sy(value) - 6,
            "text-anchor": "end",
            fill: color,
            "font-size": 11.5,
            "font-weight": 600
        }, label));
    });

    const selectedX = sx(state.sleep);

    root.append(svg("rect", {
        x: selectedX - 27,
        y: top - 6,
        width: 54,
        height: H - top - bottom + 12,
        fill: "#f2b544",
        "fill-opacity": 0.1,
        stroke: "rgba(242,181,68,0.35)",
        rx: 8
    }));

    for (let i = 0; i < 10; i++) {
        const selected = i === state.sleep;

        root.append(svg("text", {
            x: sx(i),
            y: H - 22,
            "text-anchor": "middle",
            fill: selected ? "#f2b544" : "#a4a9c4",
            "font-size": selected ? 14 : 13,
            "font-weight": selected ? 700 : 400
        }, `${fmt(4 + i * 0.5)}–${fmt(4.5 + i * 0.5)}`));
    }

    root.append(svg("text", {
        x: W / 2,
        y: H - 2,
        "text-anchor": "middle",
        fill: "#a4a9c4",
        "font-size": 13.5
    }, "Horas de sueño diarias (rango en horas)"));

    const upper = [];
    const lower = [];

    for (let i = 0; i < 10; i++) {
        const values = DATA.ageLines.map(
            line => line[i].p
        );

        upper.push([
            sx(i),
            sy(Math.max(...values) + 0.35)
        ]);

        lower.unshift([
            sx(i),
            sy(Math.min(...values) - 0.35)
        ]);
    }

    root.append(svg("polygon", {
        points: [...upper, ...lower]
            .map(p => p.join(","))
            .join(" "),
        fill: "#eceaf4",
        "fill-opacity": 0.12,
        stroke: "rgba(236,234,244,0.25)"
    }));

    const offsets = [-8, 0, 8];

    DATA.ageLines.forEach((line, group) => {
        const highlighted =
            state.selectedAge === "all" ||
            Number(state.selectedAge) === group;

        const opacity = highlighted ? 1 : 0.18;

        const points = line.map((item, index) => [
            sx(index) + offsets[group],
            sy(item.p)
        ]);

        root.append(svg("polyline", {
            points: points
                .map(p => p.join(","))
                .join(" "),
            fill: "none",
            stroke: COLORS[group],
            "stroke-opacity": opacity,
            "stroke-width": highlighted ? 2.5 : 2,
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        }));

        points.forEach(([x, y], index) => {
            const selected =
                index === state.sleep;

            const circle = svg("circle", {
                cx: x,
                cy: y,
                r: selected ? 6 : 4.3,
                fill: COLORS[group],
                "fill-opacity": opacity,
                stroke: selected ? "#fff" : "#151933",
                "stroke-width": selected ? 2 : 1.6
            });

            circle.append(svg(
                "title",
                {},
                `${AGE_LABELS[group]} años · ` +
                `${SLEEP_LABELS[index]} · ` +
                `${productivityLevel(line[index].p)}`
            ));

            root.append(circle);
        });
    });

    const activeValues = DATA.ageLines.map(
        line => line[state.sleep].p
    );

    const same =
        productivityLevel(Math.min(...activeValues)) ===
        productivityLevel(Math.max(...activeValues));

    const badgeWidth = 136;

    const badgeX = Math.min(
        Math.max(left, selectedX - badgeWidth / 2),
        W - right - badgeWidth
    );

    const badgeY = Math.max(
        6,
        sy(Math.max(...activeValues)) - 36
    );

    root.append(svg("rect", {
        x: badgeX,
        y: badgeY,
        width: badgeWidth,
        height: 24,
        rx: 12,
        fill: "#171c38",
        stroke: "#f2b544",
        "stroke-width": 1.2
    }));

    root.append(svg("text", {
        x: badgeX + badgeWidth / 2,
        y: badgeY + 15.5,
        "text-anchor": "middle",
        fill: "#f2b544",
        "font-size": 11.5,
        "font-weight": 700
    }, same
        ? "Misma productividad"
        : "Productividad similar"
    ));

    const columnWidth =
        (W - left - right) / 9;

    for (let i = 0; i < 10; i++) {
        const hit = svg("rect", {
            x: sx(i) - columnWidth / 2,
            y: top - 8,
            width: columnWidth,
            height: H - top - bottom + 16,
            fill: "transparent",
            class: "bin-hit",
            rx: 6
        });

        hit.style.cursor = "pointer";

        hit.addEventListener("click", () => {
            state.sleep = i;
            sleepConfirmed = true;
            update();
        });

        root.append(hit);
    }

    host.append(root);
}

const legend = $("ageLegend");

if (legend) {
    legend.querySelectorAll(".legend-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.selectedAge = btn.dataset.age;

            legend.querySelectorAll(".legend-btn").forEach(b => {
                b.classList.toggle(
                    "active",
                    b === btn
                );
            });

            drawChart();
        });
    });
}

$("sleepRange").addEventListener("input", event => {
    state.sleep = Number(event.target.value);
    sleepConfirmed = true;
    update();
});

window.addEventListener("beforeunload", () => {
    stopCoinAudio();
});

createResetButton();
updateMotorButton();
updateSoundButton();
update();
checkArduino();
requestAnimationFrame(updateSimulation);
