import { minesweeperGameHtml } from './games/minesweeper.js';
import { sudokuGameHtml } from './games/sudoku.js';

(function () {
    // Define constants for the extension
    const extensionName = "sillytavern-game-toolbox";
    const L_STORAGE_KEY_STATE = "game-toolbox-panel-state";
    const L_STORAGE_KEY_CUSTOM_GAMES = "game-toolbox-custom-games";

    // Main state object
    let panel;
    let panelState = {
        isOpen: false,
        isMinimized: false,
        top: '50%',
        left: '50%',
        width: '800px',
        height: '600px'
    };
    let customGames =;

    // Built-in games configuration
    const builtInGames =;

    // Function to save panel state to local storage
    async function savePanelState() {
        const { localforage } = SillyTavern.libs;
        try {
            await localforage.setItem(L_STORAGE_KEY_STATE, panelState);
        } catch (err) {
            console.error(`${extensionName}: Failed to save panel state`, err);
        }
    }

    // Function to load panel state from local storage
    async function loadPanelState() {
        const { localforage } = SillyTavern.libs;
        try {
            const savedState = await localforage.getItem(L_STORAGE_KEY_STATE);
            if (savedState) {
                panelState = {...panelState,...savedState };
            }
        } catch (err) {
            console.error(`${extensionName}: Failed to load panel state`, err);
        }
    }

    // Function to save custom games to local storage
    async function saveCustomGames() {
        const { localforage } = SillyTavern.libs;
        try {
            await localforage.setItem(L_STORAGE_KEY_CUSTOM_GAMES, customGames);
        } catch (err) {
            console.error(`${extensionName}: Failed to save custom games`, err);
        }
    }

    // Function to load custom games from local storage
    async function loadCustomGames() {
        const { localforage } = SillyTavern.libs;
        try {
            const savedGames = await localforage.getItem(L_STORAGE_KEY_CUSTOM_GAMES);
            if (savedGames && Array.isArray(savedGames)) {
                customGames = savedGames;
            }
        } catch (err) {
            console.error(`${extensionName}: Failed to load custom games`, err);
        }
    }


    // Function to create and show the main panel
    function showPanel() {
        if (panel) {
            panel.style.display = 'flex';
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
            <div class="gt-panel-content" id="gt-panel-content">
                </div>
        `;
        document.body.appendChild(panel);
        panelState.isOpen = true;

        // Apply saved state
        panel.style.top = panelState.top;
        panel.style.left = panelState.left;
        panel.style.width = panelState.width;
        panel.style.height = panelState.height;
        if (panelState.isMinimized) {
            panel.classList.add('minimized');
        }

        // Add event listeners
        document.getElementById('gt-close-btn').addEventListener('click', hidePanel);
        document.getElementById('gt-minimize-btn').addEventListener('click', toggleMinimize);
        makeDraggable(panel, panel.querySelector('.gt-panel-header'));

        renderGameGrid();
    }

    // Function to hide the panel
    function hidePanel() {
        if (panel) {
            panel.remove();
            panel = null;
            panelState.isOpen = false;
        }
    }

    // Function to toggle panel minimization
    function toggleMinimize() {
        if (!panel) return;
        panelState.isMinimized =!panelState.isMinimized;
        panel.classList.toggle('minimized', panelState.isMinimized);
        savePanelState();
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
        customGames.forEach((game, index) => {
            const iconEl = createGameIcon(game.name, '🌐');
            iconEl.addEventListener('click', () => renderGameView(game, true));
            grid.appendChild(iconEl);
        });

        // Render 'Add' button
        const addIconEl = createGameIcon('Add Game', '+');
        addIconEl.addEventListener('click', showAddGameModal);
        grid.appendChild(addIconEl);
    }

    // Helper to create a game icon element
    function createGameIcon(name, icon) {
        const iconEl = document.createElement('div');
        iconEl.className = 'gt-game-icon';
        iconEl.innerHTML = `
            <div class="icon-bg">${icon}</div>
            <span class="icon-label">${name}</span>
        `;
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

        modalBackdrop.querySelector('.gt-modal-cancel-btn').addEventListener('click', () => modalBackdrop.remove());
        modalBackdrop.querySelector('.gt-modal-save-btn').addEventListener('click', () => {
            const name = document.getElementById('gt-game-name-input').value.trim();
            const url = document.getElementById('gt-game-url-input').value.trim();
            if (name && url) {
                try {
                    new URL(url); // Validate URL format
                    customGames.push({ name, url });
                    saveCustomGames().then(() => {
                        renderCustomGamesList(document.getElementById('gt-custom-games-ul'));
                        renderGameGrid(); // Update main grid
                    });
                     document.getElementById('gt-game-name-input').value = '';
                     document.getElementById('gt-game-url-input').value = '';
                } catch (_) {
                    alert('Please enter a valid URL.');
                }
            } else {
                alert('Please fill in both name and URL.');
            }
        });
        
        // Prevent clicks inside the modal from closing it
        modalBackdrop.querySelector('.gt-modal-content').addEventListener('click', (e) => e.stopPropagation());
        modalBackdrop.addEventListener('click', () => modalBackdrop.remove());

        renderCustomGamesList(document.getElementById('gt-custom-games-ul'));
    }

    function renderCustomGamesList(ulElement) {
        ulElement.innerHTML = '';
        customGames.forEach((game, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${game.name}</span> <button data-index="${index}">Delete</button>`;
            li.querySelector('button').addEventListener('click', () => {
                customGames.splice(index, 1);
                saveCustomGames().then(() => {
                    renderCustomGamesList(ulElement);
                    renderGameGrid(); // Update main grid
                });
            });
            ulElement.appendChild(li);
        });
    }

    // Utility to make an element draggable
    function makeDraggable(element, handle) {
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
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            // Save final position
            panelState.top = element.style.top;
            panelState.left = element.style.left;
            savePanelState();
        }
    }

    // Main initialization function
    async function init() {
        // Load persistent data
        await loadPanelState();
        await loadCustomGames();

        // Create the extension button in the menu
        const buttonContainer = document.querySelector('#extension_menu_button_container');
        if (buttonContainer) {
            const button = document.createElement('div');
            button.id = 'game-toolbox-button';
            button.innerHTML = '$\🎮$';
            button.title = 'Game Toolbox';
            button.addEventListener('click', () => {
                if (panelState.isOpen) {
                    hidePanel();
                } else {
                    showPanel();
                }
            });
            buttonContainer.appendChild(button);
        } else {
            console.error(`${extensionName}: Could not find button container.`);
        }
    }

    // Wait for SillyTavern to be ready, then initialize
    document.addEventListener('APP_READY', init, { once: true });
})();
