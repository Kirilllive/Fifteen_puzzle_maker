/**
 * 15-Puzzle Game Engine
 * Refined, robust, and highly optimized object-oriented implementation.
 */
class FifteenPuzzle {
    /**
     * @param {Object} config - Configuration object for the puzzle.
     * @param {string} containerId - The DOM ID of the container element.
     */
    constructor(config = {}, containerId = 'fifteen') {
        // 1. Robust Configuration Merging with Defaults
        this.config = {
            grid: [3, 3],          // Grid dimensions (cols-1, rows-1) for backward compatibility
            size: [400, 400],      // Total width, height in pixels
            diff: 50,              // Shuffle iterations
            time: 0.3,             // Animation duration in seconds
            fill: false,           // Auto-resize to parent container
            number: false,         // Display numbers on tiles
            keyBoard: true,        // Enable keyboard support
            gamePad: false,        // Enable gamepad support
            art: { url: '', ratio: false }, 
            style: '',             // Custom CSS string
            emptySlot: null,       // Specific target for the empty slot
            onWin: () => alert('Puzzle Solved!'), // Modern callback over hardcoded alert
            ...config
        };

        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            throw new Error(`[FifteenPuzzle] Container with ID '${containerId}' not found.`);
        }

        // 2. State Initialization
        this.cols = this.config.grid[0] + 1;
        this.rows = this.config.grid[1] + 1;
        this.tileWidth = this.config.size[0] / this.cols;
        this.tileHeight = this.config.size[1] / this.rows;
        
        this.matrix = [];
        this.tiles = {};
        this.emptyPos = { x: 0, y: 0 };
        this.isPlaying = false;
        
        // 3. Lifecycle & Event Binding References (for clean garbage collection)
        this.gamepadLoopId = null;
        this.gamepadDpadPressed = false;
        
        this._handleResize = this.handleResize.bind(this);
        this._handleKeyDown = this.handleKeyDown.bind(this);
        this._handleGamepad = this.handleGamepad.bind(this);

