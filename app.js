// app.js

// 1. 全部資料一次性載入
let tzDict = {};
let schedule = {};
let curDate = new Date();

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

// 2. 初始化月曆
function initCalendar() {
  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);
  renderCalendar();
}

// 3. 切換月份
function changeMonth(offset) {
  curDate.setMonth(curDate.getMonth() + offset);
  renderCalendar();
}

// 4. 繪製月曆格
function renderCalendar() {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';

  const year = curDate.getFullYear();
  const month = curDate.getMonth();
  document.getElementById('monthLabel').textContent = `${year} 年 ${month+1} 月`;

  // 星期標頭
  ['日','一','二','三','四','五','六'].forEach(d => {
    const header = document.createElement('div');
    header.textContent = d;
    header.style.fontWeight = 'bold';
    cal.appendChild(header);
  });

  // 空白格
  const firstDay = new Date(year, month, 1).getDay();
  for (let i=0; i<firstDay; i++) {
    cal.appendChild(document.createElement('div'));
  }

  // 日期格
  const days = new Date(year, month+1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);
  for (let d=1; d<=days; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.textContent = d;
    cell.dataset.date = dateStr;
    if (schedule[dateStr])               cell.classList.add('has-schedule');
    if (localStorage.getItem(dateStr)==='done') cell.classList.add('completed');
    if (dateStr === todayStr)            cell.classList.add('today');
    cell.onclick = () => selectDate(dateStr, cell);
    cal.appendChild(cell);
  }

  // 預設選擇：今天有排程就選今天，否則第一筆排程
  const pick = schedule[todayStr] ? todayStr : Object.keys(schedule)[0];
  if (pick) {
    const initial = document.querySelector(`#calendar div[data-date="${pick}"]`);
    if (initial) selectDate(pick, initial);
  }
}

// 5. 處理點擊某日
function selectDate(dateStr, cell) {
  document.querySelectorAll('#calendar .selected')
    .forEach(x => x.classList.remove('selected'));
  cell.classList.add('selected');
  loadDay(dateStr);
}

// 6. 載入並顯示當日卡片 + 按鈕
function loadDay(date) {
  const area = document.getElementById('contentArea');
  area.innerHTML = `<h2>${date} 生字</h2>`;

  (schedule[date]||[]).forEach(ch => {
    area.appendChild(createFlashcard(ch));
  });

  // 標記完成
  const doneBtn = document.createElement('button');
  doneBtn.textContent = '標記為完成';
  doneBtn.onclick = () => {
    localStorage.setItem(date, 'done');
    renderCalendar();
    // 重新選取同一天
    const cell = document.querySelector(`#calendar div[data-date="${date}"]`);
    if (cell) selectDate(date, cell);
    alert(`${date} 已完成！`);
  };
  area.appendChild(doneBtn);

  // 開始小測驗
  const quizBtn = document.createElement('button');
  quizBtn.textContent = '開始小測驗';
  quizBtn.onclick = () => startQuiz(schedule[date]);
  area.appendChild(quizBtn);
}

// 7. 產生單字卡片（Demo V2 版式）
function createFlashcard(ch) {
  const info = tzDict[ch] || {};
  const bopomofo   = info.bopomofo   || '—';
  const radical    = info.radical    || '—';
  const definition = info.definition || '—';
  const phrases    = info.phrases    || {'2':[], '3':[], '4':[]};

  const renderPhrases = len => {
    const list = phrases[String(len)] || [];
    if (!list.length) {
      return `<div><strong>常用詞（${len}字）：</strong>—</div>`;
    }
    const items = list.map(p =>
      `<li>${p.word} – ${p.zh}；<em>${p.en}</em></li>`
    ).join('');
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

// 8. 小測驗 Stub
function startQuiz(chars) {
  alert('小測驗功能尚未實作');
}
