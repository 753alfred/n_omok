// 오목판 크기 및 기본 설정
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const size = 15;  // 15x15 오목판
const cellSize = canvas.width / size;
const board = Array.from({ length: size }, () => Array(size).fill(0)); // 0: 빈칸, 1~n: 플레이어 번호

const numPlayers = 3; // 플레이어 수 (n명)
let currentPlayer = 1; // 현재 플레이어 (1번부터 시작)

const turnDisplay = document.getElementById('turn');

// 오목판 그리기 함수
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000';
  for (let i = 0; i < size; i++) {
    // 가로 선
    ctx.beginPath();
    ctx.moveTo(cellSize / 2, i * cellSize + cellSize / 2);
    ctx.lineTo(canvas.width - cellSize / 2, i * cellSize + cellSize / 2);
    ctx.stroke();
    // 세로 선
    ctx.beginPath();
    ctx.moveTo(i * cellSize + cellSize / 2, cellSize / 2);
    ctx.lineTo(i * cellSize + cellSize / 2, canvas.height - cellSize / 2);
    ctx.stroke();
  }

  // 돌 그리기
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== 0) {
        drawStone(x, y, board[y][x]);
      }
    }
  }
}

// 돌 그리기 함수
function drawStone(x, y, player) {
  const colors = ['black', 'white', 'red', 'blue', 'green', 'purple'];
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
}

// 클릭 시 돌 놓기
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);

  // 이미 돌이 놓여있으면 무시
  if (board[y][x] !== 0) return;

  // 현재 플레이어의 돌 놓기
  board[y][x] = currentPlayer;
  drawBoard();

  // 승리 체크
  if (checkWin(x, y, currentPlayer)) {
    alert(`플레이어 ${currentPlayer} 승리!`);
    canvas.removeEventListener('click', arguments.callee); // 게임 종료
    return;
  }

  // 다음 플레이어로 전환
  currentPlayer = (currentPlayer % numPlayers) + 1;
  turnDisplay.textContent = `현재 턴: 플레이어 ${currentPlayer}`;
});

// 승리 조건 체크 함수 (연속 5개 돌 확인)
function checkWin(x, y, player) {
  const directions = [
    [1, 0], // 가로
    [0, 1], // 세로
    [1, 1], // 대각 ↘
    [1, -1] // 대각 ↗
  ];

  for (let [dx, dy] of directions) {
    let count = 1;

    // 현재 돌 기준으로 양쪽 방향 탐색
    for (let dir = -1; dir <= 1; dir += 2) {
      let nx = x + dx * dir;
      let ny = y + dy * dir;

      while (
        nx >= 0 && nx < size &&
        ny >= 0 && ny < size &&
        board[ny][nx] === player
      ) {
        count++;
        nx += dx * dir;
        ny += dy * dir;
      }
    }

    // 5개 이상 연결되면 승리
    if (count >= 5) return true;
  }

  return false;
}

drawBoard(); // 초기 오목판 그리기
