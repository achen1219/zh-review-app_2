// app.js

// 1. Helper: Fisher–Yates shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// 2. Global state
let tzDict = {};
let schedule = {};
let curDate = new Date();

// 3. Load dictionary and schedule then init calendar
Promise.all([
  fetch('tzdict.json').then(r => r.json()),
  fetch('schedule.json').then(r => r.json())
]).then(([dictData, schedData]) => {
  tzDict = dictData;
  schedule = schedData;
  initCalendar();
}).catch(e => console.error('載入失敗', e));

// 4. Set up calendar controls
function initCalendar() {
  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);
  renderCalendar();
}
function changeMonth(offset) {
  curDate.setMonth(curDate.getMonth() + offset);
  renderCalendar();
}

// 5. Render the month grid
function renderCalendar() {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  const year = curDate.getFullYear(), month = curDate.getMonth();
  document.getElementById('monthLabel').textContent = `${year} 年 ${month + 1} 月`;

  // Weekday headers
  ['日','一','二','三','四','五','六'].forEach(d => {
    const hd = document.createElement('div');
    hd.textContent = d;
    hd.style.fontWeight = 'bold';
    cal.appendChild(hd);
  });

  // Leading blanks
  const firstDay = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstDay; i++) cal.appendChild(document.createElement('div'));

  // Days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.textContent = d;
    cell.dataset.date = dateStr;
    if (schedule[dateStr])           cell.classList.add('has-schedule');
    if (localStorage.getItem(dateStr)==='done') cell.classList.add('completed');
    if (dateStr === todayStr)        cell.classList.add('today');
    cell.onclick = () => selectDate(dateStr, cell);
    cal.appendChild(cell);
  }

  // Auto-select today or first scheduled day
  const pick = schedule[todayStr] ? todayStr : Object.keys(schedule)[0];
  if (pick) {
    const c = document.querySelector(`#calendar div[data-date="${pick}"]`);
    if (c) selectDate(pick, c);
  }
}

// 6. Handle date click
function selectDate(dateStr, cell) {
  document.querySelectorAll('#calendar .selected')
          .forEach(x => x.classList.remove('selected'));
  cell.classList.add('selected');
  loadDay(dateStr);
}

// 7. Load flashcards + controls
function loadDay(date) {
  const area = document.getElementById('contentArea');
  const lastScore = localStorage.getItem(`score-${date}`);
  area.innerHTML = lastScore !== null
    ? `<div>上次小測驗分數：${lastScore} 分</div><h2>${date} 生字</h2>`
    : `<h2>${date} 生字</h2>`;

  (schedule[date]||[]).forEach(ch => area.appendChild(createFlashcard(ch)));

  // Toggle complete / undo
  const doneBtn = document.createElement('button');
  const done = localStorage.getItem(date) === 'done';
  doneBtn.textContent = done ? '取消完成' : '標記為完成';
  doneBtn.onclick = () => {
    if (done) localStorage.removeItem(date);
    else localStorage.setItem(date,'done');
    renderCalendar();
    const c = document.querySelector(`#calendar div[data-date="${date}"]`);
    if (c) selectDate(date, c);
  };
  area.appendChild(doneBtn);

  // Start quiz
  const quizBtn = document.createElement('button');
  quizBtn.textContent = '開始小測驗';
  quizBtn.onclick = () => showQuiz(date, schedule[date]||[]);
  area.appendChild(quizBtn);
}

