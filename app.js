// app.js

// Helper: Fisher–Yates shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Global state
let tzDict = {};
let schedule = {};
let curDate = new Date();

// Load dictionary and schedule
Promise.all([
  fetch('tzdict.json').then(res => res.json()),
  fetch('schedule.json').then(res => res.json())
]).then(([dict, sched]) => {
  tzDict = dict;
  schedule = sched;
  initCalendar();
}).catch(err => console.error('Load error:', err));

// Initialize calendar controls
function initCalendar() {
  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);
  renderCalendar();
}

// Change month view
function changeMonth(delta) {
  curDate.setMonth(curDate.getMonth() + delta);
  renderCalendar();
}

// Render the calendar grid
function renderCalendar() {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  const year = curDate.getFullYear();
  const month = curDate.getMonth();
  document.getElementById('monthLabel').textContent = `${year} 年 ${month + 1} 月`;

  // Weekday headers
  ['日','一','二','三','四','五','六'].forEach(day => {
    const hd = document.createElement('div');
    hd.textContent = day;
    hd.style.fontWeight = 'bold';
    cal.appendChild(hd);
  });

  // Blank slots before 1st
  const firstDow = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstDow; i++) cal.appendChild(document.createElement('div'));

  // Date cells
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0,10);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.textContent = d;
    cell.dataset.date = dateStr;
    if (schedule[dateStr]) cell.classList.add('has-schedule');
    if (localStorage.getItem(dateStr) === 'done') cell.classList.add('completed');
    if (dateStr === today) cell.classList.add('today');
    cell.onclick = () => selectDate(dateStr, cell);
    cal.appendChild(cell);
  }

  // Auto-select today or first
  const pick = schedule[today] ? today : Object.keys(schedule)[0];
  if (pick) {
    const start = document.querySelector(`#calendar div[data-date="${pick}"]`);
    if (start) selectDate(pick, start);
  }
}

// Handle date selection
function selectDate(dateStr, cell) {
  document.querySelectorAll('#calendar .selected').forEach(el => el.classList.remove('selected'));
  cell.classList.add('selected');
  loadDay(dateStr);
}

// Load that day's flashcards and controls
target function loadDay(date) {
  const area = document.getElementById('contentArea');
  const prevScore = localStorage.getItem(`score-${date}`);
  area.innerHTML = prevScore !== null
    ? `<div>上次小測驗分數：${prevScore} 分</div><h2>${date} 生字</h2>`
    : `<h2>${date} 生字</h2>`;

  (schedule[date] || []).forEach(ch => area.appendChild(createFlashcard(ch)));

  // Complete toggle
  const btnDone = document.createElement('button');
  const done = localStorage.getItem(date) === 'done';
  btnDone.textContent = done ? '取消完成' : '標記為完成';
  btnDone.onclick = () => {
    if (done) localStorage.removeItem(date);
    else localStorage.setItem(date, 'done');
    renderCalendar();
    const c = document.querySelector(`#calendar div[data-date="${date}"]`);
    if (c) selectDate(date, c);
  };
  area.appendChild(btnDone);

  // Quiz start
  const btnQuiz = document.createElement('button');
  btnQuiz.textContent = '開始小測驗';
  btnQuiz.onclick = () => startQuiz(date, schedule[date] || []);
  area.appendChild(btnQuiz);
}

// Build flashcard
function createFlashcard(ch) {
  const info = tzDict[ch] || {};
  const bop = info.bopomofo || '—';
  const rad = info.radical  || '—';
  const def = info.definition || '—';
  const phs = info.phrases || {'2':[], '3':[], '4':[]};

  const renderP = (n) => {
    const arr = phs[String(n)] || [];
    if (!arr.length) return `<div><strong>常用詞（${n}字）：</strong>—</div>`;
    const lis = arr.map(p => `<li>${p.word} – ${p.zh}</li>`).join('');
    return `<div><strong>常用詞（${n}字）：</strong></div><ul>${lis}</ul>`;
  };

  const card = document.createElement('div');
  card.className = 'flashcard';
  card.innerHTML = `
    <h4>${ch}</h4>
    <div><strong>注音：</strong>${bop}</div>
    <div><strong>部首：</strong>${rad}</div>
    <div><strong>定義：</strong>${def}</div>
    ${renderP(2)}
    ${renderP(3)}
    ${renderP(4)}
  `;
  return card;
}

// Start quiz page
target function startQuiz(date, chars) {
  if (!Array.isArray(chars) || chars.length < 2) {
    alert('今天字數不足無法測驗');
    return;
  }
  const pool = [...chars];
  const firstTwo = pool.splice(0,2);
  shuffle(pool);
  const quizChars = firstTwo.concat(pool.slice(0,8));
  const questions = quizChars.map((ch, i) => {
    const info = tzDict[ch] || {};
    const bop = info.bopomofo || '—';
    const phr2 = info.phrases?.['2'] || [];
    // Always multiple choice
    const opts = [];
    let correct;
    const type = ['bop','def','phr'][i % 3];
    if (type === 'bop') {
      correct = bop;
      opts.push(bop);
      shuffle(chars);
      opts.push(chars[2] ? tzDict[chars[2]].bopomofo : '—');
    } else if (type === 'def') {
      correct = info.definition;
      opts.push(correct);
      shuffle(chars);
      opts.push(tzDict[chars[3]]?.definition || '—');
    } else {
      const p = phr2[0] || {zh:'—', word:ch};
      correct = p.zh;
      opts.push(correct);
      shuffle(chars);
      opts.push((tzDict[chars[4]]?.phrases?.['2']||[])[0]?.zh || '—');
    }
    shuffle(opts);
    return { ch, question: ch, opts, answer: correct };
  });
  const area = document.getElementById('contentArea');
  area.innerHTML = `<h2>${date} 小測驗</h2><form id='qf'></form><button id='submit'>提交答案</button>`;
  const form = document.getElementById('qf');
  questions.forEach((q,i) => {
    const div = document.createElement('div');
    const choices = q.opts.map((o,j) =>
      `<label><input type='radio' name='q${i}' value='${o}'>${o}</label>`
    ).join('<br>');
    div.innerHTML = `<p>第${i+1}題：請選正確答案</p>${choices}`;
    form.appendChild(div);
  });
  document.getElementById('submit').onclick = e => {
    e.preventDefault();
    let sc=0;
    questions.forEach((q,i) => {
      if (form[`q${i}`].value === q.answer) sc++;
    });
    alert(`得分：${sc}/${questions.length}`);
    localStorage.setItem(`score-${date}`, sc);
    loadDay(date);
  };
}
