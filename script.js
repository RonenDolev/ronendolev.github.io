
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
  wordSearch: { title: '', words: [], grid: [], placements: [], showSolution: false, foundWords: new Set() },
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

async function fetchJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'שגיאה בבקשת השרת.');
  return data;
}

function cleanHebrewWord(value) {
  return String(value || '').replace(/[^א-ת]/g, '').trim();
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
function renderWordSearch() {
  const { title, grid, placements, words, showSolution, foundWords } = state.wordSearch;
  elements.wordSearchRenderTitle.textContent = title || 'תפזורת';
  elements.wordSearchPrintTitle.textContent = title || 'תפזורת';
  elements.wordSearchGrid.innerHTML = '';
  const solutionSet = new Set();
  if (showSolution) {
    placements.forEach((placement) => placement.cells.forEach((cell) => solutionSet.add(`${cell.row}:${cell.col}`)));
  }
  grid.forEach((row, rowIndex) => {
    row.forEach((char, colIndex) => {
      const cell = document.createElement('div');
      cell.className = 'word-cell';
      if (solutionSet.has(`${rowIndex}:${colIndex}`)) cell.classList.add('solution');
      cell.textContent = char;
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
function buildCrossword(entries) {
  const normalized = shuffle(entries.map((entry) => ({
    word: cleanHebrewWord(entry.word),
    clue: String(entry.clue || '').trim()
  })).filter((entry) => entry.word.length >= 2 && entry.word.length <= CROSSWORD_SIZE))
    .sort((a,b) => b.word.length - a.word.length)
    .slice(0, 20);

  const grid = Array.from({ length: CROSSWORD_SIZE }, () => Array(CROSSWORD_SIZE).fill(''));
  const placed = [];
  if (!normalized.length) return null;

  const first = normalized[0];
  const firstRow = Math.floor(CROSSWORD_SIZE / 2);
  const firstCol = Math.floor(CROSSWORD_SIZE / 2) + Math.floor(first.word.length / 2);
  placed.push(placeCrosswordWord(grid, first.word, firstRow, firstCol, CROSSWORD_DIRECTIONS[0], first.clue));

  for (const entry of normalized.slice(1)) {
    let done = false;
    for (const requireIntersection of [true, false]) {
      for (let row = 0; row < CROSSWORD_SIZE && !done; row += 1) {
        for (let col = 0; col < CROSSWORD_SIZE && !done; col += 1) {
          for (const direction of shuffle(CROSSWORD_DIRECTIONS)) {
            if (!canPlaceCrosswordWord(grid, entry.word, row, col, direction, requireIntersection)) continue;
            placed.push(placeCrosswordWord(grid, entry.word, row, col, direction, entry.clue));
            done = true;
            break;
          }
        }
      }
      if (done) break;
    }
  }
  if (!placed.length) return null;
  const trimmed = trimCrossword(grid, placed);
  const numbers = new Map();
  let current = 1;
  trimmed.entries.sort((a,b) => (a.row - b.row) || (a.col - b.col)).forEach((entry) => {
    const key = `${entry.row}:${entry.col}`;
    if (!numbers.has(key)) numbers.set(key, current++);
    entry.number = numbers.get(key);
  });
  return { grid: trimmed.grid, entries: trimmed.entries, rows: trimmed.grid.length, cols: trimmed.grid[0].length };
}
function renderCrossword() {
  const { title, puzzle, showSolution } = state.crossword;
  if (!puzzle) return;
  elements.crosswordRenderTitle.textContent = title || 'תשחץ';
  elements.crosswordPrintTitle.textContent = title || 'תשחץ';
  elements.crosswordGrid.style.gridTemplateColumns = `repeat(${puzzle.cols}, 34px)`;
  elements.crosswordGrid.innerHTML = '';
  const cellMap = new Map();
  puzzle.entries.forEach((entry) => entry.cells.forEach((cell, index) => {
    cellMap.set(`${cell.row}:${cell.col}`, {
      letter: entry.word[index],
      number: index === 0 ? entry.number : null
    });
  }));

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

  const across = puzzle.entries.filter((entry) => entry.direction === 'across').sort((a,b) => a.number - b.number);
  const down = puzzle.entries.filter((entry) => entry.direction === 'down').sort((a,b) => a.number - b.number);
  elements.crosswordAcross.innerHTML = '';
  elements.crosswordDown.innerHTML = '';
  across.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = entry.clue;
    elements.crosswordAcross.appendChild(li);
  });
  down.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = entry.clue;
    elements.crosswordDown.appendChild(li);
  });
}
elements.generateCrosswordBtn.addEventListener('click', async () => {
  try {
    setMessage(elements.crosswordMessage, 'יוצר תשחץ…');
    const data = await fetchJson('/api/crossword-topic', {
      topic: elements.crosswordTopic.value.trim(),
      count: Number(elements.crosswordCount.value),
      ageGroup: elements.crosswordAge.value
    });
    const puzzle = buildCrossword(data.entries || []);
    if (!puzzle) throw new Error('לא ניתן היה לבנות תשחץ מהמילים שהתקבלו.');
    state.crossword.title = elements.crosswordTitle.value.trim() || data.title || 'תשחץ';
    state.crossword.entries = data.entries || [];
    state.crossword.puzzle = puzzle;
    state.crossword.showSolution = false;
    renderCrossword();
    setMessage(elements.crosswordMessage, `שובצו ${puzzle.entries.length} מילים בתשחץ.`, 'success');
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
  Array.from(symbolMap.entries()).slice(0, Math.max(6, Math.ceil(symbolMap.size * 0.65))).forEach(([letter, symbol]) => {
    const chip = document.createElement('div');
    chip.className = 'key-chip';
    chip.innerHTML = `<strong>${symbol}</strong><span>${letter}</span>`;
    elements.secretCodeKey.appendChild(chip);
  });

  elements.secretCodeList.innerHTML = '';
  entries.forEach((entry, index) => {
    const item = document.createElement('article');
    item.className = 'quiz-item';
    const encoded = entry.word.split('').map((char) => symbolMap.get(char)).join(' ');
    item.innerHTML = `
      <h4>חידה ${index + 1}</h4>
      <p class="small">רמז: ${entry.clue}</p>
      <p><strong>${encoded}</strong></p>
      <label>התשובה שלך</label>
      <input type="text" data-answer="${entry.word}" data-type="text-answer" />
      <p class="solution-line ${showSolution ? '' : 'hidden-section'}"><strong>פתרון:</strong> ${entry.word}</p>
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
