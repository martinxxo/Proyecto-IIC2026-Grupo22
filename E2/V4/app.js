"use strict";

const BRIDGE = "http://127.0.0.1:8765";

const DATA = {
    BAJA: {
        score: 49.632670,
        hours: 5.228995,
        records: 5932,
        color: "#e8705f",
        sleepColor: "#a79bdc",
        motor: "1",
        coinInterval: 3000
    },
    MEDIA: {
        score: 70.041689,
        hours: 6.180554,
        records: 11370,
        color: "#f2b544",
        sleepColor: "#79a9e8",
        motor: "2",
        coinInterval: 1000
    },
    ALTA: {
        score: 95,
        hours: 9,
        records: 12698,
        color: "#58ba8b",
        sleepColor: "#67c7ce",
        motor: "3",
        coinInterval: 600
    }
};

const CONFIG = {
    UPDATE_MS: 50,
    MOTOR_INTERVAL_MS: 400,
    TYPING_WINDOW_MS: 2000,
    PAUSE_MS: 1500,
    MAX_GROWTH_PER_SECOND: 10 / 0.6,
    MIN_GROWTH_PER_SECOND: 5 / 0.6,
    DECAY_PER_SECOND: 12,
    MEDIUM_THRESHOLD: 50,
    HIGH_THRESHOLD: 100,
    MAX_PROGRESS: 100,
    COIN_VOLUME: 0.35,
    TEXT_SOFT_LIMIT: 180,
    TEXT_HARD_LIMIT: 240,
    TEXT_CLEAN_INTERVAL: 100
};

const $ = id => document.getElementById(id);

const elements = {
    productivityPanel: document.querySelector(".productivity-panel"),
    sleepPanel: document.querySelector(".sleep-panel"),
    prodLevel: $("prodLevel"),
    prodValue: $("prodValue"),
    prodBar: $("prodBar"),
    sleepValue: $("sleepValue"),
    sleepBar: $("sleepBar"),
    sleepDescription: $("sleepDescription"),
    typingInput: $("typingInput"),
    writingOverlay: $("writingOverlay"),
    menuButton: $("menuButton"),
    settingsMenu: $("settingsMenu"),
    motorButton: $("motorButton"),
    soundButton: $("soundButton"),
    resetButton: $("resetButton"),
    arduinoStatus: $("arduinoStatus"),
    workAudio: $("workAudio")
};

