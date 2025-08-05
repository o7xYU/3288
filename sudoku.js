// This file exports a string containing a self-contained HTML5 Sudoku game.
// Source adapted from 'EduardoProfe666/sudoku-play' and other vanilla JS examples.
export const sudokuGameHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Sudoku</title>
    <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
        #sudoku-board { display: grid; grid-template-columns: repeat(9, 1fr); width: 450px; height: 450px; border: 3px solid black; }
       .sudoku-cell { width: 100%; height: 100%; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 24px; box-sizing: border-box; }
       .sudoku-cell:nth-child(3n) { border-right: 2px solid black; }
       .sudoku-cell:nth-child(9n) { border-right: none; }
       .sudoku-row:nth-child(3n).sudoku-cell { border-bottom: 2px solid black; }
       .sudoku-row:nth-child(9).sudoku-cell { border-bottom: none; }
        input { width: 100%; height: 100%; text-align: center; font-size: 24px; border: none; background-color: transparent; }
        input:disabled { color: black; font-weight: bold; }
    </style>
</head>
<body>
    <div id="sudoku-board"></div>
    <script>
        const boardEl = document.getElementById('sudoku-board');
        let board =;

        function generatePuzzle() {
            // A simple generator: starts with a solved board and removes numbers.
            const base = ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ;
            
            // Random transformations (not cryptographically strong, but good enough for variety)
            // Swap rows within a 3x3 block
            for (let block = 0; block < 3; block++) {
                let r = Array.from({length: 3}, (_, i) => i + block * 3).sort(() => Math.random() - 0.5);
                let tempBlock = [base[r], base[r], base[r]];
                base[r] = tempBlock; base[r] = tempBlock; base[r] = tempBlock;
            }

            board = JSON.parse(JSON.stringify(base)); // Deep copy

            // Remove numbers (difficulty)
            let empties = 40; // Medium difficulty
            for (let i = 0; i < empties; i++) {
                let r = Math.floor(Math.random() * 9);
                let c = Math.floor(Math.random() * 9);
                if (board[r][c]!== 0) {
                    board[r][c] = 0;
                } else {
                    i--; // Try again
                }
            }
        }

        function renderBoard() {
            boardEl.innerHTML = '';
            for (let r = 0; r < 9; r++) {
                const rowEl = document.createElement('div');
                rowEl.className = 'sudoku-row';
                for (let c = 0; c < 9; c++) {
                    const cellEl = document.createElement('div');
                    cellEl.className = 'sudoku-cell';
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.min = 1;
                    input.max = 9;
                    if (board[r][c]!== 0) {
                        input.value = board[r][c];
                        input.disabled = true;
                    }
                    cellEl.appendChild(input);
                    boardEl.appendChild(cellEl);
                }
            }
        }
        
        function initGame() {
            generatePuzzle();
            renderBoard();
        }

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
