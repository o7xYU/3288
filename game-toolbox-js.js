// Game Toolbox Extension for SillyTavern
(function() {
    const MODULE_NAME = 'game_toolbox';
    const DEBUG_PREFIX = `<${MODULE_NAME}>`;
    
    let extensionSettings = null;
    let saveSettingsDebounced = null;
    
    // Default settings
    const defaultSettings = {
        customGames: [],
        minimized: false,
        currentGame: null
    };
    
    // Get or initialize settings
    function getSettings() {
        if (!extensionSettings[MODULE_NAME]) {
            extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
        }
        
        // Ensure all default keys exist
        for (const key in defaultSettings) {
            if (extensionSettings[MODULE_NAME][key] === undefined) {
                extensionSettings[MODULE_NAME][key] = defaultSettings[key];
            }
        }
        
        return extensionSettings[MODULE_NAME];
    }
    
    // Initialize the extension
    async function init() {
        const context = SillyTavern.getContext();
        extensionSettings = context.extensionSettings;
        saveSettingsDebounced = context.saveSettingsDebounced;
        
        console.log(DEBUG_PREFIX, 'Initializing Game Toolbox');
        
        // Add game button to extension menu
        addGameButton();
        
        // Create main panel
        createGamePanel();
        
        // Load saved state
        loadState();
    }
    
    // Add game button to extension menu
    function addGameButton() {
        const extensionMenu = document.getElementById('extensionsMenu');
        if (!extensionMenu) return;
        
        const gameButton = document.createElement('div');
        gameButton.id = 'game-toolbox-button';
        gameButton.className = 'extension_button game-toolbox-button';
        gameButton.innerHTML = '🎮';
        gameButton.title = 'Game Toolbox';
        
        gameButton.addEventListener('click', toggleGamePanel);
        
        extensionMenu.appendChild(gameButton);
    }
    
    // Create the main game panel
    function createGamePanel() {
        const panel = document.createElement('div');
        panel.id = 'game-toolbox-panel';
        panel.className = 'game-toolbox-panel';
        
        panel.innerHTML = `
            <div class="game-toolbox-header">
                <div class="game-toolbox-title">🎮 Game Toolbox</div>
                <div class="game-toolbox-controls">
                    <button class="game-toolbox-control-btn minimize-btn" title="Minimize">_</button>
                    <button class="game-toolbox-control-btn close-btn" title="Close">✕</button>
                </div>
            </div>
            <div class="game-toolbox-content">
                <div class="game-menu">
                    <div class="game-grid">
                        <div class="game-item" data-game="minesweeper">
                            <div class="game-icon">💣</div>
                            <div class="game-name">Minesweeper</div>
                        </div>
                        <div class="game-item" data-game="sudoku">
                            <div class="game-icon">🔢</div>
                            <div class="game-name">Sudoku</div>
                        </div>
                        <div class="game-item add-game-btn" data-action="add-game">
                            <div class="game-icon">➕</div>
                            <div class="game-name">Add Game</div>
                        </div>
                    </div>
                </div>
                <div class="game-container">
                    <button class="back-to-menu">← Back to Menu</button>
                    <div id="game-content"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Add event listeners
        panel.querySelector('.minimize-btn').addEventListener('click', minimizePanel);
        panel.querySelector('.close-btn').addEventListener('click', closePanel);
        panel.querySelector('.back-to-menu').addEventListener('click', showMenu);
        
        // Game item click handlers
        panel.querySelectorAll('.game-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const game = e.currentTarget.dataset.game;
                const action = e.currentTarget.dataset.action;
                
                if (action === 'add-game') {
                    showAddGameDialog();
                } else if (game) {
                    startGame(game);
                }
            });
        });
        
        // Create custom game dialog
        createCustomGameDialog();
    }
    
    // Create custom game dialog
    function createCustomGameDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'custom-game-dialog';
        dialog.className = 'custom-game-dialog';
        
        dialog.innerHTML = `
            <div class="dialog-header">Add Custom Game</div>
            <div class="dialog-content">
                <input type="text" class="dialog-input" id="game-name-input" placeholder="Game Name">
                <input type="text" class="dialog-input" id="game-url-input" placeholder="Game URL (e.g., https://example.com/game)">
                <input type="text" class="dialog-input" id="game-icon-input" placeholder="Icon (emoji or text)">
            </div>
            <div class="dialog-buttons">
                <button class="dialog-btn" onclick="document.getElementById('custom-game-dialog').classList.remove('show')">Cancel</button>
                <button class="dialog-btn primary" id="add-game-confirm">Add</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add confirm button handler
        dialog.querySelector('#add-game-confirm').addEventListener('click', addCustomGame);
    }
    
    // Toggle game panel visibility
    function toggleGamePanel() {
        const panel = document.getElementById('game-toolbox-panel');
        const isVisible = panel.classList.contains('show');
        
        if (isVisible) {
            closePanel();
        } else {
            panel.classList.add('show');
            const settings = getSettings();
            if (settings.minimized) {
                panel.classList.add('minimized');
            }
        }
    }
    
    // Minimize panel
    function minimizePanel() {
        const panel = document.getElementById('game-toolbox-panel');
        panel.classList.toggle('minimized');
        
        const settings = getSettings();
        settings.minimized = panel.classList.contains('minimized');
        saveSettingsDebounced();
    }
    
    // Close panel
    function closePanel() {
        const panel = document.getElementById('game-toolbox-panel');
        panel.classList.remove('show');
        
        // Save current game state if needed
        const settings = getSettings();
        settings.currentGame = null;
        saveSettingsDebounced();
    }
    
    // Show game menu
    function showMenu() {
        document.querySelector('.game-menu').style.display = 'block';
        document.querySelector('.game-container').classList.remove('show');
        
        const settings = getSettings();
        settings.currentGame = null;
        saveSettingsDebounced();
    }
    
    // Start a game
    function startGame(gameName) {
        const gameContainer = document.querySelector('.game-container');
        const gameContent = document.getElementById('game-content');
        
        // Hide menu, show game
        document.querySelector('.game-menu').style.display = 'none';
        gameContainer.classList.add('show');
        
        // Clear previous content
        gameContent.innerHTML = '';
        
        // Save current game
        const settings = getSettings();
        settings.currentGame = gameName;
        saveSettingsDebounced();
        
        // Load the appropriate game
        switch(gameName) {
            case 'minesweeper':
                loadMinesweeper(gameContent);
                break;
            case 'sudoku':
                loadSudoku(gameContent);
                break;
            default:
                // Check if it's a custom game
                const customGame = settings.customGames.find(g => g.id === gameName);
                if (customGame) {
                    loadCustomGame(gameContent, customGame);
                }
        }
    }
    
    // Load Minesweeper game
    function loadMinesweeper(container) {
        const game = {
            rows: 10,
            cols: 10,
            mines: 15,
            grid: [],
            revealed: [],
            flagged: [],
            gameOver: false,
            firstClick: true
        };
        
        function initGame() {
            game.grid = Array(game.rows).fill().map(() => Array(game.cols).fill(0));
            game.revealed = Array(game.rows).fill().map(() => Array(game.cols).fill(false));
            game.flagged = Array(game.rows).fill().map(() => Array(game.cols).fill(false));
            game.gameOver = false;
            game.firstClick = true;
            renderGame();
        }
        
        function placeMines(excludeRow, excludeCol) {
            let minesPlaced = 0;
            while (minesPlaced < game.mines) {
                const row = Math.floor(Math.random() * game.rows);
                const col = Math.floor(Math.random() * game.cols);
                
                if (game.grid[row][col] !== -1 && !(row === excludeRow && col === excludeCol)) {
                    game.grid[row][col] = -1;
                    minesPlaced++;
                    
                    // Update numbers around mine
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = row + dr;
                            const nc = col + dc;
                            if (nr >= 0 && nr < game.rows && nc >= 0 && nc < game.cols && game.grid[nr][nc] !== -1) {
                                game.grid[nr][nc]++;
                            }
                        }
                    }
                }
            }
        }
        
        function revealCell(row, col) {
            if (game.gameOver || game.revealed[row][col] || game.flagged[row][col]) return;
            
            if (game.firstClick) {
                placeMines(row, col);
                game.firstClick = false;
            }
            
            game.revealed[row][col] = true;
            
            if (game.grid[row][col] === -1) {
                game.gameOver = true;
                revealAllMines();
                alert('Game Over! You hit a mine!');
            } else if (game.grid[row][col] === 0) {
                // Reveal adjacent cells
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr >= 0 && nr < game.rows && nc >= 0 && nc < game.cols) {
                            revealCell(nr, nc);
                        }
                    }
                }
            }
            
            checkWin();
            renderGame();
        }
        
        function toggleFlag(row, col, e) {
            e.preventDefault();
            if (game.gameOver || game.revealed[row][col]) return;
            
            game.flagged[row][col] = !game.flagged[row][col];
            renderGame();
        }
        
        function revealAllMines() {
            for (let r = 0; r < game.rows; r++) {
                for (let c = 0; c < game.cols; c++) {
                    if (game.grid[r][c] === -1) {
                        game.revealed[r][c] = true;
                    }
                }
            }
        }
        
        function checkWin() {
            let cellsToReveal = 0;
            for (let r = 0; r < game.rows; r++) {
                for (let c = 0; c < game.cols; c++) {
                    if (game.grid[r][c] !== -1 && !game.revealed[r][c]) {
                        cellsToReveal++;
                    }
                }
            }
            
            if (cellsToReveal === 0) {
                game.gameOver = true;
                alert('Congratulations! You won!');
            }
        }
        
        function renderGame() {
            const gridHtml = [];
            for (let r = 0; r < game.rows; r++) {
                for (let c = 0; c < game.cols; c++) {
                    let cellClass = 'mine-cell';
                    let cellContent = '';
                    
                    if (game.revealed[r][c]) {
                        cellClass += ' revealed';
                        if (game.grid[r][c] === -1) {
                            cellClass += ' mine';
                            cellContent = '💣';
                        } else if (game.grid[r][c] > 0) {
                            cellClass += ` number-${game.grid[r][c]}`;
                            cellContent = game.grid[r][c];
                        }
                    } else if (game.flagged[r][c]) {
                        cellClass += ' flagged';
                        cellContent = '🚩';
                    }
                    
                    gridHtml.push(`
                        <div class="${cellClass}" 
                             data-row="${r}" 
                             data-col="${c}"
                             oncontextmenu="return false;">
                            ${cellContent}
                        </div>
                    `);
                }
            }
            
            container.innerHTML = `
                <div class="builtin-game">
                    <div class="minesweeper-controls">
                        <button id="new-minesweeper">New Game</button>
                        <span>Mines: ${game.mines}</span>
                    </div>
                    <div class="minesweeper-grid" style="grid-template-columns: repeat(${game.cols}, 30px);">
                        ${gridHtml.join('')}
                    </div>
                </div>
            `;
            
            // Add event listeners
            container.querySelector('#new-minesweeper').addEventListener('click', initGame);
            
            container.querySelectorAll('.mine-cell').forEach(cell => {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                
                cell.addEventListener('click', () => revealCell(row, col));
                cell.addEventListener('contextmenu', (e) => toggleFlag(row, col, e));
            });
        }
        
        initGame();
    }
    
    // Load Sudoku game
    function loadSudoku(container) {
        const game = {
            grid: [],
            solution: [],
            fixed: [],
            selected: null,
            errors: []
        };
        
        function generateSudoku() {
            // Generate a complete valid sudoku solution
            game.solution = Array(9).fill().map(() => Array(9).fill(0));
            fillGrid(game.solution);
            
            // Create puzzle by removing numbers
            game.grid = game.solution.map(row => [...row]);
            game.fixed = Array(9).fill().map(() => Array(9).fill(true));
            
            // Remove numbers to create puzzle (keeping about 30-35 numbers)
            const cellsToRemove = 81 - 35;
            let removed = 0;
            
            while (removed < cellsToRemove) {
                const row = Math.floor(Math.random() * 9);
                const col = Math.floor(Math.random() * 9);
                
                if (game.grid[row][col] !== 0) {
                    game.grid[row][col] = 0;
                    game.fixed[row][col] = false;
                    removed++;
                }
            }
            
            renderGame();
        }
        
        function fillGrid(grid) {
            // Simplified sudoku generator
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            
            // Fill diagonal 3x3 boxes first
            for (let box = 0; box < 9; box += 3) {
                const nums = [...numbers].sort(() => Math.random() - 0.5);
                let idx = 0;
                for (let r = box; r < box + 3; r++) {
                    for (let c = box; c < box + 3; c++) {
                        grid[r][c] = nums[idx++];
                    }
                }
            }
            
            // Fill remaining cells
            solveSudoku(grid);
        }
        
        function solveSudoku(grid) {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (grid[row][col] === 0) {
                        for (let num = 1; num <= 9; num++) {
                            if (isValidMove(grid, row, col, num)) {
                                grid[row][col] = num;
                                if (solveSudoku(grid)) {
                                    return true;
                                }
                                grid[row][col] = 0;
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        }
        
        function isValidMove(grid, row, col, num) {
            // Check row
            for (let c = 0; c < 9; c++) {
                if (grid[row][c] === num) return false;
            }
            
            // Check column
            for (let r = 0; r < 9; r++) {
                if (grid[r][col] === num) return false;
            }
            
            // Check 3x3 box
            const boxRow = Math.floor(row / 3) * 3;
            const boxCol = Math.floor(col / 3) * 3;
            for (let r = boxRow; r < boxRow + 3; r++) {
                for (let c = boxCol; c < boxCol + 3; c++) {
                    if (grid[r][c] === num) return false;
                }
            }
            
            return true;
        }
        
        function selectCell(row, col) {
            game.selected = { row, col };
            renderGame();
        }
        
        function inputNumber(num) {
            if (!game.selected || game.fixed[game.selected.row][game.selected.col]) return;
            
            game.grid[game.selected.row][game.selected.col] = num;
            checkErrors();
            checkWin();
            renderGame();
        }
        
        function checkErrors() {
            game.errors = [];
            
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const num = game.grid[row][col];
                    if (num === 0) continue;
                    
                    // Check for duplicates in row, column, and box
                    for (let c = 0; c < 9; c++) {
                        if (c !== col && game.grid[row][c] === num) {
                            game.errors.push({ row, col });
                            break;
                        }
                    }
                    
                    for (let r = 0; r < 9; r++) {
                        if (r !== row && game.grid[r][col] === num) {
                            game.errors.push({ row, col });
                            break;
                        }
                    }
                    
                    const boxRow = Math.floor(row / 3) * 3;
                    const boxCol = Math.floor(col / 3) * 3;
                    for (let r = boxRow; r < boxRow + 3; r++) {
                        for (let c = boxCol; c < boxCol + 3; c++) {
                            if ((r !== row || c !== col) && game.grid[r][c] === num) {
                                game.errors.push({ row, col });
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        function checkWin() {
            // Check if puzzle is complete and correct
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (game.grid[row][col] === 0) return false;
                }
            }
            
            if (game.errors.length === 0) {
                setTimeout(() => alert('Congratulations! You solved the puzzle!'), 100);
                return true;
            }
            
            return false;
        }
        
        function renderGame() {
            const gridHtml = [];
            
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    let cellClass = 'sudoku-cell';
                    
                    if (game.fixed[row][col]) {
                        cellClass += ' fixed';
                    }
                    
                    if (game.selected && game.selected.row === row && game.selected.col === col) {
                        cellClass += ' selected';
                    }
                    
                    if (game.errors.some(e => e.row === row && e.col === col)) {
                        cellClass += ' error';
                    }
                    
                    const value = game.grid[row][col] || '';
                    
                    gridHtml.push(`
                        <div class="${cellClass}" 
                             data-row="${row}" 
                             data-col="${col}">
                            ${value}
                        </div>
                    `);
                }
            }
            
            container.innerHTML = `
                <div class="builtin-game">
                    <div class="sudoku-controls">
                        <button id="new-sudoku">New Game</button>
                        <button id="clear-cell">Clear Cell</button>
                    </div>
                    <div class="sudoku-grid">
                        ${gridHtml.join('')}
                    </div>
                    <div class="number-buttons">
                        ${[1,2,3,4,5,6,7,8,9].map(num => 
                            `<button class="number-btn" data-num="${num}">${num}</button>`
                        ).join('')}
                    </div>
                </div>
            `;
            
            // Add event listeners
            container.querySelector('#new-sudoku').addEventListener('click', generateSudoku);
            container.querySelector('#clear-cell').addEventListener('click', () => {
                if (game.selected && !game.fixed[game.selected.row][game.selected.col]) {
                    inputNumber(0);
                }
            });
            
            container.querySelectorAll('.sudoku-cell').forEach(cell => {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                cell.addEventListener('click', () => selectCell(row, col));
            });
            
            container.querySelectorAll('.number-btn').forEach(btn => {
                const num = parseInt(btn.dataset.num);
                btn.addEventListener('click', () => inputNumber(num));
            });
        }
        
        generateSudoku();
    }
    
    // Load custom game
    function loadCustomGame(container, customGame) {
        container.innerHTML = `
            <div class="builtin-game">
                <iframe src="${customGame.url}" class="game-iframe" 
                        sandbox="allow-scripts allow-same-origin"
                        title="${customGame.name}">
                </iframe>
            </div>
        `;
    }
    
    // Show add game dialog
    function showAddGameDialog() {
        const dialog = document.getElementById('custom-game-dialog');
        dialog.classList.add('show');
        
        // Clear inputs
        document.getElementById('game-name-input').value = '';
        document.getElementById('game-url-input').value = '';
        document.getElementById('game-icon-input').value = '';
    }
    
    // Add custom game
    function addCustomGame() {
        const name = document.getElementById('game-name-input').value.trim();
        const url = document.getElementById('game-url-input').value.trim();
        const icon = document.getElementById('game-icon-input').value.trim() || '🎮';
        
        if (!name || !url) {
            alert('Please enter both game name and URL');
            return;
        }
        
        // Validate URL
        try {
            new URL(url);
        } catch {
            alert('Please enter a valid URL');
            return;
        }
        
        const settings = getSettings();
        const gameId = `custom-${Date.now()}`;
        
        settings.customGames.push({
            id: gameId,
            name,
            url,
            icon
        });
        
        saveSettingsDebounced();
        
        // Add to UI
        addCustomGameToUI(gameId, name, icon);
        
        // Close dialog
        document.getElementById('custom-game-dialog').classList.remove('show');
    }
    
    // Add custom game to UI
    function addCustomGameToUI(id, name, icon) {
        const gameGrid = document.querySelector('.game-grid');
        const addButton = gameGrid.querySelector('.add-game-btn');
        
        const gameItem = document.createElement('div');
        gameItem.className = 'game-item';
        gameItem.dataset.game = id;
        gameItem.innerHTML = `
            <div class="game-icon">${icon}</div>
            <div class="game-name">${name}</div>
        `;
        
        gameItem.addEventListener('click', () => startGame(id));
        
        gameGrid.insertBefore(gameItem, addButton);
    }
    
    // Load saved state
    function loadState() {
        const settings = getSettings();
        
        // Load custom games
        settings.customGames.forEach(game => {
            addCustomGameToUI(game.id, game.name, game.icon);
        });
        
        // Restore minimized state
        if (settings.minimized) {
            const panel = document.getElementById('game-toolbox-panel');
            if (panel.classList.contains('show')) {
                panel.classList.add('minimized');
            }
        }
    }
    
    // jQuery ready
    jQuery(async () => {
        // Wait for SillyTavern to be ready
        while (!window.SillyTavern?.getContext) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await init();
    });
})();