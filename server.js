
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 3000;

// Раздаём файлы игры
app.use(express.static(__dirname));

// Проверка сервера
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    game: 'Весёлая ферма 3D',
    players: players.size
  });
});

// Все подключённые игроки
const players = new Map();

// Подключение нового игрока
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

  // Отправляем новому игроку список игроков
  socket.emit('players:initial', Array.from(players.values()));

  // Сообщаем остальным о новом игроке
  socket.broadcast.emit('player:joined', player);

  // Получаем положение игрока
  socket.on('player:update', data => {

    if (!data || typeof data !== 'object') return;

    const current = players.get(socket.id);

    if (!current) return;

    const x = Number(data.x);
    const y = Number(data.y);
    const z = Number(data.z);
    const rotation = Number(data.rotation);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z) ||
      !Number.isFinite(rotation)
    ) return;

    // Ограничиваем координаты игрового мира
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

    // Передаём обновление остальным игрокам
    socket.broadcast.emit('player:update', current);
  });

  // Отключение игрока
  socket.on('disconnect', () => {

    console.log('Игрок отключился:', socket.id);

    players.delete(socket.id);

    io.emit('player:left', socket.id);
  });

});

// Запуск сервера
server.listen(PORT, '0.0.0.0', () => {

  console.log('================================');
  console.log('🌻 ВЕСЁЛАЯ ФЕРМА 3D');
  console.log('================================');
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log('Ожидание игроков...');
});
