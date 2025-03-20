// 오목판 크기 및 기본 설정
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const size = 15; // 15x15 오목판
const cellSize = canvas.width / size;
let board = Array.from({ length: size }, () => Array(size).fill(0)); // 0: 빈칸, 1~n: 플레이어 번호

let playerId = 0;            // 내 플레이어 번호 (서버에서 할당)
let currentPlayer = 1;       // 현재 턴인 플레이어 번호
let lastMoves = {};          // { 플레이어 번호: [x, y] } 마지막 위치 저장

const turnDisplay = document.getElementById('turn');

// WebSocket 서버 주소 (Render 배포 주소 입력 필요)
// 예시: wss://omok-server.onrender.com
const ws = new WebSocket('wss://n-omok-server.onrender.com');  // 실제 주소로 수정

// 서버로부터 메시지를 받았을 때 처리
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'init') {
    // 서버에서 내 번호, 오목판 정보, 현재 턴 수신
    playerId = data.playerId;
    board = data.board;
    currentPlayer = data.currentPlayer;

    drawBoard();
    turnDisplay.textContent = `내 번호: ${playerId} / 현재 턴: ${currentPlayer}`;
  } else if (data.type === 'update') {
    // 누군가 돌을 놓았을 때 전체 클라이언트에게 전달됨
    board[data.y][data.x] = data.playerId;
    lastMoves[data.playerId] = [data.x, data.y];  // 마지막 위치 기록
    currentPlayer = data.currentPlayer;

    drawBoard();
    turnDisplay.textContent = `내 번호: ${playerId} / 현재 턴: ${currentPlayer}`;
  }
};

// 오목판 그리기 함수
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000';

  // 바둑판 선 그리기
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

  // 모든 돌 그리기
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

// 돌 그리기 함수
function drawStone(x, y, player, isLastMove) {
  // 눈에 잘 띄는 색 순서 배열
  const colors = [
    'black',             // 플레이어 1
    'red',               // 플레이어 2
    'green',             // 플레이어 3
    'deepskyblue',       // 플레이어 4
    'purple',            // 플레이어 5
    'orange',            // 플레이어 6
    'brown',             // 플레이어 7
    'darkcyan'           // 플레이어 8
    // 추가 가능
  ];

  ctx.beginPath();
  ctx.arc(
    x * cellSize + cellSize / 2,
    y * cellSize + cellSize / 2,
    cellSize / 2 - 5,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = colors[(player - 1) % colors.length]; // 색 순환 사용
  ctx.fill();

  // 마지막 둔 돌이면 흰 점 표시
  if (isLastMove) {
    ctx.beginPath();
    ctx.arc(
      x * cellSize + cellSize / 2,
      y * cellSize + cellSize / 2,
      5, // 흰 점 크기
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'white';
    ctx.fill();
  }
}

// 클릭 시 서버에 돌 놓기 요청
canvas.addEventListener('click', (e) => {
  if (currentPlayer !== playerId) return; // 내 턴 아니면 무시

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);

  if (board[y][x] !== 0) return; // 이미 놓은 곳 무시

  // 서버에 돌 놓기 요청 보내기
  ws.send(JSON.stringify({
    type: 'place',
    x,
    y,
    playerId
  }));
});
