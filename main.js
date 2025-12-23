// ... (기존 Firebase 설정 및 로직 상단 동일) ...

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

if (!localStorage.getItem('gp_id')) {
    localStorage.setItem('gp_id', 'u_' + Math.random().toString(36).substr(2, 9));
}
const myId = localStorage.getItem('gp_id');
let currentData = null;

function updateTimer() {
    const now = new Date();
    const nextMonday = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    const diff = nextMonday - now;
    if (diff <= 0) { db.ref('current').set(null); return; }
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    document.getElementById('timer-display').innerText = `NEXT RESET: ${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
setInterval(updateTimer, 1000);

function handleManualReset() {
    db.ref('current').set(null, (e) => {
        if (e) alert("에러: " + e.message);
        else { alert("초기화 완료"); location.reload(); }
    });
}
document.getElementById('reset-btn').onclick = () => { if(confirm('초기화할까요?')) handleManualReset(); };

db.ref('current').on('value', (snap) => {
    currentData = snap.val();
    const msg = document.getElementById('status-msg');
    const inArea = document.getElementById('input-area');
    const resArea = document.getElementById('result-area');
    const rstBtn = document.getElementById('reset-btn');

    if (currentData && (currentData.mun || currentData.dap)) rstBtn.classList.remove('hidden');
    else rstBtn.classList.add('hidden');

    if (!currentData || !currentData.mun) {
        msg.innerText = "오늘의 문어를 입력하세요";
        inArea.classList.remove('hidden');
        resArea.classList.add('hidden');
    } else if (!currentData.dap) {
        if (currentData.u1 === myId) {
            msg.innerText = "상대방의 답어를 기다리는 중입니다.";
            inArea.classList.add('hidden');
        } else {
            msg.innerText = "문어에 대응하는 답어를 입력하세요";
            inArea.classList.remove('hidden');
        }
        resArea.classList.add('hidden');
    } else {
        msg.innerText = "이번 주 암구호 동기화 완료";
        inArea.classList.add('hidden');
        resArea.classList.remove('hidden');
        document.getElementById('display-mun').innerText = currentData.mun;
        document.getElementById('display-dap').innerText = currentData.dap;
    }
});

document.getElementById('submit-btn').onclick = () => {
    const val = document.getElementById('pass-input').value.trim();
    if (!val) return;
    const dateStr = new Date().toISOString().split('T')[0];
    if (!currentData || !currentData.mun) {
        db.ref('current').set({ mun: val, u1: myId, date: dateStr });
    } else if (!currentData.dap && currentData.u1 !== myId) {
        db.ref('current').update({ dap: val, u2: myId });
        db.ref('history').push({ date: dateStr, mun: currentData.mun, dap: val, status: "움직이면 쏜다" });
    }
    document.getElementById('pass-input').value = "";
};

db.ref('history').on('value', (snap) => {
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = "";
    const data = snap.val();
    if (!data) return;
    Object.keys(data).reverse().forEach(key => {
        const item = data[key];
        const tr = document.createElement('tr');
        const sClass = item.status === '통과' ? 'pass' : 'fail';
        // 통과 색상도 테마색으로 변경됨
        tr.innerHTML = `<td>${item.date.slice(5)}</td><td><strong>${item.mun}</strong>/${item.dap}</td><td><select onchange="updateStatus('${key}', this.value)" class="status-select ${sClass}"><option value="통과" ${item.status === '통과' ? 'selected' : ''}>통과</option><option value="움직이면 쏜다" ${item.status === '움직이면 쏜다' ? 'selected' : ''}>움직이면 쏜다</option></select></td><td><button class="del-btn" onclick="deleteItem('${key}')">×</button></td>`;
        tbody.appendChild(tr);
    });
});

window.updateStatus = (k, v) => db.ref(`history/${k}`).update({ status: v });
window.deleteItem = (k) => { if(confirm('기록을 삭제하시겠습니까?')) db.ref(`history/${k}`).remove(); };

function go(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
document.getElementById('start-btn').onclick = () => go('screen-main');
document.getElementById('go-history-from-intro').onclick = () => go('screen-history');
document.getElementById('go-history').onclick = () => go('screen-history');
document.getElementById('go-main').onclick = () => go('screen-main');

// --- [신규 기능] 인트로 텍스트 랜덤 모자이크 인터랙션 ---
const introTextContainer = document.getElementById('intro-text-container');
const originalText = "그래픽암구호";
const mosaicChar = "●";

function animateMosaic() {
    let newHtml = "";
    for (let i = 0; i < originalText.length; i++) {
        // 70% 확률로 원본 글자, 30% 확률로 모자이크 문자 표시
        const charToShow = Math.random() > 0.3 ? originalText[i] : mosaicChar;
        newHtml += `<span class="mosaic-char">${charToShow}</span>`;
    }
    introTextContainer.innerHTML = newHtml;
}

// 200ms마다 모자이크 갱신 (속도 조절 가능)
setInterval(animateMosaic, 200);
// 초기 실행
animateMosaic();
