const socket = io();
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const size = 15;
const cellSize = canvas.width / size;
let board = Array(size).fill(null).map(() => Array(size).fill(null));
let currentPlayer = 'black';
let playerColor = 'black';
let room = null;

document.getElementById('startMatching').addEventListener('click', () => {
    socket.emit('startMatching');
});

document.getElementById('backToLobby').addEventListener('click', () => {
    document.getElementById('lobby').style.display = 'block';
    document.getElementById('game').style.display = 'none';
    document.getElementById('backToLobby').style.display = 'none';
});

function drawBoard() {
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            ctx.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
        }
    }
}

function drawStone(x, y, player) {
    const centerX = x * cellSize + cellSize / 2;
    const centerY = y * cellSize + cellSize / 2;
    const radius = cellSize / 2 * 0.8;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = player;
    ctx.fill();
    ctx.closePath();
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);

    if (!board[y][x] && currentPlayer === playerColor) {
        board[y][x] = currentPlayer;
        drawStone(x, y, currentPlayer);
        socket.emit('makeMove', { room, x, y, player: currentPlayer });
    }
});

function checkWin(x, y, player) {
    return (
        checkDirection(x, y, player, 1, 0) ||
        checkDirection(x, y, player, 0, 1) ||
        checkDirection(x, y, player, 1, 1) ||
        checkDirection(x, y, player, 1, -1)
    );
}

function checkDirection(x, y, player, dx, dy) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
        if (board[y + i * dy]?.[x + i * dx] === player) {
            count++;
        } else {
            break;
        }
    }
    for (let i = 1; i < 5; i++) {
        if (board[y - i * dy]?.[x - i * dx] === player) {
            count++;
        } else {
            break;
        }
    }
    return count >= 5;
}

socket.on('startGame', ({ room: roomName, player }) => {
    room = roomName;
    playerColor = player;
    currentPlayer = 'black';
    board = Array(size).fill(null).map(() => Array(size).fill(null));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    document.getElementById('status').innerText = `You are playing as ${player}`;
});

socket.on('moveMade', ({ x, y, player }) => {
    board[y][x] = player;
    drawStone(x, y, player);
    if (checkWin(x, y, player)) {
        document.getElementById('status').innerText = `${player} wins!`;
        document.getElementById('backToLobby').style.display = 'block';
    } else {
        currentPlayer = player === 'black' ? 'white' : 'black';
    }
});

socket.on('gameOver', ({ winner }) => {
    document.getElementById('status').innerText = `${winner} wins!`;
    document.getElementById('backToLobby').style.display = 'block';
});

socket.on('opponentLeft', () => {
    document.getElementById('status').innerText = 'Your opponent has left the game.';
    document.getElementById('backToLobby').style.display = 'block';
});
