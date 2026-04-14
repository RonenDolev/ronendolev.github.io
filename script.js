
const WORD_SEARCH_SIZE = 15;
const CROSSWORD_SIZE = 19;
const HEBREW_ALPHABET = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];
const WORD_SEARCH_DIRECTIONS = [
  { row: 0, col: 1 }, { row: 0, col: -1 }, { row: 1, col: 0 }, { row: -1, col: 0 },
  { row: 1, col: 1 }, { row: 1, col: -1 }, { row: -1, col: 1 }, { row: -1, col: -1 }
];
const CROSSWORD_DIRECTIONS = [
  { key: 'across', row: 0, col: -1 },   // right to left
  { key: 'down', row: 1, col: 0 }       // top to bottom
];
const SECRET_SYMBOL_POOL = ['★','●','▲','■','◆','♥','♣','♠','☀','☁','☂','☘','✿','✦','☾','☺','⚑','⚙','⌂','✈','♫','☕','⚓','✸','✪','✚','✖','☯','☮','✽','⬟','⬢','⬣'];
const OPTION_LABELS = ['א', 'ב', 'ג', 'ד'];

const state = {
  activeSectionId: 'homeSection',
  wordSearch: { title: '', words: [], grid: [], placements: [], showSolution: false, foundWords: new Set(), selectedCells: [], foundCellKeys: new Set() },
  crossword: { title: '', entries: [], puzzle: null, showSolution: false },
  secretCode: { title: '', entries: [], symbolMap: new Map(), showSolution: false },
  sequence: { title: '', exercises: [], showSolution: false },
  whoAmI: { title: '', items: [], showSolution: false },
  mathQuiz: { title: '', items: [], showSolution: false },
  geoQuiz: { title: '', items: [], showSolution: false }
};

const elements = {};
document.querySelectorAll('[id]').forEach((node) => { elements[node.id] = node; });

function initSelect(select, from, to, selected) {
  for (let value = from; value <= to; value += 1) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = String(value);
    if (value === selected) option.selected = true;
    select.appendChild(option);
  }
}
initSelect(elements.wordSearchCount, 8, 20, 12);
initSelect(elements.crosswordCount, 6, 20, 12);
initSelect(elements.secretCodeCount, 4, 14, 8);
initSelect(elements.sequenceCount, 6, 14, 10);
initSelect(elements.whoAmICount, 4, 12, 8);
initSelect(elements.mathQuizCount, 4, 12, 8);
initSelect(elements.geoQuizCount, 4, 12, 8);

document.querySelectorAll('.nav-btn').forEach((button) => {
  button.addEventListener('click', () => switchSection(button.dataset.target));
});
document.querySelectorAll('.go-btn').forEach((button) => {
  button.addEventListener('click', () => switchSection(button.dataset.target));
});

function switchSection(targetId) {
  state.activeSectionId = targetId;
  document.querySelectorAll('.content-section').forEach((section) => {
    section.classList.toggle('hidden-section', section.id !== targetId);
  });
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.target === targetId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setMessage(node, message, kind = 'info') {
  node.textContent = message || '';
  node.style.color = kind === 'error' ? '#dc2626' : kind === 'success' ? '#15803d' : '#1d4ed8';
}

function resolveApiBase() {
  const runtimeBase =
    window.WORDGAMES_API_BASE ||
    localStorage.getItem('wordgames_api_base') ||
    '';

  return String(runtimeBase || '').trim().replace(/\/+$/, '');
}

function buildApiUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;

  const apiBase = resolveApiBase();
  if (!apiBase) return raw;

  if (raw.startsWith('/')) return `${apiBase}${raw}`;
  return `${apiBase}/${raw}`;
}

async function fetchJson(url, payload) {
  const finalUrl = buildApiUrl(url);

  const response = await fetch(finalUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      (resolveApiBase()
        ? 'השרת החיצוני לא החזיר תשובה תקינה.'
        : 'פונקציית AI אינה זמינה כרגע באתר הסטטי. יש להגדיר backend ציבורי.')
    );
  }

  return data;
}

function normalizeHebrewLetters(value) {
  return String(value || '').replace(/[ךםןףץ]/g, (char) => ({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }[char] || char));
}
function cleanHebrewWord(value) {
  return normalizeHebrewLetters(value).replace(/[^א-ת]/g, '').trim();
}
function shuffle(array) {
  const clone = array.slice();
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}
function randomHebrewLetter() {
  return HEBREW_ALPHABET[Math.floor(Math.random() * HEBREW_ALPHABET.length)];
}
function printSection(sectionId) {
  document.body.setAttribute('data-print-target', sectionId);
  window.print();
  setTimeout(() => document.body.setAttribute('data-print-target', ''), 500);
}

function buildWordSearch(words) {
  const grid = Array.from({ length: WORD_SEARCH_SIZE }, () => Array(WORD_SEARCH_SIZE).fill(''));
  const placements = [];
  const normalizedWords = shuffle(words.map(cleanHebrewWord).filter(Boolean).filter((value, idx, arr) => arr.indexOf(value) === idx && value.length <= WORD_SEARCH_SIZE)).sort((a,b) => b.length - a.length);
  for (const word of normalizedWords) {
    let placed = false;
    for (let attempt = 0; attempt < 900 && !placed; attempt += 1) {
      const direction = WORD_SEARCH_DIRECTIONS[Math.floor(Math.random() * WORD_SEARCH_DIRECTIONS.length)];
      const startRow = Math.floor(Math.random() * WORD_SEARCH_SIZE);
      const startCol = Math.floor(Math.random() * WORD_SEARCH_SIZE);
      if (!canPlaceWordSearchWord(grid, word, startRow, startCol, direction)) continue;
      const cells = [];
      for (let index = 0; index < word.length; index += 1) {
        const row = startRow + direction.row * index;
        const col = startCol + direction.col * index;
        grid[row][col] = word[index];
        cells.push({ row, col });
      }
      placements.push({ word, cells });
      placed = true;
    }
  }
  for (let row = 0; row < WORD_SEARCH_SIZE; row += 1) {
    for (let col = 0; col < WORD_SEARCH_SIZE; col += 1) {
      if (!grid[row][col]) grid[row][col] = randomHebrewLetter();
    }
  }
  return { grid, placements, words: placements.map((entry) => entry.word) };
}
function canPlaceWordSearchWord(grid, word, startRow, startCol, direction) {
  for (let index = 0; index < word.length; index += 1) {
    const row = startRow + direction.row * index;
    const col = startCol + direction.col * index;
    if (row < 0 || row >= WORD_SEARCH_SIZE || col < 0 || col >= WORD_SEARCH_SIZE) return false;
    const existing = grid[row][col];
    if (existing && existing !== word[index]) return false;
  }
  return true;
}
function isStraightAdjacentSelection(cells) {
  if (cells.length <= 1) return true;
  const deltas = [];
  for (let i = 1; i < cells.length; i += 1) {
    const dr = cells[i].row - cells[i - 1].row;
    const dc = cells[i].col - cells[i - 1].col;
    if (Math.abs(dr) > 1 || Math.abs(dc) > 1 || (dr === 0 && dc === 0)) return false;
    deltas.push(`${dr}:${dc}`);
  }
  return new Set(deltas).size <= 1;
}
function tryCommitWordSearchSelection() {
  const selected = state.wordSearch.selectedCells || [];
  if (!selected.length) return false;
  const forward = selected.map((cell) => state.wordSearch.grid[cell.row]?.[cell.col] || '').join('');
  const backward = selected.slice().reverse().map((cell) => state.wordSearch.grid[cell.row]?.[cell.col] || '').join('');
  const match = state.wordSearch.placements.find((placement) => !state.wordSearch.foundWords.has(placement.word) && (placement.word === forward || placement.word === backward));
  if (!match) return false;
  state.wordSearch.foundWords.add(match.word);
  match.cells.forEach((cell) => state.wordSearch.foundCellKeys.add(`${cell.row}:${cell.col}`));
  state.wordSearch.selectedCells = [];
  return true;
}
function handleWordSearchCellClick(row, col) {
  const selected = state.wordSearch.selectedCells || [];
  const key = `${row}:${col}`;
  if (selected.some((cell) => `${cell.row}:${cell.col}` === key)) {
    state.wordSearch.selectedCells = selected.filter((cell, idx) => idx !== selected.length - 1 || `${cell.row}:${cell.col}` !== key);
    renderWordSearch();
    return;
  }
  const next = selected.concat([{ row, col }]);
  if (!isStraightAdjacentSelection(next)) {
    state.wordSearch.selectedCells = [{ row, col }];
  } else {
    state.wordSearch.selectedCells = next;
  }
  if (tryCommitWordSearchSelection()) {
    setMessage(elements.wordSearchMessage, 'כל הכבוד! מילה נמצאה.', 'success');
  }
  renderWordSearch();
}
function renderWordSearch() {
  const { title, grid, placements, words, showSolution, foundWords, selectedCells, foundCellKeys } = state.wordSearch;
  elements.wordSearchRenderTitle.textContent = title || 'תפזורת';
  elements.wordSearchPrintTitle.textContent = title || 'תפזורת';
  elements.wordSearchGrid.innerHTML = '';
  const solutionSet = new Set();
  if (showSolution) {
    placements.forEach((placement) => placement.cells.forEach((cell) => solutionSet.add(`${cell.row}:${cell.col}`)));
  }
  const activeSet = new Set((selectedCells || []).map((cell) => `${cell.row}:${cell.col}`));
  grid.forEach((row, rowIndex) => {
    row.forEach((char, colIndex) => {
      const cell = document.createElement('div');
      cell.className = 'word-cell';
      const key = `${rowIndex}:${colIndex}`;
      if (solutionSet.has(key)) cell.classList.add('solution');
      if ((foundCellKeys || new Set()).has(key)) cell.classList.add('found');
      if (activeSet.has(key)) cell.classList.add('active');
      cell.textContent = char;
      cell.addEventListener('click', () => handleWordSearchCellClick(rowIndex, colIndex));
      elements.wordSearchGrid.appendChild(cell);
    });
  });
  elements.wordSearchWordBank.innerHTML = '';
  words.forEach((word) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'word-chip';
    if (foundWords.has(word)) chip.classList.add('found');
    chip.textContent = word;
    chip.addEventListener('click', () => {
      if (foundWords.has(word)) foundWords.delete(word); else foundWords.add(word);
      renderWordSearch();
    });
    elements.wordSearchWordBank.appendChild(chip);
  });
}
elements.generateWordSearchAiBtn.addEventListener('click', async () => {
  try {
    setMessage(elements.wordSearchMessage, 'יוצר מילים…');
    const payload = {
      topic: elements.wordSearchTopic.value.trim(),
      count: Number(elements.wordSearchCount.value),
      ageGroup: elements.wordSearchAge.value
    };
    const data = await fetchJson('/api/wordsearch-topic', payload);
    elements.wordSearchWords.value = (data.words || []).join('\n');
    if (!elements.wordSearchTitle.value.trim()) elements.wordSearchTitle.value = data.title || `תפזורת ${payload.topic}`;
    setMessage(elements.wordSearchMessage, `נוצרו ${data.words.length} מילים.`, 'success');
  } catch (error) {
    setMessage(elements.wordSearchMessage, error.message, 'error');
  }
});
elements.buildWordSearchBtn.addEventListener('click', () => {
  const manualWords = elements.wordSearchWords.value.split(/\r?\n/).map(cleanHebrewWord).filter(Boolean);
  if (!manualWords.length) return setMessage(elements.wordSearchMessage, 'יש להזין מילים או ליצור בעזרת AI.', 'error');
  const puzzle = buildWordSearch(manualWords);
  state.wordSearch.title = elements.wordSearchTitle.value.trim() || 'תפזורת';
  state.wordSearch.words = puzzle.words;
  state.wordSearch.grid = puzzle.grid;
  state.wordSearch.placements = puzzle.placements;
  state.wordSearch.showSolution = false;
  state.wordSearch.foundWords = new Set();
  state.wordSearch.selectedCells = [];
  state.wordSearch.foundCellKeys = new Set();
  renderWordSearch();
  setMessage(elements.wordSearchMessage, puzzle.words.length === manualWords.length ? 'התפזורת נוצרה בהצלחה.' : `התפזורת נוצרה, אך שובצו ${puzzle.words.length} מתוך ${manualWords.length} מילים.`, puzzle.words.length === manualWords.length ? 'success' : 'info');
});
elements.toggleWordSearchBtn.addEventListener('click', () => {
  state.wordSearch.showSolution = !state.wordSearch.showSolution;
  elements.toggleWordSearchBtn.textContent = state.wordSearch.showSolution ? 'הסתר פתרון' : 'הצג פתרון';
  renderWordSearch();
});
elements.printWordSearchBtn.addEventListener('click', () => printSection('wordSearchSection'));