// 8. Quiz page renderer
function showQuiz(date, chars) {
  if (!chars || chars.length < 2) {
    alert('今天沒有足夠的字來進行小測驗');
    return;
  }
  // Build pool and pick 10
  const pool = [...chars];
  const firstTwo = pool.splice(0,2);
  shuffle(pool);
  const quizChars = firstTwo.concat(pool.slice(0,8));

  // Prepare question objects
  const questions = quizChars.map(ch => {
    const info = tzDict[ch] || {};
    const bop = info.bopomofo || '—';
    const phr2 = info.phrases?.['2'] || [];
    // Always use multiple-choice in Chinese
    // Question types: 注音 / 詞義 / 詞語
    let type = ['bopomofo','definition','phrase'][Math.floor(Math.random()*3)];
    if (type==='phrase' && phr2.length===0) type='definition';

    if (type === 'bopomofo') {
      return {
        text: `「${ch}」的注音是？`,
        options: [bop],
        answer: bop,
        kind: 'input'  // free-input field
      };
    }
    // For multiple-choice, gather 4 options
    const opts = [];
    if (type === 'definition') {
      const correct = info.definition || '—';
      opts.push(correct);
      shuffle(quizChars);
      for (let c2 of quizChars.slice(0,3)) {
        opts.push(tzDict[c2]?.definition || '—');
      }
    } else {
      // phrase
      const p = phr2[Math.floor(Math.random()*phr2.length)];
      opts.push(p.zh);
      quizChars.forEach(c2 => {
        (tzDict[c2]?.phrases?.['2']||[]).forEach(qp => {
          if (opts.length<4 && qp.zh!==p.zh) opts.push(qp.zh);
        });
      });
    }
    shuffle(opts);
    return {
      text: type==='definition'
        ? `請選「${ch}」的解釋：`
        : `請選「${p.word}」的解釋：`,
      options: opts.slice(0,4),
      answer: opts[0],  // correct is first in array before shuffle
      kind: 'choice'
    };
  });

  // Render form
  const area = document.getElementById('contentArea');
  area.innerHTML = `<h2>${date} 小測驗</h2><form id="quizForm"></form><button id="submitQuiz">提交答案</button>`;
  const form = document.getElementById('quizForm');

  questions.forEach((q,i) => {
    const div = document.createElement('div');
    if (q.kind === 'input') {
      div.innerHTML = `<p>第 ${i+1} 題：${q.text}</p>
        <input name="q${i}" placeholder="輸入答案">`;
    } else {
      // multiple‐choice
      const optsHtml = q.options.map(o =>
        `<label><input type="radio" name="q${i}" value="${o}"> ${o}</label>`
      ).join('<br>');
      div.innerHTML = `<p>第 ${i+1} 題：${q.text}</p>${optsHtml}`;
    }
    form.appendChild(div);
  });

  document.getElementById('submitQuiz').onclick = e => {
    e.preventDefault();
    let score = 0;
    questions.forEach((q,i) => {
      const val = form[`q${i}`].value.trim();
      if (val === q.answer) score++;
    });
    alert(`小測驗結束！答對 ${score}/${questions.length} 題。`);
    localStorage.setItem(`score-${date}`, score);
    loadDay(date);
  };
}

// 9. Flashcard builder (Demo V2)
function createFlashcard(ch) {
  const info = tzDict[ch] || {};
  const bop      = info.bopomofo   || '—';
  const rad      = info.radical    || '—';
  const def      = info.definition || '—';
  const phrases  = info.phrases    || {'2':[], '3':[], '4':[]};

  const renderPhrases = len => {
    const arr = phrases[String(len)] || [];
    if (!arr.length) return `<div><strong>常用詞（${len}字）：</strong>—</div>`;
    const items = arr.map(p=>`<li>${p.word} – ${p.zh}</li>`).join('');
    return `<div><strong>常用詞（${len}字）：</strong></div><ul>${items}</ul>`;
  };

  const card = document.createElement('div');
  card.className = 'flashcard';
  card.innerHTML = `
    <h4>${ch}</h4>
    <div><strong>注音：</strong>${bop}</div>
    <div><strong>部首：</strong>${rad}</div>
    <div><strong>定義：</strong>${def}</div>
    ${renderPhrases(2)}
    ${renderPhrases(3)}
    ${renderPhrases(4)}
  `;
  return card;
}