        this.init();
    }

    init() {
        // Setup DOM container
        this.container.replaceChildren(); // Modern, faster alternative to innerHTML = ""
        this.container.style.cssText = `
            width: ${this.config.size[0]}px;
            height: ${this.config.size[1]}px;
            position: relative;
            overflow: hidden;
            touch-action: none; /* Prevent scrolling while playing on touch devices */
        `;

        if (this.config.fill) {
            this.handleResize();
            window.addEventListener('resize', this._handleResize, { passive: true });
        }

        this.generateGrid();
        this.bindInputs();
        this.shuffle();
    }

    generateGrid() {
        const totalSlots = this.rows * this.cols;
        const emptySlotTarget = this.config.emptySlot || totalSlots;
        let idCounter = 1;

        for (let y = 0; y < this.rows; y++) {
            this.matrix[y] = [];
            for (let x = 0; x < this.cols; x++) {
                if (idCounter !== emptySlotTarget) {
                    this.matrix[y][x] = idCounter;
                    this.createDOMTile(idCounter, x, y);
                } else {
                    this.matrix[y][x] = 0; // 0 denotes empty slot
                    this.emptyPos = { x, y };
                }
                idCounter++;
            }
        }
    }

    createDOMTile(id, x, y) {
        const tile = document.createElement("div");
        tile.className = "puzzle-slot";
        
        if (this.config.number) {
            tile.textContent = id;
            tile.style.display = "flex";
            tile.style.alignItems = "center";
            tile.style.justifyContent = "center";
        }

        const bgSize = this.config.art.ratio 
            ? `${this.config.size[0]}px auto` 
            : `auto ${this.config.size[1]}px`;
            
        tile.style.cssText += `
            position: absolute;
            width: ${this.tileWidth}px;
            height: ${this.tileHeight}px;
            background-image: url('${this.config.art.url}');
            background-size: ${bgSize};
            background-position: -${this.tileWidth * x}px -${this.tileHeight * y}px;
            cursor: pointer;
            user-select: none;
            ${this.config.style}
        `;

        // Modern event listener setup
        tile.addEventListener("click", () => this.handleTileClick(id));
        
        this.container.appendChild(tile);
        this.tiles[id] = tile;
    }

    shuffle() {
        let prevEmpty = { x: -1, y: -1 };
        
        for (let i = 0; i < this.config.diff; i++) {
            const neighbors = [];
            const { x, y } = this.emptyPos;

            // Strict boundary checks for valid moves
            if (x > 0 && prevEmpty.x !== x - 1) neighbors.push({ x: x - 1, y });
            if (x < this.cols - 1 && prevEmpty.x !== x + 1) neighbors.push({ x: x + 1, y });
            if (y > 0 && prevEmpty.y !== y - 1) neighbors.push({ x, y: y - 1 });
            if (y < this.rows - 1 && prevEmpty.y !== y + 1) neighbors.push({ x, y: y + 1 });

            // Ensure we have valid neighbors (fallback safeguard)
            if (neighbors.length === 0) continue;

            const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
            prevEmpty = { x, y };
            
            // Swap logic
            this.matrix[y][x] = this.matrix[pick.y][pick.x];
            this.matrix[pick.y][pick.x] = 0;
            this.emptyPos = pick;
        }

        this.updateDOM(false); 
        
        // Delay enabling interactions and transitions to ensure DOM is ready
        requestAnimationFrame(() => {
            setTimeout(() => {
                this.isPlaying = true;
                Object.values(this.tiles).forEach(tile => {
                    if (this.config.time) {
                        tile.style.transition = `transform ${this.config.time}s ease-in-out`;
                    }
                });
            }, 50);
        });
    }

    handleTileClick(id) {
        if (!this.isPlaying) return;

        let target = null;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.matrix[y][x] === id) {
                    target = { x, y };
                    break;
                }
            }
            if (target) break;
        }

        if (target) this.moveTile(target.x, target.y);
    }

    moveTile(x, y) {
        const { x: ex, y: ey } = this.emptyPos;

        if (x === ex && y === ey) return; // Prevent self-moves

        if (x === ex) {
            // Vertical array shift
            const dir = Math.sign(y - ey);
            for (let currY = ey; currY !== y; currY += dir) {
                this.matrix[currY][ex] = this.matrix[currY + dir][ex];
            }
        } else if (y === ey) {
            // Horizontal array shift
            const dir = Math.sign(x - ex);
            for (let currX = ex; currX !== x; currX += dir) {
                this.matrix[ey][currX] = this.matrix[ey][currX + dir];
            }
        } else {
            return; // Invalid move (diagonal or disconnected)
        }

        // Finalize state
        this.matrix[y][x] = 0;
        this.emptyPos = { x, y };

        this.updateDOM();
        this.checkWin();
    }

    updateDOM() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const tileId = this.matrix[y][x];
                if (tileId !== 0) {
                    const tile = this.tiles[tileId];
                    // Using CSS transforms for vastly superior hardware-accelerated rendering performance
                    tile.style.transform = `translate(${x * this.tileWidth}px, ${y * this.tileHeight}px)`;
                    // Ensure top/left are 0 since we rely on transform
                    tile.style.top = '0px';
                    tile.style.left = '0px';
                }
            }
        }
    }

    checkWin() {
        let expectedId = 1;
        const max = this.rows * this.cols;
        const emptyTarget = this.config.emptySlot || max;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (expectedId === emptyTarget) {
                    if (this.matrix[y][x] !== 0) return; // Empty slot is in the wrong place
                } else {
                    if (this.matrix[y][x] !== expectedId) return; // Tile is out of place
                }
                expectedId++;
            }
        }

        this.isPlaying = false;
        
        // Allow transition to finish before executing callback
        const delay = this.config.time ? this.config.time * 1000 : 50;
        setTimeout(() => {
            if (typeof this.config.onWin === 'function') {
                this.config.onWin();
            }
        }, delay);
    }

    handleResize() {
        const parent = this.container.parentNode;
        if (!parent) return;
        
        const rect = parent.getBoundingClientRect();
        const scale = Math.min(rect.width / this.config.size[0], rect.height / this.config.size[1]);
        
        this.container.style.transform = `scale(${scale})`;
        this.container.style.transformOrigin = "top left"; // Safer origin for predictable layouts
    }

    handleKeyDown(e) {
        if (!this.isPlaying) return;
        const { x, y } = this.emptyPos;
        
        // Modern e.key implementation, gracefully handles D-pad mappings to slide tiles IN to the empty space
        switch(e.key) {
            case 'ArrowLeft':  if (x < this.cols - 1) this.moveTile(x + 1, y); break;
            case 'ArrowRight': if (x > 0) this.moveTile(x - 1, y); break;
            case 'ArrowUp':    if (y < this.rows - 1) this.moveTile(x, y + 1); break;
            case 'ArrowDown':  if (y > 0) this.moveTile(x, y - 1); break;
            default: return; // Ignore other keys
        }
        e.preventDefault(); // Prevent page scrolling
    }

    handleGamepad() {
        if (!this.isPlaying) return;

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let inputDetected = false;

        for (let gamepad of gamepads) {
            if (!gamepad) continue;

            // Standard D-Pad layout map (Indices 12, 13, 14, 15)
            const up = gamepad.buttons[12]?.pressed;
            const down = gamepad.buttons[13]?.pressed;
            const left = gamepad.buttons[14]?.pressed;
            const right = gamepad.buttons[15]?.pressed;

            if (up || down || left || right) {
                inputDetected = true;
                
                // Proper debouncing to prevent machine-gunning inputs
                if (!this.gamepadDpadPressed) {
                    const { x, y } = this.emptyPos;
                    if (up && y < this.rows - 1) this.moveTile(x, y + 1);
                    else if (down && y > 0) this.moveTile(x, y - 1);
                    else if (left && x < this.cols - 1) this.moveTile(x + 1, y);
                    else if (right && x > 0) this.moveTile(x - 1, y);
                    
                    this.gamepadDpadPressed = true;
                }
            }
        }

        if (!inputDetected) {
            this.gamepadDpadPressed = false;
        }

        this.gamepadLoopId = requestAnimationFrame(this._handleGamepad);
    }

    bindInputs() {
        if (this.config.keyBoard) {
            document.addEventListener("keydown", this._handleKeyDown);
        }

        if (this.config.gamePad) {
            window.addEventListener('gamepadconnected', () => {
                // Ensure we don't start multiple loops
                if (this.gamepadLoopId) cancelAnimationFrame(this.gamepadLoopId);
                this.gamepadLoopId = requestAnimationFrame(this._handleGamepad);
            });
        }
    }

    /**
     * Completely unbinds all event listeners and kills loops.
     * Prevents memory leaks if the puzzle needs to be removed from the DOM.
     */
    destroy() {
        this.isPlaying = false;
        window.removeEventListener('resize', this._handleResize);
        document.removeEventListener('keydown', this._handleKeyDown);
        
        if (this.gamepadLoopId) {
            cancelAnimationFrame(this.gamepadLoopId);
        }
        
        this.container.replaceChildren(); // Clear DOM elements
        this.tiles = {};
    }
}

// Global initialization fallback mapping
if (typeof window !== 'undefined' && typeof window.setup !== 'undefined' && window.setup.puzzle_fifteen) {
    window.gameInstance = new FifteenPuzzle(window.setup.puzzle_fifteen, "fifteen");
}