// Crossword
function canPlaceCrosswordWord(grid, word, row, col, direction, requireIntersection) {
  let intersections = 0;
  for (let index = 0; index < word.length; index += 1) {
    const r = row + direction.row * index;
    const c = col + direction.col * index;
    if (r < 0 || r >= CROSSWORD_SIZE || c < 0 || c >= CROSSWORD_SIZE) return false;
    const existing = grid[r][c];
    if (existing && existing !== word[index]) return false;
    if (existing === word[index]) intersections += 1;
    if (direction.key === 'across') {
      if (r - 1 >= 0 && grid[r - 1][c] && grid[r][c] !== word[index]) return false;
      if (r + 1 < CROSSWORD_SIZE && grid[r + 1][c] && grid[r][c] !== word[index]) return false;
    } else {
      if (c - 1 >= 0 && grid[r][c - 1] && grid[r][c] !== word[index]) return false;
      if (c + 1 < CROSSWORD_SIZE && grid[r][c + 1] && grid[r][c] !== word[index]) return false;
    }
  }
  const beforeRow = row - direction.row;
  const beforeCol = col - direction.col;
  const afterRow = row + direction.row * word.length;
  const afterCol = col + direction.col * word.length;
  if (beforeRow >= 0 && beforeRow < CROSSWORD_SIZE && beforeCol >= 0 && beforeCol < CROSSWORD_SIZE && grid[beforeRow][beforeCol]) return false;
  if (afterRow >= 0 && afterRow < CROSSWORD_SIZE && afterCol >= 0 && afterCol < CROSSWORD_SIZE && grid[afterRow][afterCol]) return false;
  if (requireIntersection && intersections === 0) return false;
  return true;
}
function placeCrosswordWord(grid, word, row, col, direction, clue) {
  const cells = [];
  for (let index = 0; index < word.length; index += 1) {
    const r = row + direction.row * index;
    const c = col + direction.col * index;
    grid[r][c] = word[index];
    cells.push({ row: r, col: c });
  }
  return { word, clue, row, col, direction: direction.key, cells };
}
function trimCrossword(grid, entries) {
  let minRow = CROSSWORD_SIZE, maxRow = 0, minCol = CROSSWORD_SIZE, maxCol = 0;
  entries.forEach((entry) => entry.cells.forEach((cell) => {
    minRow = Math.min(minRow, cell.row); maxRow = Math.max(maxRow, cell.row);
    minCol = Math.min(minCol, cell.col); maxCol = Math.max(maxCol, cell.col);
  }));
  const trimmed = [];
  for (let row = minRow; row <= maxRow; row += 1) {
    const line = [];
    for (let col = minCol; col <= maxCol; col += 1) line.push(grid[row][col] || '');
    trimmed.push(line);
  }
  const translatedEntries = entries.map((entry) => ({
    ...entry,
    row: entry.row - minRow,
    col: entry.col - minCol,
    cells: entry.cells.map((cell) => ({ row: cell.row - minRow, col: cell.col - minCol }))
  }));
  return { grid: trimmed, entries: translatedEntries };
}
function buildCrossword(entries, targetCount = Number.POSITIVE_INFINITY) {
  const normalized = shuffle(entries.map((entry) => ({
    word: cleanHebrewWord(entry.word),
    clue: String(entry.clue || '').trim()
  })).filter((entry) => entry.word.length >= 2 && entry.word.length <= CROSSWORD_SIZE))
    .sort((a, b) => b.word.length - a.word.length)
    .slice(0, 20);
  if (!normalized.length) return null;

  let best = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const shuffled = shuffle(normalized);
    const grid = Array.from({ length: CROSSWORD_SIZE }, () => Array(CROSSWORD_SIZE).fill(''));
    const placed = [];
    const first = shuffled[0];
    const firstRow = Math.floor(CROSSWORD_SIZE / 2);
    const firstCol = Math.floor(CROSSWORD_SIZE / 2) + Math.floor(first.word.length / 2);
    placed.push(placeCrosswordWord(grid, first.word, firstRow, firstCol, CROSSWORD_DIRECTIONS[0], first.clue));

    for (const entry of shuffled.slice(1)) {
      let done = false;
      for (let row = 0; row < CROSSWORD_SIZE && !done; row += 1) {
        for (let col = 0; col < CROSSWORD_SIZE && !done; col += 1) {
          for (const direction of shuffle(CROSSWORD_DIRECTIONS)) {
            if (!canPlaceCrosswordWord(grid, entry.word, row, col, direction, true)) continue;
            placed.push(placeCrosswordWord(grid, entry.word, row, col, direction, entry.clue));
            if (placed.length >= targetCount) {
              done = true;
              break;
            }
            done = true;
            break;
          }
        }
      }
    }
    if (!best || placed.length > best.length) best = { placed, grid };
    if (best.length >= Math.min(8, normalized.length)) break;
  }
  if (!best || !best.placed.length) return null;
  const trimmed = trimCrossword(best.grid, best.placed);

  trimmed.entries = trimmed.entries
    .filter((entry) => entry && entry.word && entry.clue && (entry.direction === 'across' || entry.direction === 'down'))
    .map((entry) => ({
      ...entry,
      startCol: entry.direction === 'across'
        ? (
            Array.isArray(entry.cells) && entry.cells.length
              ? Math.max(...entry.cells.map((cell) => cell.col))
              : entry.col + entry.word.length - 1
          )
        : entry.col
    }));

  const startMap = new Map();
  trimmed.entries.forEach((entry) => {
    const key = `${entry.row}:${entry.startCol}`;
    if (!startMap.has(key)) startMap.set(key, []);
    startMap.get(key).push(entry);
  });

  const numbers = new Map();
  let current = 1;

  for (let row = 0; row < trimmed.grid.length; row += 1) {
    for (let col = trimmed.grid[0].length - 1; col >= 0; col -= 1) {
      const key = `${row}:${col}`;
      if (startMap.has(key) && !numbers.has(key)) {
        numbers.set(key, current++);
      }
    }
  }

  trimmed.entries.forEach((entry) => {
    entry.number = numbers.get(`${entry.row}:${entry.startCol}`);
  });

  return { grid: trimmed.grid, entries: trimmed.entries, rows: trimmed.grid.length, cols: trimmed.grid[0].length };
}
function normalizeCrosswordEntries(entries) {
  const seen = new Set();
  return (entries || [])
    .map((entry) => ({
      word: cleanHebrewWord(entry.word),
      clue: String(entry.clue || '').trim()
    }))
    .filter((entry) => entry.word.length >= 2 && entry.word.length <= CROSSWORD_SIZE && entry.clue)
    .filter((entry) => {
      const key = `${entry.word}::${entry.clue}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function buildBestCrosswordFromApi(payload, requestedCount, maxAttempts = 6) {
  let best = null;
  const poolCount = Math.max(requestedCount + 12, requestedCount);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const data = await fetchJson('/api/crossword-topic', { ...payload, count: poolCount });
    const entries = normalizeCrosswordEntries(data.entries || []);
    const puzzle = buildCrossword(entries, requestedCount);

    if (puzzle && (!best || puzzle.entries.length > best.puzzle.entries.length)) {
      best = { data, entries, puzzle, attempt };
    }

    if (best && best.puzzle.entries.length >= requestedCount) {
      break;
    }
  }

  if (!best || !best.puzzle) {
    throw new Error('לא ניתן היה לבנות תשחץ מהמילים שהתקבלו.');
  }

  return best;
}
function normalizeCrosswordEntries(entries) {
  const seen = new Set();
  return (entries || [])
    .map((entry) => ({
      word: cleanHebrewWord(entry.word),
      clue: String(entry.clue || '').trim()
    }))
    .filter((entry) => entry.word.length >= 2 && entry.word.length <= CROSSWORD_SIZE && entry.clue)
    .filter((entry) => {
      const key = `${entry.word}::${entry.clue}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function buildBestCrosswordFromApi(payload, requestedCount, maxAttempts = 6) {
  let best = null;
  const poolCount = Math.max(requestedCount + 12, requestedCount);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const data = await fetchJson('/api/crossword-topic', { ...payload, count: poolCount });
    const entries = normalizeCrosswordEntries(data.entries || []);
    const puzzle = buildCrossword(entries, requestedCount);

    if (puzzle && (!best || puzzle.entries.length > best.puzzle.entries.length)) {
      best = { data, entries, puzzle, attempt };
    }

    if (best && best.puzzle.entries.length >= requestedCount) {
      break;
    }
  }

  if (!best || !best.puzzle) {
    throw new Error('לא ניתן היה לבנות תשחץ מהמילים שהתקבלו.');
  }

  return best;
}
function renderCrossword() {
  const { title, puzzle, showSolution } = state.crossword;
  if (!puzzle) return;
  elements.crosswordRenderTitle.textContent = title || 'תשחץ';
  elements.crosswordPrintTitle.textContent = title || 'תשחץ';

  if (elements.toggleCrosswordBtn) {
    elements.toggleCrosswordBtn.textContent = showSolution ? 'הסתר פתרון' : 'הצג פתרון';
  }

  elements.crosswordGrid.style.gridTemplateColumns = `repeat(${puzzle.cols}, 34px)`;
  elements.crosswordGrid.innerHTML = '';
  const cellMap = new Map();
  puzzle.entries
    .filter((entry) => entry && entry.word && Number.isInteger(entry.number) && (entry.direction === 'across' || entry.direction === 'down'))
    .forEach((entry) => {
      const orderedCells =
        Array.isArray(entry.cells) && entry.cells.length
          ? [...entry.cells].sort((a, b) => (
              entry.direction === 'across'
                ? a.col - b.col
                : a.row - b.row
            ))
          : [...entry.word].map((_, index) => ({
              row: entry.row + (entry.direction === 'down' ? index : 0),
              col: entry.direction === 'across' ? (entry.startCol - (entry.word.length - 1)) + index : entry.col
            }));

            const letters = entry.direction === 'across'
        ? [...entry.word].reverse()
        : [...entry.word];

      letters.forEach((letter, index) => {
        const cell = orderedCells[index];
        if (!cell) return;

        const key = `${cell.row}:${cell.col}`;
        const existing = cellMap.get(key);
        const nextNumber = ((entry.direction === 'across' ? index === letters.length - 1 : index === 0) ? entry.number : null);

        cellMap.set(key, {
          letter: existing?.letter ?? letter,
          number: Number.isInteger(existing?.number) ? existing.number : nextNumber
        });
      });
    });

  for (let row = 0; row < puzzle.rows; row += 1) {
    for (let col = 0; col < puzzle.cols; col += 1) {
      const data = cellMap.get(`${row}:${col}`);
      const cell = document.createElement('div');
      cell.className = 'crossword-cell';
      if (!data) {
        cell.classList.add('block');
      } else {
        if (showSolution) cell.classList.add('solution-visible');
        const input = document.createElement('input');
        input.maxLength = 1;
        input.setAttribute('dir', 'rtl');
        input.setAttribute('lang', 'he');
        input.inputMode = 'text';
        input.dataset.answer = data.letter;
        input.dataset.position = `${row}:${col}`;
        input.value = showSolution ? data.letter : (input.value || '');
        input.addEventListener('input', () => {
          input.value = cleanHebrewWord(input.value).slice(0, 1);
        });
        if (showSolution) input.disabled = true; else input.disabled = false;
        cell.appendChild(input);
        if (data.number) {
          const marker = document.createElement('span');
          marker.className = 'crossword-number';
          marker.textContent = data.number;
          cell.appendChild(marker);
        }
      }
      elements.crosswordGrid.appendChild(cell);
    }
  }

  const validEntries = puzzle.entries.filter((entry) =>
    entry &&
    entry.word &&
    entry.clue &&
    Number.isInteger(entry.number) &&
    (entry.direction === 'across' || entry.direction === 'down')
  );

  const across = validEntries.filter((entry) => entry.direction === 'across').sort((a, b) => a.number - b.number);
  const down = validEntries.filter((entry) => entry.direction === 'down').sort((a, b) => a.number - b.number);
  elements.crosswordAcross.innerHTML = '';
  elements.crosswordDown.innerHTML = '';
  across.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'crossword-clue-item';
    li.setAttribute('dir', 'rtl');
    li.setAttribute('lang', 'he');
    li.innerHTML = `<span class="crossword-clue-number" dir="ltr">${entry.number}.</span><span class="crossword-clue-text" dir="rtl" lang="he">${entry.clue}</span>`;
    elements.crosswordAcross.appendChild(li);
  });
  down.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'crossword-clue-item';
    li.setAttribute('dir', 'rtl');
    li.setAttribute('lang', 'he');
    li.innerHTML = `<span class="crossword-clue-number" dir="ltr">${entry.number}.</span><span class="crossword-clue-text" dir="rtl" lang="he">${entry.clue}</span>`;
    elements.crosswordDown.appendChild(li);
  });
}
elements.generateCrosswordBtn.addEventListener('click', async () => {
  try {
    const requestedCount = Number(elements.crosswordCount.value) || 12;
    const payload = {
      topic: elements.crosswordTopic.value.trim(),
      ageGroup: elements.crosswordAge.value
    };

    setMessage(elements.crosswordMessage, `יוצר תשחץ עם יעד של ${requestedCount} מילים…`);

    const result = await buildBestCrosswordFromApi(
      payload,
      requestedCount,
      requestedCount >= 18 ? 8 : 6
    );

    const { data, entries, puzzle } = result;

    state.crossword.title = elements.crosswordTitle.value.trim() || data.title || 'תשחץ';
    state.crossword.entries = entries;
    state.crossword.puzzle = puzzle;
    state.crossword.showSolution = false;

    renderCrossword();

    const placedCount = puzzle.entries.length;
    const message = placedCount >= requestedCount
      ? `נוצר תשחץ עם ${placedCount} מילים מתוך ${requestedCount} שביקשת.`
      : `נוצר תשחץ חלקי: שובצו ${placedCount} מתוך ${requestedCount} מילים. נסה שוב או בחר נושא רחב יותר.`;

    setMessage(
      elements.crosswordMessage,
      message,
      placedCount >= requestedCount ? 'success' : 'info'
    );
  } catch (error) {
    setMessage(elements.crosswordMessage, error.message, 'error');
  }
});
elements.checkCrosswordBtn.addEventListener('click', () => {
  const inputs = elements.crosswordGrid.querySelectorAll('input[data-answer]');
  if (!inputs.length) return setMessage(elements.crosswordMessage, 'יש ליצור תשחץ קודם.', 'error');
  let correct = 0;
  let corrected = 0;
  inputs.forEach((input) => {
    const expected = input.dataset.answer;
    const ok = cleanHebrewWord(input.value) === expected;
    input.parentElement.classList.remove('correct', 'wrong');
    input.parentElement.classList.add(ok ? 'correct' : 'wrong');
    if (ok) {
      correct += 1;
    } else {
      input.value = expected;
      input.title = `התשובה הנכונה: ${expected}`;
      corrected += 1;
    }
  });
  const message = corrected > 0
    ? `נכונות ${correct} מתוך ${inputs.length} משבצות. ${corrected} משבצות שגויות מולאו בתשובה הנכונה.`
    : `נכונות ${correct} מתוך ${inputs.length} משבצות.`;
  setMessage(elements.crosswordMessage, message, correct === inputs.length ? 'success' : 'info');
});
elements.toggleCrosswordBtn.addEventListener('click', () => {
  state.crossword.showSolution = !state.crossword.showSolution;
  elements.toggleCrosswordBtn.textContent = state.crossword.showSolution ? 'הסתר פתרון' : 'הצג פתרון';
  renderCrossword();
});
elements.printCrosswordBtn.addEventListener('click', () => printSection('crosswordSection'));

