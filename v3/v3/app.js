
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

const fmt = number => number.toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
});

const state = {
    sleep: 5,
    exercise: 1,
    soundEnabled: false
};

const SLEEP_LABELS = Array.from(
    {length: 10},
    (_, i) => `${fmt(4 + i * 0.5)} – ${fmt(4 + (i + 1) * 0.5)} horas`
);

const EX_LABELS = [
    "0 – 1,5 horas",
    ">1,5 – 3 horas",
    ">3 – 4,5 horas",
    ">4,5 – 6 horas"
];

const AGE_LABELS = ["22 – 30", "31 – 40", "41 – 54"];

const COLORS = ["#f2b544", "#67c7ce", "#e88f9c"];

const workVideo = $("workVideo");
const workAudio = $("workAudio");
const soundButton = $("soundButton");

workVideo.muted = true;
workVideo.loop = true;

workAudio.loop = true;
workAudio.volume = 0.35;

function getMediaSpeed() {
    return 1.0 + (state.sleep / 9) * 2.8;
}

function updateMediaSpeed() {
    const speed = getMediaSpeed();

    workVideo.playbackRate = speed;
    workAudio.playbackRate = speed;

    if ("preservesPitch" in workAudio) {
        workAudio.preservesPitch = true;
    }
}

function updateSoundButton() {
    $("soundIcon").textContent =
        state.soundEnabled ? "♫" : "♪";

    $("soundLabel").textContent =
        state.soundEnabled ? "Silenciar" : "Activar sonido";

    soundButton.classList.toggle("active", state.soundEnabled);

    soundButton.setAttribute(
        "aria-pressed",
        String(state.soundEnabled)
    );
}

soundButton.addEventListener("click", async () => {
    if (state.soundEnabled) {
        state.soundEnabled = false;
        workAudio.pause();
        updateSoundButton();
        return;
    }

    try {
        updateMediaSpeed();
        await workAudio.play();
        state.soundEnabled = true;
    } catch (error) {
        console.warn("No fue posible iniciar el audio:", error);
        state.soundEnabled = false;
    }

    updateSoundButton();
});

workVideo.addEventListener("loadedmetadata", updateMediaSpeed);

function startVideo() {
    const result = workVideo.play();

    if (result && typeof result.catch === "function") {
        result.catch(error => {
            console.warn("No fue posible iniciar el video:", error);
        });
    }
}

const PROGRESSION_INTERVAL_MS = 500;

const progressButton = $("progressButton");

let progressionTimer = null;
let progressionPaused = false;

function updateProgressButton() {
    const running = progressionTimer !== null;

    $("progressIcon").textContent = running ? "Ⅱ" : "▶";

    $("progressLabel").textContent = running
        ? "Pausar progresión"
        : progressionPaused
            ? "Reanudar progresión"
            : "Progresión de 4 a 9 horas";

    progressButton.classList.toggle("active", running);

    progressButton.setAttribute(
        "aria-pressed",
        String(running)
    );
}

function stopProgression(keepPaused = false) {
    if (progressionTimer !== null) {
        clearInterval(progressionTimer);
        progressionTimer = null;
    }

    progressionPaused = keepPaused;
    updateProgressButton();
}

function runProgression() {
    stopProgression(false);

    progressionTimer = setInterval(() => {
        if (state.sleep >= 9) {
            stopProgression();
            return;
        }

        state.sleep += 1;
        update();

        if (state.sleep >= 9) {
            stopProgression();
        }
    }, PROGRESSION_INTERVAL_MS);

    updateProgressButton();
}

progressButton.addEventListener("click", () => {
    if (progressionTimer !== null) {
        stopProgression(true);
        return;
    }

    if (progressionPaused && state.sleep < 9) {
        runProgression();
        return;
    }

    state.sleep = 0;
    update();
    runProgression();
});

function svg(tag, attrs = {}, text = "") {
    const element = document.createElementNS(
        "http://www.w3.org/2000/svg",
        tag
    );

    Object.entries(attrs).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });

    if (text) {
        element.textContent = text;
    }

    return element;
}

function current() {
    return DATA.matrix[state.sleep][state.exercise];
}