const format = (value, decimals = 1) =>
    value.toLocaleString("es-CL", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

let progress = 0;
let currentLevel = "DETENIDO";

let keyTimes = [];
let lastKeyTime = -Infinity;
let lastUpdateTime = performance.now();

let hasActivity = false;
let motorEnabled = true;
let soundEnabled = true;

let bridgeConnected = false;
let arduinoPort = null;

let sending = false;
let motorUpdatePending = false;
let lastSentCommand = "";

let audioUnlocked = false;
let audioUnlocking = false;

let coinTimer = null;
let currentCoinInterval = null;
let nextCoinVoice = 0;

const coinVoices = Array.from(
    {length: 5},
    () => {
        const audio = new Audio(
            elements.workAudio.getAttribute("src")
        );

        audio.preload = "auto";
        audio.volume = CONFIG.COIN_VOLUME;
        audio.loop = false;

        return audio;
    }
);

elements.workAudio.pause();

function prepareAudio() {

    for (const audio of coinVoices) {
        audio.load();
    }
}

async function unlockAudio() {

    if (audioUnlocked || audioUnlocking) return;

    audioUnlocking = true;

    const results = await Promise.all(
        coinVoices.map(async audio => {

            try {

                audio.muted = true;
                audio.currentTime = 0;

                await audio.play();

                audio.pause();
                audio.currentTime = 0;

                return true;

            } catch {

                return false;

            } finally {

                audio.muted = false;
            }
        })
    );

    audioUnlocked = results.some(Boolean);
    audioUnlocking = false;

    updateCoinAudio();
}

function getTypingRate(now) {

    keyTimes = keyTimes.filter(
        time => now - time <= CONFIG.TYPING_WINDOW_MS
    );

    return keyTimes.length /
        (CONFIG.TYPING_WINDOW_MS / 1000);
}

function getLevel() {

    if (!hasActivity) return "DETENIDO";

    if (progress >= CONFIG.HIGH_THRESHOLD) {
        return "ALTA";
    }

    if (progress >= CONFIG.MEDIUM_THRESHOLD) {
        return "MEDIA";
    }

    return "BAJA";
}

function motorCommand() {

    if (
        !motorEnabled ||
        !hasActivity ||
        currentLevel === "DETENIDO"
    ) {
        return "0";
    }

    return DATA[currentLevel].motor;
}

function canPlayCoins() {

    return (
        soundEnabled &&
        audioUnlocked &&
        hasActivity &&
        currentLevel !== "DETENIDO"
    );
}

function stopCoinAudio() {

    if (coinTimer !== null) {

        clearInterval(coinTimer);

        coinTimer = null;
    }

    currentCoinInterval = null;

    for (const audio of coinVoices) {

        audio.pause();
        audio.currentTime = 0;
    }
}

function playCoin() {

    if (!canPlayCoins()) return;

    const audio = coinVoices[nextCoinVoice];

    nextCoinVoice =
        (nextCoinVoice + 1) % coinVoices.length;

    audio.pause();
    audio.currentTime = 0;
    audio.volume = CONFIG.COIN_VOLUME;
    audio.muted = false;

    audio.play().catch(error => {

        if (error.name !== "AbortError") {

            console.warn(
                "Error de audio:",
                error
            );
        }
    });
}

function updateCoinAudio() {

    if (!canPlayCoins()) {

        if (coinTimer !== null) {
            stopCoinAudio();
        }

        return;
    }

    const interval =
        DATA[currentLevel].coinInterval;

    if (
        coinTimer !== null &&
        currentCoinInterval === interval
    ) {
        return;
    }

    stopCoinAudio();

    currentCoinInterval = interval;

    playCoin();

    coinTimer = setInterval(
        playCoin,
        interval
    );
}

function updateArduinoStatus() {

    if (!elements.arduinoStatus) return;

    elements.arduinoStatus.dataset.connected =
        String(bridgeConnected);

    elements.arduinoStatus.textContent =
        bridgeConnected
            ? `Arduino conectado${arduinoPort ? ` (${arduinoPort})` : ""}`
            : "Arduino desconectado";
}

async function sendMotor(force = false) {

    if (sending) {

        motorUpdatePending = true;

        return;
    }

    const command = motorCommand();

    if (!force && command === lastSentCommand) {
        return;
    }

    sending = true;

    try {

        const response = await fetch(
            `${BRIDGE}/api/command`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({command}),
                signal: AbortSignal.timeout(1000)
            }
        );

        if (!response.ok) {
            throw new Error("Puente no disponible");
        }

        const result = await response.json();

        bridgeConnected =
            Boolean(result.connected);

        arduinoPort =
            result.port || null;

        lastSentCommand =
            bridgeConnected ? command : "";

    } catch {

        bridgeConnected = false;
        arduinoPort = null;
        lastSentCommand = "";

    } finally {

        sending = false;

        updateArduinoStatus();

        if (motorUpdatePending) {

            motorUpdatePending = false;

            sendMotor();
        }
    }
}

function updateButtons() {

    elements.motorButton.textContent =
        motorEnabled
            ? "Motor: activado"
            : "Motor: desactivado";

    elements.motorButton.setAttribute(
        "aria-pressed",
        String(motorEnabled)
    );

    elements.soundButton.textContent =
        soundEnabled
            ? "Sonido: activado"
            : "Sonido: desactivado";

    elements.soundButton.setAttribute(
        "aria-pressed",
        String(soundEnabled)
    );
}

function openMenu() {

    elements.settingsMenu.hidden = false;

    elements.menuButton.setAttribute(
        "aria-expanded",
        "true"
    );
}

function closeMenu(restoreFocus = true) {

    elements.settingsMenu.hidden = true;

    elements.menuButton.setAttribute(
        "aria-expanded",
        "false"
    );

    if (restoreFocus) {

        elements.typingInput.focus();
    }
}

function toggleMenu() {

    if (elements.settingsMenu.hidden) {

        openMenu();

    } else {

        closeMenu();
    }
}

function showWritingOverlay() {

    elements.writingOverlay.classList.remove(
        "dismissed"
    );
}

function hideWritingOverlay() {

    elements.writingOverlay.classList.add(
        "dismissed"
    );
}

