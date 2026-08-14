class SerialController {
    constructor(onLetterReceived, onHUDUpdate) {
        this.port = null;
        this.reader = null;
        this.isConnected = false;
        this.isReading = false;
        this.buffer = '';
        this.onLetterReceived = onLetterReceived;
        this.onHUDUpdate = onHUDUpdate;

        // JSON mapping store
        this.letterMap = {};
        this.loadLetterMap();

        if ('serial' in navigator) {
            navigator.serial.addEventListener('disconnect', (event) => {
                if (this.port && event.target === this.port) {
                    this.handleDeviceDisconnected();
                }
            });
        }
    }

    /**
     * Loads mapping dictionary from data/letterMap.json
     */
    async loadLetterMap() {
        try {
            const response = await fetch('./data/letterMap.json');
            this.letterMap = await response.json();
            console.log("Letter map loaded successfully.");
        } catch (error) {
            console.error("Failed to load letterMap.json:", error);
        }
    }

    /**
     * Connect triggered manually via button or shortcut
     */
    async connect() {
        if (!('serial' in navigator)) {
            alert('Web Serial API is not supported in this browser.');
            return false;
        }

        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 9600 });
            this.isConnected = true;
            this.readLoop();
            return true;
        } catch (error) {
            console.error("Serial Connection Failed:", error);
            this.handleDeviceDisconnected();
            return false;
        }
    }

    /**
     * Reading stream with buffer logic to prevent freezing/lag
     */
    async readLoop() {
        this.isReading = true;
        const decoder = new TextDecoder();

        while (this.port && this.port.readable && this.isReading) {
            try {
                this.reader = this.port.readable.getReader();
                
                while (this.isReading) {
                    const { value, done } = await this.reader.read();
                    if (done) break;

                    if (value) {
                        this.buffer += decoder.decode(value, { stream: true });
                        const lines = this.buffer.split(/\r?\n/);
                        this.buffer = lines.pop();

                        for (const line of lines) {
                            const trimmedLine = line.trim();
                            if (trimmedLine.length > 0) {
                                this.processRawData(trimmedLine);
                            }
                        }
                    }
                }
            } catch (error) {
                if (this.isReading) {
                    console.error("Serial stream error:", error);
                }
            } finally {
                if (this.reader) {
                    this.reader.releaseLock();
                    this.reader = null;
                }
            }
        }
    }

    /**
     * Parses raw input data safely
     */
    processRawData(rawData) {
        let bitArray = [0, 0, 0, 0, 0, 0, 0, 0];
        let decimalVal = 0;
        let mappedLetter = '?';

        // 1. Parse Raw Input Data (Array or Integer string)
        if (typeof rawData === 'string' && rawData.startsWith('[') && rawData.endsWith(']')) {
            try {
                bitArray = JSON.parse(rawData);
                decimalVal = parseInt(bitArray.join(''), 2) || 0;
            } catch (e) {
                console.warn("Invalid array format:", rawData);
            }
        } else {
            const parsed = parseInt(rawData, 10);
            if (!isNaN(parsed)) {
                decimalVal = parsed;
                bitArray = decimalVal
                    .toString(2)
                    .padStart(8, '0')
                    .split('')
                    .map(Number);
            }
        }

        // 2. Fetch Letter from this.letterMap using Decimal Key
        const key = String(decimalVal);
        if (this.letterMap && Object.prototype.hasOwnProperty.call(this.letterMap, key)) {
            mappedLetter = this.letterMap[key];
        } else {
            mappedLetter = '?';
        }

        // 3. UI Update & Game Handlers
        if (this.onHUDUpdate) {
            this.onHUDUpdate(bitArray, decimalVal, mappedLetter);
        }

        if (this.onLetterReceived && mappedLetter !== '?') {
            this.onLetterReceived(mappedLetter);
        }
    }

    /**
     * Safe disconnect without stream lock errors
     */
    async disconnect() {
        this.isReading = false;

        if (this.reader) {
            try {
                await this.reader.cancel();
            } catch (e) {}
        }

        if (this.port) {
            try {
                await this.port.close();
            } catch (e) {}
        }

        this.handleDeviceDisconnected();
    }

    handleDeviceDisconnected() {
        this.port = null;
        this.reader = null;
        this.isConnected = false;
        this.isReading = false;
        this.buffer = '';

        if (window.gameEngine && window.gameEngine.ui) {
            window.gameEngine.ui.setSerialConnectedStatus(false);
        }
    }
}