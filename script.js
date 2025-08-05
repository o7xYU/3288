import { minesweeperGameHtml } from './minesweeper.js';
import { sudokuGameHtml } from './sudoku.js';

(function () {
    // Define constants for the extension
    const extensionName = "sillytavern-game-toolbox";
    const L_STORAGE_KEY_PANEL_STATE = "game-toolbox-panel-state";
    const L_STORAGE_KEY_HANDLE_POS = "game-toolbox-handle-pos";
    const L_STORAGE_KEY_CUSTOM_GAMES = "game-toolbox-custom-games";

    // DOM elements
    let handle;
    let panel;

    // State objects
    let panelState = {};
    let handlePos = {};
    let customGames =;
    let isDragging = false;

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

    // --- UI CONTROLLER ---
    const ui = {
        createHandle: async () => {
            handlePos = await loadData(L_STORAGE_KEY_HANDLE_POS, { bottom: '20px', right: '20px' });
            
            handle = document.createElement('div');
            handle.id = 'gt-handle';
            handle.innerHTML = '🎮';
            handle.title = 'Game Toolbox';
            
            Object.assign(handle.style, handlePos);

            handle.addEventListener('mousedown', (e) => {
                isDragging = false; // Reset drag state
                const dragTimeout = setTimeout(() => {
                    isDragging = true;
                }, 150); // Set a small delay to differentiate click from drag

                let pos1 = 0, pos2 = 0, pos3 = e.clientX, pos4 = e.clientY;
                handle.classList.add('dragging');

                function elementDrag(ev) {
                    ev.preventDefault();
                    isDragging = true; // If moving, it's definitely a drag
                    pos1 = pos3 - ev.clientX;
                    pos2 = pos4 - ev.clientY;
                    pos3 = ev.clientX;
                    pos4 = ev.clientY;
                    
                    handle.style.bottom = 'auto';
                    handle.style.right = 'auto';
                    handle.style.top = `${handle.offsetTop - pos2}px`;
                    handle.style.left = `${handle.offsetLeft - pos1}px`;
                }

                function closeDragElement() {
                    clearTimeout(dragTimeout);
                    document.onmouseup = null;
                    document.onmousemove = null;
                    handle.classList.remove('dragging');
                    
                    if (isDragging) {
                        handlePos = { top: handle.style.top, left: handle.style.left, bottom: null, right: null };
                        saveData(L_STORAGE_KEY_HANDLE_POS, handlePos);
                    }
                }

                document.onmousemove = elementDrag;
                document.onmouseup = closeDragElement;
            });

            handle.addEventListener('click', () => {
                if (!isDragging) {
                    ui.togglePanel();
                }
            });

            document.body.appendChild(handle);
        },

        togglePanel: () => {
            if (panel && document.body.contains(panel)) {
                ui.destroyPanel();
            } else {
                ui.createPanel();
            }
        },

        createPanel: async () => {
            panelState = await loadData(L_STORAGE_KEY_PANEL_STATE, { top: '50%', left: '50%', isMinimized: false });

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

            Object.assign(panel.style, { top: panelState.top, left: panelState.left });
            if (panelState.isMinimized) panel.classList.add('minimized');

            document.getElementById('gt-close-btn').addEventListener('click', ui.destroyPanel);
            document.getElementById('gt-minimize-btn').addEventListener('click', ui.toggleMinimize);
            
            makeDraggable(panel, panel.querySelector('.gt-panel-header'), (el) => {
                panelState.top = el.style.top;
                panelState.left = el.style.left;
                saveData(L_STORAGE_KEY_PANEL_STATE, panelState);
            });

            renderGameGrid();
        },

        destroyPanel: () => {
            if (panel) {
                panel.remove();
                panel = null;
            }
        },

        toggleMinimize: () => {
            if (!panel) return;
            panelState.isMinimized =!panelState.isMinimized;
            panel.classList.toggle('minimized', panelState.isMinimized);
            saveData(L_STORAGE_KEY_PANEL_STATE, panelState);
        }
    };

    // --- GAME & MODAL RENDERING ---
    function renderGameGrid() {
        const content = document.getElementById('gt-panel-content');
        if (!content) return;
        content.innerHTML = '<div class="gt-game-grid" id="gt-game-grid"></div>';
        const grid = document.getElementById('gt-game-grid');

        builtInGames.forEach(game => {
            const iconEl = createGameIcon(game.name, game.icon);
            iconEl.addEventListener('click', () => renderGameView(game));
            grid.appendChild(iconEl);
        });

        customGames.forEach((game) => {
            const iconEl = createGameIcon(game.name, '🌐');
            iconEl.addEventListener('click', () => renderGameView(game, true));
            grid.appendChild(iconEl);
        });

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

    function renderGameView(game, isCustom = false) {
        const content = document.getElementById('gt-panel-content');
        if (!content) return;
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
                    new URL(url);
                    customGames.push({ name, url });
                    saveData(L_STORAGE_KEY_CUSTOM_GAMES, customGames).then(() => {
                        renderCustomGamesList(listElement);
                        renderGameGrid();
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
                    renderGameGrid();
                });
            });
            ulElement.appendChild(li);
        });
    }

    // --- UTILITY FUNCTIONS ---
    function makeDraggable(element, handle, onDragEnd) {
        handle.onmousedown = (e) => {
            e.preventDefault();
            let pos1 = 0, pos2 = 0, pos3 = e.clientX, pos4 = e.clientY;

            function elementDrag(ev) {
                ev.preventDefault();
                pos1 = pos3 - ev.clientX;
                pos2 = pos4 - ev.clientY;
                pos3 = ev.clientX;
                pos4 = ev.clientY;
                element.style.top = `${element.offsetTop - pos2}px`;
                element.style.left = `${element.offsetLeft - pos1}px`;
            }

            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
                if (onDragEnd) onDragEnd(element);
            }

            document.onmousemove = elementDrag;
            document.onmouseup = closeDragElement;
        };
    }

    // --- INITIALIZATION ---
    async function init() {
        customGames = await loadData(L_STORAGE_KEY_CUSTOM_GAMES,);
        ui.createHandle();
    }

    document.addEventListener('APP_READY', init, { once: true });
})();
