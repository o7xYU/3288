import { minesweeperGameHtml } from './minesweeper.js';
import { sudokuGameHtml } from './sudoku.js';

(function () {
    // Define constants for the extension
    const extensionName = "sillytavern-game-toolbox";
    const L_STORAGE_KEY_PANEL_STATE = "game-toolbox-panel-state";
    const L_STORAGE_KEY_BUTTON_POS = "game-toolbox-button-pos";
    const L_STORAGE_KEY_CUSTOM_GAMES = "game-toolbox-custom-games";

    // Main state objects
    let panel;
    let floatingButton;
    let panelState = {
        isOpen: false,
        isMinimized: false,
        top: '50%',
        left: '50%',
        width: '800px',
        height: '600px'
    };
    let buttonPos = { top: null, left: null, bottom: '20px', right: '20px' };
    let customGames =;

    // Built-in games configuration
    const builtInGames =;

    // --- DATA PERSISTENCE FUNCTIONS ---
    async function saveData(key, data) {
        const { localforage } = SillyTavern.libs;
        try {
            await localforage.setItem(key, data);
        } catch (err) {
            console.error(`${extensionName}: Failed to save data for key ${key}`, err);
        }
    }

    async function loadData(key, defaultData) {
        const { localforage } = SillyTavern.libs;
        try {
            const savedData = await localforage.getItem(key);
            return savedData? {...defaultData,...savedData } : defaultData;
        } catch (err) {
            console.error(`${extensionName}: Failed to load data for key ${key}`, err);
            return defaultData;
        }
    }

    // --- UI CREATION AND MANAGEMENT ---

    // Function to create and show the main panel
    function showPanel() {
        if (panel) {
            panel.classList.remove('hidden');
            panelState.isOpen = true;
            return;
        }

        panel = document.createElement('div');
        panel.id = 'game-toolbox-panel';
        panel.innerHTML = `
            <div class="gt-panel-header">
                <span class="gt-panel-title">Game Toolbox</span>
                <div class="gt-panel-controls">
                    <button id="gt-minimize-btn">–</button>
                    <button id="gt-close-btn">×</button>
                </div>
            </div>
            <div class="gt-panel-content" id="gt-panel-content"></div>
        `;
        document.body.appendChild(panel);
        panelState.isOpen = true;

        // Apply saved state
        Object.assign(panel.style, { top: panelState.top, left: panelState.left, width: panelState.width, height: panelState.height });
        if (panelState.isMinimized) panel.classList.add('minimized');

        // Add event listeners
        document.getElementById('gt-close-btn').addEventListener('click', hidePanel);
        document.getElementById('gt-minimize-btn').addEventListener('click', toggleMinimize);
        makeDraggable(panel, panel.querySelector('.gt-panel-header'), (el) => {
            panelState.top = el.style.top;
            panelState.left = el.style.left;
            saveData(L_STORAGE_KEY_PANEL_STATE, panelState);
        });

        renderGameGrid();
    }

    function hidePanel() {
        if (panel) {
            panel.classList.add('hidden');
            panelState.isOpen = false;
        }
    }

    function toggleMinimize() {
        if (!panel) return;
        panelState.isMinimized =!panelState.isMinimized;
        panel.classList.toggle('minimized', panelState.isMinimized);
        saveData(L_STORAGE_KEY_PANEL_STATE, panelState);
    }

    function togglePanel() {
        if (panel && panelState.isOpen) {
            hidePanel();
        } else {
            showPanel();
        }
    }

    // Function to render the main game selection grid
    function renderGameGrid() {
        const content = document.getElementById('gt-panel-content');
        content.innerHTML = '<div class="gt-game-grid" id="gt-game-grid"></div>';
        const grid = document.getElementById('gt-game-grid');

        // Render built-in games
        builtInGames.forEach(game => {
            const iconEl = createGameIcon(game.name, game.icon);
            iconEl.addEventListener('click', () => renderGameView(game));
            grid.appendChild(iconEl);
        });

        // Render custom games
        customGames.forEach((game) => {
            const iconEl = createGameIcon(game.name, '🌐');
            iconEl.addEventListener('click', () => renderGameView(game, true));
            grid.appendChild(iconEl);
        });

        // Render 'Add' button
        const addIconEl = createGameIcon('Add Game', '+');
        addIconEl.addEventListener('click', showAddGameModal);
        grid.appendChild(addIconEl);
    }

    function createGameIcon(name, icon) {
        const iconEl = document.createElement('div');
        iconEl.className = 'gt-game-icon';
        iconEl.innerHTML = `<div class="icon-bg">${icon}</div><span class="icon-label">${name}</span>`;
        return iconEl;
    }

    // Function to render the view for a selected game
    function renderGameView(game, isCustom = false) {
        const content = document.getElementById('gt-panel-content');
        content.innerHTML = `
            <div class="gt-game-view">
                <div class="gt-game-header">
                    <h3>${game.name}</h3>
                    <div>
                        <button id="gt-back-btn">← Back</button>
                        ${!isCustom? '<button id="gt-new-game-btn">New Game</button>' : ''}
                    </div>
                </div>
                <iframe id="gt-game-iframe" ${isCustom? `sandbox="allow-scripts"` : ''}></iframe>
            </div>
        `;

        const iframe = document.getElementById('gt-game-iframe');
        if (isCustom) {
            iframe.src = game.url;
        } else {
            iframe.srcdoc = game.html;
        }

        document.getElementById('gt-back-btn').addEventListener('click', renderGameGrid);
        if (!isCustom) {
            document.getElementById('gt-new-game-btn').addEventListener('click', () => {
                iframe.contentWindow.postMessage('new_game', '*');
            });
        }
    }
    
    // Function to show the modal for adding/managing custom games
    function showAddGameModal() {
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'gt-modal-backdrop';
        modalBackdrop.innerHTML = `
            <div class="gt-modal-content">
                <h3>Manage Custom Games</h3>
                <input type="text" id="gt-game-name-input" placeholder="Game Name">
                <input type="url" id="gt-game-url-input" placeholder="Game URL (https://...)">
                <div class="gt-modal-buttons">
                    <button class="gt-modal-cancel-btn">Cancel</button>
                    <button class="gt-modal-save-btn">Save</button>
                </div>
                <div class="gt-custom-games-list">
                    <h4>Saved Games:</h4>
                    <ul id="gt-custom-games-ul"></ul>
                </div>
            </div>
        `;
        document.body.appendChild(modalBackdrop);

        const nameInput = document.getElementById('gt-game-name-input');
        const urlInput = document.getElementById('gt-game-url-input');
        const listElement = document.getElementById('gt-custom-games-ul');

        modalBackdrop.querySelector('.gt-modal-cancel-btn').addEventListener('click', () => modalBackdrop.remove());
        modalBackdrop.querySelector('.gt-modal-save-btn').addEventListener('click', () => {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            if (name && url) {
                try {
                    new URL(url); // Validate URL format
                    customGames.push({ name, url });
                    saveData(L_STORAGE_KEY_CUSTOM_GAMES, customGames).then(() => {
                        renderCustomGamesList(listElement);
                        renderGameGrid(); // Update main grid
                    });
                    nameInput.value = '';
                    urlInput.value = '';
                } catch (_) {
                    alert('Please enter a valid URL.');
                }
            } else {
                alert('Please fill in both name and URL.');
            }
        });
        
        modalBackdrop.querySelector('.gt-modal-content').addEventListener('click', (e) => e.stopPropagation());
        modalBackdrop.addEventListener('click', () => modalBackdrop.remove());

        renderCustomGamesList(listElement);
    }

    function renderCustomGamesList(ulElement) {
        ulElement.innerHTML = '';
        customGames.forEach((game, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${game.name}</span> <button data-index="${index}">Delete</button>`;
            li.querySelector('button').addEventListener('click', () => {
                customGames.splice(index, 1);
                saveData(L_STORAGE_KEY_CUSTOM_GAMES, customGames).then(() => {
                    renderCustomGamesList(ulElement);
                    renderGameGrid(); // Update main grid
                });
            });
            ulElement.appendChild(li);
        });
    }

    // --- UTILITY FUNCTIONS ---

    function makeDraggable(element, handle, onDragEnd) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.bottom = 'auto'; // Remove conflicting properties
            element.style.right = 'auto';
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            if (onDragEnd) onDragEnd(element);
        }
    }

    // --- INITIALIZATION ---

    async function init() {
        // Load persistent data
        panelState = await loadData(L_STORAGE_KEY_PANEL_STATE, panelState);
        buttonPos = await loadData(L_STORAGE_KEY_BUTTON_POS, buttonPos);
        customGames = await loadData(L_STORAGE_KEY_CUSTOM_GAMES,);

        // Create the floating action button
        floatingButton = document.createElement('div');
        floatingButton.id = 'game-toolbox-floating-button';
        floatingButton.innerHTML = '🎮';
        floatingButton.title = 'Game Toolbox';
        
        // Apply saved position
        Object.assign(floatingButton.style, {
            top: buttonPos.top,
            left: buttonPos.left,
            bottom: buttonPos.bottom,
            right: buttonPos.right
        });

        floatingButton.addEventListener('click', togglePanel);
        document.body.appendChild(floatingButton);

        // Make it draggable and save its position on drag end
        makeDraggable(floatingButton, floatingButton, (el) => {
            buttonPos = { top: el.style.top, left: el.style.left, bottom: null, right: null };
            saveData(L_STORAGE_KEY_BUTTON_POS, buttonPos);
        });
    }

    // Wait for SillyTavern to be ready, then initialize
    document.addEventListener('APP_READY', init, { once: true });
})();