function buildSecretSymbolMap(words) {
  const letters = Array.from(new Set(words.join('').split('')));
  const symbols = shuffle(SECRET_SYMBOL_POOL).slice(0, letters.length);
  const map = new Map();
  letters.forEach((letter, index) => map.set(letter, symbols[index]));
  return map;
}
function renderSecretCode() {
  const { title, entries, symbolMap, showSolution } = state.secretCode;
  elements.secretCodeRenderTitle.textContent = title || 'קוד סודי';
  elements.secretCodePrintTitle.textContent = title || 'קוד סודי';

  elements.secretCodeKey.innerHTML = '';
  elements.secretCodeKey.style.display = 'flex';
  elements.secretCodeKey.style.flexWrap = 'wrap';
  elements.secretCodeKey.style.gap = '10px';
  elements.secretCodeKey.style.direction = 'rtl';
  elements.secretCodeKey.style.justifyContent = 'flex-end';

  Array.from(symbolMap.entries()).forEach(([letter, symbol]) => {
    const chip = document.createElement('div');
    chip.className = 'key-chip';
    chip.style.display = 'inline-flex';
    chip.style.flexDirection = 'row';
    chip.style.alignItems = 'center';
    chip.style.gap = '8px';
    chip.style.direction = 'rtl';
    chip.innerHTML = `<strong>${symbol}</strong><span>${letter}</span>`;
    elements.secretCodeKey.appendChild(chip);
  });

  elements.secretCodeList.innerHTML = '';
  entries.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'quiz-item';

    const encodedSymbols = entry.word
      .split('')
      .map((char) => symbolMap.get(char) || char);

    const encodedHtml = encodedSymbols
      .map((symbol) => `<span style="display:inline-flex;min-width:18px;justify-content:center;">${symbol}</span>`)
      .join('');

    item.innerHTML = `
      <h3>חידה ${index + 1}</h3>
      <p>רמז: ${entry.clue}</p>
      <div style="display:block;width:100%;text-align:right;direction:rtl;">
        <div style="display:inline-flex;display:inline-flex;flex-direction:row;direction:rtl;justify-content:flex-start;gap:10px;unicode-bidi:plaintext;margin:8px 0 12px;">
          ${encodedHtml}
        </div>
      </div>
      <label>התשובה שלך</label>
      <input type="text" data-answer="${entry.word}" data-type="text" />
      <p class="solution-line ${showSolution ? '' : 'hidden-section'}">פתרון: ${entry.word}</p>
    `;

    elements.secretCodeList.appendChild(item);
  });
}

elements.generateSecretCodeBtn.addEventListener('click', async () => {
  try {
    setMessage(elements.secretCodeMessage, 'יוצר קוד סודי…');
    const data = await fetchJson('/api/secret-code-topic', {
      topic: elements.secretCodeTopic.value.trim(),
      count: Number(elements.secretCodeCount.value),
      difficulty: elements.secretCodeDifficulty.value
    });
    const entries = (data.entries || []).map((entry) => ({ word: cleanHebrewWord(entry.word), clue: String(entry.clue || '').trim() })).filter((entry) => entry.word);
    state.secretCode.title = elements.secretCodeTitle.value.trim() || data.title || 'קוד סודי';
    state.secretCode.entries = entries;
    state.secretCode.symbolMap = buildSecretSymbolMap(entries.map((entry) => entry.word));
    state.secretCode.showSolution = false;
    renderSecretCode();
    setMessage(elements.secretCodeMessage, `נוצרו ${entries.length} חידות קוד.`, 'success');
  } catch (error) {
    setMessage(elements.secretCodeMessage, error.message, 'error');
  }
});
elements.checkSecretCodeBtn.addEventListener('click', () => {
  checkTextInputs(elements.secretCodeList, elements.secretCodeMessage);
});
elements.toggleSecretCodeBtn.addEventListener('click', () => {
  state.secretCode.showSolution = !state.secretCode.showSolution;
  elements.toggleSecretCodeBtn.textContent = state.secretCode.showSolution ? 'הסתר פתרון' : 'הצג פתרון';
  renderSecretCode();
});
elements.printSecretCodeBtn.addEventListener('click', () => printSection('secretCodeSection'));

function renderSequence() {
  const { title, exercises, showSolution } = state.sequence;
  elements.sequenceRenderTitle.textContent = title || 'השלמת סדרה';
  elements.sequencePrintTitle.textContent = title || 'השלמת סדרה';
  elements.sequenceList.innerHTML = '';
  exercises.forEach((entry, index) => {
    const item = document.createElement('article');
    item.className = 'quiz-item';
    item.innerHTML = `<h4>סדרה ${index + 1}</h4><p><strong>${entry.series.join(' , ')} , ___</strong></p><div class="inline-options"></div><p class="solution-line ${showSolution ? '' : 'hidden-section'}"><strong>פתרון:</strong> ${entry.answer}</p>`;
    const optionsBox = item.querySelector('.inline-options');
    entry.options.forEach((option) => {
      const row = document.createElement('label');
      row.className = 'option-row';
      row.innerHTML = `<input type="radio" name="sequence_${index}" value="${option}"><span>${option}</span>`;
      optionsBox.appendChild(row);
    });
    item.dataset.answer = entry.answer;
    elements.sequenceList.appendChild(item);
  });
}
elements.generateSequenceBtn.addEventListener('click', async () => {
  try {
    setMessage(elements.sequenceMessage, 'יוצר סדרות…');
    const data = await fetchJson('/api/sequence-topic', {
      topic: elements.sequenceTopic.value.trim(),
      count: Number(elements.sequenceCount.value),
      difficulty: elements.sequenceDifficulty.value
    });
    state.sequence.title = elements.sequenceTitle.value.trim() || data.title || 'השלמת סדרה';
    state.sequence.exercises = data.exercises || [];
    state.sequence.showSolution = false;
    renderSequence();
    setMessage(elements.sequenceMessage, `נוצרו ${state.sequence.exercises.length} סדרות.`, 'success');
  } catch (error) {
    setMessage(elements.sequenceMessage, error.message, 'error');
  }
});
elements.checkSequenceBtn.addEventListener('click', () => {
  checkRadioItems(elements.sequenceList, elements.sequenceMessage);
});
elements.toggleSequenceBtn.addEventListener('click', () => {
  state.sequence.showSolution = !state.sequence.showSolution;
  elements.toggleSequenceBtn.textContent = state.sequence.showSolution ? 'הסתר פתרון' : 'הצג פתרון';
  renderSequence();
});
elements.printSequenceBtn.addEventListener('click', () => printSection('sequenceSection'));

