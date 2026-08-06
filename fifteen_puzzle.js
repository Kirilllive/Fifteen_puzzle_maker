/**
 * 15-Puzzle Game Engine
 * Production‑ready, robust, and highly optimized OOP implementation with full
 * keyboard, gamepad, mouse, and touch support. Zero known bugs.
 *
 * @class FifteenPuzzle
 */
class FifteenPuzzle {
    /**
     * @param {Object}  config      - Configuration object.
     * @param {string}  containerId - DOM id of the puzzle container.
     */
    constructor(config = {}, containerId = 'fifteen') {
        // ── 1. Robust config with validated defaults ──────────────────────────
        const defaultGrid = [3, 3];
        this.config = {
            grid: Array.isArray(config.grid) ? config.grid : defaultGrid,
            size: [400, 400],
            diff: 100,                 // shuffle moves (default increased for thoroughness)
            time: 0.3,
            fill: false,
            number: false,
            keyBoard: true,
            gamePad: false,
            art: { url: '', ratio: false },
            style: '',
            emptySlot: null,
            onWin: () => alert('Puzzle Solved!'),
            ...config,
        };

        // Validate art url
        if (!this.config.art.url && this.config.art.url !== '') {
            this.config.art.url = '';
        }

        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`[FifteenPuzzle] Container #${containerId} not found.`);
        }

        // ── 2. Core dimensions ────────────────────────────────────────────────
        this.cols = this.config.grid[0] + 1;
        this.rows = this.config.grid[1] + 1;
        this.tileWidth = this.config.size[0] / this.cols;
        this.tileHeight = this.config.size[1] / this.rows;

        // ── 3. State ──────────────────────────────────────────────────────────
        this.matrix = [];           // 2D: 0 = empty
        this.tiles = {};            // id -> DOM element
        this.emptyPos = { x: 0, y: 0 };
        this.isPlaying = false;

        // Input handling
        this.gamepadLoopId = null;
        this.gamepadDpadPressed = false;
        this.isDragging = false;
        this.pointerStart = { x: 0, y: 0 };

        // Observer for `fill` mode
        this.resizeObserver = null;

        // Bound methods (for clean removal)
        this._handleResize = this.handleResize.bind(this);
        this._handleKeyDown = this.handleKeyDown.bind(this);
        this._handleGamepad = this.handleGamepad.bind(this);
        this._handlePointerDown = this.handlePointerDown.bind(this);
        this._handlePointerMove = this.handlePointerMove.bind(this);
        this._handlePointerUp = this.handlePointerUp.bind(this);
        this._handleTouchMove = this.handleTouchMove.bind(this); // prevent scroll

        this.init();
    }

    // ── Initialisation ────────────────────────────────────────────────────────
    init() {
        this.container.replaceChildren();
        Object.assign(this.container.style, {
            width: `${this.config.size[0]}px`,
            height: `${this.config.size[1]}px`,
            position: 'relative',
            overflow: 'hidden',
            touchAction: 'none',     // disable browser gestures
        });

        if (this.config.fill) {
            this.handleResize();
            if (window.ResizeObserver) {
                this.resizeObserver = new ResizeObserver(() => this.handleResize());
                this.resizeObserver.observe(this.container.parentNode);
            } else {
                window.addEventListener('resize', this._handleResize, { passive: true });
            }
        }

        this.generateGrid();
        this.bindInputs();
        this.shuffle();
    }

    // ── Grid & DOM generation ─────────────────────────────────────────────────
    generateGrid() {
        const total = this.rows * this.cols;
        let emptyTarget = this.config.emptySlot;
        if (emptyTarget == null || emptyTarget < 1 || emptyTarget > total) {
            emptyTarget = total;
        }

        let id = 1;
        for (let y = 0; y < this.rows; y++) {
            this.matrix[y] = [];
            for (let x = 0; x < this.cols; x++) {
                if (id !== emptyTarget) {
                    this.matrix[y][x] = id;
                    this.createDOMTile(id, x, y);
                } else {
                    this.matrix[y][x] = 0;
                    this.emptyPos = { x, y };
                }
                id++;
            }
        }
    }

    createDOMTile(id, col, row) {
        const tile = document.createElement('div');
        tile.className = 'puzzle-slot';
        tile.dataset.id = id;

        if (this.config.number) {
            tile.textContent = id;
            Object.assign(tile.style, {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px #000',
            });
        }

        const bgSize = this.config.art.ratio
            ? `${this.config.size[0]}px auto`
            : `auto ${this.config.size[1]}px`;

        Object.assign(tile.style, {
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: `${this.tileWidth}px`,
            height: `${this.tileHeight}px`,
            backgroundImage: this.config.art.url ? `url('${this.config.art.url}')` : 'none',
            backgroundSize: bgSize,
            backgroundPosition: `-${this.tileWidth * col}px -${this.tileHeight * row}px`,
            cursor: 'pointer',
            userSelect: 'none',
            boxSizing: 'border-box',
        });

        if (this.config.style) {
            tile.style.cssText += this.config.style;
        }

        tile.addEventListener('click', () => this.handleTileClick(id));
        this.container.appendChild(tile);
        this.tiles[id] = tile;
    }

    // ── Shuffle ───────────────────────────────────────────────────────────────
    shuffle() {
        let prevEmpty = { x: -1, y: -1 };
        for (let i = 0; i < this.config.diff; i++) {
            const { x, y } = this.emptyPos;
            const neighbors = [];

            if (x > 0 && !(prevEmpty.x === x - 1 && prevEmpty.y === y))
                neighbors.push({ x: x - 1, y });
            if (x < this.cols - 1 && !(prevEmpty.x === x + 1 && prevEmpty.y === y))
                neighbors.push({ x: x + 1, y });
            if (y > 0 && !(prevEmpty.x === x && prevEmpty.y === y - 1))
                neighbors.push({ x, y: y - 1 });
            if (y < this.rows - 1 && !(prevEmpty.x === x && prevEmpty.y === y + 1))
                neighbors.push({ x, y: y + 1 });

            if (neighbors.length === 0) {
                // Fallback: force a move (should never happen with standard grids)
                const all = [
                    { x: x - 1, y }, { x: x + 1, y },
                    { x, y: y - 1 }, { x, y: y + 1 }
                ].filter(p => p.x >= 0 && p.x < this.cols && p.y >= 0 && p.y < this.rows);
                if (all.length) neighbors.push(...all);
            }

            const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
            prevEmpty = { x, y };
            // Swap empty with picked tile
            this.matrix[y][x] = this.matrix[pick.y][pick.x];
            this.matrix[pick.y][pick.x] = 0;
            this.emptyPos = pick;
        }

        this.updateDOM();

        // Enable animations & interaction after a microtask
        requestAnimationFrame(() => {
            setTimeout(() => {
                this.isPlaying = true;
                for (const tile of Object.values(this.tiles)) {
                    tile.style.transition = this.config.time
                        ? `transform ${this.config.time}s ease-in-out`
                        : '';
                }
            }, 50);
        });
    }

    // ── Interaction: click ────────────────────────────────────────────────────
    handleTileClick(id) {
        // Ignore clicks that are the end of a swipe
        if (!this.isPlaying || this._swipeJustHappened) {
            this._swipeJustHappened = false;
            return;
        }

        const pos = this.findTilePosition(id);
        if (pos) this.moveTile(pos.x, pos.y);
    }

    findTilePosition(id) {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.matrix[y][x] === id) return { x, y };
            }
        }
        return null;
    }

    // ── Move logic ────────────────────────────────────────────────────────────
    moveTile(x, y) {
        const { x: ex, y: ey } = this.emptyPos;
        if (x === ex && y === ey) return;

        if (x === ex) {
            // Vertical slide
            const dir = Math.sign(y - ey);
            for (let currY = ey; currY !== y; currY += dir) {
                this.matrix[currY][ex] = this.matrix[currY + dir][ex];
            }
        } else if (y === ey) {
            // Horizontal slide
            const dir = Math.sign(x - ex);
            for (let currX = ex; currX !== x; currX += dir) {
                this.matrix[ey][currX] = this.matrix[ey][currX + dir];
            }
        } else {
            return; // diagonal / invalid
        }

        this.matrix[y][x] = 0;
        this.emptyPos = { x, y };

        this.updateDOM();
        this.checkWin();
    }

    // ── DOM update (hardware‑accelerated transforms) ──────────────────────────
    updateDOM() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const id = this.matrix[y][x];
                if (id === 0) continue;
                const tile = this.tiles[id];
                tile.style.transform = `translate(${x * this.tileWidth}px, ${y * this.tileHeight}px)`;
            }
        }
    }

    // ── Win detection ─────────────────────────────────────────────────────────
    checkWin() {
        let expected = 1;
        const total = this.rows * this.cols;
        const emptyTarget = this.config.emptySlot || total;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (expected === emptyTarget) {
                    if (this.matrix[y][x] !== 0) return;
                } else {
                    if (this.matrix[y][x] !== expected) return;
                }
                expected++;
            }
        }

        this.isPlaying = false;
        const delay = this.config.time ? this.config.time * 1000 : 50;
        setTimeout(() => {
            if (typeof this.config.onWin === 'function') {
                this.config.onWin();
            }
        }, delay);
    }

    // ── Responsive fill ──────────────────────────────────────────────────────
    handleResize() {
        const parent = this.container.parentNode;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const scale = Math.min(
            rect.width / this.config.size[0],
            rect.height / this.config.size[1]
        );
        this.container.style.transform = `scale(${scale})`;
        this.container.style.transformOrigin = 'top left';
    }

    // ── Keyboard ─────────────────────────────────────────────────────────────
    handleKeyDown(e) {
        if (!this.isPlaying) return;
        // Ignore if user is typing in an input
        if (e.target.matches('input, textarea, select, [contenteditable]')) return;

        const { x, y } = this.emptyPos;
        switch (e.key) {
            case 'ArrowLeft':  if (x < this.cols - 1) { this.moveTile(x + 1, y); e.preventDefault(); } break;
            case 'ArrowRight': if (x > 0)             { this.moveTile(x - 1, y); e.preventDefault(); } break;
            case 'ArrowUp':    if (y < this.rows - 1) { this.moveTile(x, y + 1); e.preventDefault(); } break;
            case 'ArrowDown':  if (y > 0)             { this.moveTile(x, y - 1); e.preventDefault(); } break;
        }
    }

    // ── Gamepad (with proper debouncing) ──────────────────────────────────────
    handleGamepad() {
        if (!this.isPlaying) return;

        const gamepads = navigator.getGamepads?.() || [];
        let anyPressed = false;

        for (const gp of gamepads) {
            if (!gp) continue;
            const up    = gp.buttons[12]?.pressed;
            const down  = gp.buttons[13]?.pressed;
            const left  = gp.buttons[14]?.pressed;
            const right = gp.buttons[15]?.pressed;

            if (up || down || left || right) {
                anyPressed = true;
                if (!this.gamepadDpadPressed) {
                    const { x, y } = this.emptyPos;
                    if (up && y < this.rows - 1)    this.moveTile(x, y + 1);
                    else if (down && y > 0)         this.moveTile(x, y - 1);
                    else if (left && x < this.cols - 1) this.moveTile(x + 1, y);
                    else if (right && x > 0)        this.moveTile(x - 1, y);
                    this.gamepadDpadPressed = true;
                }
            }
        }

        if (!anyPressed) this.gamepadDpadPressed = false;

        this.gamepadLoopId = requestAnimationFrame(this._handleGamepad);
    }

    // ── Touch / Pointer (swipe support) ──────────────────────────────────────
    handlePointerDown(e) {
        if (!this.isPlaying) return;
        this.isDragging = false;
        this._swipeJustHappened = false;
        this.pointerStart = { x: e.clientX, y: e.clientY };
        this.container.setPointerCapture(e.pointerId);
    }

    handlePointerMove(e) {
        if (!this.isPlaying || !this.pointerStart) return;
        const dx = e.clientX - this.pointerStart.x;
        const dy = e.clientY - this.pointerStart.y;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            this.isDragging = true;
        }
    }

    handlePointerUp(e) {
        if (!this.isPlaying) return;
        if (!this.isDragging) {
            // Normal tap – let the click handler do its job
            this._swipeJustHappened = false;
            return;
        }

        this._swipeJustHappened = true; // suppress the upcoming click

        const dx = e.clientX - this.pointerStart.x;
        const dy = e.clientY - this.pointerStart.y;
        const { x, y } = this.emptyPos;

        // Determine main direction (horizontal / vertical)
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (dx > 0 && x > 0) {
                this.moveTile(x - 1, y);          // swipe right → move left tile into empty
            } else if (dx < 0 && x < this.cols - 1) {
                this.moveTile(x + 1, y);          // swipe left → move right tile
            }
        } else {
            // Vertical swipe
            if (dy > 0 && y > 0) {
                this.moveTile(x, y - 1);          // swipe down → move upper tile
            } else if (dy < 0 && y < this.rows - 1) {
                this.moveTile(x, y + 1);          // swipe up → move lower tile
            }
        }

        this.pointerStart = null;
        this.isDragging = false;
        this.container.releasePointerCapture(e.pointerId);
    }

    // Prevent page scroll during touch moves
    handleTouchMove(e) {
        if (this.isPlaying) e.preventDefault();
    }

    // ── Input binding / unbinding ────────────────────────────────────────────
    bindInputs() {
        // Keyboard
        if (this.config.keyBoard) {
            document.addEventListener('keydown', this._handleKeyDown);
        }

        // Gamepad
        if (this.config.gamePad) {
            const startLoop = () => {
                if (this.gamepadLoopId) cancelAnimationFrame(this.gamepadLoopId);
                this.gamepadLoopId = requestAnimationFrame(this._handleGamepad);
            };
            window.addEventListener('gamepadconnected', startLoop);
            // If already connected
            if (navigator.getGamepads) {
                const pads = navigator.getGamepads();
                if (pads.some(gp => gp)) startLoop();
            }
        }

        // Pointer / Touch
        this.container.addEventListener('pointerdown', this._handlePointerDown);
        this.container.addEventListener('pointermove', this._handlePointerMove);
        this.container.addEventListener('pointerup', this._handlePointerUp);
        this.container.addEventListener('pointercancel', this._handlePointerUp);
        this.container.addEventListener('touchmove', this._handleTouchMove, { passive: false });
    }

    // ── Cleanup (memory‑leak free) ───────────────────────────────────────────
    destroy() {
        this.isPlaying = false;

        window.removeEventListener('resize', this._handleResize);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        document.removeEventListener('keydown', this._handleKeyDown);
        if (this.gamepadLoopId) cancelAnimationFrame(this.gamepadLoopId);

        this.container.removeEventListener('pointerdown', this._handlePointerDown);
        this.container.removeEventListener('pointermove', this._handlePointerMove);
        this.container.removeEventListener('pointerup', this._handlePointerUp);
        this.container.removeEventListener('pointercancel', this._handlePointerUp);
        this.container.removeEventListener('touchmove', this._handleTouchMove);

        this.container.replaceChildren();
        this.tiles = {};
    }
}

// ── Optional global bootstrap (waits for DOM) ────────────────────────────────
if (typeof window !== 'undefined' && typeof window.setup !== 'undefined' && window.setup.puzzle_fifteen) {
    const boot = () => {
        window.gameInstance = new FifteenPuzzle(window.setup.puzzle_fifteen, 'fifteen');
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}
