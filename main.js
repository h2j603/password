// Firebase 설정 (본인의 키값 유지)
const firebaseConfig = {
    apiKey: "AIzaSyC-BopInOkG2KsTt5dE-4nJ7dvFn2FuM9s",
    authDomain: "graphic-password-5c72a.firebaseapp.com",
    databaseURL: "https://graphic-password-5c72a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "graphic-password-5c72a",
    storageBucket: "graphic-password-5c72a.firebasestorage.app",
    messagingSenderId: "977779517772",
    appId: "1:977779517772:web:d0a23c998208eb251007e9",
    measurementId: "G-6LLC7CN195"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- 1. 매트릭스 그리드 캔버스 엔진 ---
const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');
let width, height, columns, rows;
const cellSize = 25; 
let gridAlpha = [];

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    columns = Math.ceil(width / cellSize);
    rows = Math.ceil(height / cellSize);
    gridAlpha = Array(columns * rows).fill(0).map(() => Math.random());
}

function drawGrid() {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#06ba57';
    ctx.lineWidth = 0.5;

    for(let i=0; i<=columns; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, height);
        ctx.globalAlpha = (Math.sin(Date.now() * 0.001 + i) * 0.1) + 0.12;
        ctx.stroke();
    }
    for(let j=0; j<=rows; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * cellSize); ctx.lineTo(width, j * cellSize);
        ctx.globalAlpha = (Math.cos(Date.now() * 0.001 + j) * 0.1) + 0.12;
        ctx.stroke();
    }

    ctx.fillStyle = '#06ba57';
    for(let i=0; i<columns; i++) {
        if(Math.random() > 0.985) {
            let r = Math.floor(Math.random() * rows);
            gridAlpha[i + r * columns] = 1.0;
        }
    }
    for(let k=0; k<gridAlpha.length; k++) {
        if(gridAlpha[k] > 0.05) {
            let c = k % columns; let r = Math.floor(k / columns);
            ctx.globalAlpha = gridAlpha[k] * 0.3;
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            gridAlpha[k] *= 0.93;
        }
    }
    requestAnimationFrame(drawGrid);
}
window.addEventListener('resize', resize);
resize(); drawGrid();

// --- 2. 인트로 모자이크 인터랙션 ---
const introTextContainer = document.getElementById('intro-text-container');
const originalText = "그래픽암구호";
const mosaicChars = ["●", "○", "■", "□", "▲", "△", "◆", "◇"];

function animateMosaic() {
    let newHtml = "";
    for (let i = 0; i < originalText.length; i++) {
        const charToShow = Math.random() > 0.38 ? originalText[i] : mosaicChars[Math.floor(Math.random() * mosaicChars.length)];
        newHtml += `<span class="mosaic-char">${charToShow}</span>`;
    }
    introTextContainer.innerHTML = newHtml;
}
setInterval(animateMosaic, 160);

// --- 3. 실시간 데이터 및 타이머 로직 ---
if (!localStorage.getItem('gp_id')) {
    localStorage.setItem('gp_id', 'u_' + Math.random().toString(36).substr(2, 9));
}
const myId = localStorage.getItem('gp_id');
let currentData = null;

function updateTimer() {
    const now = new Date();
    const nextMonday = new Date();
    nextMonday.setDate(now.getDate() + (8 - now.getDay()) % 7 || 7);
    nextMonday.setHours(0, 0, 0, 0);
    const diff = nextMonday - now;
    if (diff <= 0) { db.ref('current').set(null); return; }
    const d = Math.floor(diff / (86400000)), h = Math.floor((diff / 3600000) % 24), m = Math.floor((diff / 60000) % 60), s = Math.floor((diff / 1000) % 60);
    document.getElementById('timer-display').innerText = `NEXT RESET: ${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
setInterval(updateTimer, 1000);

function handleManualReset() {
    db.ref('current').set(null, (e) => {
        if (e) alert(e.message);
        else { alert("초기화 완료"); location.reload(); }
    });
}
document.getElementById('reset-btn').onclick = () => { if(confirm('초기화할까요?')) handleManualReset(); };

db.ref('current').on('value', (snap) => {
    currentData = snap.val();
    const msg = document.getElementById('status-msg'), inArea = document.getElementById('input-area'), resArea = document.getElementById('result-area'), rstBtn = document.getElementById('reset-btn');
    if (currentData && (currentData.mun || currentData.dap)) rstBtn.classList.remove('hidden'); else rstBtn.classList.add('hidden');
    if (!currentData || !currentData.mun) {
        msg.innerText = "오늘의 문어를 입력하세요"; inArea.classList.remove('hidden'); resArea.classList.add('hidden');
    } else if (!currentData.dap) {
        if (currentData.u1 === myId) { msg.innerText = "상대방의 답어를 기다리는 중..."; inArea.classList.add('hidden'); }
        else { msg.innerText = "답어를 입력하세요"; inArea.classList.remove('hidden'); }
        resArea.classList.add('hidden');
    } else {
        msg.innerText = "동기화 완료"; inArea.classList.add('hidden'); resArea.classList.remove('hidden');
        document.getElementById('display-mun').innerText = currentData.mun; document.getElementById('display-dap').innerText = currentData.dap;
    }
});

document.getElementById('submit-btn').onclick = () => {
    const val = document.getElementById('pass-input').value.trim();
    if (!val) return;
    const dateStr = new Date().toISOString().split('T')[0];
    if (!currentData || !currentData.mun) db.ref('current').set({ mun: val, u1: myId, date: dateStr });
    else if (!currentData.dap && currentData.u1 !== myId) {
        db.ref('current').update({ dap: val, u2: myId });
        db.ref('history').push({ date: dateStr, mun: currentData.mun, dap: val, status: "움직이면 쏜다" });
    }
    document.getElementById('pass-input').value = "";
};

db.ref('history').on('value', (snap) => {
    const tbody = document.querySelector('#history-table tbody'); tbody.innerHTML = "";
    const data = snap.val(); if (!data) return;
    Object.keys(data).reverse().forEach(key => {
        const item = data[key], tr = document.createElement('tr'), sClass = item.status === '통과' ? 'pass' : 'fail';
        tr.innerHTML = `<td>${item.date.slice(5)}</td><td><strong>${item.mun}</strong>/${item.dap}</td><td><select onchange="updateStatus('${key}', this.value)" class="status-select ${sClass}"><option value="통과" ${item.status === '통과' ? 'selected' : ''}>통과</option><option value="움직이면 쏜다" ${item.status === '움직이면 쏜다' ? 'selected' : ''}>움직이면 쏜다</option></select></td><td><button class="del-btn" onclick="deleteItem('${key}')">×</button></td>`;
        tbody.appendChild(tr);
    });
});

window.updateStatus = (k, v) => db.ref(`history/${k}`).update({ status: v });
window.deleteItem = (k) => { if(confirm('삭제하시겠습니까?')) db.ref(`history/${k}`).remove(); };

function go(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); }
document.getElementById('start-btn').onclick = () => go('screen-main');
document.getElementById('go-history-from-intro').onclick = () => go('screen-history');
document.getElementById('go-history').onclick = () => go('screen-history');
document.getElementById('go-main').onclick = () => go('screen-main');
