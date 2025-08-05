// Game Toolbox Extension for SillyTavern
(function() {
    'use strict';
    
    const MODULE_NAME = 'game_toolbox';
    const DEBUG_PREFIX = `<${MODULE_NAME}>`;
    
    // Default settings
    const defaultSettings = {
        customGames: [],
        minimized: false,
        currentGame: null,
        floatingButtonPosition: { bottom: 30, right: 30 }
    };
    
    // Initialize the extension
    function init() {
        console.log(DEBUG_PREFIX, 'Initializing Game Toolbox');
        
        // Create floating button
        createFloatingButton();
        
        // Create main panel
        createGamePanel();
        
        // Load saved state
        loadState();
    }
    
    // Get or initialize settings
    function getSettings() {
        const context = SillyTavern.getContext();
        const extensionSettings = context.extensionSettings;
        
        if (!extensionSettings[MODULE_NAME]) {
            extensionSettings[MODULE_NAME] = Object.assign({}, defaultSettings);
        }
        
        return extensionSettings[MODULE_NAME];
    }
    
    // Save settings
    function saveSettings() {
        const context = SillyTavern.getContext();
        context.saveSettingsDebounced();
    }
    
    // Create floating button
    function createFloatingButton() {
        // Remove existing button if any
        const existingButton = document.getElementById('game-toolbox-floating-button');
        if (existingButton) {
            existingButton.remove();
        }
        
        const floatingButton = document.createElement('div');
        floatingButton.id = 'game-toolbox-floating-button';
        floatingButton.className = 'game-toolbox-floating-button';
        floatingButton.innerHTML = '🎮';
        floatingButton.title = 'Game Toolbox';
        
        // Position the button
        const settings = getSettings();
        floatingButton.style.bottom = settings.floatingButtonPosition.bottom + 'px';
        floatingButton.style.right = settings.floatingButtonPosition.right + 'px';
        
        floatingButton.addEventListener('click', toggleGamePanel);
        
        // Make button draggable
        makeDraggable(floatingButton);
        
        document.body.appendChild(floatingButton);
    }
    
    // Make element draggable
    function makeDraggable(element) {
        let isDragging = false;
        let startX, startY, startRight, startBottom;
        
        element.addEventListener('mousedown', function(e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            startRight = window.innerWidth - rect.right;
            startBottom = window.innerHeight - rect.bottom;
            
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            
            const deltaX = startX - e.clientX;
            const deltaY = e.clientY - startY;
            
            const newRight = Math.max(10, Math.min(window.innerWidth - 60, startRight + deltaX));
            const newBottom = Math.max(10, Math.min(window.innerHeight - 60, startBottom + deltaY));
            
            element.style.right = newRight + 'px';
            element.style.bottom = newBottom + 'px';
        });
        
        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'pointer';
                
                // Save position
                const settings = getSettings();
                settings.floatingButtonPosition = {
                    right: parseInt(element.style.right),
                    bottom: parseInt(element.style.bottom)
                };
                saveSettings();
            }
        });
    }
    
    // Create the main game panel
    function createGamePanel() {
        // Remove existing panel if any
        const existingPanel = document.getElementById('game-toolbox-panel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        const panel = document.createElement('div');
        panel.id = 'game-toolbox-panel';
        panel.className = 'game-toolbox-panel';
        
        panel.innerHTML = `
            <div class="game-toolbox-header">
                <div class="game-toolbox-title">🎮 Game Toolbox</div>
                <div class="game-toolbox-controls">
                    <button class="game-toolbox-control-btn minimize-btn" title="Minimize">−</button>
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
            item.addEventListener('click', function(e) {
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
        
        // Close panel when clicking outside (except floating button)
        document.addEventListener('click', function(e) {
            if (!panel.contains(e.target) && 
                !document.getElementById('game-toolbox-floating-button').contains(e.target) &&
                !document.getElementById('custom-game-dialog').contains(e.target)) {
                if (panel.classList.contains('show') && !panel.classList.contains('minimized')) {
                    closePanel();
                }
            }
        });
        
        // Restore panel on minimize click when minimized
        panel.addEventListener('click', function() {
            if (panel.classList.contains('minimized')) {
                panel.classList.remove('minimized');
                const settings = getSettings();
                settings.minimized = false;
                saveSettings();
            }
        });
    }
    
    // Create custom game dialog
    function createCustomGameDialog() {
        // Remove existing dialog if any
        const existingDialog = document.getElementById('custom-game-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }
        
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
                <button class="dialog-btn cancel-btn">Cancel</button>
                <button class="dialog-btn primary" id="add-game-confirm">Add</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add button handlers
        dialog.querySelector('.cancel-btn').addEventListener('click', function() {
            dialog.classList.remove('show');
        });
        dialog.querySelector('#add-game-confirm').addEventListener('click', addCustomGame);
        
        // Add enter key support for inputs
        dialog.querySelectorAll('.dialog-input').forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addCustomGame();
                }
            });
        });
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
        saveSettings();
    }
    
    // Close panel
    function closePanel() {
        const panel = document.getElementById('game-toolbox-panel');
        panel.classList.remove('show');
        panel.classList.remove('minimized');
        
        // Save current game state if needed
        const settings = getSettings();
        settings.currentGame = null;
        settings.minimized = false;
        saveSettings();
    }
    
    // Show game menu
    function showMenu() {
        document.querySelector('.game-menu').style.display = 'block';
        document.querySelector('.game-container').classList.remove('show');
        
        const settings = getSettings();
        settings.currentGame = null;
        saveSettings();
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
        saveSettings();
        
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
        // Create game state
        window.minesweeperGame = {
            rows: 10,
            cols: 10,
            mines: 15,
            grid: [],
            revealed: [],
            flagged: [],
            gameOver: false,
            firstClick: true
        };
        
        window.initMinesweeper = function() {
            const game = window.minesweeperGame;
            game.grid = Array(game.rows).fill().map(() => Array(game.cols).fill(0));
            game.revealed = Array(game.rows).fill().map(() => Array(game.cols).fill(false));
            game.flagged = Array(game.rows).fill().map(() => Array(game.cols).fill(false));
            game.gameOver = false;
            game.firstClick = true;
            renderMinesweeper();
        };
        
        window.placeMines = function(excludeRow, excludeCol) {
            const game = window.minesweeperGame;
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
        };
        
        window.revealCell = function(row, col) {
            const game = window.minesweeperGame;
            if (game.gameOver || game.revealed[row][col] || game.flagged[row][col]) return;
            
            if (game.firstClick) {
                placeMines(row, col);
                game.firstClick = false;
            }
            
            game.revealed[row][col] = true;
            
            if (game.grid[row][col] === -1) {
                game.gameOver = true;
                revealAllMines();
                setTimeout(() => alert('Game Over! You hit a mine!'), 100);
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
            
            checkMinesweeperWin();
            renderMinesweeper();
        };
        
        window.toggleFlag = function(row, col) {
            const game = window.minesweeperGame;
            if (game.gameOver || game.revealed[row][col]) return;
            
            game.flagged[row][col] = !game.flagged[row][col];
            renderMinesweeper();
            return false; // Prevent context menu
        };
        
        window.revealAllMines = function() {
            const game = window.minesweeperGame;
            for (let r = 0; r < game.rows; r++) {
                for (let c = 0; c < game.cols; c++) {
                    if (game.grid[r][c] === -1) {
                        game.revealed[r][c] = true;
                    }
                }
            }
        };
        
        window.checkMinesweeperWin = function() {
            const game = window.minesweeperGame;
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
                setTimeout(() => alert('Congratulations! You won!'), 100);
            }
        };
        
        window.renderMinesweeper = function() {
            const game = window.minesweeperGame;
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
                             onclick="revealCell(${r}, ${c})"
                             oncontextmenu="return toggleFlag(${r}, ${c})">
                            ${cellContent}
                        </div>
                    `);
                }
            }
            
            container.innerHTML = `
                <div class="builtin-game">
                    <div class="minesweeper-controls">
                        <button onclick="initMinesweeper()">New Game</button>
                        <span>Mines: ${game.mines}</span>
                    </div>
                    <div class="minesweeper-grid" style="grid-template-columns: repeat(${game.cols}, 30px);">
                        ${gridHtml.join('')}
                    </div>
                </div>
            `;
        };
        
        initMinesweeper();
    }
    
    // Load Sudoku game
    function loadSudoku(container) {
        // Create game state
        window.sudokuGame = {
            grid: [],
            solution: [],
            fixed: [],
            selected: null,
            errors: []
        };
        
        window.generateSudoku = function() {
            const game = window.sudokuGame;
            // Generate a complete valid sudoku solution
            game.solution = Array(9).fill().map(() => Array(9).fill(0));
            fillSudokuGrid(game.solution);
            
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
            
            renderSudoku();
        };
        
        window.fillSudokuGrid = function(grid) {
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
        };
        
        window.solveSudoku = function(grid) {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (grid[row][col] === 0) {
                        for (let num = 1; num <= 9; num++) {
                            if (isValidSudokuMove(grid, row, col, num)) {
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
        };
        
        window.isValidSudokuMove = function(grid, row, col, num) {
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
        };
        
        window.selectSudokuCell = function(row, col) {
            const game = window.sudokuGame;
            game.selected = { row, col };
            renderSudoku();
        };
        
        window.inputSudokuNumber = function(num) {
            const game = window.sudokuGame;
            if (!game.selected || game.fixed[game.selected.row][game.selected.col]) return;
            
            game.grid[game.selected.row][game.selected.col] = num;
            checkSudokuErrors();
            checkSudokuWin();
            renderSudoku();
        };
        
        window.checkSudokuErrors = function() {
            const game = window.sudokuGame;
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
        };
        
        window.checkSudokuWin = function() {
            const game = window.sudokuGame;
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
        };
        
        window.renderSudoku = function() {
            const game = window.sudokuGame;
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
                             onclick="selectSudokuCell(${row}, ${col})">
                            ${value}
                        </div>
                    `);
                }
            }
            
            container.innerHTML = `
                <div class="builtin-game">
                    <div class="sudoku-controls">
                        <button onclick="generateSudoku()">New Game</button>
                        <button onclick="if(sudokuGame.selected && !sudokuGame.fixed[sudokuGame.selected.row][sudokuGame.selected.col]) inputSudokuNumber(0)">Clear Cell</button>
                    </div>
                    <div class="sudoku-grid">
                        ${gridHtml.join('')}
                    </div>
                    <div class="number-buttons">
                        ${[1,2,3,4,5,6,7,8,9].map(num => 
                            `<button class="number-btn" onclick="inputSudokuNumber(${num})">${num}</button>`
                        ).join('')}
                    </div>
                </div>
            `;
        };
        
        generateSudoku();
    }
    
    // Load custom game
    function loadCustomGame(container, customGame) {
        container.innerHTML = `
            <div class="builtin-game">
                <iframe src="${customGame.url}" class="game-iframe" 
                        sandbox="allow-scripts allow-same-origin allow-forms"
                        title="${customGame.name}">
                    <p>Your browser does not support iframes. Please visit <a href="${customGame.url}" target="_blank">${customGame.name}</a> directly.</p>
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
        
        // Focus on first input
        document.getElementById('game-name-input').focus();
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
        const gameId = 'custom-' + Date.now();
        
        settings.customGames.push({
            id: gameId,
            name: name,
            url: url,
            icon: icon
        });
        
        saveSettings();
        
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
        
        gameItem.addEventListener('click', function() {
            startGame(id);
        });
        
        // Add right-click context menu for custom games
        gameItem.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (confirm(`Remove "${name}" from games?`)) {
                removeCustomGame(id);
            }
        });
        
        gameGrid.insertBefore(gameItem, addButton);
    }
    
    // Remove custom game
    function removeCustomGame(gameId) {
        const settings = getSettings();
        settings.customGames = settings.customGames.filter(game => game.id !== gameId);
        saveSettings();
        
        // Remove from UI
        const gameItem = document.querySelector(`[data-game="${gameId}"]`);
        if (gameItem) {
            gameItem.remove();
        }
    }
    
    // Load saved state
    function loadState() {
        const settings = getSettings();
        
        // Load custom games
        settings.customGames.forEach(function(game) {
            addCustomGameToUI(game.id, game.name, game.icon);
        });
        
        // Restore minimized state
        if (settings.minimized) {
            const panel = document.getElementById('game-toolbox-panel');
            if (panel && panel.classList.contains('show')) {
                panel.classList.add('minimized');
            }
        }
        
        // Restore current game if any
        if (settings.currentGame) {
            startGame(settings.currentGame);
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const floatingButton = document.getElementById('game-toolbox-floating-button');
        if (floatingButton) {
            // Ensure button stays within viewport
            const rect = floatingButton.getBoundingClientRect();
            const maxRight = window.innerWidth - 60;
            const maxBottom = window.innerHeight - 60;
            
            if (rect.right > window.innerWidth) {
                floatingButton.style.right = '30px';
            }
            if (rect.bottom > window.innerHeight) {
                floatingButton.style.bottom = '30px';
            }
        }
    });
    
    // jQuery ready
    jQuery(function() {
        // Wait for SillyTavern to be ready
        const checkReady = setInterval(function() {
            if (window.SillyTavern && window.SillyTavern.getContext) {
                clearInterval(checkReady);
                init();
            }
        }, 100);
    });
})();