function update() {
    const data = current();

    $("sleepValue").textContent = SLEEP_LABELS[state.sleep];
    $("exerciseValue").textContent = EX_LABELS[state.exercise];

    $("prodValue").textContent = fmt(data.p);
    $("prodBar").style.width = data.p + "%";

    const nLow = Math.round(data.low);

    $("lowValue").textContent = nLow;

    const persons = $("persons");
    persons.replaceChildren();

    for (let i = 0; i < 100; i++) {
        const person = document.createElement("span");

        person.className = "person" + (i < nLow ? " low" : "");
        person.textContent = "●";

        persons.append(person);
    }

    $("sleepRange").value = state.sleep;
    $("exerciseRange").value = state.exercise;

    $("sleepRange").style.setProperty(
        "--range-progress",
        (state.sleep / 9 * 100) + "%"
    );

    $("exerciseRange").style.setProperty(
        "--range-progress",
        (state.exercise / 3 * 100) + "%"
    );

    updateMediaSpeed();
    drawChart();
}

function drawChart() {
    const host = $("chart");
    host.replaceChildren();

    const W = 1040;
    const H = 360;

    const margin = {
        left: 64,
        right: 22,
        top: 24,
        bottom: 52
    };

    const sx = index =>
        margin.left +
        index * (W - margin.left - margin.right) / 9;

    const yMin = 50;
    const yMax = 100;

    const sy = value =>
        H - margin.bottom -
        (value - yMin) / (yMax - yMin) *
        (H - margin.top - margin.bottom);

    const root = svg("svg", {
        viewBox: `0 0 ${W} ${H}`,
        role: "img",
        "aria-label":
            "Productividad promedio según horas de sueño por grupo de edad"
    });

    for (let value = 50; value <= 100; value += 10) {
        root.append(
            svg("line", {
                x1: margin.left,
                x2: W - margin.right,
                y1: sy(value),
                y2: sy(value),
                stroke: "#343b61",
                "stroke-width": 1
            })
        );

        root.append(
            svg("text", {
                x: margin.left - 12,
                y: sy(value) + 4,
                "text-anchor": "end",
                fill: "#a4a9c4",
                "font-size": 14
            }, String(value))
        );
    }

    for (let i = 0; i < 10; i++) {
        root.append(
            svg("text", {
                x: sx(i),
                y: H - 21,
                "text-anchor": "middle",
                fill: "#a4a9c4",
                "font-size": 14
            }, fmt(4 + i * 0.5))
        );
    }

    root.append(
        svg("text", {
            x: W / 2,
            y: H - 2,
            "text-anchor": "middle",
            fill: "#a4a9c4",
            "font-size": 14
        }, "Horas de sueño")
    );

    const selectedX = sx(state.sleep);
    const shadowWidth = 46;

    const shadowLeft = Math.max(
        margin.left,
        selectedX - shadowWidth / 2
    );

    const shadowRight = selectedX + shadowWidth / 2;

    root.append(
        svg("rect", {
            x: shadowLeft,
            y: margin.top,
            width: shadowRight - shadowLeft,
            height: H - margin.top - margin.bottom,
            fill: "#f2b544",
            "fill-opacity": ".09",
            rx: 7
        })
    );

    DATA.ageLines.forEach((line, groupIndex) => {
        const points = line.map((point, index) => [
            sx(index),
            sy(point.p)
        ]);

        root.append(
            svg("polyline", {
                points: points
                    .map(point => point.join(","))
                    .join(" "),
                fill: "none",
                stroke: COLORS[groupIndex],
                "stroke-width": 2.5,
                "stroke-linejoin": "round",
                "stroke-linecap": "round"
            })
        );

        points.forEach(([x, y], index) => {
            const circle = svg("circle", {
                cx: x,
                cy: y,
                r: index === state.sleep ? 6.5 : 4.5,
                fill: COLORS[groupIndex],
                stroke: "#151933",
                "stroke-width": 2
            });

            circle.append(
                svg(
                    "title",
                    {},
                    `${AGE_LABELS[groupIndex]} años · ` +
                    `${SLEEP_LABELS[index]} · ` +
                    `${fmt(line[index].p)} puntos · ` +
                    `n=${line[index].n}`
                )
            );

            root.append(circle);
        });
    });

    host.append(root);
}

$("sleepRange").addEventListener("input", event => {
    stopProgression();
    state.sleep = Number(event.target.value);
    update();
});

$("exerciseRange").addEventListener("input", event => {
    state.exercise = Number(event.target.value);
    update();
});

update();
updateSoundButton();
updateProgressButton();
startVideo();
