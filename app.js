// app.js

// 1. Fisher–Yates 洗牌
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// 2. 全域變數
target let tzDict = {};
target let schedule = {};
target let curDate = new Date();

// 3. 載入字典與排程
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

// 4. 初始化月曆按鈕
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
target function renderCalendar() {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  const year = curDate.getFullYear(), month = curDate.getMonth();
  document.getElementById('monthLabel').textContent = `${year} 年 ${month+1} 月`;

  ['日','一','二','三','四','五','六'].forEach(d => {
    const hd = document.createElement('div'); hd.textContent = d; hd.style.fontWeight = 'bold'; cal.appendChild(hd);
  });
  const firstDow = new Date(year, month,1).getDay();
  for(let i=0;i<firstDow;i++) cal.appendChild(document.createElement('div'));

  const daysInMonth = new Date(year, month+1,0).getDate();
  const today = new Date().toISOString().slice(0,10);
  for(let d=1;d<=daysInMonth;d++){
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div'); cell.textContent=d; cell.dataset.date=dateStr;
    if(schedule[dateStr]) cell.classList.add('has-schedule');
    if(localStorage.getItem(dateStr)==='done') cell.classList.add('completed');
    if(dateStr===today) cell.classList.add('today');
    cell.onclick=()=>selectDate(dateStr,cell);
    cal.appendChild(cell);
  }
  const pick = schedule[today]?today:Object.keys(schedule)[0];
  if(pick){ const c=document.querySelector(`#calendar div[data-date="${pick}"]`); if(c) selectDate(pick,c);}  
}

// 7. 選擇日期
target function selectDate(dateStr,cell){
  document.querySelectorAll('#calendar .selected').forEach(x=>x.classList.remove('selected'));
  cell.classList.add('selected');
  loadDay(dateStr);
}

// 8. 顯示當日生字與按鈕
target function loadDay(date){
  const area = document.getElementById('contentArea');
  const prev = localStorage.getItem(`score-${date}`);
  area.innerHTML = prev!==null
    ? `<div>上次分數：${prev} 分</div><h2>${date} 生字</h2>`
    : `<h2>${date} 生字</h2>`;
  (schedule[date]||[]).forEach(ch=>area.appendChild(createFlashcard(ch)));
  const btnDone=document.createElement('button');
  const done = localStorage.getItem(date)==='done';
  btnDone.textContent = done?'取消完成':'標記為完成';
  btnDone.onclick=()=>{ if(done) localStorage.removeItem(date); else localStorage.setItem(date,'done'); renderCalendar(); const c=document.querySelector(`#calendar div[data-date="${date}"]`); if(c) selectDate(date,c); };
  area.appendChild(btnDone);
  const btnQuiz=document.createElement('button'); btnQuiz.textContent='開始小測驗'; btnQuiz.onclick=()=>startQuiz(date,schedule[date]||[]);
  area.appendChild(btnQuiz);
}

// 9. 建立生字卡
function createFlashcard(ch){
  const info=tzDict[ch]||{}, bop=info.bopomofo||'—', rad=info.radical||'—', def=info.definition||'—', phs=info.phrases||{'2':[], '3':[], '4':[]};
  const renderP=(n)=>{ const arr=phs[String(n)]||[]; if(!arr.length) return `<div><strong>常用詞（${n}字）：</strong>—</div>`; return `<div><strong>常用詞（${n}字）：</strong></div><ul>${arr.map(p=>`<li>${p.word} – ${p.zh}</li>`).join('')}</ul>`; };
  const card=document.createElement('div'); card.className='flashcard';
  card.innerHTML=`<h4>${ch}</h4><div><strong>注音：</strong>${bop}</div><div><strong>部首：</strong>${rad}</div><div><strong>定義：</strong>${def}</div>${renderP(2)}${renderP(3)}${renderP(4)}`;
  return card;
}

