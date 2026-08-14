class UIController {
    constructor() {
        this.container = document.getElementById('word-ui-container');
        this.popupOverlay = document.getElementById('popup-overlay');
        this.nextLevelBtn = document.getElementById('next-level-btn');
        
        // Serial HUD Elements
        this.serialDisplay = document.getElementById('serial-data-display');
        this.serialDecimal = document.getElementById('serial-decimal-display');
        this.serialLetterPreview = document.getElementById('serial-letter-preview');
        this.connectBtn = document.getElementById('connect-serial-btn');
    }

    setupWordDisplay(word) {
        this.container.innerHTML = '';
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

    /**
     * Updates Raw Array (Without Caption), Decimal and Letter Square Badges
     */
    updateSerialHUD(bitArray, decimalVal, mappedLetter) {
        // Update Decimal & Letter values
        const decimalElem = document.getElementById('hud-decimal-val');
        const letterElem = document.getElementById('hud-letter-val');
        
        if (decimalElem) decimalElem.textContent = decimalVal;
        if (letterElem) letterElem.textContent = mappedLetter;

        // Update 8 Square Bit Cells with Color Variation
        const cellsContainer = document.getElementById('hud-bit-cells');
        if (cellsContainer && Array.isArray(bitArray) && bitArray.length === 8) {
            const cells = cellsContainer.children;
            
            for (let i = 0; i < 8; i++) {
                const val = bitArray[i];
                cells[i].textContent = val;

                if (val === 1) {
                    cells[i].className = 'bit-cell bit-1';
                } else {
                    cells[i].className = 'bit-cell bit-0';
                }
            }
        }
    }
    /**
     * Updates Connect / Disconnect button text simply
     */
    setSerialConnectedStatus(isConnected) {
        const btn = document.getElementById('connect-serial-btn');
        if (!btn) return;

        if (isConnected) {
            btn.textContent = '🔌 Connected';
            btn.className = 'connected'; // Applies Green CSS
        } else {
            btn.textContent = '🔌 No Connection'; // or '🔌 Connect'
            btn.className = 'disconnected'; // Applies Red CSS
        }
    }

    showCompletionPopup(word, onNextCallback) {
        this.popupOverlay.classList.remove('hidden');
        
        const newBtn = this.nextLevelBtn.cloneNode(true);
        this.nextLevelBtn.parentNode.replaceChild(newBtn, this.nextLevelBtn);
        this.nextLevelBtn = newBtn;

        this.nextLevelBtn.addEventListener('click', () => {
            this.popupOverlay.classList.add('hidden');
            onNextCallback();
        });
    }
}