function renderWhoAmI() {
  const { title, items, showSolution } = state.whoAmI;
  elements.whoAmIRenderTitle.textContent = title || 'מי אני';
  elements.whoAmIPrintTitle.textContent = title || 'מי אני';
  elements.whoAmIList.innerHTML = '';
  items.forEach((entry, index) => {
    const item = document.createElement('article');
    item.className = 'quiz-item';
    const clues = entry.clues.map((clue) => `<li>${clue}</li>`).join('');
    item.innerHTML = `
      <h4>חידה ${index + 1}</h4>
      <ol>${clues}</ol>
      <label>אני חושב/ת שהתשובה היא</label>
      <input type="text" data-answer="${entry.answer}" data-type="text-answer" />
      <p class="solution-line ${showSolution ? '' : 'hidden-section'}"><strong>פתרון:</strong> ${entry.answer}</p>
    `;
    elements.whoAmIList.appendChild(item);
  });
}
elements.generateWhoAmIBtn.addEventListener('click', async () => {
  try {
    setMessage(elements.whoAmIMessage, 'יוצר חידות…');
    const data = await fetchJson('/api/whoami-topic', {
      topic: elements.whoAmITopic.value.trim(),
      count: Number(elements.whoAmICount.value),
      difficulty: elements.whoAmIDifficulty.value
    });
    state.whoAmI.title = elements.whoAmITitle.value.trim() || data.title || 'מי אני';
    state.whoAmI.items = data.items || [];
    state.whoAmI.showSolution = false;
    renderWhoAmI();
    setMessage(elements.whoAmIMessage, `נוצרו ${state.whoAmI.items.length} חידות.`, 'success');
  } catch (error) {
    setMessage(elements.whoAmIMessage, error.message, 'error');
  }
});
elements.checkWhoAmIBtn.addEventListener('click', () => {
  checkTextInputs(elements.whoAmIList, elements.whoAmIMessage);
});
elements.toggleWhoAmIBtn.addEventListener('click', () => {
  state.whoAmI.showSolution = !state.whoAmI.showSolution;
  elements.toggleWhoAmIBtn.textContent = state.whoAmI.showSolution ? 'הסתר פתרון' : 'הצג פתרון';
  renderWhoAmI();
});
elements.printWhoAmIBtn.addEventListener('click', () => printSection('whoAmISection'));

function renderMathQuiz() {
  const { title, items, showSolution } = state.mathQuiz;
  elements.mathQuizRenderTitle.textContent = title || 'חשבון מילולי';
  elements.mathQuizPrintTitle.textContent = title || 'חשבון מילולי';
  elements.mathQuizList.innerHTML = '';
  items.forEach((entry, index) => {
    const item = document.createElement('article');
    item.className = 'quiz-item';
    item.innerHTML = `
      <h4>שאלה ${index + 1}</h4>
      <p>${entry.question}</p>
      <label>התשובה שלך</label>
      <input type="text" inputmode="numeric" data-answer="${entry.answer}" data-type="numeric-answer" />
      <p class="small">פעולה מרכזית: ${entry.operationLabel}</p>
      <p class="solution-line ${showSolution ? '' : 'hidden-section'}"><strong>פתרון:</strong> ${entry.answer}</p>
    `;
    elements.mathQuizList.appendChild(item);
  });
}
elements.generateMathQuizBtn.addEventListener('click', async () => {
  try {
    setMessage(elements.mathQuizMessage, 'יוצר חידון מתמטי…');
    const data = await fetchJson('/api/math-quiz-topic', {
      topic: elements.mathQuizTopic.value.trim(),
      count: Number(elements.mathQuizCount.value),
      difficulty: elements.mathQuizDifficulty.value,
      mode: elements.mathQuizMode.value
    });
    state.mathQuiz.title = elements.mathQuizTitle.value.trim() || data.title || 'חשבון מילולי';
    state.mathQuiz.items = data.items || [];
    state.mathQuiz.showSolution = false;
    renderMathQuiz();
    setMessage(elements.mathQuizMessage, `נוצרו ${state.mathQuiz.items.length} שאלות.`, 'success');
  } catch (error) {
    setMessage(elements.mathQuizMessage, error.message, 'error');
  }
});
elements.checkMathQuizBtn.addEventListener('click', () => {
  checkTextInputs(elements.mathQuizList, elements.mathQuizMessage, true);
});
elements.toggleMathQuizBtn.addEventListener('click', () => {
  state.mathQuiz.showSolution = !state.mathQuiz.showSolution;
  elements.toggleMathQuizBtn.textContent = state.mathQuiz.showSolution ? 'הסתר פתרון' : 'הצג פתרון';
  renderMathQuiz();
});
elements.printMathQuizBtn.addEventListener('click', () => printSection('mathQuizSection'));

function renderGeoQuiz() {
  const { title, items, showSolution } = state.geoQuiz;
  elements.geoQuizRenderTitle.textContent = title || 'חידון גיאוגרפיה';
  elements.geoQuizPrintTitle.textContent = title || 'חידון גיאוגרפיה';
  elements.geoQuizList.innerHTML = '';
  items.forEach((entry, index) => {
    const item = document.createElement('article');
    item.className = 'quiz-item';
    const flagBlock = entry.flagUrl
      ? `<div class="flag-question-block"><img class="flag-question-image" src="${entry.flagUrl}" alt="דגל" loading="lazy"><p class="flag-question-caption">${entry.question}</p></div>`
      : `<p>${entry.question}</p>`;
    item.innerHTML = `<h4>שאלה ${index + 1}</h4>${flagBlock}<div class="inline-options"></div><p class="solution-line ${showSolution ? '' : 'hidden-section'}"><strong>פתרון:</strong> ${entry.answer}</p>`;
    const optionsBox = item.querySelector('.inline-options');
    entry.options.forEach((option) => {
      const row = document.createElement('label');
      row.className = 'option-row';
      row.innerHTML = `<input type="radio" name="geo_${index}" value="${option}"><span>${option}</span>`;
      optionsBox.appendChild(row);
    });
    item.dataset.answer = entry.answer;
    elements.geoQuizList.appendChild(item);
  });
}
elements.generateGeoQuizBtn.addEventListener('click', async () => {
  try {
    setMessage(elements.geoQuizMessage, 'יוצר חידון גיאוגרפי…');
    const data = await fetchJson('/api/geo-quiz-topic', {
      mode: elements.geoQuizMode.value,
      region: elements.geoQuizRegion.value,
      count: Number(elements.geoQuizCount.value),
      difficulty: elements.geoQuizDifficulty.value
    });
    state.geoQuiz.title = elements.geoQuizTitle.value.trim() || data.title || 'חידון גיאוגרפיה';
    state.geoQuiz.items = data.items || [];
    state.geoQuiz.showSolution = false;
    renderGeoQuiz();
    setMessage(elements.geoQuizMessage, `נוצרו ${state.geoQuiz.items.length} שאלות.`, 'success');
  } catch (error) {
    setMessage(elements.geoQuizMessage, error.message, 'error');
  }
});
elements.checkGeoQuizBtn.addEventListener('click', () => {
  checkRadioItems(elements.geoQuizList, elements.geoQuizMessage);
});
elements.toggleGeoQuizBtn.addEventListener('click', () => {
  state.geoQuiz.showSolution = !state.geoQuiz.showSolution;
  elements.toggleGeoQuizBtn.textContent = state.geoQuiz.showSolution ? 'הסתר פתרון' : 'הצג פתרון';
  renderGeoQuiz();
});
elements.printGeoQuizBtn.addEventListener('click', () => printSection('geoQuizSection'));

function revealItemSolution(item, reveal) {
  const solution = item.querySelector('.solution-line');
  if (!solution) return;
  solution.classList.toggle('hidden-section', !reveal);
  solution.classList.toggle('auto-revealed', reveal);
}

function checkTextInputs(container, messageNode, numeric = false) {
  const inputs = container.querySelectorAll('input[data-answer]');
  if (!inputs.length) return setMessage(messageNode, 'יש ליצור פעילות קודם.', 'error');
  let correct = 0;
  let wrong = 0;
  inputs.forEach((input) => {
    const expected = String(input.dataset.answer || '').trim();
    const actual = String(input.value || '').trim();
    const ok = numeric ? Number(actual) === Number(expected) : cleanHebrewWord(actual) === cleanHebrewWord(expected);
    const item = input.closest('.quiz-item') || input.parentElement;
    item.classList.remove('correct', 'wrong');
    item.classList.add(ok ? 'correct' : 'wrong');
    revealItemSolution(item, !ok);
    if (ok) {
      correct += 1;
    } else {
      wrong += 1;
      input.title = `התשובה הנכונה: ${expected}`;
    }
  });
  const message = wrong > 0
    ? `תשובות נכונות: ${correct} מתוך ${inputs.length}. התשובה הנכונה הוצגה בכל שאלה שגויה.`
    : `תשובות נכונות: ${correct} מתוך ${inputs.length}.`;
  setMessage(messageNode, message, correct === inputs.length ? 'success' : 'info');
}
function checkRadioItems(container, messageNode) {
  const items = container.querySelectorAll('.quiz-item');
  if (!items.length) return setMessage(messageNode, 'יש ליצור פעילות קודם.', 'error');
  let correct = 0;
  let wrong = 0;
  items.forEach((item) => {
    const selected = item.querySelector('input[type="radio"]:checked');
    const ok = selected && selected.value === item.dataset.answer;
    item.classList.remove('correct', 'wrong');
    item.classList.add(ok ? 'correct' : 'wrong');
    revealItemSolution(item, !ok);
    if (ok) {
      correct += 1;
    } else {
      wrong += 1;
    }
  });
  const message = wrong > 0
    ? `תשובות נכונות: ${correct} מתוך ${items.length}. התשובה הנכונה הוצגה בכל שאלה שגויה.`
    : `תשובות נכונות: ${correct} מתוך ${items.length}.`;
  setMessage(messageNode, message, correct === items.length ? 'success' : 'info');
}

renderWordSearch();

