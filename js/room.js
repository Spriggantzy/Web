const root = document.getElementById('room-root');
const params = new URLSearchParams(location.search);
const roomId = (params.get('code') || '').toUpperCase();

if (!roomId) {
  root.innerHTML = '<p class="error">Room code олдсонгүй.</p><a class="button secondary" href="lobby.html">Lobby</a>';
  throw new Error('no room code');
}

function loadRoom() {
  const saved = localStorage.getItem(`room-${roomId}`);
  const room = saved
    ? JSON.parse(saved)
    : {
        id: roomId,
        room_code: roomId,
        host_user_id: 'me',
        status: 'waiting',
        max_players: 5,
        players: [
          { id: 'me', username: 'Player 1', is_ready: false, seat_number: 1 },
          { id: 'bot2', username: 'Player 2', is_ready: true, seat_number: 2 }
        ]
      };
  room.max_players = 5;
  saveRoom(room);
  return room;
}

function saveRoom(room) {
  localStorage.setItem(`room-${roomId}`, JSON.stringify(room));
}

function renderPlayerList(players) {
  return `<div class="grid">${players
    .map(
      (p) =>
        `<div class="player"><span>${p.seat_number}. ${p.username}</span><span class="badge ${p.is_ready ? 'ready' : ''}">${p.is_ready ? 'Ready' : 'Not ready'}</span></div>`
    )
    .join('')}</div>`;
}

function render(room) {
  const allReady = room.players.length >= 2 && room.players.length <= 5 && room.players.every((p) => p.is_ready);
  const meReady = Boolean(room.players[0]?.is_ready);

  root.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Өрөө: ${room.room_code}</h1>
        <p class="muted">Муушиг 2-5 тоглогчтой. Бүх тоглогч Ready болсны дараа эхэлнэ.</p>
      </div>
      <a class="button secondary" href="lobby.html">Lobby</a>
    </div>
    ${renderPlayerList(room.players)}
    <div class="nav">
      <button class="button" id="ready-btn">${meReady ? 'Ready болсон' : 'Ready болох'}</button>
      <button class="button secondary" id="add-bot-btn" ${room.players.length >= 5 ? 'disabled' : ''}>Demo player нэмэх (${room.players.length}/5)</button>
      <a class="button ${!allReady ? 'secondary disabled-link' : ''}" href="${allReady ? `game.html?code=${room.room_code}` : '#'}">Тоглоом эхлүүлэх</a>
    </div>
    ${!allReady ? '<p class="muted">2-5 тоглогч хэрэгтэй. Бүх тоглогч Ready болох ёстой.</p>' : ''}
  `;

  document.getElementById('ready-btn').addEventListener('click', () => {
    room.players = room.players.map((p) => (p.id === 'me' ? { ...p, is_ready: !p.is_ready } : p));
    saveRoom(room);
    render(room);
  });

  const addBotBtn = document.getElementById('add-bot-btn');
  addBotBtn.addEventListener('click', () => {
    if (room.players.length >= 5) return;
    const n = room.players.length + 1;
    room.players = [...room.players, { id: `bot${n}`, username: `Player ${n}`, is_ready: true, seat_number: n }];
    saveRoom(room);
    render(room);
  });
}

render(loadRoom());
