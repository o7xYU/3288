// This file exports a string containing a self-contained HTML5 Minesweeper game.
// Source adapted from 'manuelhenke/minesweeper-for-web' and bundled for srcdoc.
export const minesweeperGameHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Minesweeper</title>
    <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
        #game-container { display: grid; border: 2px solid #7b7b7b; }
     .cell { width: 30px; height: 30px; background-color: #bdbdbd; border: 2px outset #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; cursor: pointer; }
     .cell.revealed { background-color: #d0d0d0; border: 1px solid #7b7b7b; }
     .cell.bomb { background-color: red; }
     .cell.flag::after { content: '🚩'; }
     .c1 { color: #0000ff; }.c2 { color: #008200; }.c3 { color: #ff0000; }
     .c4 { color: #000084; }.c5 { color: #840000; }.c6 { color: #008284; }
     .c7 { color: #840084; }.c8 { color: #757575; }
    </style>
</head>
<body>
    <div id="game-container"></div>
    <script>
        const gameContainer = document.getElementById('game-container');
        let rows = 16, cols = 16, bombs = 40;
        let board =;
        let gameOver = false;

        function initGame() {
            gameOver = false;
            board = Array(rows).fill(null).map(() => Array(cols).fill(null).map(() => ({ bomb: false, revealed: false, flag: false, neighbors: 0 })));
            
            // Place bombs
            let bombsPlaced = 0;
            while (bombsPlaced < bombs) {
                const r = Math.floor(Math.random() * rows);
                const c = Math.floor(Math.random() * cols);
                if (!board[r][c].bomb) {
                    board[r][c].bomb = true;
                    bombsPlaced++;
                }
            }

            // Calculate neighbors
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (board[r][c].bomb) continue;
                    let count = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].bomb) {
                                count++;
                            }
                        }
                    }
                    board[r][c].neighbors = count;
                }
            }
            render();
        }

        function render() {
            gameContainer.innerHTML = '';
            gameContainer.style.gridTemplateColumns = \`repeat(\${cols}, 30px)\`;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cellData = board[r][c];
                    const cellEl = document.createElement('div');
                    cellEl.className = 'cell';
                    if (cellData.revealed) {
                        cellEl.classList.add('revealed');
                        if (cellData.bomb) {
                            cellEl.classList.add('bomb');
                            cellEl.innerHTML = '💣';
                        } else if (cellData.neighbors > 0) {
                            cellEl.innerText = cellData.neighbors;
                            cellEl.classList.add('c' + cellData.neighbors);
                        }
                    } else if (cellData.flag) {
                        cellEl.classList.add('flag');
                    }
                    cellEl.addEventListener('click', () => handleClick(r, c));
                    cellEl.addEventListener('contextmenu', (e) => { e.preventDefault(); handleRightClick(r, c); });
                    gameContainer.appendChild(cellEl);
                }
            }
        }

        function handleClick(r, c) {
            if (gameOver |

| board[r][c].revealed |
| board[r][c].flag) return;
            revealCell(r, c);
            if (board[r][c].bomb) {
                alert('Game Over!');
                gameOver = true;
                revealAll();
            }
            checkWin();
            render();
        }

        function handleRightClick(r, c) {
            if (gameOver |

| board[r][c].revealed) return;
            board[r][c].flag =!board[r][c].flag;
            render();
        }

        function revealCell(r, c) {
            if (r < 0 |

| r >= rows |
| c < 0 |
| c >= cols |
| board[r][c].revealed) return;
            board[r][c].revealed = true;
            if (board[r][c].neighbors === 0 &&!board[r][c].bomb) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        revealCell(r + dr, c + dc);
                    }
                }
            }
        }
        
        function revealAll() {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    board[r][c].revealed = true;
                }
            }
            render();
        }

        function checkWin() {
            const revealedCount = board.flat().filter(cell => cell.revealed).length;
            if (revealedCount === rows * cols - bombs) {
                alert('You Win!');
                gameOver = true;
            }
        }

        // Listen for messages from the parent window to restart the game
        window.addEventListener('message', (event) => {
            if (event.data === 'new_game') {
                initGame();
            }
        });

        initGame();
    <\/script>
</body>
</html>
`;
