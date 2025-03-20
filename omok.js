const roomListScreen = document.getElementById('room-list-screen');
const gameScreen = document.getElementById('game-screen');
const roomListElement = document.getElementById('room-list');
const hidePlayingCheckbox = document.getElementById('hide-playing');
const turnDisplay = document.getElementById('turn');
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const popup = document.getElementById('create-popup');
const passwordPopup = document.getElementById('password-popup');

let size = 19;
let cellSize;
let board = [];
let lastMoves = {};

let currentRoomId = null;
let playerId = 0;
let currentPlayer = 1;
let maxPlayers = 2;
let roomListData = [];
let selectedJoinRoomId = '';
let selectedJoinPassword = '';

const ws = new WebSocket('wss://n-omok-server.onrender.com');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'roomList') {
    roomListData = data.rooms.sort((a, b) => b.createdAt - a.createdAt);
    renderRoomList();
  } else if (data.type === 'init') {
    playerId = data.playerId;
    board = data.board;
    size = board.length;
    currentPlayer = data.currentPlayer;
    maxPlayers = data.maxPlayers;
    setupCanvas();
    switchToGameScreen();
    drawBoard();
    updateTurnText();
  } else if (data.type === 'update') {
    board[data.y][data.x] = data.playerId;
    lastMoves[data.playerId] = [data.x, data.y];
    currentPlayer = data.currentPlayer;
    drawBoard();
    updateTurnText();
  } else if (data.type === 'win') {
    alert(`플레이어 ${data.winner} 승리!`);
  } else if (data.type === 'invalidPassword') {
    alert('비밀번호가 틀렸습니다.');
  }
};

// 방 리스트 표시
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

// 방 만들기 팝업
function openCreatePopup() { popup.style.display = 'flex'; }
function closeCreatePopup() { popup.style.display = 'none'; }

// 방 만들기 요청
function createRoom() {
  const name = document.getElementById('room-name').value.trim();
  const password = document.getElementById('room-password').value.trim();
  const numPlayers = parseInt(document.getElementById('num-players').value);
  const boardSize = parseInt(document.getElementById('board-size').value);
  if (!name) return alert('방 이름을 입력하세요.');

  ws.send(JSON.stringify({
    type: 'createRoom',
    name,
    password,
    maxPlayers: numPlayers,
    size: boardSize
  }));

  closeCreatePopup();
}

// 방 참여 처리
function handleJoin(room) {
  if (room.password) {
    selectedJoinRoomId = room.roomId;
    passwordPopup.style.display = 'flex';
  } else {
    joinRoom(room.roomId);
  }
}

// 비밀번호 확인 후 참여
function submitPassword() {
  const pw = document.getElementById('join-password').value.trim();
  ws.send(JSON.stringify({ type: 'joinRoom', roomId: selectedJoinRoomId, password: pw }));
  passwordPopup.style.display = 'none';
}
function closePasswordPopup() { passwordPopup.style.display = 'none'; }

// 방 참여
function joinRoom(roomId) {
  ws.send(JSON.stringify({ type: 'joinRoom', roomId }));
  currentRoomId = roomId;
}

// 게임화면 전환 및 설정
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

// 돌 놓기
canvas.addEventListener('click', (e) => {
  if (currentPlayer !== playerId) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);
  if (board[y][x] !== 0) return;

  ws.send(JSON.stringify({
    type: 'place', x, y, playerId, roomId: currentRoomId
  }));
});

// 5초마다 서버에 방 리스트 요청
setInterval(() => {
  ws.send(JSON.stringify({ type: 'getRoomList' }));
}, 5000);
