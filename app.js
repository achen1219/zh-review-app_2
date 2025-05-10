// app.js

// 1) Load the entire dictionary once
let tzDict = {};
fetch('tzdict.json')
  .then(r => r.json())
  .then(j => {
    tzDict = j;
    initPage();
  })
  .catch(e => {
    console.error('字典載入失敗', e);
    alert('無法載入字典，請稍後重試');
  });

// 2) Your review schedule: update this object with new dates/characters
const schedule = {
  '2025-05-10': ['掌','瓣','梢','禮','取','抬','初','夏','包','類','目','描','極','障'],
  '2025-05-11': ['鋪','童','掌','瓣','梢','禮','腰','蓋','技','票','程','結','漠','綿'],
  // … add more dates here …
};

// 3) Once DOM loaded and tzDict ready, initialize dropdown & calendar
function initPage() {
  const dateSelect = document.getElementById('dateSelect');
  const showCalendarBtn = document.getElementById('showCalendar');

  // Populate date dropdown
  Object.keys(schedule).forEach(date => {
    const opt = document.createElement('option');
    opt.value = date;
    opt.textContent = date;
    dateSelect.appendChild(opt);
  });

  // Hooks
  dateSelect.addEventListener('change', loadDay);
  showCalendarBtn.addEventListener('click', toggleCalendar);

  // Load first date by default
  dateSelect.selectedIndex = 0;
  loadDay();
}

// 4) Load & render one day’s flashcards
function loadDay() {
  const date = document.getElementById('dateSelect').value;
  const chars = schedule[date] || [];
  const area = document.getElementById('contentArea');
  area.innerHTML = '';  

  // Create a flashcard for each character
  chars.forEach(ch => {
    const card = createFlashcard(ch);
    area.appendChild(card);
  });

  // “標記為完成” button
  const doneBtn = document.createElement('button');
  doneBtn.textContent = '標記為完成';
  doneBtn.onclick = () => {
    localStorage.setItem(date,'done');
    buildCalendar();
    alert(`${date} 已完成！`);
  };
  area.appendChild(doneBtn);

  // “開始小測驗” button
  const quizBtn = document.createElement('button');
  quizBtn.textContent = '開始小測驗';
  quizBtn.onclick = () => startQuiz(chars);
  area.appendChild(quizBtn);
}

// 5) Build the calendar view
function toggleCalendar() {
  const cv = document.getElementById('calendarView');
  cv.style.display = cv.style.display === 'none' ? 'block' : 'none';
  if (cv.style.display === 'block') buildCalendar();
}
function buildCalendar() {
  const tbl = document.getElementById('calendarTable');
  let row = '<tr>';
  Object.keys(schedule).forEach(date => {
    const done = localStorage.getItem(date) === 'done';
    row += `<td style="padding:8px; background:${done?'#cfc':'#fdd'}">${date}</td>`;
  });
  row += '</tr>';
  tbl.innerHTML = row;
}

// 6) Create one flashcard element in “Demo V2” style
function createFlashcard(ch) {
  const info = tzDict[ch] || {};
  const {
    bopomofo    = '—',
    radical     = '—',
    definition  = '—',
    phrases     = { '2':[], '3':[], '4':[] }
  } = info;

  // helper to render phrase lists
  const renderPhrases = len => {
    const arr = phrases[String(len)] || [];
    if (!arr.length) {
      return `<div><strong>常用詞（${len}字）：</strong>—</div>`;
    }
    const items = arr.map(p =>
      `<li>${p.word} – ${p.zh}；<em>${p.en}</em></li>`
    ).join('');
    return `
      <div><strong>常用詞（${len}字）：</strong></div>
      <ul>${items}</ul>
    `;
  };

  // build the card
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

// 7) Stub for quiz (you can expand later)
function startQuiz(chars) {
  alert('小測驗功能待開發…');
}