function renderLevel() {

    if (currentLevel === "DETENIDO") {

        elements.productivityPanel.style.setProperty(
            "--productivity-color",
            "#a4a9c4"
        );

        elements.sleepPanel.style.setProperty(
            "--sleep-color",
            "#67c7ce"
        );

        elements.prodLevel.textContent =
            "Sin actividad";

        elements.prodValue.textContent = "—";
        elements.prodBar.style.width = "0%";

        elements.sleepValue.textContent = "—";
        elements.sleepBar.style.width = "0%";

        elements.sleepDescription.textContent =
            "Descubre la relación entre tu productividad y el descanso.";

        return;
    }

    const data = DATA[currentLevel];

    elements.productivityPanel.style.setProperty(
        "--productivity-color",
        data.color
    );

    elements.sleepPanel.style.setProperty(
        "--sleep-color",
        data.sleepColor
    );

    elements.prodLevel.textContent =
        `Productividad ${currentLevel.toLowerCase()}`;

    elements.prodValue.textContent =
        format(data.score);

    elements.prodBar.style.width =
        `${data.score}%`;

    elements.sleepValue.textContent =
        format(data.hours, 2);

    const sleepPercentage = Math.max(
        0,
        Math.min(
            100,
            (data.hours - 4) / 5 * 100
        )
    );

    elements.sleepBar.style.width =
        `${sleepPercentage}%`;

    if (currentLevel === "ALTA") {

        elements.sleepDescription.innerHTML =
            `En el escenario simulado de máxima productividad, el descanso alcanza <strong>${format(data.hours, 2)} horas de sueño al día.</strong>`;

    } else {

        elements.sleepDescription.innerHTML =
            `El nivel de productividad que alcanzaste se asocia con un promedio de <strong>${format(data.hours, 2)} horas de sueño al día.</strong>`;
    }
}

function changeLevel(nextLevel) {

    if (nextLevel === currentLevel) return;

    stopCoinAudio();

    currentLevel = nextLevel;

    renderLevel();

    sendMotor(true);

    updateCoinAudio();
}

function isValidTypingKey(event) {

    if (
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.isComposing
    ) {
        return false;
    }

    return (
        event.key.length === 1 ||
        event.key === "Backspace" ||
        event.key === "Enter"
    );
}

function registerKey(event) {

    if (!isValidTypingKey(event)) return;

    if (event.key === "Enter") {
        event.preventDefault();
    }

    const now = performance.now();

    keyTimes.push(now);

    lastKeyTime = now;

    hideWritingOverlay();

    if (soundEnabled && !audioUnlocked) {

        unlockAudio();
    }

    if (!hasActivity) {

        hasActivity = true;

        progress = 0;

        lastUpdateTime = now;

        changeLevel("BAJA");
    }
}

function removeOldText(amount) {

    if (amount <= 0) return;

    const input = elements.typingInput;

    const start = input.selectionStart;
    const end = input.selectionEnd;

    input.value = input.value.slice(amount);

    input.setSelectionRange(
        Math.max(0, start - amount),
        Math.max(0, end - amount)
    );

    input.scrollTop = input.scrollHeight;
}

function enforceTextLimit() {

    const input = elements.typingInput;

    const excess =
        input.value.length -
        CONFIG.TEXT_HARD_LIMIT;

    if (excess > 0) {

        removeOldText(excess);
    }

    let attempts = 0;

    while (
        input.scrollHeight > input.clientHeight + 2 &&
        input.value.length > 0 &&
        attempts < 30
    ) {

        removeOldText(
            Math.min(8, input.value.length)
        );

        attempts++;
    }
}

function cleanOldText() {

    if (!hasActivity) return;

    const length =
        elements.typingInput.value.length;

    if (length <= CONFIG.TEXT_SOFT_LIMIT) return;

    const excess =
        length - CONFIG.TEXT_SOFT_LIMIT;

    removeOldText(
        Math.min(
            excess,
            Math.max(1, Math.ceil(excess / 10))
        )
    );
}

