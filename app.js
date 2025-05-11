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

  // Blank slots
  const firstDow = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstDow; i++) {
    cal.appendChild(document.createElement('div'));
  }

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

  // Auto-select
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

// Load flashcards and controls
function loadDay(date) {
  const area = document.getElementById('contentArea');
  const prevScore = localStorage.getItem(`score-${date}`);
  area.innerHTML = prevScore !== null
    ? `<div>上次小測驗分數：${prevScore} 分</div><h2>${date} 生字</h2>`
    : `<h2>${date} 生字</h2>`;

  (schedule[date] || []).forEach(ch => area.appendChild(createFlashcard(ch)));

  // Toggle complete/undo
  const btnDone = document.createElement('button');
  const done = localStorage.getItem(date) === 'done';
  btnDone.textContent = done ? '取消完成' : '標記為完成';
  btnDone.onclick = () => {
    if (done) localStorage.removeItem(date);
    else localStorage.setItem(date,'done');
    renderCalendar();
    const c = document.querySelector(`#calendar div[data-date="${date}"]`);
    if (c) selectDate(date, c);
  };
  area.appendChild(btnDone);

  // Start quiz
 // 開始小測驗：自動產生注音、詞義、詞語、組詞四種題型
function startQuiz(date, chars) {
  if (!Array.isArray(chars) || chars.length < 2) {
    alert('今天字數不足，無法進行小測驗');
    return;
  }

  // 1. 前兩字 + 隨機取 8 字
  const pool = [...chars];
  const frontTwo = pool.splice(0, 2);
  shuffle(pool);
  const quizChars = frontTwo.concat(pool.slice(0, 8));

  // 2. 全域干擾資料
  const allBops    = Object.values(tzDict).map(i => i.bopomofo).filter(x=>x);
  const allDefs    = Object.values(tzDict).map(i => i.definition).filter(x=>x);
  const allPhrases = Object.values(tzDict)
    .flatMap(i => i.phrases?.['2']||[])
    .map(p => p.word);
  const allCharsInPhrases = allPhrases.join('').split('');

  // 3. 組題
  const questions = quizChars.map(ch => {
    const info = tzDict[ch] || {};
    // 隨機挑題型
    let types = ['bopomofo','definition','phrase','combine'];
    let type = types[Math.floor(Math.random()*types.length)];
    // 若無短語，跳過詞語
    if (type==='phrase' && (!info.phrases||!info.phrases['2']||!info.phrases['2'].length)) {
      type = 'definition';
    }
    // 若無短語，跳過組詞
    if (type==='combine' && (!info.phrases||!info.phrases['2']||!info.phrases['2'].length)) {
      type = 'bopomofo';
    }

    let text='', opts=[], ans='';

    if (type==='bopomofo') {
      text = `注音填空：「${ch}」的注音是？`;
      ans  = info.bopomofo || '—';
      const set = new Set([ans]);
      while (set.size < 4) {
        set.add(allBops[Math.floor(Math.random()*allBops.length)]);
      }
      opts = Array.from(set);
      shuffle(opts);

    } else if (type==='definition') {
      text = `詞義判斷：「${ch}」的定義是？`;
      ans  = info.definition || '—';
      const set = new Set([ans]);
      while (set.size < 4) {
        set.add(allDefs[Math.floor(Math.random()*allDefs.length)]);
      }
      opts = Array.from(set);
      shuffle(opts);

    } else if (type==='phrase') {
      text = `詞語辨識：下列哪一個是含「${ch}」的正確常用詞？`;
      ans  = info.phrases['2'][0].word;
      const set = new Set([ans]);
      while (set.size < 4) {
        set.add(allPhrases[Math.floor(Math.random()*allPhrases.length)]);
      }
      opts = Array.from(set);
      shuffle(opts);

    } else { // combine
      const word = info.phrases['2'][0].word;  // e.g. "障礙"
      text = `詞語辨識：下列哪個字可以和「${ch}」組成常用詞？`;
      // 另一半
      ans  = word.replace(ch,'');
      const set = new Set([ans]);
      while (set.size < 4) {
        set.add(allCharsInPhrases[Math.floor(Math.random()*allCharsInPhrases.length)]);
      }
      opts = Array.from(set);
      shuffle(opts);
    }

    return { text, options: opts, answer: ans };
  });

  // 4. 渲染到同一頁
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <h2>${date} 小測驗</h2>
    <form id="quizForm"></form>
    <button id="submitQuiz">提交答案</button>
  `;
  const form = document.getElementById('quizForm');

  questions.forEach((q,i) => {
    const div = document.createElement('div');
    let html = `<p>第 ${i+1} 題：${q.text}</p>`;
    q.options.forEach(o => {
      html += `<label>
                 <input type="radio" name="q${i}" value="${o}"> ${o}
               </label><br>`;
    });
    div.innerHTML = html;
    form.appendChild(div);
  });

  // 5. 提交評分並存檔
  document.getElementById('submitQuiz').onclick = e => {
    e.preventDefault();
    let score = 0;
    questions.forEach((q,i) => {
      if (form[`q${i}`].value === q.answer) score++;
    });
    alert(`測驗結束！你答對 ${score}/${questions.length} 題`);
    localStorage.setItem(`score-${date}`, score);
    loadDay(date);
  };
}
