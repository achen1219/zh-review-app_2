// app.js

// 一次性讀入整本字典
let tzDict = {};
fetch('tzdict.json')
  .then(r => {
    console.log('tzdict.json status:', r.status);
    return r.json();
  })
  .then(j => {
    tzDict = j;
    console.log('Loaded tzDict, total entries:', Object.keys(tzDict).length);
    initPage();
  })
  .catch(e => {
    console.error('字典載入失敗', e);
    alert('無法載入字典，請稍後再試');
  });

// 排程：只要在這裡增減日期／字，就自動生效
const schedule = {
  '2025-05-10': ['掌','瓣','梢','禮','取','抬','初','夏','包','類','目','描','極','障'],
  '2025-05-11': ['鋪','童','掌','瓣','梢','禮','腰','蓋','技','票','程','結','漠','綿'],
  // …後續新增日期
};

// 初始化頁面：填 dropdown、綁事件
function initPage() {
  const dateSelect = document.getElementById('dateSelect');
  Object.keys(schedule).forEach(date => {
    const opt = document.createElement('option');
    opt.value = date; opt.textContent = date;
    dateSelect.appendChild(opt);
  });
  dateSelect.addEventListener('change', loadDay);
  document.getElementById('showCalendar').addEventListener('click', toggleCalendar);
  dateSelect.selectedIndex = 0;
  loadDay();
}

// 載入 & 渲染當日卡片
function loadDay() {
  const date = document.getElementById('dateSelect').value;
  const area = document.getElementById('contentArea');
  area.innerHTML = '';
  (schedule[date] || []).forEach(ch => {
    area.appendChild(createFlashcard(ch));
  });
  // 完成 & 測驗按鈕
  const doneBtn = document.createElement('button');
  doneBtn.textContent = '標記為完成';
  doneBtn.onclick = () => {
    localStorage.setItem(date,'done'); buildCalendar();
    alert(`${date} 已完成！`);
  };
  area.appendChild(doneBtn);
  const quizBtn = document.createElement('button');
  quizBtn.textContent = '開始小測驗';
  quizBtn.onclick = () => startQuiz(schedule[date]);
  area.appendChild(quizBtn);
}

// 日曆檢視
function toggleCalendar() {
  const cv = document.getElementById('calendarView');
  cv.style.display = cv.style.display==='none'?'block':'none';
  if(cv.style.display==='block') buildCalendar();
}
function buildCalendar() {
  const tbl = document.getElementById('calendarTable');
  let row = '<tr>';
  Object.keys(schedule).forEach(d => {
    const done = localStorage.getItem(d)==='done';
    row += `<td style="padding:8px;background:${done?'#cfc':'#fdd'}">${d}</td>`;
  });
  row += '</tr>';
  tbl.innerHTML = row;
}

// 產生單張卡片（Demo V2 版式）
function createFlashcard(ch) {
  const info = tzDict[ch] || {};
  const { bopomofo='—', radical='—', definition='—', phrases={} } = info;

  const renderPhrases = len => {
    const arr = phrases[String(len)]||[];
    if(!arr.length) return `<div><strong>常用詞（${len}字）：</strong>—</div>`;
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

// 小測驗 Stub
function startQuiz(chars){
  alert('小測驗功能尚未實作');
}
