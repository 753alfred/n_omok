// omok.js 전체 파일 - 게임 시작 버튼 HTML 참조로 수정 완료

const roomListScreen = document.getElementById('room-list-screen');
const gameScreen = document.getElementById('game-screen');
const roomListElement = document.getElementById('room-list');
const hidePlayingCheckbox = document.getElementById('hide-playing');
const turnDisplay = document.getElementById('turn');
const playersDiv = document.getElementById('players');
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const popup = document.getElementById('create-popup');
const passwordPopup = document.getElementById('password-popup');
const startButton = document.getElementById('start-button');

let size = 19;
let cellSize;
let board = [];
let lastMoves = {};

let currentRoomId = null;
let playerId = 0;
let currentPlayer = 1;
let maxPlayers = 2;
let playersInRoom = [];
let roomListData = [];
let selectedJoinRoomId = '';
let isGameStarted = false;

const ws = new WebSocket('wss://n-omok-server.onrender.com');

// 서버 메시지 수신
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'roomList') {
    roomListData = data.rooms.sort((a, b) => b.createdAt - a.createdAt);
    renderRoomList();
  } else if (data.type === 'init') {
    playerId = Number(data.playerId);
    board = data.board;
    size = board.length;
    currentPlayer = Number(data.currentPlayer);
    maxPlayers = data.maxPlayers;
    playersInRoom = data.players;
    isGameStarted = data.isGameStarted;

    setupCanvas();
    switchToGameScreen();
    drawBoard();
    updateTurnText();

    if (!isGameStarted && playersInRoom.length === maxPlayers && playerId === 1) {
      startButton.style.display = 'inline';
    } else {
      startButton.style.display = 'none';
    }
  } else if (data.type === 'update') {
    board[data.y][data.x] = data.playerId;
    lastMoves[data.playerId] = [data.x, data.y];
    currentPlayer = Number(data.currentPlayer);
    drawBoard();
    updateTurnText();
  } else if (data.type === 'win') {
    alert(`승리! 플레이어 ${data.winner}`);
  } else if (data.type === 'invalidPassword') {
    alert('비밀번호가 틀렸습니다.');
  } else if (data.type === 'gameStarted') {
    isGameStarted = true;
    startButton.style.display = 'none';
  }
};

startButton.onclick = () => {
  ws.send(JSON.stringify({ type: 'startGame', roomId: currentRoomId }));
  startButton.style.display = 'none';
};

function renderRoomList() {
  const hidePlaying = hidePlayingCheckbox.checked;
  roomListElement.innerHTML = '';
  roomListData.forEach(room => {
    if (hidePlaying && room.status === '게임중') return;
    const li = document.createElement('li');
    li.textContent = `[${room.roomId}] ${room.name} | ${room.players}/${room.maxPlayers} | ${room.status}`;
    const joinBtn = document.createElement('button');
    joinBtn.textContent = '참여';
    joinBtn.onclick = () => handleJoin(room);
    li.appendChild(joinBtn);
    roomListElement.appendChild(li);
  });
}

function openCreatePopup() { popup.style.display = 'flex'; }
function closeCreatePopup() { popup.style.display = 'none'; }

function createRoom() {
  const name = document.getElementById('room-name').value.trim();
  const password = document.getElementById('room-password').value.trim();
  const numPlayers = parseInt(document.getElementById('num-players').value);
  const boardSize = parseInt(document.getElementById('board-size').value);
  if (!name) return alert('방 이름을 입력하세요.');

  ws.send(JSON.stringify({
    type: 'createRoom',
    name, password,
    maxPlayers: numPlayers,
    size: boardSize
  }));

  closeCreatePopup();
}

function handleJoin(room) {
  if (room.password) {
    selectedJoinRoomId = room.roomId;
    passwordPopup.style.display = 'flex';
  } else {
    location.href = `./?room=${room.roomId}`;
  }
}

function submitPassword() {
  const pw = document.getElementById('join-password').value.trim();
  ws.send(JSON.stringify({ type: 'joinRoom', roomId: selectedJoinRoomId, password: pw }));
  passwordPopup.style.display = 'none';
}
function closePasswordPopup() { passwordPopup.style.display = 'none'; }

function joinRoom(roomId) {
  ws.send(JSON.stringify({ type: 'joinRoom', roomId }));
  currentRoomId = roomId;
}

function switchToGameScreen() {
  roomListScreen.style.display = 'none';
  gameScreen.style.display = 'block';
}
function setupCanvas() {
  canvas.width = size * 40;
  canvas.height = size * 40;
  cellSize = canvas.width / size;
}
function updateTurnText() {
  turnDisplay.textContent = `내 번호: ${playerId} / 현재 턴: ${currentPlayer}`;
  playersDiv.textContent = `참여자: ${playersInRoom.join(', ')} | 현재 턴: 플레이어 ${currentPlayer}`;
}
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000';
  for (let i = 0; i < size; i++) {
    ctx.beginPath();
    ctx.moveTo(cellSize / 2, i * cellSize + cellSize / 2);
    ctx.lineTo(canvas.width - cellSize / 2, i * cellSize + cellSize / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i * cellSize + cellSize / 2, cellSize / 2);
    ctx.lineTo(i * cellSize + cellSize / 2, canvas.height - cellSize / 2);
    ctx.stroke();
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== 0) {
        const player = board[y][x];
        const isLastMove = lastMoves[player]?.[0] === x && lastMoves[player]?.[1] === y;
        drawStone(x, y, player, isLastMove);
      }
    }
  }
}
function drawStone(x, y, player, isLastMove) {
  const colors = ['black', 'red', 'green', 'deepskyblue', 'purple', 'orange'];
  ctx.beginPath();
  ctx.arc(
    x * cellSize + cellSize / 2,
    y * cellSize + cellSize / 2,
    cellSize / 2 - 5,
    0, Math.PI * 2
  );
  ctx.fillStyle = colors[(player - 1) % colors.length];
  ctx.fill();
  if (isLastMove) {
    ctx.beginPath();
    ctx.arc(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  }
}

canvas.addEventListener('click', (e) => {
  if (!isGameStarted) return;
  if (Number(currentPlayer) !== Number(playerId)) return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);
  if (board[y][x] !== 0) return;

  ws.send(JSON.stringify({
    type: 'place', x, y, playerId, roomId: currentRoomId
  }));
});

setInterval(() => {
  ws.send(JSON.stringify({ type: 'getRoomList' }));
}, 5000);

const urlParams = new URLSearchParams(window.location.search);
const urlRoomId = urlParams.get('room');
if (urlRoomId) {
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'joinRoom', roomId: urlRoomId }));
    currentRoomId = urlRoomId;
  });
}
