
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const players = new Map();

app.use(express.static(__dirname));

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    game: 'Весёлая ферма 3D',
    players: players.size
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', socket => {
  console.log('Игрок подключился:', socket.id);

  const player = {
    id: socket.id,
    x: 0,
    y: 0,
    z: 7,
    rotation: 0,
    camera: 'third',
    name: 'Фермер'
  };

  players.set(socket.id, player);

  socket.emit('players:initial', Array.from(players.values()));
  socket.broadcast.emit('player:joined', player);

  socket.on('player:update', data => {
    if (!data || typeof data !== 'object') return;

    const current = players.get(socket.id);
    if (!current) return;

    const x = Number(data.x);
    const y = Number(data.y);
    const z = Number(data.z);
    const rotation = Number(data.rotation);

    if (![x, y, z, rotation].every(Number.isFinite)) return;

    current.x = Math.max(-48, Math.min(48, x));
    current.y = Math.max(-2, Math.min(5, y));
    current.z = Math.max(-45, Math.min(45, z));
    current.rotation = rotation;

    if (typeof data.name === 'string') {
      current.name = data.name.slice(0, 20);
    }

    if (data.camera === 'first' || data.camera === 'third') {
      current.camera = data.camera;
    }

    socket.broadcast.emit('player:update', current);
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit('player:left', socket.id);
    console.log('Игрок отключился:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('🌻 ВЕСЁЛАЯ ФЕРМА 3D запущена на порту ' + PORT);
});
