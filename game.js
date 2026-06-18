const WORDS = [
  'SWAP','POLLING','MEMORIA','PAGINACAO','PROCESSO',
  'BARRAMENTO','BUFFER','DRIVER',
  'FIRMWARE','PERIFERICO','CHIPSET','SOFTWARE','REDE','HARDWARE','DISPOSITIVO'
];
const TOTAL = WORDS.length;
const ROWS = 22, COLS = 24;

let grid = [], placed = [], selecting = false, startCell = null, currentCells = [];
let foundWords = [], foundCells = new Set();

function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function buildGrid() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
  placed = [];

  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];

  // Sort longest words first for better placement
  const sorted = [...WORDS].sort((a, b) => b.length - a.length);

  for (const w of sorted) {
    let ok = false, tries = 0;
    while (!ok && tries < 600) {
      tries++;
      const [dr, dc] = dirs[randInt(0, dirs.length - 1)];
      let r = randInt(0, ROWS - 1), c = randInt(0, COLS - 1);
      const er = r + dr * (w.length - 1);
      const ec = c + dc * (w.length - 1);
      if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
      let fits = true;
      for (let i = 0; i < w.length; i++) {
        const ch = grid[r + dr * i][c + dc * i];
        if (ch !== '' && ch !== w[i]) { fits = false; break; }
      }
      if (!fits) continue;
      const cells = [];
      for (let i = 0; i < w.length; i++) {
        grid[r + dr * i][c + dc * i] = w[i];
        cells.push([r + dr * i, c + dc * i]);
      }
      placed.push({ word: w, cells });
      ok = true;
    }
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (!grid[r][c]) grid[r][c] = letters[randInt(0, 25)];
}

function renderGrid() {
  const el = document.getElementById('grid');
  el.style.gridTemplateColumns = `repeat(${COLS}, 30px)`;
  el.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = grid[r][c];
      cell.dataset.r = r;
      cell.dataset.c = c;
      if (foundCells.has(`${r},${c}`)) cell.classList.add('found-cell');
      cell.addEventListener('mousedown', onDown);
      cell.addEventListener('mouseenter', onEnter);
      el.appendChild(cell);
    }
  }
  document.addEventListener('mouseup', onUp);
  el.addEventListener('touchstart', onTouchStart, { passive: false });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd);
}

function getLine(r1, c1, r2, c2) {
  const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
  const cells = [];
  let r = r1, c = c1;
  while (true) {
    cells.push([r, c]);
    if (r === r2 && c === c2) break;
    r += dr; c += dc;
  }
  return cells;
}

function isAxisAligned(r1, c1, r2, c2) { return r1 === r2 || c1 === c2; }

function highlightCells(cells, add) {
  cells.forEach(([r, c]) => {
    const el = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (!el) return;
    if (add) {
      el.classList.add('selecting');
    } else {
      el.classList.remove('selecting');
      if (foundCells.has(`${r},${c}`)) el.classList.add('found-cell');
    }
  });
}

function onDown(e) {
  selecting = true;
  const r = +e.currentTarget.dataset.r, c = +e.currentTarget.dataset.c;
  startCell = [r, c];
  currentCells = [[r, c]];
  highlightCells(currentCells, true);
}

function onEnter(e) {
  if (!selecting || !startCell) return;
  const r = +e.currentTarget.dataset.r, c = +e.currentTarget.dataset.c;
  highlightCells(currentCells, false);
  if (isAxisAligned(startCell[0], startCell[1], r, c)) {
    currentCells = getLine(startCell[0], startCell[1], r, c);
  } else {
    currentCells = [startCell];
  }
  highlightCells(currentCells, true);
}

function onUp() {
  if (!selecting) return;
  selecting = false;
  checkSelection();
  highlightCells(currentCells, false);
  currentCells = [];
  startCell = null;
}

function onTouchStart(e) {
  const t = e.touches[0];
  const el = document.elementFromPoint(t.clientX, t.clientY);
  if (el && el.classList.contains('cell')) onDown({ currentTarget: el });
}

function onTouchMove(e) {
  e.preventDefault();
  const t = e.touches[0];
  const el = document.elementFromPoint(t.clientX, t.clientY);
  if (el && el.classList.contains('cell')) onEnter({ currentTarget: el });
}

function onTouchEnd() { onUp(); }

function checkSelection() {
  const word = currentCells.map(([r, c]) => grid[r][c]).join('');
  const wordRev = word.split('').reverse().join('');

  for (const p of placed) {
    if (foundWords.includes(p.word)) continue;
    if (p.word === word || p.word === wordRev) {
      foundWords.push(p.word);
      p.cells.forEach(([r, c]) => foundCells.add(`${r},${c}`));
      p.cells.forEach(([r, c]) => {
        const el = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
        if (el) el.classList.add('found-cell');
      });
      updateBadges();
      showMsg(`✓ "${p.word}" encontrado!`, true);

      if (foundWords.length === TOTAL) {
        document.getElementById('found-count').textContent = `${TOTAL} / ${TOTAL} encontradas`;
        showMsg('🎉 Parabéns! Todas as palavras encontradas!', true);
        document.getElementById('finish-banner').classList.add('visible');
      }
      return;
    }
  }
  if (word.length > 1) showMsg('Palavra não encontrada.', false);
}

function updateBadges() {
  document.getElementById('found-count').textContent = `${foundWords.length} / ${TOTAL} encontradas`;
  document.querySelectorAll('.word-badge').forEach(b => {
    if (foundWords.includes(b.dataset.word)) b.classList.add('found');
  });
}

function showMsg(txt, good) {
  const el = document.getElementById('msg-area');
  el.textContent = txt;
  el.className = good ? 'good' : 'bad';
  clearTimeout(el._t);
  el._t = setTimeout(() => { if (!foundWords.length === TOTAL) { el.textContent = ''; el.className = ''; } }, 3000);
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(name).classList.add('active');
}

document.getElementById('btn-play').addEventListener('click', () => {
  buildGrid();
  foundWords = [];
  foundCells = new Set();

  const wl = document.getElementById('word-list');
  wl.innerHTML = '';
  WORDS.forEach(w => {
    const b = document.createElement('span');
    b.className = 'word-badge';
    b.textContent = w;
    b.dataset.word = w;
    wl.appendChild(b);
  });

  renderGrid();
  document.getElementById('found-count').textContent = `0 / ${TOTAL} encontradas`;
  document.getElementById('msg-area').textContent = '';
  document.getElementById('finish-banner').classList.remove('visible');
  showScreen('screen-game');
});

document.getElementById('btn-restart').addEventListener('click', () => {
  showScreen('screen-start');
});