/* ANAGRAM LOCAL MODULE */
(() => {
  const sectionId = 'anagramSection';
  const els = {
    section: document.getElementById('anagramSection'),
    title: document.getElementById('anagramTitle'),
    topic: document.getElementById('anagramTopic'),
    count: document.getElementById('anagramCount'),
    difficulty: document.getElementById('anagramDifficulty'),
    words: document.getElementById('anagramWords'),
    generateBtn: document.getElementById('generateAnagramBtn'),
    buildBtn: document.getElementById('buildAnagramBtn'),
    checkBtn: document.getElementById('checkAnagramBtn'),
    printBtn: document.getElementById('printAnagramBtn'),
    message: document.getElementById('anagramMessage'),
    list: document.getElementById('anagramList'),
    renderTitle: document.getElementById('anagramRenderTitle'),
    printTitle: document.getElementById('anagramPrintTitle')
  };

  if (!els.section) return;

  const topicBank = {
    'חיות': ['כלב', 'חתול', 'אריה', 'פיל', 'גמל', 'סוס', 'דג', 'ציפור', 'קוף', 'נמר'],
    'מאכלים': ['פיצה', 'פלאפל', 'שוקו', 'תפוח', 'בננה', 'מרק', 'עוגה', 'סלט', 'פסטה', 'לחם'],
    'צבעים': ['אדום', 'כחול', 'ירוק', 'צהוב', 'לבן', 'שחור', 'ורוד', 'סגול', 'כתום', 'חום'],
    'בית ספר': ['ילקוט', 'מחברת', 'עיפרון', 'מחק', 'ספר', 'מורה', 'כיתה', 'תלמיד', 'לוח', 'שעור'],
    'חגים': ['פסח', 'פורים', 'סוכה', 'חנוכה', 'שבת', 'מצה', 'נר', 'תחפושת', 'יין', 'תפוח'],
    'ים': ['גל', 'חול', 'חוף', 'דג', 'צדף', 'סירה', 'עוגן', 'שונית', 'מרינה', 'מצוף']
  };

  const state = {
    items: []
  };

  function cleanHebrewWord(value) {
    return String(value || '').trim().replace(/[^א-ת]/g, '');
  }

  function showMessage(text, type = 'info') {
    if (typeof setMessage === 'function') {
      setMessage(els.message, text, type);
      return;
    }

    if (!els.message) return;
    els.message.textContent = text || '';
    els.message.className = 'message';
    els.message.style.color =
      type === 'error' ? '#b91c1c' :
      type === 'success' ? '#166534' :
      '#1e3a8a';
  }

  function initCountOptions() {
    if (!els.count || els.count.options.length) return;
    for (let i = 4; i <= 20; i += 1) {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = String(i);
      if (i === 8) option.selected = true;
      els.count.appendChild(option);
    }
  }

  function updateTitles() {
    const title = (els.title && els.title.value.trim()) || 'אנגרמה';
    if (els.renderTitle) els.renderTitle.textContent = title;
    if (els.printTitle) els.printTitle.textContent = title;
  }

  function normalizeWordList(words) {
    const result = [];
    const seen = new Set();

    words
      .map(cleanHebrewWord)
      .filter(Boolean)
      .forEach((word) => {
        if (word.length < 2) return;
        if (seen.has(word)) return;
        seen.add(word);
        result.push(word);
      });

    return result;
  }

  function shuffleWord(word) {
    if (!word || word.length < 2) return word;

    let shuffled = word;
    let attempts = 0;

    while (shuffled === word && attempts < 20) {
      const chars = word.split('');
      for (let i = chars.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      shuffled = chars.join('');
      attempts += 1;
    }

    if (shuffled === word) {
      shuffled = word.slice(1) + word[0];
    }

    return shuffled;
  }

  function buildAnagramItems(words) {
    return normalizeWordList(words).map((word) => ({
      word,
      scrambled: shuffleWord(word)
    }));
  }

  function pickWordsByTopic(rawTopic, count) {
    const topic = String(rawTopic || '').trim();
    if (!topic) return [];

    const aliases = {
      'ימים': 'ים', 'אוקיינוס': 'ים', 'אוקינוס': 'ים', 'חוף': 'ים', 'חופים': 'ים', 'ים': 'ים'
    };
    const normalizedTopic = aliases[topic] || topic;

    if (topicBank[normalizedTopic]) {
      return topicBank[normalizedTopic].slice(0, count);
    }

    const matchedKey = Object.keys(topicBank).find(
      (key) => key.includes(normalizedTopic) || normalizedTopic.includes(key)
    );

    return matchedKey ? topicBank[matchedKey].slice(0, count) : [];
  }

  function renderAnagram() {
    updateTitles();

    if (!els.list) return;
    els.list.innerHTML = '';

    if (!state.items.length) {
      const empty = document.createElement('div');
      empty.className = 'quiz-item';
      empty.textContent = 'עדיין לא נבנתה אנגרמה.';
      els.list.appendChild(empty);
      return;
    }

    state.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'quiz-item';
      row.innerHTML = `
        <div class="option-row">
          <strong>${index + 1}.</strong>
          <span>סדר את האותיות: <strong>${item.scrambled}</strong></span>
        </div>
        <input type="text" data-anagram-answer="${item.word}" placeholder="כתוב את המילה הנכונה" />
        <p class="solution-line hidden-section" data-anagram-solution>פתרון: ${item.word}</p>
      `;
      els.list.appendChild(row);
    });
  }

  function openSection() {
    if (typeof switchSection === 'function') {
      switchSection(sectionId);
      return;
    }

    document.querySelectorAll('.content-section').forEach((section) => {
      section.classList.add('hidden-section');
    });

    els.section.classList.remove('hidden-section');
    els.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function ensureHomeCardButton() {
    const cards = Array.from(document.querySelectorAll('.card-grid .card'));
    const anagramCard = cards.find((card) => {
      const heading = card.querySelector('h3');
      return heading && heading.textContent.trim() === 'אנגרמה';
    });

    if (!anagramCard) return;

    anagramCard.style.cursor = 'pointer';

    if (!anagramCard.querySelector('.go-btn[data-target="anagramSection"]')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'go-btn';
      btn.dataset.target = 'anagramSection';
      btn.textContent = 'למסך אנגרמה';
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        openSection();
      });
      anagramCard.appendChild(btn);
    }

    if (!anagramCard.dataset.anagramCardBound) {
      anagramCard.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        openSection();
      });
      anagramCard.dataset.anagramCardBound = '1';
    }
  }

  function handleGenerate() {
    const topic = els.topic ? els.topic.value.trim() : '';
    const count = Number(els.count ? els.count.value : 8) || 8;
    const words = pickWordsByTopic(topic, count);

    if (!topic) {
      showMessage('כתוב נושא או הזן מילים ידניות.', 'error');
      return;
    }

    if (!words.length) {
      showMessage('כרגע נתמכים מקומית נושאים כמו: חיות, מאכלים, צבעים, בית ספר, חגים.', 'error');
      return;
    }

    if (els.words) {
      els.words.value = words.join('\r\n');
    }

    if (els.title && !els.title.value.trim()) {
      els.title.value = `אנגרמה - ${topic}`;
    }

    showMessage(`נוצרו ${words.length} מילים לאנגרמה.`, 'success');
  }

  function handleBuild() {
    const rawWords = (els.words ? els.words.value : '').split(/\r?\n/);
    const words = normalizeWordList(rawWords);

    if (!words.length) {
      showMessage('הזן מילים ידניות או צור מילים בעזרת AI.', 'error');
      return;
    }

    state.items = buildAnagramItems(words);
    renderAnagram();
    openSection();
    showMessage(`נבנו ${state.items.length} פריטי אנגרמה.`, 'success');
  }

  function handleCheck() {
    const inputs = els.list ? els.list.querySelectorAll('input[data-anagram-answer]') : [];

    if (!inputs.length) {
      showMessage('יש לבנות אנגרמה תחילה.', 'error');
      return;
    }

    let correct = 0;

    inputs.forEach((input) => {
      const expected = cleanHebrewWord(input.dataset.anagramAnswer);
      const actual = cleanHebrewWord(input.value);
      const row = input.closest('.quiz-item');
      const solution = row ? row.querySelector('[data-anagram-solution]') : null;

      if (row) {
        row.classList.remove('correct', 'wrong');
      }

      if (actual && actual === expected) {
        correct += 1;
        if (row) row.classList.add('correct');
      } else if (row) {
        row.classList.add('wrong');
      }

      if (solution) {
        solution.classList.remove('hidden-section');
      }
    });

    const total = inputs.length;
    const type = correct === total ? 'success' : 'info';
    showMessage(`ענית נכון על ${correct} מתוך ${total}.`, type);
  }

  function handlePrint() {
    updateTitles();

    if (typeof printSection === 'function') {
      printSection(sectionId);
      return;
    }

    window.print();
  }

  initCountOptions();
  updateTitles();
  renderAnagram();
  ensureHomeCardButton();

  function goHome() {
  const homeSection = document.getElementById('homeSection');
  document.querySelectorAll('.content-section').forEach((section) => {
    section.classList.add('hidden-section');
  });
  if (homeSection) {
    homeSection.classList.remove('hidden-section');
    homeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function toggleAnagramSolutions() {
  const solutions = els.list ? els.list.querySelectorAll('[data-anagram-solution]') : [];
  if (!solutions.length) {
    showMessage('יש לבנות אנגרמה תחילה.', 'error');
    return;
  }

  const shouldShow = Array.from(solutions).some((node) => node.classList.contains('hidden-section'));
  solutions.forEach((node) => {
    node.classList.toggle('hidden-section', !shouldShow);
  });

  const toggleBtn = document.getElementById('toggleAnagramSolutionBtn');
  if (toggleBtn) {
    toggleBtn.textContent = shouldShow ? 'הסתר פתרון' : 'הצג פתרון';
  }
}

function bindBackHomeButton(id) {
  const btn = document.getElementById(id);
  if (!btn || btn.dataset.boundHome === '1') return;
  btn.addEventListener('click', goHome);
  btn.dataset.boundHome = '1';
}

if (!els.section.dataset.anagramBound) {
  if (els.generateBtn) els.generateBtn.addEventListener('click', handleGenerate);
  if (els.buildBtn) els.buildBtn.addEventListener('click', handleBuild);
  if (els.checkBtn) els.checkBtn.addEventListener('click', handleCheck);
  if (els.printBtn) els.printBtn.addEventListener('click', handlePrint);

  const toggleBtn = document.getElementById('toggleAnagramSolutionBtn');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleAnagramSolutions);

  bindBackHomeButton('backHomeAnagramBtn');
  bindBackHomeButton('backHomeSudokuBtn');
  bindBackHomeButton('backHomeHumanBodyBtn');
  bindBackHomeButton('backHomeTriviaBtn');
  bindBackHomeButton('backHomeMathBingoBtn');
  bindBackHomeButton('backHomeHolidaysBtn');
  bindBackHomeButton('backHomeAnimalHomesBtn');
  bindBackHomeButton('backHomeSmartMazeBtn');

  if (els.title) els.title.addEventListener('input', updateTitles);
  els.section.dataset.anagramBound = '1';
}
})();




