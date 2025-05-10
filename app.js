// app.js
const schedule = {
  '2025-05-10': ['掌','瓣','梢','禮','取','抬','初','夏','包','類','目','描','極','障'],
  '2025-05-11': ['鋪','童','掌','瓣','梢','禮','腰','蓋','技','票','程','結','漠','綿']
};

document.addEventListener('DOMContentLoaded', () => {
  const dateSelect = document.getElementById('dateSelect');
  const showCalendarBtn = document.getElementById('showCalendar');

  // 填充下拉選單
  Object.keys(schedule).forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    dateSelect.appendChild(opt);
  });

  dateSelect.addEventListener('change', loadDay);
  showCalendarBtn.addEventListener('click', toggleCalendar);

  // 預設第一筆
  dateSelect.selectedIndex = 0;
  loadDay();
});

async function loadDay() {
  const date = document.getElementById('dateSelect').value;
  const chars = schedule[date];
  const area = document.getElementById('contentArea');
  area.innerHTML = '';

  // 逐字生成卡片
  chars.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'flashcard';

    fetch(`tzdata/${encodeURIComponent(ch)}.json`)
      .then(r => r.json())
      .then(data => {
        const bopomofo = data.DESC1 || '—';
        const definition = (data.DESC2||'—').replace(/&.*?;/g, '');
        card.innerHTML = `
          <h4>${ch} <span class="pinyin">${bopomofo}</span></h4>
          <div>
            <strong>注音：</strong>${bopomofo}
            <button onclick="tzUI.query('${ch}')" style="margin-left:8px;">查字</button>
          </div>
          <div><strong>英文定義：</strong>${definition}</div>
        `;
      })
      .catch(() => {
        card.innerHTML = `<h4>${ch}</h4><div>載入失敗</div>`;
      })
      .finally(() => {
        area.appendChild(card);
      });
  });

  // 「標記完成」按鈕
  const doneBtn = document.createElement('button');
  doneBtn.textContent = '標記為完成';
  doneBtn.onclick = () => {
    localStorage.setItem(date,'done');
    buildCalendar();
    alert(`${date} 已完成！`);
  };
  area.appendChild(doneBtn);

  // 「開始小測驗」按鈕
  const quizBtn = document.createElement('button');
  quizBtn.textContent = '開始小測驗';
  quizBtn.onclick = () => startQuiz(schedule[date]);
  area.appendChild(quizBtn);
}

function toggleCalendar() {
  const cv = document.getElementById('calendarView');
  cv.style.display = cv.style.display==='none'?'block':'none';
  if (cv.style.display==='block') buildCalendar();
}

function buildCalendar() {
  const tbl = document.getElementById('calendarTable');
  let row = '<tr>';
  for (let d of Object.keys(schedule)) {
    const done = localStorage.getItem(d)==='done';
    row += `<td style="background:${done?'#cfc':'#fdd'}">${d}</td>`;
  }
  row += '</tr>';
  tbl.innerHTML = row;
}

function startQuiz(chars) {
  alert('小測驗功能待開發！');
}
