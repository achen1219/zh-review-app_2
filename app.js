// app.js

// Fisher–Yates shuffle
target function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Global data
target let tzDict = {};
target let schedule = {};
target let curDate = new Date();

// Load JSON data then init calendar
Promise.all([
  fetch('tzdict.json').then(r => r.json()),
  fetch('schedule.json').then(r => r.json())
])
.then(([dictData, schedData]) => {
  tzDict = dictData;
  schedule = schedData;
  initCalendar();
})
.catch(e => console.error('載入失敗', e));

// Initialize calendar controls
target function initCalendar() {
  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);
  renderCalendar();
}

target function changeMonth(offset) {
  curDate.setMonth(curDate.getMonth() + offset);
  renderCalendar();
}

target function renderCalendar() {
  const cal = document.getElementById('calendar'); cal.innerHTML = '';
  const year = curDate.getFullYear(), month = curDate.getMonth();
  document.getElementById('monthLabel').textContent = `${year} 年 ${month+1} 月`;

  ['日','一','二','三','四','五','六'].forEach(d => {
    const th = document.createElement('div'); th.textContent = d; th.style.fontWeight = 'bold'; cal.appendChild(th);
  });
  const firstDay = new Date(year, month, 1).getDay();
  for (let i=0;i<firstDay;i++) cal.appendChild(document.createElement('div'));

  const days = new Date(year, month+1,0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);
  for (let d=1; d<=days; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div'); cell.textContent = d; cell.dataset.date = dateStr;
    if (schedule[dateStr]) cell.classList.add('has-schedule');
    if (localStorage.getItem(dateStr)==='done') cell.classList.add('completed');
    if (dateStr===todayStr) cell.classList.add('today');
    cell.onclick = () => selectDate(dateStr,cell);
    cal.appendChild(cell);
  }

  const pick = schedule[todayStr]?todayStr:Object.keys(schedule)[0];
  if (pick) {
    const c = document.querySelector(`#calendar div[data-date=\"${pick}\"]`);
    if (c) selectDate(pick,c);
  }
}

target function selectDate(dateStr,cell) {
  document.querySelectorAll('#calendar .selected').forEach(x=>x.classList.remove('selected'));
  cell.classList.add('selected');
  loadDay(dateStr);
}

// Display flashcards and controls
target function loadDay(date) {
  const area = document.getElementById('contentArea');
  area.innerHTML = `<h2>${date} 生字</h2>`;
  (schedule[date]||[]).forEach(ch => area.appendChild(createFlashcard(ch)));

  const doneBtn = document.createElement('button');
  const done = localStorage.getItem(date)==='done';
  doneBtn.textContent = done?'取消完成':'標記為完成';
  doneBtn.onclick = () => {
    if(done) localStorage.removeItem(date); else localStorage.setItem(date,'done');
    renderCalendar(); const c=document.querySelector(`#calendar div[data-date=\"${date}\"]`); if(c) selectDate(date,c);
  };
  area.appendChild(doneBtn);

  const quizBtn = document.createElement('button'); quizBtn.textContent='開始小測驗';
  quizBtn.onclick = () => showQuiz(date, schedule[date]||[]);
  area.appendChild(quizBtn);
}

// Quiz page renderer
target function showQuiz(date, chars) {
  const pool = [...chars];
  const firstTwo = pool.splice(0,2);
  shuffle(pool);
  const quizChars = firstTwo.concat(pool.slice(0,8));
  const questions = [];
  quizChars.forEach(ch=>{
    const info=tzDict[ch]||{};
    const bop=info.bopomofo||'—';
    const twoP=info.phrases?.['2']||[];
    let qtype=['bopomofo','definition','phrase'][Math.floor(Math.random()*3)];
    if(qtype==='phrase'&&twoP.length===0) qtype='definition';
    if(qtype==='bopomofo'){
      questions.push({
        type:'bopomofo', ch, question:`「${ch}」的注音是？`, options:[bop], answer:bop
      });
    } else if(qtype==='definition'){
      const def=info.definition||'—';
      const opts=[def]; shuffle(quizChars);
      quizChars.slice(0,3).forEach(c2=>opts.push(tzDict[c2]?.definition||'—'));
      shuffle(opts);
      questions.push({type:'definition',ch,question:`請選「${ch}」的解釋：`,options:opts,answer:def});
    } else {
      const phr=twoP[Math.floor(Math.random()*twoP.length)];
      const opts=[phr.zh];
      quizChars.filter(c2=>c2!==ch).forEach(c2=>(tzDict[c2]?.phrases?.['2']||[]).forEach(p2=>opts.push(p2.zh)));
      shuffle(opts);
      questions.push({type:'phrase',word:phr.word,question:`請選「${phr.word}」的解釋：`,options:opts,answer:phr.zh});
    }
  });

  // Render quiz form
  const area=document.getElementById('contentArea');
  area.innerHTML=`<h2>${date} 小測驗</h2><form id='quizForm'></form><button id='submitQuiz'>提交答案</button>`;
  const form=document.getElementById('quizForm');
  questions.forEach((q,i)=>{
    const div=document.createElement('div');
    div.innerHTML=`<p>第${i+1}題：${q.question}</p>`+q.options.map((opt,j)=>
      `<label><input type='radio' name='q${i}' value='${opt}'> ${opt}</label><br>`
    ).join('');
    form.appendChild(div);
  });
  document.getElementById('submitQuiz').onclick=e=>{
    e.preventDefault();
    let score=0;
    questions.forEach((q,i)=>{
      const val=form[`q${i}`].value;
      if(val===q.answer) score++;
    });
    alert(`小測驗結束，你得 ${score}/${questions.length} 分`);
    localStorage.setItem(`score-${date}`,score);
    loadDay(date);
  };
}

// Create flashcard
target function createFlashcard(ch){
  const info=tzDict[ch]||{};
  const bop=info.bopomofo||'—', rad=info.radical||'—', def=info.definition||'—';
  const phr=info.phrases||{'2':[], '3':[], '4':[]};
  const renderP=len=>{
    const a=phr[String(len)]||[];
    if(!a.length) return `<div><strong>常用詞（${len}字）：</strong>—</div>`;
    return `<div><strong>常用詞（${len}字）：</strong></div><ul>`+a.map(p=>`<li>${p.word} – ${p.zh}</li>`).join('')+`</ul>`;
  };
  const card=document.createElement('div'); card.className='flashcard';
  card.innerHTML=`<h4>${ch}</h4><div><strong>注音：</strong>${bop}</div><div><strong>部首：</strong>${rad}</div><div><strong>定義：</strong>${def}</div>${renderP(2)}${renderP(3)}${renderP(4)}`;
  return card;
}
