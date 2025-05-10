// app.js

// 一次性載入整本字典
let tzDict = {};
fetch('tzdict.json')
  .then(r => r.json())
  .then(j => {
    tzDict = j;
  })
  .catch(e => console.error('字典載入失敗', e));

// 一次性載入整份排程
let schedule = {};
fetch('schedule.json')
  .then(r => r.json())
  .then(j => {
    schedule = j;
    initCalendar();
  })
  .catch(e => console.error('排程載入失敗', e));

// 當前顯示的月份
let curDate = new Date();

// 初始化月曆按鈕與顯示
function initCalendar() {
  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);
  renderCalendar();
}

// 切換月份
function changeMonth(offset) {
  curDate.setMonth(curDate.getMonth() + offset);
  renderCalendar();
}

// 繪製月曆格
function renderCalendar() {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';

  // 月份標題
  const year = curDate.getFullYear(), month = curDate.getMonth();
  document.getElementById('monthLabel').textContent = `${year} 年 ${month + 1} 月`;

  // 星期標頭
  ['日','一','二','三','四','五','六'].forEach(d => {
    const th = document.createElement('div');
    th.textContent = d;
    th.style.fontWeight = 'bold';
    cal.appendChild(th);
  });

  // 前置空格
  const firstDay = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstDay; i++) {
    cal.appendChild(document.createElement('div'));
  }

  // 每日格子
  const days = new Date(year, month+1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);
  for (let d = 1; d <= days; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.textContent = d;
    if (schedule[dateStr]) cell.classList.add('has-schedule');
    if (dateStr === todayStr) cell.classList.add('today');
    cell.onclick = () => selectDate(dateStr, cell);
    cal.appendChild(cell);
  }
}

// 點擊某天，選取並載入卡片
function selectDate(dateStr, cell) {
  // 標記選取樣式
  document.querySelectorAll('#calendar .selected')
    .forEach(x => x.classList.remove('selected'));
  cell.classList.add('selected');
  loadDay(dateStr);
}

// 渲染當日卡片與按鈕
function loadDay(date) {
  const area = document.getElementById('contentArea');
  area.innerHTML = `<h2>${date} 生字</h2>`;

  const chars = schedule[date] || [];
  chars.forEach(ch => area.appendChild(createFlashcard(ch)));

// 標記完成
const doneBtn = document.createElement('button');
doneBtn.textContent = '標記為完成';
doneBtn.onclick = () => {
  localStorage.setItem(date, 'done');  // save state
  renderCalendar();                     // re-draw the main calendar grid
  loadDay(date);                        // re-load cards so you see the green cell still selected
  alert(`${date} 已完成！`);
};
area.appendChild(doneBtn);

  // 小測驗（待實作）
  const quizBtn = document.createElement('button');
  quizBtn.textContent = '開始小測驗';
  quizBtn.onclick = () => startQuiz(chars);
  area.appendChild(quizBtn);
}

// 切換「完成日曆」檢視
document.getElementById('showCalendar').onclick = toggleFinishedView;
function toggleFinishedView() {
  const view = document.getElementById('calendarView');
  view.style.display = view.style.display==='none'?'block':'none';
  if (view.style.display==='block') buildCalendar();
}

// 繪製完成日曆（簡易版）
function buildCalendar() {
  const tbl = document.getElementById('calendarTable');
  let html = '<tr>';
  Object.keys(schedule).forEach(d => {
    const done = localStorage.getItem(d) === 'done';
    html += `<td style="padding:8px; background:${done?'#cfc':'#fdd'}">${d}</td>`;
  });
  html += '</tr>';
  tbl.innerHTML = html;
}

// 產生單字卡片（Demo V2 樣式）
function createFlashcard(ch) {
  const info = tzDict[ch] || {};
  const {
    bopomofo   = '—',
    radical    = '—',
    definition = '—',
    phrases    = {'2':[], '3':[], '4':[]}
  } = info;

  const renderPhrases = len => {
    const arr = phrases[String(len)] || [];
    if (!arr.length) {
      return `<div><strong>常用詞（${len}字）：</strong>—</div>`;
    }
    const items = arr.map(p =>
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

// 小測驗 Stub
function startQuiz(chars) {
  alert('小測驗功能尚未實作');
}