function updateSimulation() {

    const now = performance.now();

    const elapsed = Math.min(
        0.1,
        Math.max(
            0,
            (now - lastUpdateTime) / 1000
        )
    );

    lastUpdateTime = now;

    const typingRate = getTypingRate(now);

    const activelyTyping =
        hasActivity &&
        now - lastKeyTime <= CONFIG.PAUSE_MS;

    if (activelyTyping) {

        const normalizedRate =
            Math.min(1, typingRate / 8);

        const growth =
            CONFIG.MIN_GROWTH_PER_SECOND +
            normalizedRate * (
                CONFIG.MAX_GROWTH_PER_SECOND -
                CONFIG.MIN_GROWTH_PER_SECOND
            );

        progress = Math.min(
            CONFIG.MAX_PROGRESS,
            progress + growth * elapsed
        );

    } else if (hasActivity) {

        progress = Math.max(
            0,
            progress -
            CONFIG.DECAY_PER_SECOND * elapsed
        );

        if (progress <= 0) {

            hasActivity = false;

            keyTimes = [];

            elements.typingInput.value = "";

            showWritingOverlay();
        }
    }

    changeLevel(getLevel());

    updateCoinAudio();
}

function stopActivity() {

    stopCoinAudio();

    hasActivity = false;
    progress = 0;

    keyTimes = [];

    lastKeyTime = -Infinity;
    lastUpdateTime = performance.now();

    currentLevel = "DETENIDO";

    elements.typingInput.value = "";

    showWritingOverlay();

    renderLevel();

    sendMotor(true);
}

function resetAll() {

    motorEnabled = true;
    soundEnabled = true;

    stopActivity();

    updateButtons();

    closeMenu();

    elements.typingInput.focus();
}

elements.typingInput.addEventListener(
    "keydown",
    registerKey
);

elements.typingInput.addEventListener(
    "input",
    enforceTextLimit
);

elements.typingInput.addEventListener(
    "paste",
    event => event.preventDefault()
);

elements.typingInput.addEventListener(
    "drop",
    event => event.preventDefault()
);

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {

        closeMenu();

        return;
    }

    if (
        event.target === elements.typingInput ||
        !elements.settingsMenu.hidden ||
        (
            event.target instanceof Element &&
            event.target.closest("button")
        )
    ) {
        return;
    }

    if (!isValidTypingKey(event)) return;

    event.preventDefault();

    elements.typingInput.focus();

    registerKey(event);

    const input = elements.typingInput;

    if (event.key.length === 1) {

        input.setRangeText(
            event.key,
            input.selectionStart,
            input.selectionEnd,
            "end"
        );
    }

    if (event.key === "Backspace") {

        const start = input.selectionStart;
        const end = input.selectionEnd;

        input.setRangeText(
            "",
            start === end
                ? Math.max(0, start - 1)
                : start,
            end,
            "end"
        );
    }

    enforceTextLimit();
});

elements.menuButton.addEventListener(
    "click",
    toggleMenu
);

document.addEventListener("click", event => {

    if (
        event.target instanceof Element &&
        !event.target.closest(".settings")
    ) {

        closeMenu(false);

        elements.typingInput.focus();
    }
});

elements.motorButton.addEventListener(
    "click",
    () => {

        motorEnabled = !motorEnabled;

        updateButtons();

        sendMotor(true);

        closeMenu();
    }
);

elements.soundButton.addEventListener(
    "click",
    () => {

        soundEnabled = !soundEnabled;

        if (soundEnabled) {

            unlockAudio();

            updateCoinAudio();

        } else {

            stopCoinAudio();
        }

        updateButtons();

        closeMenu();
    }
);

elements.resetButton.addEventListener(
    "click",
    resetAll
);

window.addEventListener(
    "blur",
    stopActivity
);

document.addEventListener(
    "visibilitychange",
    () => {

        if (document.hidden) {

            stopActivity();
        }
    }
);

window.addEventListener(
    "beforeunload",
    () => {

        stopCoinAudio();

        navigator.sendBeacon(
            `${BRIDGE}/api/command`,
            new Blob(
                [JSON.stringify({command: "0"})],
                {type: "application/json"}
            )
        );
    }
);

setInterval(
    updateSimulation,
    CONFIG.UPDATE_MS
);

setInterval(
    cleanOldText,
    CONFIG.TEXT_CLEAN_INTERVAL
);

setInterval(
    () => sendMotor(true),
    CONFIG.MOTOR_INTERVAL_MS
);

prepareAudio();

renderLevel();

updateButtons();

updateArduinoStatus();

showWritingOverlay();

sendMotor(true);

elements.typingInput.focus();