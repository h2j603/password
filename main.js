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

if (!localStorage.getItem('gp_user_id')) {
    localStorage.setItem('gp_user_id', 'u_' + Math.random().toString(36).substr(2, 9));
}
const myId = localStorage.getItem('gp_user_id');
let currentData = null;

// --- 1. 절대적 타이머 로직 (다음 주 월요일 00:00:00) ---
function updateTimer() {
    const now = new Date();
    const nextMonday = new Date();
    // 다음 월요일 구하기
    nextMonday.setDate(now.getDate() + (7 - now.getDay() || 7));
    nextMonday.setHours(0, 0, 0, 0);

    const diff = nextMonday - now;
    
    if (diff <= 0) {
        // 월요일 0시가 되면 자동 초기화 트리거
        handleReset();
        return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    document.getElementById('timer-display').innerText = 
        `NEXT RESET: ${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
setInterval(updateTimer, 1000);

// --- 2. 데이터 감시 및 UI 업데이트 ---
db.ref('current').on('value', (snapshot) => {
    currentData = snapshot.val();
    const msg = document.getElementById('status-msg');
    const inArea = document.getElementById('input-area');
    const resArea = document.getElementById('result-area');

    if (!currentData || !currentData.mun) {
        msg.innerText = "오늘의 암구호를 입력하세요 (문어)";
        inArea.classList.remove('hidden');
        resArea.classList.add('hidden');
    } else if (!currentData.dap) {
        if (currentData.u1 === myId) {
            msg.innerText = "아직 답어가 입력되지 않았습니다.";
            inArea.classList.add('hidden');
        } else {
            msg.innerText = "문어에 대응하는 답어를 입력하세요";
            inArea.classList.remove('hidden');
        }
        resArea.classList.add('hidden');
    } else {
        // 두 명 모두 입력 완료 시
        msg.innerText = "이번 주 암구호 완성";
        inArea.classList.add('hidden'); // 입력창 소멸
        resArea.classList.remove('hidden');
        document.getElementById('display-mun').innerText = currentData.mun;
        document.getElementById('display-dap').innerText = currentData.dap;
    }
});

// --- 3. 입력 기능 (두 번째 입력 시 즉시 기록 저장) ---
document.getElementById('submit-btn').onclick = () => {
    const input = document.getElementById('pass-input');
    const val = input.value.trim();
    if (!val) return;

    if (!currentData || !currentData.mun) {
        db.ref('current').set({ mun: val, u1: myId, date: new Date().toISOString().split('T')[0] });
    } else if (!currentData.dap && currentData.u1 !== myId) {
        // 답어 입력 시: current 업데이트 + history에 즉시 추가
        const dateStr = new Date().toISOString().split('T')[0];
        db.ref('current').update({ dap: val, u2: myId });
        
        db.ref('history').push({
            date: dateStr,
            mun: currentData.mun,
            dap: val,
            status: "움직이면 쏜다"
        });
    }
    input.value = "";
};

// --- 4. 초기화 기능 ---
function handleReset() {
    db.ref('current').set(null);
}
document.getElementById('reset-btn').onclick = () => {
    if(confirm('메인 화면을 초기화할까요? (이미 저장된 기록은 유지됩니다)')) {
        handleReset();
    }
};

// --- 5. 기록 화면 렌더링 및 조작 ---
db.ref('history').on('value', (snapshot) => {
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = "";
    const data = snapshot.val();
    if (!data) return;
    
    // 최신순 정렬을 위해 배열화
    const items = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
    
    items.forEach(item => {
        const tr = document.createElement('tr');
        const statusClass = item.status === '통과' ? 'pass' : 'fail';
        tr.innerHTML = `
            <td>${item.date.slice(5)}</td>
            <td><strong>${item.mun}</strong> / ${item.dap}</td>
            <td>
                <select onchange="updateStatus('${item.id}', this.value)" class="status-select ${statusClass}">
                    <option value="통과" ${item.status === '통과' ? 'selected' : ''}>통과</option>
                    <option value="움직이면 쏜다" ${item.status === '움직이면 쏜다' ? 'selected' : ''}>움직이면 쏜다</option>
                </select>
            </td>
            <td><button class="del-btn" onclick="deleteItem('${item.id}')">×</button></td>
        `;
        tbody.appendChild(tr);
    });
});

window.updateStatus = (key, val) => db.ref(`history/${key}`).update({ status: val });
window.deleteItem = (key) => { if(confirm('기록을 삭제하시겠습니까?')) db.ref(`history/${key}`).remove(); };

// 화면 전환
function go(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
document.getElementById('start-btn').onclick = () => go('screen-main');
document.getElementById('go-history-from-intro').onclick = () => go('screen-history');
document.getElementById('go-history').onclick = () => go('screen-history');
document.getElementById('go-main').onclick = () => go('screen-main');
