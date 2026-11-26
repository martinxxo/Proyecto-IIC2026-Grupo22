"use strict";

window.Arduino = (() => {
    const BAUD_RATE = 9600;
    const SEND_INTERVAL = 400;
    const STARTUP_DELAY = 2500;

    let port = null;
    let writer = null;
    let connected = false;
    let connecting = false;
    let sending = false;
    let timer = null;
    let currentCommand = "0";

    const encoder = new TextEncoder();
    const listeners = new Set();

    function supported() {
        return "serial" in navigator;
    }

    function isConnected() {
        return connected;
    }

    function notify() {
        listeners.forEach(callback => {
            try {
                callback(connected);
            } catch (error) {
                console.error(error);
            }
        });

        window.dispatchEvent(
            new CustomEvent("arduino-status", {
                detail: {
                    connected,
                    connecting
                }
            })
        );
    }

    function onStatusChange(callback) {
        listeners.add(callback);
        callback(connected);

        return () => listeners.delete(callback);
    }

    function wait(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }

    function stopTimer() {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
    }

    async function write(command) {
        if (!connected || !writer || sending) {
            return false;
        }

        sending = true;

        try {
            await writer.write(
                encoder.encode(command)
            );

            return true;

        } catch (error) {
            console.warn(
                "Error de comunicación con Arduino:",
                error
            );

            connected = false;
            currentCommand = "0";

            stopTimer();
            notify();

            return false;

        } finally {
            sending = false;
        }
    }

    function startTimer() {
        stopTimer();

        timer = setInterval(() => {
            if (connected) {
                write(currentCommand);
            }
        }, SEND_INTERVAL);
    }

    async function releasePort() {
        stopTimer();

        while (sending) {
            await wait(20);
        }

        if (writer) {
            try {
                writer.releaseLock();
            } catch (error) {
                console.warn(error);
            }

            writer = null;
        }

        if (port) {
            try {
                await port.close();
            } catch (error) {
                console.warn(error);
            }

            port = null;
        }

        connected = false;
        currentCommand = "0";
    }

    async function connect() {
        if (!supported()) {
            console.warn(
                "Este navegador no admite Web Serial API."
            );

            return false;
        }

        if (connected) {
            return true;
        }

        if (connecting) {
            return false;
        }

        connecting = true;
        notify();

        try {
            await releasePort();

            port = await navigator.serial.requestPort({
                filters: [
                    {usbVendorId: 0x2341},
                    {usbVendorId: 0x2A03}
                ]
            });

            await port.open({
                baudRate: BAUD_RATE,
                dataBits: 8,
                stopBits: 1,
                parity: "none",
                flowControl: "none"
            });

            writer = port.writable.getWriter();

            await wait(STARTUP_DELAY);

            currentCommand = "0";
            connected = true;

            const ready = await write("0");

            if (!ready) {
                throw new Error(
                    "No se pudo iniciar Arduino."
                );
            }

            startTimer();

            console.log("Arduino conectado.");

            return true;

        } catch (error) {
            await releasePort();

            if (error.name !== "NotFoundError") {
                console.warn(
                    "No se pudo conectar Arduino:",
                    error
                );
            }

            return false;

        } finally {
            connecting = false;
            notify();
        }
    }

    async function disconnect() {
        stopTimer();
        currentCommand = "0";

        while (sending) {
            await wait(20);
        }

        if (connected && writer) {
            await write("0");
        }

        await releasePort();

        notify();

        console.log("Arduino desconectado.");

        return true;
    }

    async function toggle() {
        if (connecting) {
            return false;
        }

        if (connected) {
            await disconnect();
            return false;
        }

        return connect();
    }

    async function send(command) {
        command = String(command);

        if (!["0", "1", "2", "3"].includes(command)) {
            console.warn(
                "Comando Arduino no válido:",
                command
            );

            return false;
        }

        if (!connected) {
            currentCommand = "0";
            return false;
        }

        currentCommand = command;

        return write(command);
    }

    async function stop() {
        currentCommand = "0";

        if (connected) {
            return write("0");
        }

        return false;
    }

    function createButton() {
        let button = document.getElementById(
            "arduinoConnectButton"
        );

        if (!button) {
            button = document.createElement("button");

            button.id = "arduinoConnectButton";
            button.type = "button";

            Object.assign(button.style, {
                position: "fixed",
                right: "15px",
                bottom: "15px",
                zIndex: "9999",
                padding: "9px 14px",
                borderRadius: "8px",
                border: "1px solid #626b91",
                background: "#202642",
                color: "#ffffff",
                fontFamily: "inherit",
                fontSize: "12px",
                cursor: "pointer"
            });

            document.body.appendChild(button);
        }

        function updateButton() {
            if (!supported()) {
                button.textContent =
                    "Arduino no compatible";

                button.disabled = true;
                button.style.color = "#e8705f";

                return;
            }

            button.disabled = connecting;

            if (connecting) {
                button.textContent =
                    "Conectando Arduino...";

                button.style.color = "#f2b544";

            } else if (connected) {
                button.textContent =
                    "● Arduino conectado";

                button.style.color = "#58ba8b";

            } else {
                button.textContent =
                    "● Conectar Arduino";

                button.style.color = "#e8705f";
            }
        }

        button.addEventListener("click", async () => {
            await toggle();
            button.blur();
        });

        window.addEventListener(
            "arduino-status",
            updateButton
        );

        updateButton();
    }

    if (supported()) {
        navigator.serial.addEventListener(
            "disconnect",
            async event => {
                if (
                    event.target !== port &&
                    event.port !== port
                ) {
                    return;
                }

                connected = false;
                currentCommand = "0";

                stopTimer();
                notify();

                await releasePort();
            }
        );
    }

    document.addEventListener(
        "visibilitychange",
        () => {
            if (document.hidden) {
                stop();
            }
        }
    );

    window.addEventListener("pagehide", () => {
        stopTimer();
        stop();
    });

    window.addEventListener("beforeunload", () => {
        stopTimer();
        stop();
    });

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            createButton,
            {once: true}
        );
    } else {
        createButton();
    }

    return Object.freeze({
        supported,
        connect,
        disconnect,
        toggle,
        send,
        stop,
        isConnected,
        onStatusChange
    });
})();