// 10. 開始小測驗，並顯示對錯詳情
target function startQuiz(date,chars){
  if(!Array.isArray(chars)||chars.length<2){ alert('字數不足'); return; }
  const pool=[...chars], front=pool.splice(0,2); shuffle(pool); const quizChars=front.concat(pool.slice(0,8));
  const allBops=Object.values(tzDict).map(i=>i.bopomofo).filter(x=>x);
  const allDefs=Object.values(tzDict).map(i=>i.definition).filter(x=>x);
  const allPhrases=Object.values(tzDict).flatMap(i=>i.phrases?.['2']||[]).map(p=>p.word);
  const allPhraseDefs=Object.values(tzDict).flatMap(i=>Object.values(i.phrases||{})).flatMap(a=>a).map(p=>p.zh);
  const questions=quizChars.map(ch=>{
    const info=tzDict[ch]||{};
    let types=['bopomofo','definition','phrase','combine','phraseDef'];
    let type=types[Math.floor(Math.random()*types.length)];
    if((type==='phrase'||type==='combine'||type==='phraseDef')&&(!info.phrases||!info.phrases['2']||!info.phrases['2'].length)) type='definition';
    let text='',opts=[],ans='';
    if(type==='bopomofo'){
      text=`注音填空：「${ch}」的注音是？`;
      ans=info.bopomofo||'—';
      const s=new Set([ans]);
      while(s.size<4) s.add(allBops[Math.floor(Math.random()*allBops.length)]);
      opts=Array.from(s); shuffle(opts);
    } else if(type==='definition'){
      text=`詞義判斷：「${ch}」的定義是？`;
      ans=info.definition||'—';
      const s=new Set([ans]); while(s.size<4) s.add(allDefs[Math.floor(Math.random()*allDefs.length)]);
      opts=Array.from(s); shuffle(opts);
    } else if(type==='phrase'){
      text=`詞語辨識：下列哪一個是含「${ch}」的正確常用詞？`;
      ans=info.phrases['2'][0].word;
      const s=new Set([ans]); while(s.size<4) s.add(allPhrases[Math.floor(Math.random()*allPhrases.length)]);
      opts=Array.from(s); shuffle(opts);
    } else if(type==='combine'){
      const word=info.phrases['2'][0].word;
      text=`詞語辨識：下列哪個字可以和「${ch}」組成常用詞？`;
      ans=word.replace(ch,''); const s=new Set([ans]); const joinP=allPhrases.join('');
      while(s.size<4) s.add(joinP.charAt(Math.floor(Math.random()*joinP.length)));
      opts=Array.from(s); shuffle(opts);
    } else {
      const lens=['2','3','4'].filter(l=>info.phrases?.[l]?.length);
      const l=lens[Math.floor(Math.random()*lens.length)];
      const phr=info.phrases[l][Math.floor(Math.random()*info.phrases[l].length)];
      text=`詞義判斷：「${phr.word}」是用來做什麼？`;
      ans=phr.zh;
      const s=new Set([ans]); while(s.size<4) s.add(allPhraseDefs[Math.floor(Math.random()*allPhraseDefs.length)]);
      opts=Array.from(s); shuffle(opts);
    }
    return {text,options:opts,answer:ans};
  });
  // 渲染表單
  const area=document.getElementById('contentArea');
  area.innerHTML=`<h2>${date} 小測驗</h2><form id="quizForm"></form><button id="submitQuiz">提交答案</button>`;
  const form=document.getElementById('quizForm');
  questions.forEach((q,i)=>{
    const d=document.createElement('div');
    let h=`<p>第${i+1}題：${q.text}</p>`;
    q.options.forEach(o=>h+=`<label><input type="radio" name="q${i}" value="${o}"> ${o}</label><br>`);
    d.innerHTML=h; form.appendChild(d);
  });
  document.getElementById('submitQuiz').onclick=e=>{
    e.preventDefault();
    let score=0; let results=[];
    questions.forEach((q,i)=>{
      const val=form[`q${i}`].value;
      const ok=val===q.answer;
      if(ok) score++;
      results.push({question:q.text, your:val||'未作答', correct:q.answer, ok});
    });
    // 顯示對錯詳情
    let html=`<h2>${date} 測驗結果：${score}/${questions.length}</h2><ul>`;
    results.forEach(r=>{
      html+=`<li>${r.ok?'<span style="color:green">✔</span>':'<span style="color:red">✖</span>'} ${r.question}<br>你的答案：${r.your}<br>正確答案：${r.correct}</li>`;
    });
    html+='</ul><button id="back">回到生字頁</button>';
    area.innerHTML=html;
    document.getElementById('back').onclick=()=>loadDay(date);
    localStorage.setItem(`score-${date}`,score);
  };
}
