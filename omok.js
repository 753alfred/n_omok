// 화면 요소 참조
const roomListScreen = document.getElementById('room-list-screen');
const gameScreen = document.getElementById('game-screen');
const roomListElement = document.getElementById('room-list');
const turnDisplay = document.getElementById('turn');
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const popup = document.getElementById('create-popup');

let size = 19;  // 기본 판 크기
let cellSize;   // 셀 크기 (판 크기에 따라 계산)
let board = [];
let lastMoves = {};

let currentRoomId = null;
let playerId = 0;
let currentPlayer = 1;
let maxPlayers = 2;

// WebSocket 서버 주소
const ws = new WebSocket('wss://n-omok-server.onrender.com');

// 서버로부터 메시지 수신
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'roomList') {
    updateRoomList(data.rooms);
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
  }
};

// 화면 전환 및 방 목록 표시
function updateRoomList(rooms) {
  roomListElement.innerHTML = '';
  rooms.forEach(room => {
    const li = document.createElement('li');
    li.textContent = `방 ID: ${room.roomId} | 인원: ${room.players}/${room.maxPlayers} | 판: ${room.size}x${room.size}`;
    const joinBtn = document.createElement('button');
    joinBtn.textContent = '참여';
    joinBtn.onclick = () => joinRoom(room.roomId);
    li.appendChild(joinBtn);
    roomListElement.appendChild(li);
  });
}

// 방 생성 팝업
function openCreatePopup() {
  popup.style.display = 'flex';
}

function closeCreatePopup() {
  popup.style.display = 'none';
}

// 방 만들기
function createRoom() {
  const numPlayers = parseInt(document.getElementById('num-players').value);
  const boardSize = parseInt(document.getElementById('board-size').value);

  ws.send(JSON.stringify({
    type: 'createRoom',
    maxPlayers: numPlayers,
    size: boardSize
  }));

  closeCreatePopup();
}

// 방 참여
function joinRoom(roomId) {
  ws.send(JSON.stringify({ type: 'joinRoom', roomId }));
  currentRoomId = roomId;
}

// 게임 화면으로 전환
function switchToGameScreen() {
  roomListScreen.style.display = 'none';
  gameScreen.style.display = 'block';
}

// 캔버스 설정
function setupCanvas() {
  canvas.width = size * 40;
  canvas.height = size * 40;
  cellSize = canvas.width / size;
}

// 턴 표시
function updateTurnText() {
  turnDisplay.textContent = `내 번호: ${playerId} / 현재 턴: ${currentPlayer}`;
}

// 오목판 그리기
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

// 돌 그리기
function drawStone(x, y, player, isLastMove) {
  const colors = ['black', 'red', 'green', 'deepskyblue', 'purple', 'orange'];
  ctx.beginPath();
  ctx.arc(
    x * cellSize + cellSize / 2,
    y * cellSize + cellSize / 2,
    cellSize / 2 - 5,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = colors[(player - 1) % colors.length];
  ctx.fill();

  if (isLastMove) {
    ctx.beginPath();
    ctx.arc(
      x * cellSize + cellSize / 2,
      y * cellSize + cellSize / 2,
      5,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'white';
    ctx.fill();
  }
}

// 클릭 → 돌 놓기 요청
canvas.addEventListener('click', (e) => {
  if (currentPlayer !== playerId) return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);

  if (board[y][x] !== 0) return;

  ws.send(JSON.stringify({
    type: 'place',
    x,
    y,
    playerId,
    roomId: currentRoomId
  }));
});
