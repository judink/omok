const express = require('express');
const serverless = require('serverless-http');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static('public'));

let waitingPlayer = null;
let rooms = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('startMatching', () => {
        if (waitingPlayer) {
            const room = 'room-' + waitingPlayer.id + '-' + socket.id;
            rooms[room] = { players: [waitingPlayer.id, socket.id], currentPlayer: 'black' };
            waitingPlayer.join(room);
            socket.join(room);

            io.to(room).emit('startGame', { room, player: 'black' });
            io.to(waitingPlayer.id).emit('startGame', { room, player: 'white' });
            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
        }
    });

    socket.on('makeMove', ({ room, x, y, player }) => {
        if (rooms[room].currentPlayer === player) {
            rooms[room].currentPlayer = player === 'black' ? 'white' : 'black';
            io.to(room).emit('moveMade', { x, y, player });
        }
    });

    socket.on('gameOver', ({ room, winner }) => {
        io.to(room).emit('gameOver', { winner });
        rooms[room].players.forEach(id => io.sockets.sockets.get(id).leave(room));
        delete rooms[room];
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
        for (let room in rooms) {
            const index = rooms[room].players.indexOf(socket.id);
            if (index !== -1) {
                rooms[room].players.splice(index, 1);
                io.to(room).emit('opponentLeft');
                if (rooms[room].players.length === 0) {
                    delete rooms[room];
                }
            }
        }
    });
});

module.exports.handler = serverless(app);
