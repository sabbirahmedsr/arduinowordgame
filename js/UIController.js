/* *********************************************************
   Module 1.0.0 : UI Controller (Fixed Thin Underline Hint)
************************************************************/

class UIController {
    constructor() {
        this.container = document.getElementById('word-ui-container');
        
        this.victoryImgContainer = document.createElement('div');
        this.victoryImgContainer.id = 'victory-image-container';
        document.body.appendChild(this.victoryImgContainer);

        this.connectBtn = document.getElementById('connect-serial-btn');

        // Cached HUD Elements
        this.decimalElem = document.getElementById('hud-decimal-val');
        this.letterElem = document.getElementById('hud-letter-val');
        this.cellsContainer = document.getElementById('hud-bit-cells');
        this.bitCells = this.cellsContainer ? this.cellsContainer.children : [];

        // Reverse map setup for custom letterMap.json lookup
        this.letterToDecimalMap = null;
    }

    // Set letter mapping data from loaded json
    setLetterMap(mapData) {
        if (!mapData) return;
        this.letterToDecimalMap = {};
        for (const [dec, letter] of Object.entries(mapData)) {
            if (!this.letterToDecimalMap[letter]) {
                this.letterToDecimalMap[letter] = parseInt(dec, 10);
            }
        }
    }

    setupWordDisplay(word) {
        this.container.className = ''; 
        this.container.innerHTML = '';
        this.victoryImgContainer.className = '';
        this.victoryImgContainer.innerHTML = '';

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < word.length; i++) {
            const box = document.createElement('div');
            box.className = 'letter-box';
            box.id = `letter-${i}`;
            box.innerText = word[i];
            fragment.appendChild(box);
        }
        this.container.appendChild(fragment);
    }

    revealLetter(index) {
        const box = document.getElementById(`letter-${index}`);
        if (box) {
            box.classList.add('revealed');
        }
    }

    triggerColorfulVictory(word, onComplete) {
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
                if (onComplete) onComplete();
            }, totalLettersTime + 800);

        }, 350);
    }

    updateSerialHUD(bitArray, decimalVal, mappedLetter, targetLetter = null) {
        if (this.decimalElem) this.decimalElem.textContent = decimalVal;
        if (this.letterElem) this.letterElem.textContent = mappedLetter;

        // Convert target letter to 8-bit array using letterMap decimal value
        let targetBits = null;
        if (targetLetter && this.letterToDecimalMap && this.letterToDecimalMap[targetLetter] !== undefined) {
            const dec = this.letterToDecimalMap[targetLetter];
            targetBits = dec.toString(2).padStart(8, '0').split('').map(Number);
        }

        if (this.bitCells.length === 8 && Array.isArray(bitArray)) {
            for (let i = 0; i < 8; i++) {
                const val = bitArray[i];
                const cell = this.bitCells[i];
                cell.textContent = val;

                const isTargetBitOne = targetBits && targetBits[i] === 1;
                const isCurrentBitOne = val === 1;

                let classNames = 'bit-cell';
                if (isCurrentBitOne) classNames += ' bit-1';
                else classNames += ' bit-0';

                // Add simple underline target hint
                if (isTargetBitOne) classNames += ' target-hint';

                cell.className = classNames;
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