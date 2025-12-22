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

// 기기 ID 생성
if (!localStorage.getItem('gp_id')) {
    localStorage.setItem('gp_id', 'u_' + Math.random().toString(36).substr(2, 9));
}
const myId = localStorage.getItem('gp_id');
let currentData = null;

// --- 1. 절대 시간 타이머 (매주 월요일 0시 기준) ---
function updateTimer() {
    const now = new Date();
    const nextMonday = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);

    const diff = nextMonday - now;
    if (diff <= 0) { 
        db.ref('current').set(null); // 시간 완료 시 리셋
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

// --- 2. 강력한 초기화 함수 ---
function handleManualReset() {
    console.log("초기화 명령 전송...");
    // current 노드를 null로 설정 (삭제와 동일)
    db.ref('current').set(null, (error) => {
        if (error) {
            alert("초기화 실패: Firebase 권한을 확인하세요.\n" + error.message);
        } else {
            alert("초기화가 성공적으로 완료되었습니다.");
            location.reload(); // 성공 시 화면 강제 새로고침
        }
    });
}

// 버튼 클릭 이벤트 바인딩
document.getElementById('reset-btn').onclick = () => {
    if(confirm('메인 화면을 초기화할까요? (작성 중인 데이터가 사라집니다)')) {
        handleManualReset();
    }
};

// --- 3. 실시간 감시 및 UI 업데이트 ---
db.ref('current').on('value', (snapshot) => {
    currentData = snapshot.val();
    const msg = document.getElementById('status-msg');
    const inArea = document.getElementById('input-area');
    const resArea = document.getElementById('result-area');
    const rstBtn = document.getElementById('reset-btn');

    // 데이터 존재 여부에 따른 초기화 버튼 노출
    if (currentData && (currentData.mun || currentData.dap)) {
        rstBtn.classList.remove('hidden');
    } else {
        rstBtn.classList.add('hidden');
    }

    if (!currentData || !currentData.mun) {
        msg.innerText = "오늘의 암구호를 입력하세요 (문어)";
        inArea.classList.remove('hidden');
        resArea.classList.add('hidden');
    } else if (!currentData.dap) {
        if (currentData.u1 === myId) {
            msg.innerText = "상대방의 답어를 기다리고 있습니다.";
            inArea.classList.add('hidden');
        } else {
            msg.innerText = "문어에 대응하는 답어를 입력하세요";
            inArea.classList.remove('hidden');
        }
        resArea.classList.add('hidden');
    } else {
        // 완성 상태
        msg.innerText = "이번 주 암구호 동기화 완료";
        inArea.classList.add('hidden');
        resArea.classList.remove('hidden');
        document.getElementById('display-mun').innerText = currentData.mun;
        document.getElementById('display-dap').innerText = currentData.dap;
    }
});

// --- 4. 데이터 전송 ---
document.getElementById('submit-btn').onclick = () => {
    const val = document.getElementById('pass-input').value.trim();
    if (!val) return;
    const dateStr = new Date().toISOString().split('T')[0];

    if (!currentData || !currentData.mun) {
        // 문어 입력
        db.ref('current').set({ mun: val, u1: myId, date: dateStr });
    } else if (!currentData.dap && currentData.u1 !== myId) {
        // 답어 입력 -> 즉시 히스토리 저장
        db.ref('current').update({ dap: val, u2: myId });
        db.ref('history').push({
            date: dateStr,
            mun: currentData.mun,
            dap: val,
            status: "움직이면 쏜다"
        });
    }
    document.getElementById('pass-input').value = "";
};

// --- 5. 기록 화면 렌더링 ---
db.ref('history').on('value', (snapshot) => {
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = "";
    const data = snapshot.val();
    if (!data) return;
    const items = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
    items.forEach(item => {
        const tr = document.createElement('tr');
        const sClass = item.status === '통과' ? 'pass' : 'fail';
        tr.innerHTML = `
            <td>${item.date.slice(5)}</td>
            <td><strong>${item.mun}</strong> / ${item.dap}</td>
            <td>
                <select onchange="updateStatus('${item.id}', this.value)" class="status-select ${sClass}">
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
window.deleteItem = (key) => { if(confirm('이 기록을 삭제하시겠습니까?')) db.ref(`history/${key}`).remove(); };

// 화면 전환
function go(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
document.getElementById('start-btn').onclick = () => go('screen-main');
document.getElementById('go-history-from-intro').onclick = () => go('screen-history');
document.getElementById('go-history').onclick = () => go('screen-history');
document.getElementById('go-main').onclick = () => go('screen-main');
