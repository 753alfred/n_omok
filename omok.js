// 화면 요소 참조
const roomListScreen = document.getElementById('room-list-screen');
const gameScreen = document.getElementById('game-screen');
const roomListElement = document.getElementById('room-list');
const turnDisplay = document.getElementById('turn');
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const size = 15;
const cellSize = canvas.width / size;

// 방 관련
let currentRoomId = null;
let playerId = 0;
let currentPlayer = 1;
let board = Array.from({ length: size }, () => Array(size).fill(0));
let lastMoves = {};  // 마지막 둔 위치 저장

// 서버 연결 (방 기능 지원 주소로 수정 필요)
const ws = new WebSocket('wss://n-omok-server.onrender.com');

// 서버에서 메시지 수신
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'roomList') {
    // 방 목록 표시
    updateRoomList(data.rooms);
  } else if (data.type === 'init') {
    // 게임 초기화
    playerId = data.playerId;
    board = data.board;
    currentPlayer = data.currentPlayer;
    switchToGameScreen();
    drawBoard();
    updateTurnText();
  } else if (data.type === 'update') {
    // 돌 놓기 업데이트
    board[data.y][data.x] = data.playerId;
    lastMoves[data.playerId] = [data.x, data.y];
    currentPlayer = data.currentPlayer;
    drawBoard();
    updateTurnText();
  }
};

// 방 리스트 화면으로 전환
function updateRoomList(rooms) {
  roomListElement.innerHTML = '';
  rooms.forEach(roomId => {
    const li = document.createElement('li');
    li.textContent = `방 ID: ${roomId}`;
    const joinBtn = document.createElement('button');
    joinBtn.textContent = '참여';
    joinBtn.onclick = () => joinRoom(roomId);
    li.appendChild(joinBtn);
    roomListElement.appendChild(li);
  });
}

// 방 만들기 요청
function createRoom() {
  ws.send(JSON.stringify({ type: 'createRoom' }));
}

// 방 참여 요청
function joinRoom(roomId) {
  ws.send(JSON.stringify({ type: 'joinRoom', roomId }));
  currentRoomId = roomId;
}

// 게임 화면으로 전환
function switchToGameScreen() {
  roomListScreen.style.display = 'none';
  gameScreen.style.display = 'block';
}

// 턴 표시 갱신
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

// 돌 그리기 (색상 + 흰 점 표시)
function drawStone(x, y, player, isLastMove) {
  const colors = [
    'black', 'red', 'green', 'deepskyblue', 'purple', 'orange', 'brown', 'darkcyan'
  ];

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

// 클릭 시 서버에 돌 놓기 요청
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
