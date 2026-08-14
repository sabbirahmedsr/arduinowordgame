class UIController {
    constructor() {
        this.container = document.getElementById('word-ui-container');
        
        // Dynamic Victory Image Element
        this.victoryImgContainer = document.createElement('div');
        this.victoryImgContainer.id = 'victory-image-container';
        document.body.appendChild(this.victoryImgContainer);

        // Connect Button Reference
        this.connectBtn = document.getElementById('connect-serial-btn');
    }

    setupWordDisplay(word) {
        this.container.className = ''; 
        this.container.innerHTML = '';
        this.victoryImgContainer.className = '';
        this.victoryImgContainer.innerHTML = '';

        for (let i = 0; i < word.length; i++) {
            const box = document.createElement('div');
            box.className = 'letter-box';
            box.id = `letter-${i}`;
            box.innerText = word[i];
            this.container.appendChild(box);
        }
    }

    revealLetter(index) {
        const box = document.getElementById(`letter-${index}`);
        if (box) {
            box.classList.add('revealed');
        }
    }

    triggerColorfulVictory(word, imageSrc, onComplete) {
        this.container.classList.add('victory-mode');

        const letters = this.container.children;
        const colorsCount = 5;

        setTimeout(() => {
            for (let i = 0; i < letters.length; i++) {
                setTimeout(() => {
                    const box = letters[i];
                    if (box) {
                        box.classList.add(`rainbow-${i % colorsCount}`);
                        box.classList.add('pop-bounce');
                    }
                }, i * 150);
            }

            const totalLettersTime = letters.length * 150;
            setTimeout(() => {
                if (imageSrc) {
                    this.victoryImgContainer.innerHTML = `<img src="${imageSrc}" alt="${word}" />`;
                    this.victoryImgContainer.classList.add('show');
                }

                setTimeout(() => {
                    if (onComplete) onComplete();
                }, 1200);

            }, totalLettersTime + 200);

        }, 350);
    }

    updateSerialHUD(bitArray, decimalVal, mappedLetter) {
        const decimalElem = document.getElementById('hud-decimal-val');
        const letterElem = document.getElementById('hud-letter-val');
        
        if (decimalElem) decimalElem.textContent = decimalVal;
        if (letterElem) letterElem.textContent = mappedLetter;

        const cellsContainer = document.getElementById('hud-bit-cells');
        if (cellsContainer && Array.isArray(bitArray) && bitArray.length === 8) {
            const cells = cellsContainer.children;
            for (let i = 0; i < 8; i++) {
                const val = bitArray[i];
                cells[i].textContent = val;
                cells[i].className = val === 1 ? 'bit-cell bit-1' : 'bit-cell bit-0';
            }
        }
    }

    setSerialConnectedStatus(isConnected) {
        if (!this.connectBtn) return;

        if (isConnected) {
            this.connectBtn.textContent = '🔌 Connected';
            this.connectBtn.className = 'connected';
        } else {
            this.connectBtn.textContent = '🔌 No Connection';
            this.connectBtn.className = 'disconnected';
        }
    }
}