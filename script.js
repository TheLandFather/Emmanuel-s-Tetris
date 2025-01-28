document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('howToPlayBtn').addEventListener('click', showHowToPlay);
document.getElementById('backBtn').addEventListener('click', showMenu);
document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('quitBtn').addEventListener('click', quitGame);

const musicFiles = [
    "GrowTetris Starting Material(s)/Music(s)/Tetris (1).mp3",
    "GrowTetris Starting Material(s)/Music(s)/Tetris (2).mp3",
    "GrowTetris Starting Material(s)/Music(s)/Tetris (3).mp3",
    "GrowTetris Starting Material(s)/Music(s)/Tetris (4).mp3",
    "GrowTetris Starting Material(s)/Music(s)/Tetris (5).mp3"
];

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const arena = createMatrix(12, 20);
const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    next: null,
    hold: null,
    score: 0,
    lines: 0,
    level: 1,
    hasHeld: false
};

let pause = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let audio;

function startGame() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    removeGameOverElement();
    resetGameState();
    playMusic();
    countdown(3, () => {
        playerReset();
        update();
    });
}

function showHowToPlay() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('howToPlay').style.display = 'block';
}

function showMenu() {
    document.getElementById('howToPlay').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
}

function playMusic() {
    if (audio) audio.pause();
    const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)];
    audio = new Audio(randomMusic);
    audio.play();
    audio.addEventListener('ended', playMusic);
}

function togglePause() {
    pause = !pause;
    if (!pause) {
        update();
    }
}

function quitGame() {
    pause = true;
    if (audio) audio.pause();
    removeGameOverElement();
    resetGameState();
    showMenu();
    document.getElementById('game').style.display = 'none';
}

function countdown(seconds, callback) {
    const countdownElement = document.getElementById('countdown');
    countdownElement.textContent = seconds;
    countdownElement.style.display = 'block';
    let interval = setInterval(() => {
        seconds--;
        countdownElement.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(interval);
            countdownElement.style.display = 'none';
            callback();
        }
    }, 1000);
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'T') {
        return [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0],
        ];
    } else if (type === 'O') {
        return [
            [2, 2],
            [2, 2],
        ];
    } else if (type === 'L') {
        return [
            [0, 0, 3],
            [3, 3, 3],
            [0, 0, 0],
        ];
    } else if (type === 'J') {
        return [
            [4, 0, 0],
            [4, 4, 4],
            [0, 0, 0],
        ];
    } else if (type === 'I') {
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'Z') {
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ];
    }
}

function resetGameState() {
    arena.forEach(row => row.fill(0)); // Clear the arena
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    player.hold = null;
    player.hasHeld = false;
    dropCounter = 0;
    updateScore();
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    player.matrix = player.next || createPiece(pieces[pieces.length * Math.random() | 0]);
    player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    player.hasHeld = false;
    if (collide(arena, player)) {
        gameOver();
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function arenaSweep() {
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        player.lines++;
        player.score += 10;
        if (player.lines % 10 === 0) {
            player.level++;
            dropInterval *= 0.9;
        }
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}







function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

let moveInterval;
document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        playerMove(-1);
        clearInterval(moveInterval);
        moveInterval = setInterval(() => playerMove(-1), 100);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
        clearInterval(moveInterval);
        moveInterval = setInterval(() => playerMove(1), 100);
    } else if (event.key === 'ArrowDown') {
        playerRotate(-1); // Rotate left
    } else if (event.key === 'ArrowUp') {
        playerRotate(1); // Rotate right
    } else if (event.key === '0' && event.location === 3) { // Num Pad 0
        playerDrop();
    } else if (event.key === ' ') { // Space for Hard Drop
        while (!collide(arena, player)) {
            player.pos.y++;
        }
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    } else if (event.key === 'Shift') { // Shift for Hold
        if (!player.hasHeld) {
            holdPiece();
            player.hasHeld = true;
        }
    }
});


document.getElementById('rotateLeftBtn').addEventListener('click', () => playerRotate(-1));
document.getElementById('rotateRightBtn').addEventListener('click', () => playerRotate(1));
document.getElementById('moveLeftBtn').addEventListener('click', () => playerMove(-1));
document.getElementById('moveRightBtn').addEventListener('click', () => playerMove(1));
document.getElementById('dropBtn').addEventListener('click', playerDrop);
document.getElementById('holdBtn').addEventListener('click', () => {
    if (!player.hasHeld) {
        holdPiece();
        player.hasHeld = true;
    }
});

