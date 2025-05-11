// app.js

// Helper: Fisher–Yates shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Global data holders
let tzDict = {};
let schedule = {};
let curDate = new Date();

// Load both dictionary and schedule, then init calendar
Promise.all([
  fetch('tzdict.json').then(r => r.json()),
  fetch('schedule.json').then(r => r.json())
])
.then(([dictData, schedData]) => {
  tzDict = dictData;
  schedule = schedData;
  initCalendar();
})
.catch(e => console.error('載入字典或排程失敗', e));

// Initialize calendar controls
function initCalendar() {
  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);
  renderCalendar();
}

// Change displayed month
function changeMonth(offset) {
  curDate.setMonth(curDate.getMonth() + offset);
  renderCalendar();
}

// Render the 7-column grid calendar
function renderCalendar() {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  const year = curDate.getFullYear();
  const month = curDate.getMonth();
  document.getElementById('monthLabel').textContent = `${year} 年 ${month+1} 月`;

  // Weekday headers
  ['日','一','二','三','四','五','六'].forEach(day => {
    const header = document.createElement('div');
    header.textContent = day;
    header.style.fontWeight = 'bold';
    cal.appendChild(header);
  });

  // Leading blanks
  const firstDay = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstDay; i++) cal.appendChild(document.createElement('div'));

  // Days
  const days = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);
  for (let d = 1; d <= days; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.textContent = d;
    cell.dataset.date = dateStr;
    if (schedule[dateStr]) cell.classList.add('has-schedule');
    if (localStorage.getItem(dateStr) === 'done') cell.classList.add('completed');
    if (dateStr === todayStr) cell.classList.add('today');
    cell.onclick = () => selectDate(dateStr, cell);
    cal.appendChild(cell);
  }

  // Auto-select: today if scheduled, else first scheduled date
  const pick = schedule[todayStr] ? todayStr : Object.keys(schedule)[0];
  if (pick) {
    const startCell = document.querySelector(`#calendar div[data-date="${pick}"]`);
    if (startCell) selectDate(pick, startCell);
  }
}

// Handle selecting a date cell
function selectDate(dateStr, cell) {
  document.querySelectorAll('#calendar .selected').forEach(x => x.classList.remove('selected'));
  cell.classList.add('selected');
  loadDay(dateStr);
}

// Load and display flashcards and buttons for a given date
function loadDay(date) {
  const area = document.getElementById('contentArea');
  const lastScore = localStorage.getItem(`score-${date}`);
  area.innerHTML = lastScore !== null
    ? `<div>上次小測驗分數：${lastScore} 分</div><h2>${date} 生字</h2>`
    : `<h2>${date} 生字</h2>`;

  (schedule[date] || []).forEach(ch => area.appendChild(createFlashcard(ch)));

  // Toggle complete/undo
  const doneBtn = document.createElement('button');
  const isDone = localStorage.getItem(date) === 'done';
  doneBtn.textContent = isDone ? '取消完成' : '標記為完成';
  doneBtn.onclick = () => {
    if (isDone) localStorage.removeItem(date);
    else localStorage.setItem(date, 'done');
    renderCalendar();
    const cell = document.querySelector(`#calendar div[data-date="${date}"]`);
    if (cell) selectDate(date, cell);
  };
  area.appendChild(doneBtn);

  // Start the quiz
  const quizBtn = document.createElement('button');
  quizBtn.textContent = '開始小測驗';
  quizBtn.onclick = () => startQuiz(date, schedule[date]);
  area.appendChild(quizBtn);
}

// Create a flashcard element (Demo V2 style)
function createFlashcard(ch) {
  const info = tzDict[ch] || {};
  const bopomofo   = info.bopomofo   || '—';
  const radical    = info.radical    || '—';
  const definition = info.definition || '—';
  const phrases    = info.phrases    || { '2': [], '3': [], '4': [] };

  const renderPhrases = len => {
    const arr = phrases[String(len)] || [];
    if (!arr.length) return `<div><strong>常用詞（${len}字）：</strong>—</div>`;
    const items = arr.map(p => `<li>${p.word} – ${p.zh}；<em>${p.en}</em></li>`).join('');
    return `<div><strong>常用詞（${len}字）：</strong></div><ul>${items}</ul>`;
  };

  const card = document.createElement('div');
  card.className = 'flashcard';
  card.innerHTML = `
    <h4>${ch}</h4>
    <div><strong>注音：</strong>${bopomofo}</div>
    <div><strong>部首：</strong>${radical}</div>
    <div><strong>定義：</strong>${definition}</div>
    ${renderPhrases(2)}
    ${renderPhrases(3)}
    ${renderPhrases(4)}
  `;
  return card;
}

// Start quiz with mixed Chinese-only questions and save score
function startQuiz(date, chars) {
  if (!chars || chars.length < 2) {
    alert('今天沒有足夠的字來進行小測驗');
    return;
  }
  // Pool: first two + 8 random
  const pool = [...chars];
  const firstTwo = pool.splice(0, 2);
  shuffle(pool);
  const quizChars = firstTwo.concat(pool.slice(0, 8));
  let score = 0;

  quizChars.forEach((ch, idx) => {
    const info = tzDict[ch] || {};
    const bop = info.bopomofo || '—';
    const twoP = info.phrases?.['2'] || [];
    // Choose type: bopomofo, definition, phrase
    let type = ['bopomofo','definition','phrase'][Math.floor(Math.random()*3)];
    // fallback if no two-character phrases
    if (type === 'phrase' && twoP.length === 0) type = 'definition';
    let userAns, correctAns;

    if (type === 'bopomofo') {
      userAns = prompt(`第 ${idx+1} 題（注音）：請輸入「${ch}」的注音`);
      correctAns = bop;
    } else if (type === 'definition') {
      // definition multiple choice
      const opts = [info.definition];
      shuffle(quizChars);
      quizChars.slice(0,3).forEach(c2 => opts.push(tzDict[c2]?.definition || '—'));
      shuffle(opts);
      const labels = ['A','B','C','D'];
      let q = `第 ${idx+1} 題（詞義）：請選「${ch}」的解釋：\n`;
      opts.forEach((o,i)=> q+=`${labels[i]}. ${o}\n`);
      userAns = prompt(q + '輸入 A/B/C/D');
      correctAns = opts[labels.indexOf((userAns||'').toUpperCase())];
    } else {
      // phrase multiple choice
      const phr = twoP[Math.floor(Math.random()*twoP.length)];
      const zh = phr.zh; const word = phr.word;
      const opts = [zh];
      quizChars.filter(c2=>c2!==ch).forEach(c2=>
        (tzDict[c2]?.phrases?.['2']||[]).forEach(p2=>opts.push(p2.zh))
      );
      shuffle(opts);
      const labels = ['A','B','C','D'];
      let q = `第 ${idx+1} 題（詞語）：請選「${word}」的解釋：\n`;
      opts.slice(0,4).forEach((o,i)=> q+=`${labels[i]}. ${o}\n`);
      userAns = prompt(q + '輸入 A/B/C/D');
      correctAns = opts[labels.indexOf((userAns||'').toUpperCase())];
    }

    if (userAns === correctAns) {
      alert('✅ 正確'); score++;
    } else {
      alert(`❌ 錯誤，正確答案：${correctAns}`);
    }
  });

  alert(`小測驗結束！答對 ${score}/${quizChars.length} 題。`);
  localStorage.setItem(`score-${date}`, score);
}