/* LOCAL NEW GAMES MODULES */
(() => {
  const SYMBOL_SETS = {
    numbers: ['1','2','3','4'],
    shapes: ['▲','■','●','★']
  };

  const HUMAN_BODY_BANK = [
    { question: 'איזה איבר עוזר לנו לחשוב ולזכור?', answer: 'המוח', options: ['המוח','הריאות','הקיבה','העור'] },
    { question: 'איזה איבר מזרים דם לכל הגוף?', answer: 'הלב', options: ['הלב','הכבד','השרירים','העיניים'] },
    { question: 'בעזרת מה אנחנו נושמים?', answer: 'הריאות', options: ['הריאות','העצמות','האוזניים','השיניים'] },
    { question: 'איזה איבר עוזר לנו לראות?', answer: 'העיניים', options: ['העיניים','הרגליים','הידיים','הקיבה'] },
    { question: 'איזה איבר שומע קולות?', answer: 'האוזניים', options: ['האוזניים','העור','הלב','האף'] },
    { question: 'איפה האוכל מתעכל?', answer: 'בקיבה', options: ['בקיבה','בכף היד','בברך','בעיניים'] },
    { question: 'מה מחזיק את הגוף יציב?', answer: 'העצמות', options: ['העצמות','השיער','הלשון','הציפורניים'] },
    { question: 'איזה איבר מגן על הגוף מבחוץ?', answer: 'העור', options: ['העור','הקיבה','המוח','השרירים'] },
    { question: 'איזה איבר מריח ריחות?', answer: 'האף', options: ['האף','המרפק','הירך','העין'] },
    { question: 'בעזרת מה אנחנו לועסים?', answer: 'השיניים', options: ['השיניים','האצבעות','המרפקים','העקבים'] }
  ];

  const TRIVIA_BANK = {
    mixed: [
      { question: 'איזה כוכב לכת נקרא הכוכב האדום?', answer: 'מאדים', options: ['מאדים','שבתאי','נוגה','צדק'] },
      { question: 'איזו חיה היא הגבוהה בעולם?', answer: 'ג׳ירפה', options: ['ג׳ירפה','פיל','סוס','גמל'] },
      { question: 'כמה ימים יש בשבוע?', answer: '7', options: ['5','6','7','8'] },
      { question: 'מהי בירת ישראל?', answer: 'ירושלים', options: ['חיפה','תל אביב','ירושלים','באר שבע'] },
      { question: 'איזה עונה מגיעה אחרי האביב?', answer: 'קיץ', options: ['חורף','סתיו','קיץ','אביב'] },
      { question: 'איזו חיה חיה במים ונושמת בזימים?', answer: 'דג', options: ['חתול','דג','סוס','אריה'] },
      { question: 'מה נותן לנו אור ביום?', answer: 'השמש', options: ['הירח','השמש','כוכב','ענן'] },
      { question: 'כמה רגליים יש לעכביש?', answer: '8', options: ['4','6','8','10'] }
    ],
    animals: [
      { question: 'איזו חיה אומרת מו?', answer: 'פרה', options: ['עז','כבשה','פרה','סוס'] },
      { question: 'איזו חיה ידועה בפסים שחורים ולבנים?', answer: 'זברה', options: ['זברה','נמר','סוס','כלב'] },
      { question: 'איזו חיה יש לה חדק?', answer: 'פיל', options: ['פיל','אריה','קוף','אייל'] },
      { question: 'איזו חיה ישנה בחורף במערה לעיתים?', answer: 'דוב', options: ['דוב','פרפר','חתול','תרנגול'] }
    ],
    space: [
      { question: 'מה מקיף את כדור הארץ?', answer: 'הירח', options: ['השמש','הירח','מאדים','ענן'] },
      { question: 'איך נקראת החללית שיוצאת לחלל?', answer: 'טיל', options: ['אונייה','טיל','מכונית','רכבת'] },
      { question: 'מה נוצץ בלילה בשמיים?', answer: 'כוכבים', options: ['עצים','כוכבים','סלעים','דגים'] },
      { question: 'על איזה כוכב לכת אנחנו חיים?', answer: 'כדור הארץ', options: ['מאדים','כדור הארץ','נוגה','שבתאי'] }
    ],
    science: [
      { question: 'מה צריך צמח כדי לגדול?', answer: 'מים ואור', options: ['מים ואור','חושך בלבד','חול בלבד','רוח בלבד'] },
      { question: 'מה קופא במקפיא?', answer: 'מים', options: ['מים','אדים','חול','עץ'] },
      { question: 'איזה מגנט מושך?', answer: 'ברזל', options: ['ברזל','נייר','עץ','בד'] },
      { question: 'מה קורה למים כשמחממים אותם מאוד?', answer: 'הם הופכים לאדים', options: ['הם נעלמים','הם קופאים','הם הופכים לאדים','הם הופכים לחול'] }
    ],
    sports: [
      { question: 'באיזה משחק בועטים בכדור לשער?', answer: 'כדורגל', options: ['כדורסל','כדוריד','כדורגל','טניס'] },
      { question: 'באיזה ספורט קולעים לסל?', answer: 'כדורסל', options: ['כדורגל','כדורסל','שחייה','התעמלות'] },
      { question: 'באיזה ספורט שוחים בבריכה?', answer: 'שחייה', options: ['שחייה','ריצה','אופניים','כדורעף'] },
      { question: 'מה לובשים על הראש ברכיבה על אופניים?', answer: 'קסדה', options: ['כפפה','קסדה','צעיף','חגורה'] }
    ],
    israel: [
      { question: 'באיזו עיר נמצאת הכנסת?', answer: 'ירושלים', options: ['ירושלים','חיפה','תל אביב','אילת'] },
      { question: 'איזו שפה מדברים בישראל בעיקר?', answer: 'עברית', options: ['עברית','איטלקית','רוסית בלבד','יפנית'] },
      { question: 'מה צבעי דגל ישראל?', answer: 'כחול ולבן', options: ['אדום ולבן','כחול ולבן','ירוק וצהוב','שחור וזהב'] },
      { question: 'באיזה ים אפשר לצוף בקלות בגלל המליחות?', answer: 'ים המלח', options: ['הים האדום','הכנרת','ים המלח','הים התיכון'] }
    ]
  };

  const HOLIDAYS_BANK = [
    { question: 'באיזה חג אוכלים מצות?', answer: 'פסח', options: ['פורים','פסח','חנוכה','שבועות'] },
    { question: 'באיזה חג מדליקים חנוכייה?', answer: 'חנוכה', options: ['ראש השנה','חנוכה','סוכות','פסח'] },
    { question: 'באיזה חג מתחפשים?', answer: 'פורים', options: ['פורים','שבועות','יום כיפור','ט״ו בשבט'] },
    { question: 'באיזה חג יושבים בסוכה?', answer: 'סוכות', options: ['סוכות','פסח','ל״ג בעומר','פורים'] },
    { question: 'באיזה חג אוכלים תפוח בדבש?', answer: 'ראש השנה', options: ['ראש השנה','שבועות','חנוכה','פסח'] },
    { question: 'באיזה חג נוהגים לצום ולהתפלל?', answer: 'יום כיפור', options: ['יום כיפור','פורים','ל״ג בעומר','חנוכה'] },
    { question: 'באיזה חג אוכלים מאכלי חלב?', answer: 'שבועות', options: ['שבועות','סוכות','פורים','פסח'] },
    { question: 'באיזה חג נוטעים עצים וחוגגים את פירות הארץ?', answer: 'ט״ו בשבט', options: ['ט״ו בשבט','יום העצמאות','ראש השנה','חנוכה'] }
  ];

  const ANIMAL_HOMES_BANK = [
    { question: 'איפה גרה דבורה?', answer: 'כוורת', options: ['כוורת','מאורה','קן','אורווה'] },
    { question: 'איפה גר סוס?', answer: 'אורווה', options: ['לול','אורווה','קן','מחילה'] },
    { question: 'איפה גר כלב?', answer: 'מלונה', options: ['מלונה','כוורת','מערה','קן'] },
    { question: 'איפה גרה ציפור?', answer: 'קן', options: ['קן','אקווריום','אורווה','לול'] },
    { question: 'איפה גר ארנב?', answer: 'מחילה', options: ['מחילה','קן','לול','כוורת'] },
    { question: 'איפה גר אריה בטבע?', answer: 'מאורה', options: ['מאורה','מלונה','אורווה','אקווריום'] },
    { question: 'איפה גרות תרנגולות?', answer: 'לול', options: ['לול','אקווריום','קן','מלונה'] },
    { question: 'איפה חי דג?', answer: 'אקווריום', options: ['אקווריום','לול','מחילה','אורווה'] },
    { question: 'איפה חיה נמלה?', answer: 'קן נמלים', options: ['קן נמלים','מלונה','מאורה','כוורת'] },
    { question: 'איפה טווה עכביש את ביתו?', answer: 'קורים', options: ['קורים','לול','אורווה','קן'] }
  ];

  const MAZE_LIBRARY = {
    easy: [
      {
        theme: 'forest',
        rows: [
          'S....',
          '###.#',
          '...#.',
          '.#.##',
          '...#F'
        ]
      },
      {
        theme: 'space',
        rows: [
          'S#...',
          '.#.#.',
          '.#.#.',
          '.#.#.',
          '...#F'
        ]
      }
    ],
    medium: [
      {
        theme: 'forest',
        rows: [
          'S..#...',
          '##.#.#.',
          '...#.#.',
          '.###.#.',
          '...#...',
          '.#.###.',
          '...#..F'
        ]
      },
      {
        theme: 'castle',
        rows: [
          'S...#..',
          '.###.#.',
          '...#.#.',
          '.#...#.',
          '.#.###.',
          '.#.....',
          '.#####F'
        ]
      }
    ],
    hard: [
      {
        theme: 'space',
        rows: [
          'S..#.....',
          '.#.#.###.',
          '.#.#...#.',
          '.#.#.#.#.',
          '.#...#.#.',
          '.###.#.#.',
          '...#.#.#.',
          '##.#...#.',
          '...###..F'
        ]
      },
      {
        theme: 'castle',
        rows: [
          'S...#....',
          '###.#.##.',
          '...#...#.',
          '.#####.#.',
          '.#.....#.',
          '.#.###.#.',
          '.#.#...#.',
          '.#.#.###.',
          '...#....F'
        ]
      }
    ]
  };

  function uniqueBy(list, keyFn) {
    const seen = new Set();
    return list.filter((item) => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function sampleQuestions(bank, count) {
    return shuffle(bank.slice()).slice(0, Math.min(count, bank.length)).map((item) => ({ ...item, options: shuffle(item.options.slice()) }));
  }

  function goHomeGlobal() {
    if (typeof switchSection === 'function') {
      switchSection('homeSection');
      return;
    }
    const home = document.getElementById('homeSection');
    document.querySelectorAll('.content-section').forEach((section) => section.classList.add('hidden-section'));
    if (home) home.classList.remove('hidden-section');
  }

  function bindBackHomeButtonGlobal(id) {
    const btn = document.getElementById(id);
    if (!btn || btn.dataset.boundHome === '1') return;
    btn.addEventListener('click', goHomeGlobal);
    btn.dataset.boundHome = '1';
  }


bindBackHomeButtonGlobal('backHomeWordSearchBtn');
bindBackHomeButtonGlobal('backHomeCrosswordBtn');
bindBackHomeButtonGlobal('backHomeSecretCodeBtn');
bindBackHomeButtonGlobal('backHomeSequenceBtn');
bindBackHomeButtonGlobal('backHomeWhoAmIBtn');
bindBackHomeButtonGlobal('backHomeMathQuizBtn');
bindBackHomeButtonGlobal('backHomeGeoQuizBtn');

  // Sudoku
  (() => {
    const els = {
      title: document.getElementById('sudokuTitle'), difficulty: document.getElementById('sudokuDifficulty'), mode: document.getElementById('sudokuSymbolMode'),
      grid: document.getElementById('sudokuGrid'), msg: document.getElementById('sudokuMessage'), renderTitle: document.getElementById('sudokuRenderTitle'), printTitle: document.getElementById('sudokuPrintTitle'),
      generate: document.getElementById('generateSudokuBtn'), check: document.getElementById('checkSudokuBtn'), toggle: document.getElementById('toggleSudokuBtn'), print: document.getElementById('printSudokuBtn')
    };
    if (!els.grid) return;
    const s = { puzzle: [], solution: [], showSolution: false };
    const base = [[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]];
    function clone(board) { return board.map((row) => row.slice()); }
    function permuteBoard() {
      let board = clone(base);
      const nums = shuffle([1,2,3,4]);
      board = board.map((row) => row.map((n) => nums[n-1]));
      const rowOrder = shuffle([[0,1],[2,3]]).flatMap((pair) => shuffle(pair.slice()));
      const colOrder = shuffle([[0,1],[2,3]]).flatMap((pair) => shuffle(pair.slice()));
      board = rowOrder.map((r) => colOrder.map((c) => board[r][c]));
      return board;
    }
    function buildPuzzle() {
      s.solution = permuteBoard();
      s.puzzle = clone(s.solution);
      const blanks = { easy: 4, medium: 6, hard: 8 }[els.difficulty.value] || 6;
      const cells = shuffle(Array.from({length:16}, (_,i)=>i)).slice(0, blanks);
      cells.forEach((idx) => { s.puzzle[Math.floor(idx/4)][idx%4] = 0; });
      s.showSolution = false;
      render();
      setMessage(els.msg, 'נוצר לוח סודוקו חדש.', 'success');
    }
    function symbolFor(value) { return (SYMBOL_SETS[els.mode.value] || SYMBOL_SETS.numbers)[value-1]; }
    function valueFromSymbol(raw) {
      const set = SYMBOL_SETS[els.mode.value] || SYMBOL_SETS.numbers;
      const val = String(raw || '').trim();
      const idx = set.indexOf(val);
      if (idx >= 0) return idx + 1;
      const n = Number(val);
      return Number.isInteger(n) ? n : 0;
    }
    function updateTitles() {
      const title = els.title.value.trim() || 'סודוקו';
      els.renderTitle.textContent = title;
      els.printTitle.textContent = title;
    }
    function render() {
      updateTitles();
      els.grid.innerHTML = '';
      if (!s.puzzle.length) return;
      s.puzzle.forEach((row, r) => row.forEach((cell, c) => {
        const div = document.createElement('div');
        div.className = 'sudoku-cell';
        div.dataset.row = String(r);
        div.dataset.col = String(c);
        if (cell) {
          div.classList.add('given');
          div.textContent = symbolFor(cell);
        } else if (s.showSolution) {
          div.classList.add('solution-visible');
          div.textContent = symbolFor(s.solution[r][c]);
        } else {
          const input = document.createElement('input');
          input.maxLength = 1;
          input.dataset.answer = String(s.solution[r][c]);
          input.setAttribute('aria-label', `שורה ${r+1} עמודה ${c+1}`);
          div.appendChild(input);
        }
        els.grid.appendChild(div);
      }));
    }
    function check() {
      const inputs = els.grid.querySelectorAll('input[data-answer]');
      if (!inputs.length) return setMessage(els.msg, 'יש ליצור סודוקו תחילה.', 'error');
      let correct = 0;
      inputs.forEach((input) => {
        const ok = valueFromSymbol(input.value) === Number(input.dataset.answer);
        const cell = input.parentElement;
        cell.classList.remove('correct','wrong');
        cell.classList.add(ok ? 'correct' : 'wrong');
        if (ok) correct += 1;
      });
      setMessage(els.msg, `פתרת נכון ${correct} מתוך ${inputs.length} משבצות.`, correct === inputs.length ? 'success' : 'info');
    }
    els.generate?.addEventListener('click', buildPuzzle);
    els.check?.addEventListener('click', check);
    els.toggle?.addEventListener('click', () => { s.showSolution = !s.showSolution; els.toggle.textContent = s.showSolution ? 'הסתר פתרון' : 'הצג פתרון'; render(); });
    els.print?.addEventListener('click', () => printSection('sudokuSection'));
    els.title?.addEventListener('input', updateTitles);
    bindBackHomeButtonGlobal('backHomeSudokuBtn');
    buildPuzzle();
  })();

  function renderQuestionList(items, listEl, renderTitleEl, printTitleEl, defaultTitle, titleValue, showSolution, groupName) {
    renderTitleEl.textContent = titleValue || defaultTitle;
    printTitleEl.textContent = titleValue || defaultTitle;
    listEl.innerHTML = '';
    items.forEach((entry, index) => {
      const item = document.createElement('article');
      item.className = 'quiz-item';
      item.dataset.answer = entry.answer;
      item.innerHTML = `<h4>שאלה ${index + 1}</h4><p>${entry.question}</p><div class="inline-options"></div><p class="solution-line ${showSolution ? '' : 'hidden-section'}"><strong>פתרון:</strong> ${entry.answer}</p>`;
      const box = item.querySelector('.inline-options');
      entry.options.forEach((option, optionIndex) => {
        const row = document.createElement('label');
        row.className = 'option-row';
        row.innerHTML = `<input type="radio" name="${groupName}_${index}" value="${option}"><strong>${OPTION_LABELS[optionIndex] || ''}</strong><span>${option}</span>`;
        box.appendChild(row);
      });
      listEl.appendChild(item);
    });
  }

  // Human body
  (() => {
    const els = {
      title: document.getElementById('humanBodyTitle'), count: document.getElementById('humanBodyCount'), difficulty: document.getElementById('humanBodyDifficulty'),
      list: document.getElementById('humanBodyList'), msg: document.getElementById('humanBodyMessage'), renderTitle: document.getElementById('humanBodyRenderTitle'), printTitle: document.getElementById('humanBodyPrintTitle'),
      generate: document.getElementById('generateHumanBodyBtn'), check: document.getElementById('checkHumanBodyBtn'), toggle: document.getElementById('toggleHumanBodyBtn'), print: document.getElementById('printHumanBodyBtn')
    };
    if (!els.list) return;
    initSelect(els.count, 4, 10, 6);
    const s = { items: [], showSolution: false };
    function generate() {
      s.items = sampleQuestions(HUMAN_BODY_BANK, Number(els.count.value));
      s.showSolution = false;
      els.toggle.textContent = 'הצג פתרון';
      render();
      setMessage(els.msg, `נוצרו ${s.items.length} שאלות.`, 'success');
    }
    function render() { renderQuestionList(s.items, els.list, els.renderTitle, els.printTitle, 'גוף האדם', els.title.value.trim(), s.showSolution, 'humanBody'); }
    els.generate?.addEventListener('click', generate);
    els.check?.addEventListener('click', () => checkRadioItems(els.list, els.msg));
    els.toggle?.addEventListener('click', () => { s.showSolution = !s.showSolution; els.toggle.textContent = s.showSolution ? 'הסתר פתרון' : 'הצג פתרון'; render(); });
    els.print?.addEventListener('click', () => printSection('humanBodySection'));
    els.title?.addEventListener('input', render);
    bindBackHomeButtonGlobal('backHomeHumanBodyBtn');
    generate();
  })();

  // Trivia
  (() => {
    const els = {
      title: document.getElementById('triviaTitle'), topic: document.getElementById('triviaTopic'), count: document.getElementById('triviaCount'), difficulty: document.getElementById('triviaDifficulty'),
      list: document.getElementById('triviaList'), msg: document.getElementById('triviaMessage'), renderTitle: document.getElementById('triviaRenderTitle'), printTitle: document.getElementById('triviaPrintTitle'),
      generate: document.getElementById('generateTriviaBtn'), check: document.getElementById('checkTriviaBtn'), toggle: document.getElementById('toggleTriviaBtn'), print: document.getElementById('printTriviaBtn')
    };
    if (!els.list) return;
    initSelect(els.count, 4, 12, 6);
    const s = { items: [], showSolution: false };
    function getBank() {
      if (els.topic.value === 'mixed') return uniqueBy(Object.values(TRIVIA_BANK).flat(), (q) => q.question);
      return TRIVIA_BANK[els.topic.value] || TRIVIA_BANK.mixed;
    }
    function generate() {
      s.items = sampleQuestions(getBank(), Number(els.count.value));
      s.showSolution = false;
      els.toggle.textContent = 'הצג פתרון';
      render();
      setMessage(els.msg, `נוצרו ${s.items.length} שאלות טריוויה.`, 'success');
    }
    function render() { renderQuestionList(s.items, els.list, els.renderTitle, els.printTitle, 'שאלות טריוויה', els.title.value.trim(), s.showSolution, 'trivia'); }
    els.generate?.addEventListener('click', generate);
    els.check?.addEventListener('click', () => checkRadioItems(els.list, els.msg));
    els.toggle?.addEventListener('click', () => { s.showSolution = !s.showSolution; els.toggle.textContent = s.showSolution ? 'הסתר פתרון' : 'הצג פתרון'; render(); });
    els.print?.addEventListener('click', () => printSection('triviaSection'));
    els.title?.addEventListener('input', render);
    bindBackHomeButtonGlobal('backHomeTriviaBtn');
    generate();
  })();

  // Holidays
  (() => {
    const els = {
      title: document.getElementById('holidaysTitle'), count: document.getElementById('holidaysCount'), list: document.getElementById('holidaysList'), msg: document.getElementById('holidaysMessage'),
      renderTitle: document.getElementById('holidaysRenderTitle'), printTitle: document.getElementById('holidaysPrintTitle'), generate: document.getElementById('generateHolidaysBtn'),
      check: document.getElementById('checkHolidaysBtn'), toggle: document.getElementById('toggleHolidaysBtn'), print: document.getElementById('printHolidaysBtn')
    };
    if (!els.list) return;
    initSelect(els.count, 4, 10, 6);
    const s = { items: [], showSolution: false };
    function generate() {
      s.items = sampleQuestions(HOLIDAYS_BANK, Number(els.count.value));
      s.showSolution = false;
      els.toggle.textContent = 'הצג פתרון';
      render();
      setMessage(els.msg, `נוצרו ${s.items.length} שאלות על חגי ישראל.`, 'success');
    }
    function render() { renderQuestionList(s.items, els.list, els.renderTitle, els.printTitle, 'חגי ישראל', els.title.value.trim(), s.showSolution, 'holidays'); }
    els.generate?.addEventListener('click', generate);
    els.check?.addEventListener('click', () => checkRadioItems(els.list, els.msg));
    els.toggle?.addEventListener('click', () => { s.showSolution = !s.showSolution; els.toggle.textContent = s.showSolution ? 'הסתר פתרון' : 'הצג פתרון'; render(); });
    els.print?.addEventListener('click', () => printSection('holidaysSection'));
    els.title?.addEventListener('input', render);
    bindBackHomeButtonGlobal('backHomeHolidaysBtn');
    generate();
  })();

  // Animal homes
  (() => {
    const els = {
      title: document.getElementById('animalHomesTitle'), count: document.getElementById('animalHomesCount'), list: document.getElementById('animalHomesList'), msg: document.getElementById('animalHomesMessage'),
      renderTitle: document.getElementById('animalHomesRenderTitle'), printTitle: document.getElementById('animalHomesPrintTitle'), generate: document.getElementById('generateAnimalHomesBtn'),
      check: document.getElementById('checkAnimalHomesBtn'), toggle: document.getElementById('toggleAnimalHomesBtn'), print: document.getElementById('printAnimalHomesBtn')
    };
    if (!els.list) return;
    initSelect(els.count, 4, 10, 6);
    const s = { items: [], showSolution: false };
    function generate() {
      s.items = sampleQuestions(ANIMAL_HOMES_BANK, Number(els.count.value));
      s.showSolution = false;
      els.toggle.textContent = 'הצג פתרון';
      render();
      setMessage(els.msg, `נוצרו ${s.items.length} שאלות התאמה.`, 'success');
    }
    function render() { renderQuestionList(s.items, els.list, els.renderTitle, els.printTitle, 'בעלי חיים והבית שלהם', els.title.value.trim(), s.showSolution, 'animalHomes'); }
    els.generate?.addEventListener('click', generate);
    els.check?.addEventListener('click', () => checkRadioItems(els.list, els.msg));
    els.toggle?.addEventListener('click', () => { s.showSolution = !s.showSolution; els.toggle.textContent = s.showSolution ? 'הסתר פתרון' : 'הצג פתרון'; render(); });
    els.print?.addEventListener('click', () => printSection('animalHomesSection'));
    els.title?.addEventListener('input', render);
    bindBackHomeButtonGlobal('backHomeAnimalHomesBtn');
    generate();
  })();

  // Math Bingo
  (() => {
    const els = {
      title: document.getElementById('mathBingoTitle'), difficulty: document.getElementById('mathBingoDifficulty'), problems: document.getElementById('mathBingoProblems'),
      prompt: document.getElementById('mathBingoPrompt'), board: document.getElementById('mathBingoBoard'), list: document.getElementById('mathBingoList'), msg: document.getElementById('mathBingoMessage'),
      renderTitle: document.getElementById('mathBingoRenderTitle'), printTitle: document.getElementById('mathBingoPrintTitle'), generate: document.getElementById('generateMathBingoBtn'),
      check: document.getElementById('checkMathBingoBtn'), toggle: document.getElementById('toggleMathBingoBtn'), print: document.getElementById('printMathBingoBtn')
    };
    if (!els.board) return;
    initSelect(els.problems, 6, 12, 8);
    const s = { problems: [], cells: [], winningLine: [], showSolution: false, currentIndex: 0 };
    const lines = [
      [0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],
      [0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],
      [0,5,10,15],[3,6,9,12]
    ];
    function buildProblemForAnswer(answer) {
      const diff = els.difficulty.value;
      if (diff === 'easy') {
        const a = Math.floor(Math.random() * Math.max(1, answer - 1)) + 1;
        const b = answer - a;
        return { text: `${a} + ${b} = ?`, answer };
      }
      if (diff === 'medium') {
        const mode = Math.random() < 0.5 ? 'add' : 'sub';
        if (mode === 'add') {
          const a = Math.floor(Math.random() * Math.max(1, answer - 1)) + 1;
          const b = answer - a;
          return { text: `${a} + ${b} = ?`, answer };
        }
        const b = Math.floor(Math.random() * 9) + 1;
        const a = answer + b;
        return { text: `${a} - ${b} = ?`, answer };
      }
      const modes = ['add','sub','mul'];
      const mode = modes[Math.floor(Math.random()*modes.length)];
      if (mode === 'mul') {
        const factors = [];
        for (let i=2;i<=9;i+=1) if (answer % i === 0 && answer / i <= 12) factors.push([i, answer / i]);
        if (factors.length) {
          const [a,b] = factors[Math.floor(Math.random()*factors.length)];
          return { text: `${a} × ${b} = ?`, answer };
        }
      }
      if (mode === 'sub') {
        const b = Math.floor(Math.random() * 12) + 1;
        const a = answer + b;
        return { text: `${a} - ${b} = ?`, answer };
      }
      const a = Math.floor(Math.random() * Math.max(1, answer - 1)) + 1;
      const b = answer - a;
      return { text: `${a} + ${b} = ?`, answer };
    }
    function generate() {
      const count = Number(els.problems.value) || 8;
      const line = lines[Math.floor(Math.random() * lines.length)];
      const winningAnswers = [];
      const answerPool = new Set();
      const max = els.difficulty.value === 'hard' ? 60 : els.difficulty.value === 'medium' ? 40 : 25;
      while (winningAnswers.length < 4) {
        const n = Math.floor(Math.random() * (max - 2)) + 2;
        if (answerPool.has(n)) continue;
        answerPool.add(n);
        winningAnswers.push(n);
      }
      const extraAnswers = [];
      while (extraAnswers.length < Math.max(0, count - 4)) {
        const n = Math.floor(Math.random() * (max - 2)) + 2;
        if (answerPool.has(n)) continue;
        answerPool.add(n);
        extraAnswers.push(n);
      }
      const problemAnswers = winningAnswers.concat(extraAnswers);
      s.problems = problemAnswers.map((answer, idx) => ({ ...buildProblemForAnswer(answer), solved: false, index: idx }));
      const cells = Array.from({ length: 16 }, (_, idx) => ({ value: null, state: 'idle', locked: false, index: idx }));
      line.forEach((cellIdx, idx) => { cells[cellIdx].value = winningAnswers[idx]; cells[cellIdx].isWinning = true; });
      const remainingProblemAnswers = extraAnswers.slice();
      const freeIndices = cells.map((c, idx) => c.value == null ? idx : -1).filter((idx) => idx >= 0);
      shuffle(freeIndices).forEach((idx) => {
        if (remainingProblemAnswers.length) {
          cells[idx].value = remainingProblemAnswers.shift();
        }
      });
      while (cells.some((c) => c.value == null)) {
        const n = Math.floor(Math.random() * (max - 2)) + 2;
        if (answerPool.has(n)) continue;
        answerPool.add(n);
        const idx = cells.findIndex((c) => c.value == null);
        cells[idx].value = n;
      }
      s.cells = cells;
      s.winningLine = line;
      s.showSolution = false;
      s.currentIndex = 0;
      els.toggle.textContent = 'הצג פתרון';
      render();
      setMessage(els.msg, 'נוצר כרטיס בינגו עם קו מנצח אמיתי.', 'success');
    }
    function render() {
      const title = els.title.value.trim() || 'בינגו חשבון';
      els.renderTitle.textContent = title;
      els.printTitle.textContent = title;
      const current = s.problems[s.currentIndex];
      els.prompt.textContent = current ? `פתרו כל תרגיל. לחצו על המספר הנכון בלוח. אם המספר נכון הוא יצבע בירוק, ואם לא — באדום.` : 'כל הכבוד! כל התרגילים נפתרו.';
      els.board.innerHTML = '';
      s.cells.forEach((cell) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bingo-cell';
        if (cell.state === 'correct') btn.classList.add('marked');
        if (cell.state === 'wrong') btn.classList.add('wrong');
        if (s.showSolution && s.winningLine.includes(cell.index)) btn.classList.add('solution');
        btn.textContent = String(cell.value);
        btn.addEventListener('click', () => handleCell(cell.index));
        els.board.appendChild(btn);
      });
      els.list.innerHTML = '';
      s.problems.forEach((problem, index) => {
        const item = document.createElement('article');
        item.className = 'quiz-item';
        if (index === s.currentIndex && !problem.solved) item.classList.add('active');
        if (problem.solved) item.classList.add('correct');
        item.innerHTML = `<h4>תרגיל ${index + 1}</h4><p><strong>${problem.text}</strong></p><p class="small">${problem.solved ? 'נפתר' : index < s.currentIndex ? 'ממתין' : index === s.currentIndex ? 'זה התרגיל הנוכחי' : 'ממתין'}</p><p class="solution-line ${s.showSolution ? '' : 'hidden-section'}"><strong>תשובה:</strong> ${problem.answer}</p>`;
        els.list.appendChild(item);
      });
    }
    function handleCell(index) {
      const current = s.problems[s.currentIndex];
      if (!current) return;
      const cell = s.cells[index];
      if (cell.locked) return;
      if (cell.value === current.answer) {
        cell.state = 'correct';
        cell.locked = true;
        current.solved = true;
        s.currentIndex += 1;
        const bingo = s.winningLine.every((i) => s.cells[i].state === 'correct');
        setMessage(els.msg, bingo ? 'יש בינגו! כל הכבוד!' : 'נכון. המשיכו לתרגיל הבא.', bingo ? 'success' : 'success');
      } else {
        cell.state = 'wrong';
        setMessage(els.msg, 'זה לא המספר הנכון לתרגיל הנוכחי.', 'error');
      }
      render();
    }
    function check() {
      const solved = s.problems.filter((p) => p.solved).length;
      const bingo = s.winningLine.every((i) => s.cells[i].state === 'correct');
      if (bingo) {
        setMessage(els.msg, 'יש בינגו! כל הכבוד!', 'success');
      } else {
        setMessage(els.msg, `פתרתם נכון ${solved} מתוך ${s.problems.length} תרגילים. עדיין אין בינגו מלא.`, 'info');
      }
    }
    els.generate?.addEventListener('click', generate);
    els.check?.addEventListener('click', check);
    els.toggle?.addEventListener('click', () => { s.showSolution = !s.showSolution; els.toggle.textContent = s.showSolution ? 'הסתר פתרון' : 'הצג פתרון'; render(); });
    els.print?.addEventListener('click', () => printSection('mathBingoSection'));
    els.title?.addEventListener('input', render);
    bindBackHomeButtonGlobal('backHomeMathBingoBtn');
    generate();
  })();

// Smart maze
  (() => {
    const els = {
      title: document.getElementById('smartMazeTitle'), difficulty: document.getElementById('smartMazeDifficulty'), theme: document.getElementById('smartMazeTheme'), grid: document.getElementById('smartMazeGrid'),
      msg: document.getElementById('smartMazeMessage'), renderTitle: document.getElementById('smartMazeRenderTitle'), printTitle: document.getElementById('smartMazePrintTitle'), instruction: document.getElementById('smartMazeInstruction'),
      generate: document.getElementById('generateSmartMazeBtn'), check: document.getElementById('checkSmartMazeBtn'), toggle: document.getElementById('toggleSmartMazeBtn'), print: document.getElementById('printSmartMazeBtn')
    };
    if (!els.grid) return;
    const s = { maze: null, showSolution: false, selected: new Set(), solutionPath: [] };
    function solveMaze(rows) {
      const h = rows.length, w = rows[0].length;
      let start = null, finish = null;
      rows.forEach((row, r) => row.split('').forEach((ch, c) => { if (ch === 'S') start = [r,c]; if (ch === 'F') finish = [r,c]; }));
      const queue = [[...start, []]];
      const seen = new Set([start.join(',')]);
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      while (queue.length) {
        const [r,c,path] = queue.shift();
        const nextPath = path.concat([[r,c]]);
        if (r === finish[0] && c === finish[1]) return nextPath;
        for (const [dr,dc] of dirs) {
          const nr=r+dr,nc=c+dc;
          if (nr<0||nc<0||nr>=h||nc>=w) continue;
          const ch = rows[nr][nc];
          if (ch === '#') continue;
          const key=`${nr},${nc}`;
          if (seen.has(key)) continue;
          seen.add(key);
          queue.push([nr,nc,nextPath]);
        }
      }
      return [];
    }
    function generate() {
      const pool = (MAZE_LIBRARY[els.difficulty.value] || MAZE_LIBRARY.medium).filter((entry) => !els.theme.value || entry.theme === els.theme.value);
      s.maze = (pool.length ? shuffle(pool.slice()) : shuffle(MAZE_LIBRARY.medium.slice()))[0];
      s.solutionPath = solveMaze(s.maze.rows);
      s.selected = new Set();
      s.showSolution = false;
      els.toggle.textContent = 'הצג פתרון';
      render();
      setMessage(els.msg, 'נוצר מבוך חדש.', 'success');
    }
    function render() {
      const title = els.title.value.trim() || 'מבוך חכם';
      els.renderTitle.textContent = title;
      els.printTitle.textContent = title;
      els.grid.innerHTML = '';
      if (!s.maze) return;
      const rows = s.maze.rows;
      els.grid.style.gridTemplateColumns = `repeat(${rows[0].length}, 34px)`;
      rows.forEach((row, r) => row.split('').forEach((ch, c) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'maze-cell';
        const key = `${r},${c}`;
        if (ch === '#') btn.classList.add('wall');
        if (ch === 'S') { btn.classList.add('start'); btn.textContent = 'ה'; }
        if (ch === 'F') { btn.classList.add('finish'); btn.textContent = 'ס'; }
        if (s.selected.has(key)) btn.classList.add('selected');
        if (s.showSolution && s.solutionPath.some(([rr,cc]) => rr===r && cc===c) && ch !== 'S' && ch !== 'F') btn.classList.add('solution');
        if (ch !== '#') {
          btn.addEventListener('click', () => {
            if (ch === 'S' || ch === 'F') return;
            if (s.selected.has(key)) s.selected.delete(key); else s.selected.add(key);
            render();
          });
        }
        els.grid.appendChild(btn);
      }));
    }
    function check() {
      if (!s.maze) return setMessage(els.msg, 'יש ליצור מבוך תחילה.', 'error');
      const selected = Array.from(s.selected);
      const correct = s.solutionPath.filter(([r,c]) => {
        const ch = s.maze.rows[r][c];
        return ch !== 'S' && ch !== 'F';
      }).map(([r,c]) => `${r},${c}`);
      const allCorrect = correct.every((key) => s.selected.has(key)) && s.selected.size === correct.length;
      setMessage(els.msg, allCorrect ? 'מצוין! מצאת את המסלול הנכון.' : `עוד לא לגמרי. סימנת ${selected.length} משבצות, אבל צריך מסלול מדויק מהתחלה לסיום.`, allCorrect ? 'success' : 'info');
    }
    els.generate?.addEventListener('click', generate);
    els.check?.addEventListener('click', check);
    els.toggle?.addEventListener('click', () => { s.showSolution = !s.showSolution; els.toggle.textContent = s.showSolution ? 'הסתר פתרון' : 'הצג פתרון'; render(); });
    els.print?.addEventListener('click', () => printSection('smartMazeSection'));
    els.title?.addEventListener('input', render);
    bindBackHomeButtonGlobal('backHomeSmartMazeBtn');
    generate();
  })();
})();






/* HOME BACK BUTTON ENHANCER */
function enhanceBackHomeButtons() {
  document.querySelectorAll('button[id^="backHome"][id$="Btn"]').forEach((btn) => {
    const section = btn.closest('section.content-section');
    const controlsPanel = section?.querySelector('.controls-panel');
    const detailsTitle = controlsPanel?.querySelector('h3');

    if (!controlsPanel) return;

    btn.type = 'button';
    btn.classList.add('home-back-btn');
    btn.setAttribute('aria-label', 'חזרה לדף הבית');
    btn.innerHTML = '<span class="home-back-icon" aria-hidden="true">⌂</span><span class="home-back-label">חזרה לדף הבית</span>';

    if (detailsTitle) {
      detailsTitle.insertAdjacentElement('beforebegin', btn);
    } else if (btn.parentElement !== controlsPanel) {
      controlsPanel.prepend(btn);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceBackHomeButtons);
} else {
  enhanceBackHomeButtons();
}
window.addEventListener('load', enhanceBackHomeButtons);
