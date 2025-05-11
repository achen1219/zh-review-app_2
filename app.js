// app.js

// 1. Fisher–Yates 洗牌
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// 2. 全域變數
let tzDict = {};
let schedule = {};
let curDate = new Date();

// 3. 載入字典與排程，然後初始化月曆
Promise.all([
  fetch('tzdict.json').then(r => r.json()),
  fetch('schedule.json').then(r => r.json()),
])
.then(([dictData, schedData]) => {
  tzDict = dictData;
  schedule = schedData;
  initCalendar();
})
.catch(err => console.error('載入失敗：', err));

// 4. 初始化：上一月／下一月按鈕綁定
function initCalendar() {
  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);
  renderCalendar();
}

// 5. 切換月份
function changeMonth(offset) {
  curDate.setMonth(curDate.getMonth() + offset);
  renderCalendar();
}

// 6. 繪製月曆
function renderCalendar() {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  const year = curDate.getFullYear();
  const month = curDate.getMonth();
  document.getElementById('monthLabel').textContent = `${year} 年 ${month+1} 月`;

  // 星期標頭
  ['日','一','二','三','四','五','六'].forEach(d => {
    const hd = document.createElement('div');
    hd.textContent = d;
    hd.style.fontWeight = 'bold';
    cal.appendChild(hd);
  });

  // 前置空格
  const firstDow = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstDow; i++) {
    cal.appendChild(document.createElement('div'));
  }

  // 每日格子
  const daysInMonth = new Date(year, month+1, 0).getDate();
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

  // 預設選擇：今天有排程就選今天，否則第一筆
  const pick = schedule[todayStr] ? todayStr : Object.keys(schedule)[0];
  if (pick) {
    const startCell = document.querySelector(`#calendar div[data-date="${pick}"]`);
    if (startCell) selectDate(pick, startCell);
  }
}

// 7. 點擊日期
function selectDate(dateStr, cell) {
  document.querySelectorAll('#calendar .selected')
          .forEach(x => x.classList.remove('selected'));
  cell.classList.add('selected');
  loadDay(dateStr);
}

// 8. 顯示當日生字卡及控制按鈕
function loadDay(date) {
  const area = document.getElementById('contentArea');
  const prevScore = localStorage.getItem(`score-${date}`);
  area.innerHTML = prevScore !== null
    ? `<div>上次小測驗分數：${prevScore} 分</div><h2>${date} 生字</h2>`
    : `<h2>${date} 生字</h2>`;

  (schedule[date] || []).forEach(ch => {
    area.appendChild(createFlashcard(ch));
  });

  // 完成/取消完成
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

  // 開始小測驗
  const btnQuiz = document.createElement('button');
  btnQuiz.textContent = '開始小測驗';
  btnQuiz.onclick = () => startQuiz(date, schedule[date] || []);
  area.appendChild(btnQuiz);
}

// 9. 建立生字卡
function createFlashcard(ch) {
  const info = tzDict[ch] || {};
  const bop = info.bopomofo   || '—';
  const rad = info.radical    || '—';
  const def = info.definition || '—';
  const phs = info.phrases    || {'2':[], '3':[], '4':[]};

  const renderP = n => {
    const arr = phs[String(n)] || [];
    if (!arr.length) return `<div><strong>常用詞（${n}字）：</strong>—</div>`;
    const items = arr.map(p => `<li>${p.word} – ${p.zh}</li>`).join('');
    return `<div><strong>常用詞（${n}字）：</strong></div><ul>${items}</ul>`;
  };

  const card = document.createElement('div');
  card.className = 'flashcard';
  card.innerHTML = `
    <h4>${ch}</h4>
    <div><strong>注音：</strong>${bop}</div>
    <div><strong>部首：</strong>${rad}</div>
    <div><strong>定義：</strong>${def}</div>
    ${renderP(2)}${renderP(3)}${renderP(4)}
  `;
  return card;
}

// 10. 開始小測驗：四種題型隨機，四選一
function startQuiz(date, chars) {
  if (!Array.isArray(chars) || chars.length < 2) {
    alert('今天字數不足，無法進行小測驗');
    return;
  }

  // (1) 前兩字 + 隨機 8 字
  const pool = [...chars];
  const frontTwo = pool.splice(0,2);
  shuffle(pool);
  const quizChars = frontTwo.concat(pool.slice(0,8));

  // (2) 全域干擾池
  const allBops    = Object.values(tzDict).map(i=>i.bopomofo).filter(x=>x);
  const allDefs    = Object.values(tzDict).map(i=>i.definition).filter(x=>x);
  const allPhrases = Object.values(tzDict)
    .flatMap(i=>i.phrases?.['2']||[])
    .map(p=>p.word);
  const allCharsInPhrases = allPhrases.join('').split('');

  // (3) 組題
  const questions = quizChars.map(ch => {
    const info = tzDict[ch] || {};
    let types = ['bopomofo','definition','phrase','combine'];
    let type = types[Math.floor(Math.random()*types.length)];
    if (type==='phrase' && (!info.phrases||!info.phrases['2']||!info.phrases['2'].length)) {
      type = 'definition';
    }
    if (type==='combine' && (!info.phrases||!info.phrases['2']||!info.phrases['2'].length)) {
      type = 'bopomofo';
    }

    let text='', opts=[], ans='';

    if (type==='bopomofo') {
      text = `注音填空：「${ch}」的注音是？`;
      ans  = info.bopomofo || '—';
      const set = new Set([ans]);
      while (set.size < 4) set.add(allBops[Math.floor(Math.random()*allBops.length)]);
      opts = Array.from(set);
      shuffle(opts);

    } else if (type==='definition') {
      text = `詞義判斷：「${ch}」的定義是？`;
      ans  = info.definition || '—';
      const set = new Set([ans]);
      while (set.size < 4) set.add(allDefs[Math.floor(Math.random()*allDefs.length)]);
      opts = Array.from(set);
      shuffle(opts);

    } else if (type==='phrase') {
      text = `詞語辨識：下列哪一個是含「${ch}」的正確常用詞？`;
      ans  = info.phrases['2'][0].word;
      const set = new Set([ans]);
      while (set.size < 4) set.add(allPhrases[Math.floor(Math.random()*allPhrases.length)]);
      opts = Array.from(set);
      shuffle(opts);

    } else { // combine
      const word = info.phrases['2'][0].word; // e.g. 障礙
      text = `詞語辨識：下列哪個字可以和「${ch}」組成常用詞？`;
      ans  = word.replace(ch,'');
      const set = new Set([ans]);
      while (set.size < 4) set.add(allCharsInPhrases[Math.floor(Math.random()*allCharsInPhrases.length)]);
      opts = Array.from(set);
      shuffle(opts);
    }

    return { text, options: opts, answer: ans };
  });

  // (4) 渲染表單
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
      html += `<label><input type="radio" name="q${i}" value="${o}"> ${o}</label><br>`;
    });
    div.innerHTML = html;
    form.appendChild(div);
  });

  // (5) 提交並評分
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
