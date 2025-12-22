// 1. Firebase 설정 적용
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

// 기기 식별용 ID
if (!localStorage.getItem('gp_user_id')) {
    localStorage.setItem('gp_user_id', 'u_' + Math.random().toString(36).substr(2, 9));
}
const myId = localStorage.getItem('gp_user_id');

let currentData = null;

// --- 핵심 기능: 월요일 리셋 로직 ---
function checkMondayReset() {
    const now = new Date();
    const day = now.getDay(); // 0:일, 1:월
    const dateStr = now.toISOString().split('T')[0];

    db.ref('lastResetDate').once('value', (snapshot) => {
        const lastReset = snapshot.val();
        // 오늘이 월요일인데 마지막 리셋 기록이 오늘과 다르다면 실행
        if (day === 1 && lastReset !== dateStr) {
            db.ref('current').once('value', (currSnap) => {
                const data = currSnap.val();
                if (data && data.mun) {
                    // 아카이브로 이동
                    db.ref('history').push({
                        date: dateStr,
                        mun: data.mun,
                        dap: data.dap || "(답어 없음)",
                        status: "움직이면 쏜다"
                    });
                }
                // 초기화
                db.ref('current').set({ mun: "", dap: "", u1: "", u2: "" });
                db.ref('lastResetDate').set(dateStr);
            });
        }
    });
}

// --- 데이터 감시: 메인 화면 ---
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
        msg.innerText = "이번 주 암구호 동기화 완료";
        inArea.classList.add('hidden');
        resArea.classList.remove('hidden');
        document.getElementById('display-mun').innerText = currentData.mun;
        document.getElementById('display-dap').innerText = currentData.dap;
    }
});

// --- 데이터 전송 ---
document.getElementById('submit-btn').onclick = () => {
    const input = document.getElementById('pass-input');
    const val = input.value.trim();
    if (!val) return;

    if (!currentData || !currentData.mun) {
        db.ref('current').update({ mun: val, u1: myId });
    } else if (!currentData.dap && currentData.u1 !== myId) {
        db.ref('current').update({ dap: val, u2: myId });
    }
    input.value = "";
};

// --- 기록 화면 처리 ---
db.ref('history').on('value', (snapshot) => {
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = "";
    const data = snapshot.val();
    
    for (let key in data) {
        const item = data[key];
        const tr = document.createElement('tr');
        const statusClass = item.status === '통과' ? 'pass' : 'fail';
        
        tr.innerHTML = `
            <td>${item.date.split('-').slice(1).join('/')}</td>
            <td><strong>${item.mun}</strong><br>${item.dap}</td>
            <td>
                <select onchange="updateStatus('${key}', this.value)" class="status-select ${statusClass}">
                    <option value="통과" ${item.status === '통과' ? 'selected' : ''}>통과</option>
                    <option value="움직이면 쏜다" ${item.status === '움직이면 쏜다' ? 'selected' : ''}>움직이면 쏜다</option>
                </select>
            </td>
            <td><button class="del-btn" onclick="deleteItem('${key}')">×</button></td>
        `;
        tbody.appendChild(tr);
    }
});

window.updateStatus = (key, val) => db.ref(`history/${key}`).update({ status: val });
window.deleteItem = (key) => { if(confirm('이 기록을 삭제할까요?')) db.ref(`history/${key}`).remove(); };

// --- 화면 전환 ---
function go(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

document.getElementById('start-btn').onclick = () => go('screen-main');
document.getElementById('go-history-from-intro').onclick = () => go('screen-history');
document.getElementById('go-history').onclick = () => go('screen-history');
document.getElementById('go-main').onclick = () => go('screen-main');

checkMondayReset();