document.getElementById('hardDropBtn').addEventListener('click', () => {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
});





document.addEventListener('keyup', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        clearInterval(moveInterval);
    }
});

function holdPiece() {
    const holdCanvas = document.getElementById('hold');
    const holdContext = holdCanvas.getContext('2d');
    holdContext.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (!player.hold) {
        player.hold = player.matrix;
        playerReset();
    } else {
        [player.matrix, player.hold] = [player.hold, player.matrix];
        player.pos.y = 0;
        player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    }
    drawMatrix(player.hold, {x: 1, y: 1}, holdContext);
}

function update(time = 0) {
    if (pause) return;
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);

    // Display next piece
    const nextCanvas = document.getElementById('next');
    const nextContext = nextCanvas.getContext('2d');
    nextContext.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation
    nextContext.scale(17, 17); // Keep the scale
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height); // Clear the canvas
    drawMatrixShifted(player.next, nextContext, 'next');

    // Display hold piece
    const holdCanvas = document.getElementById('hold');
    const holdContext = holdCanvas.getContext('2d');
    holdContext.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation
    holdContext.scale(17, 17); // Keep the scale
    holdContext.fillStyle = '#000';
    holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height); // Clear the canvas
    if (player.hold) {
        drawMatrixShifted(player.hold, holdContext, 'hold');
    }
}

function drawMatrixShifted(matrix, ctx, type) {
    let offset = { x: 1, y: 1 };

    // Manually adjust offsets based on the type and piece
    if (type === 'next') {
        if (matrix.length === 4) { // I piece
            offset = { x: 1, y: .4 };
        } else if (matrix.length === 2) { // O piece
            offset = { x: 1.4, y: 1.4 };
        } else if (matrix[1][1] === 1) { // T piece
            offset = { x: .9, y: .6 };
        } else if (matrix[1][0] === 3) { // L piece
            offset = { x: 1, y: 1.5 };
        } else if (matrix[1][0] === 4) { // J piece
            offset = { x: 1, y: 1.5 };
        } else if (matrix[1][1] === 6) { // S piece
            offset = { x: .9, y: 1.5 };
        } else if (matrix[1][1] === 7) { // Z piece
            offset = { x: .9, y: 1.5 }; // Adjust this manually
        }
    } else if (type === 'hold') {
        if (matrix.length === 4) { // I piece
            offset = { x: 1, y: .4 };
        } else if (matrix.length === 2) { // O piece
            offset = { x: 1.4, y: 1.4 };
        } else if (matrix[1][1] === 1) { // T piece
            offset = { x: .9, y: .6 };
        } else if (matrix[1][0] === 3) { // L piece
            offset = { x: 1, y: 1.5 };
        } else if (matrix[1][0] === 4) { // J piece
            offset = { x: 1, y: 1.5 };
        } else if (matrix[1][1] === 6) { // S piece
            offset = { x: .9, y: 1.5 };
        } else if (matrix[1][1] === 7) { // Z piece
            offset = { x: .9, y: 1.5 }; // Adjust this manually
        }
    }

    drawMatrix(matrix, offset, ctx);
}

function drawMatrix(matrix, offset, ctx = context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = 'red';
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function updateScore() {
    document.getElementById('score').innerText = `Score: ${player.score}`;
    document.getElementById('level').innerText = `Level: ${player.level}`;
    document.getElementById('lines').innerText = `Lines: ${player.lines}`;
}

function gameOver() {
    pause = true;
    if (audio) audio.pause();
    const gameOverElement = document.createElement('div');
    gameOverElement.id = 'gameOver';
    gameOverElement.style.position = 'absolute';
    gameOverElement.style.top = '50%';
    gameOverElement.style.left = '50%';
    gameOverElement.style.transform = 'translate(-50%, -50%)';
    gameOverElement.style.fontSize = '48px';
    gameOverElement.style.color = 'white';
    gameOverElement.style.textAlign = 'center';
    gameOverElement.innerHTML = `
        <p>Game Over</p>
        <button onclick="restartGame()">Play Again</button>
        <button onclick="quitGame()">Quit</button>
    `;
    document.body.appendChild(gameOverElement);
}

function removeGameOverElement() {
    const gameOverElement = document.getElementById('gameOver');
    if (gameOverElement) {
        gameOverElement.remove();
    }
}

function restartGame() {
    removeGameOverElement();
    resetGameState();
    playMusic();
    countdown(3, () => {
        playerReset();
        update();
    });
}
