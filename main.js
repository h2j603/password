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

// --- 1. Matrix Grid Engine ---
const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');
let width, height, columns, rows;
const cellSize = 24; 
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
        ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, height);
        ctx.globalAlpha = (Math.sin(Date.now() * 0.001 + i) * 0.07) + 0.1; ctx.stroke();
    }
    for(let j=0; j<=rows; j++) {
        ctx.beginPath(); ctx.moveTo(0, j * cellSize); ctx.lineTo(width, j * cellSize);
        ctx.globalAlpha = (Math.cos(Date.now() * 0.001 + j) * 0.07) + 0.1; ctx.stroke();
    }

    ctx.fillStyle = '#06ba57';
    for(let i=0; i<columns; i++) {
        if(Math.random() > 0.988) {
            let r = Math.floor(Math.random() * rows);
            gridAlpha[i + r * columns] = 1.0;
        }
    }
    for(let k=0; k<gridAlpha.length; k++) {
        if(gridAlpha[k] > 0.05) {
            let c = k % columns; let r = Math.floor(k / columns);
            ctx.globalAlpha = gridAlpha[k] * 0.25;
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            gridAlpha[k] *= 0.94;
        }
    }
    requestAnimationFrame(drawGrid);
}
window.addEventListener('resize', resize);
resize(); drawGrid();

// --- 2. Intro Text Interaction ---
const introTextContainer = document.getElementById('intro-text-container');
const startBtn = document.getElementById('start-btn');
const originalText = "CHALLENGE & PASSWORD"; // Updated Title
const mosaicChars = ["●", "○", "■", "□", "▲", "△", "×", "‡", "§"];

function animateMosaic() {
    let newHtml = "";
    // Randomize Font 'RAND' axis for glitch effect
    const jitter = Math.floor(Math.random() * 50);
    startBtn.style.fontVariationSettings = `"RAND" ${jitter}, "wght" 700`;

    for (let i = 0; i < originalText.length; i++) {
        if (originalText[i] === " ") { newHtml += " "; continue; }
        const charToShow = Math.random() > 0.45 ? originalText[i] : mosaicChars[Math.floor(Math.random() * mosaicChars.length)];
        newHtml += `<span class="mosaic-char">${charToShow}</span>`;
    }
    introTextContainer.innerHTML = newHtml;
}
setInterval(animateMosaic, 170);

// --- 3. Functional Logic ---
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
    const d = Math.floor(diff / 86400000), h = Math.floor((diff / 3600000) % 24), m = Math.floor((diff / 60000) % 60), s = Math.floor((diff / 1000) % 60);
    document.getElementById('timer-display').innerText = `NEXT RESET: ${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
setInterval(updateTimer, 1000);

function handleManualReset() {
    db.ref('current').set(null, (e) => {
        if (e) alert("System Error: " + e.message);
        else { alert("Current Session Cleared."); location.reload(); }
    });
}
document.getElementById('reset-btn').onclick = () => { if(confirm('Clear session?')) handleManualReset(); };

db.ref('current').on('value', (snap) => {
    currentData = snap.val();
    const msg = document.getElementById('status-msg'), inArea = document.getElementById('input-area'), resArea = document.getElementById('result-area'), rstBtn = document.getElementById('reset-btn');
    if (currentData && (currentData.mun || currentData.dap)) rstBtn.classList.remove('hidden'); else rstBtn.classList.add('hidden');
    
    if (!currentData || !currentData.mun) {
        msg.innerText = "DECLARE CHALLENGE"; inArea.classList.remove('hidden'); resArea.classList.add('hidden');
    } else if (!currentData.dap) {
        if (currentData.u1 === myId) { msg.innerText = "WAITING FOR PASSWORD..."; inArea.classList.add('hidden'); }
        else { msg.innerText = "PROVIDE PASSWORD"; inArea.classList.remove('hidden'); }
        resArea.classList.add('hidden');
    } else {
        msg.innerText = "CONNECTION ESTABLISHED"; inArea.classList.add('hidden'); resArea.classList.remove('hidden');
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
        db.ref('history').push({ date: dateStr, mun: currentData.mun, dap: val, status: "LOCKED" });
    }
    document.getElementById('pass-input').value = "";
};

db.ref('history').on('value', (snap) => {
    const tbody = document.querySelector('#history-table tbody'); tbody.innerHTML = "";
    const data = snap.val(); if (!data) return;
    Object.keys(data).reverse().forEach(key => {
        const item = data[key], tr = document.createElement('tr'), sClass = item.status === 'ACCESS' ? 'pass' : 'fail';
        tr.innerHTML = `<td>${item.date.slice(5)}</td><td><strong>${item.mun}</strong> / ${item.dap}</td><td><select onchange="updateStatus('${key}', this.value)" class="status-select ${sClass}"><option value="ACCESS" ${item.status === 'ACCESS' ? 'selected' : ''}>ACCESS</option><option value="LOCKED" ${item.status === 'LOCKED' ? 'selected' : ''}>LOCKED</option></select></td><td><button class="del-btn" onclick="deleteItem('${key}')">×</button></td>`;
        tbody.appendChild(tr);
    });
});

window.updateStatus = (k, v) => db.ref(`history/${k}`).update({ status: v });
window.deleteItem = (k) => { if(confirm('Delete record?')) db.ref(`history/${k}`).remove(); };

function go(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); }
document.getElementById('start-btn').onclick = () => go('screen-main');
document.getElementById('go-history-from-intro').onclick = () => go('screen-history');
document.getElementById('go-history').onclick = () => go('screen-history');
document.getElementById('go-main').onclick = () => go('screen-main');
