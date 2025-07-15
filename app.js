/**
 * Bible Time for Family - 메인 애플리케이션
 * 앱 초기화, 탭 관리, 이벤트 처리 등을 담당
 */

// === 전역 변수 ===
let currentTab = 'reading';
let currentUserForModal = null;
let currentBook = null;
let currentProgressUserId = null;

// === 애플리케이션 초기화 ===
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Bible Time for Family - 애플리케이션 시작');
    
    // 1. 기본 이벤트 리스너 설정
    setupGlobalEventListeners();
    
    // 2. 컴포넌트 초기화
    initializeComponents();
    
    // 3. 데이터 초기화
    await initializeData();
    
    // 4. 기본 탭 활성화
    switchTab('reading');
});

/**
 * 전역 이벤트 리스너 설정
 */
function setupGlobalEventListeners() {
    // 테마 변경
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            document.body.className = e.target.value;
        });
    }
    
    // 동기화 버튼
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            // ⭐ 보류 중인 변경사항 정리 후 데이터 새로고침
            window.gapi.clearPendingChanges();
            initializeData();
        });
    }
}
/**
 * 컴포넌트 초기화
 */
function initializeComponents() {
    // 전역 컴포넌트 객체 초기화
    window.components = {};
    
    // 각 탭별 컴포넌트 인스턴스 생성
    window.components.reading = new ReadingComponent();
    window.components.meditation = new MeditationComponent();
    window.components.messages = new MessageBoardComponent();
    window.components.allowance = new AllowanceComponent();
    window.components.stats = new StatsComponent();
    
    // 탭 전환 이벤트 리스너 설정
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.currentTarget.getAttribute('data-tab');
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
    
    console.log('컴포넌트 초기화 완료');
}

/**
 * 탭 전환 함수
 */
function switchTab(tabName) {
    console.log('탭 전환:', tabName);
    
    if (!tabName) {
        console.error('탭 이름이 없습니다.');
        return;
    }
    
    currentTab = tabName;
    
    // 모든 탭 버튼의 활성 상태 제거
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.classList.remove('tab-active');
    });
    
    // 모든 탭 콘텐츠 숨기기
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // 선택된 탭 활성화
    const selectedTab = document.getElementById(`tab-${tabName}`);
    const selectedContent = document.getElementById(`content-${tabName}`);
    
    if (selectedTab && selectedContent) {
        selectedTab.classList.add('tab-active');
        selectedContent.classList.remove('hidden');
        
        // 해당 컴포넌트 렌더링
        if (window.components[tabName]) {
            window.components[tabName].render();
        }
        
        console.log('탭 전환 완료:', tabName);
    } else {
        console.error('탭 요소를 찾을 수 없음:', tabName);
    }
}
/**
 * 데이터 초기화
 */
async function initializeData() {
    updateConnectionStatus('loading');
    
    // 로컬 데이터 먼저 로드
    const localData = window.gapi.loadFromLocalStorage();
    if (localData && localData.family && localData.family.length > 0) {
        window.stateManager.updateMultipleStates({
            family: localData.family,
            readRecords: localData.readRecords,
            badges: localData.badges,
            meditations: localData.meditations,
            prayers: localData.prayers,
            messages: localData.messages,
            allowance: localData.allowance
        });
        
        if (localData.family.length > 0) {
            currentUserForModal = localData.family[0].id;
        }
        
        console.log('로컬 데이터 로드 완료');
    }
    
    // 서버 연결 시도
    try {
        await window.gapi.testConnection();
        updateConnectionStatus('connected');
        await loadAllDataAndRender();
    } catch (error) {
        updateConnectionStatus('disconnected');
        console.log('오프라인 모드로 시작합니다.');
    }
}

/**
 * 서버에서 모든 데이터 로드
 */
async function loadAllDataAndRender() {
    try {
        const allData = await window.gapi.loadAllData();
        
        // 상태 관리자에 데이터 업데이트
        window.stateManager.updateMultipleStates({
            family: allData.family_members || [],
            readRecords: allData.reading_records || {},
            badges: allData.badges || {},
            meditations: allData.meditations || [],
            prayers: allData.prayers || [],
            messages: allData.messages || [],
            allowance: allData.allowance_ledger || []
        });
        
        const family = window.stateManager.getState('family');
        if (family?.length > 0) {
            currentUserForModal = family[0].id;
            console.log('서버 데이터 로드 완료');
        } else if (window.gapi.isConnected) {
            alert("가족 정보가 없습니다. 구글 시트의 'family_members' 시트에 데이터를 추가해주세요.");
        }
    } catch (error) {
        console.error('전체 데이터 로드 실패:', error);
    }
}
/**
 * 연결 상태 표시 업데이트
 */
function updateConnectionStatus(status) {
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    const syncBtn = document.getElementById('sync-btn');
    const adminBtn = document.getElementById('admin-btn');
    
    if (indicator) indicator.classList.remove('loading');
    
    switch (status) {
        case 'connected':
            if (indicator) indicator.className = 'w-3 h-3 rounded-full bg-green-500';
            if (text) text.textContent = '온라인';
            if (syncBtn) syncBtn.classList.remove('hidden');
            if (adminBtn) adminBtn.classList.remove('hidden');
            break;
        case 'disconnected':
            if (indicator) indicator.className = 'w-3 h-3 rounded-full bg-red-500';
            if (text) text.textContent = '오프라인';
            if (syncBtn) syncBtn.classList.add('hidden');
            if (adminBtn) adminBtn.classList.add('hidden');
            break;
        case 'loading':
            if (indicator) indicator.className = 'w-3 h-3 rounded-full bg-yellow-500 loading';
            if (text) text.textContent = '연결 중...';
            if (syncBtn) syncBtn.classList.add('hidden');
            if (adminBtn) adminBtn.classList.add('hidden');
            break;
        case 'syncing':
            if (indicator) indicator.className = 'w-3 h-3 rounded-full bg-blue-500 loading';
            if (text) text.textContent = '동기화 중...';
            if (syncBtn) syncBtn.classList.add('hidden');
            if (adminBtn) adminBtn.classList.add('hidden');
            break;
    }
}

/**
 * 모달 관련 함수들
 */
window.openChapterModal = function(bookStr) {
    try {
        const book = JSON.parse(bookStr.replace(/&quot;/g, '"'));
        currentBook = book;
        
        // 모달 HTML 생성 및 표시
        const modal = document.getElementById('chapter-modal');
        if (modal) {
            modal.innerHTML = createChapterModalHTML(book);
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    } catch (error) {
        console.error('장 선택 모달 열기 실패:', error);
    }
};
/**
 * 장 선택 모달 HTML 생성
 */
function createChapterModalHTML(book) {
    const family = window.stateManager.getState('family');
    
    return `
        <div class="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold">${book.name}</h2>
                <button onclick="window.closeChapterModal()" class="text-3xl">&times;</button>
            </div>
            <div class="flex items-center gap-2 mb-4">
                <label for="modal-user-selector">체크할 사람:</label>
                <select id="modal-user-selector" class="p-1 border rounded" onchange="window.updateChapterButtonsForUser()">
                    ${family.map(member => `<option value="${member.id}">${member.name}</option>`).join('')}
                </select>
            </div>
            <div id="modal-chapters" class="flex-grow overflow-y-auto grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 p-2 accent-bg rounded custom-scrollbar">
                ${generateChapterButtons(book)}
            </div>
        </div>
    `;
}

/**
 * 장 버튼들 생성
 */
function generateChapterButtons(book) {
    const readRecords = window.stateManager.getState('readRecords');
    const userSelector = document.getElementById('modal-user-selector');
    const currentUserId = userSelector ? userSelector.value : (currentUserForModal || window.stateManager.getState('family')[0]?.id);
    
    let userRecordsForBook = [];
    if (readRecords[currentUserId] && readRecords[currentUserId][book.name]) {
        const bookData = readRecords[currentUserId][book.name];
        if (bookData.chapters && Array.isArray(bookData.chapters)) {
            userRecordsForBook = bookData.chapters;
        } else if (Array.isArray(bookData)) {
            userRecordsForBook = bookData;
        }
    }
    
    let buttons = '';
    for (let i = 1; i <= book.chapters; i++) {
        const isRead = userRecordsForBook.includes(i);
        buttons += `
            <button 
                class="p-2 rounded border transition-colors duration-200 chapter-btn-animate ${isRead ? 'bg-green-500 text-white border-green-500' : 'bg-white hover:bg-green-100'}"
                onclick="window.toggleChapterRead(${i}, this, {bookName: '${book.name}', userId: '${currentUserId}'})"
            >
                ${i}
            </button>
        `;
    }
    
    return buttons;
}

/**
 * ⭐ 사용자 선택 변경 시 장 버튼들 업데이트
 */
window.updateChapterButtonsForUser = function() {
    if (!currentBook) return;
    
    const modalChapters = document.getElementById('modal-chapters');
    if (modalChapters) {
        modalChapters.innerHTML = generateChapterButtons(currentBook);
    }
};
/**
 * 사용자 ID로 이름 조회 헬퍼 함수
 */
function getUserName(userId) {
    const family = window.stateManager.getState('family');
    const user = family.find(u => u.id === userId);
    return user ? user.name : '알 수 없음';
}

/**
 * 장 읽기 토글 (서버 응답 처리 방식으로 수정됨)
 */
window.toggleChapterRead = async function(chapterNumber, buttonElement, context) {
    const userSelector = document.getElementById('modal-user-selector');
    const userId = userSelector ? userSelector.value : context.userId;
    const { bookName } = context;

    // UI 즉시 업데이트 (사용자 경험을 위해)
    const isCurrentlyRead = buttonElement.classList.contains('bg-green-500');
    buttonElement.disabled = true; // 중복 클릭 방지

    try {
        if (isCurrentlyRead) {
            // --- 삭제 로직 ---
            buttonElement.className = 'p-2 rounded border transition-colors duration-200 chapter-btn-animate bg-white hover:bg-green-100';
            
            await window.gapi.deleteData({
                type: 'reading',
                userId,
                bookName,
                chapter: chapterNumber
            });
        } else {
            // --- 추가 로직 ---
            buttonElement.className = 'p-2 rounded border transition-colors duration-200 chapter-btn-animate bg-green-500 text-white border-green-500 checked';
            setTimeout(() => buttonElement.classList.remove('checked'), 600);
            
            await window.gapi.saveData({
                type: 'reading',
                userId,
                userName: getUserName(userId),
                bookName,
                chapter: chapterNumber
            });
        }
    } catch (error) {
        console.error('읽기 상태 변경 실패:', error);
        alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        // 오류 발생 시 UI 원상 복구 (필요 시)
        buttonElement.className = isCurrentlyRead 
            ? 'p-2 rounded border transition-colors duration-200 chapter-btn-animate bg-green-500 text-white border-green-500'
            : 'p-2 rounded border transition-colors duration-200 chapter-btn-animate bg-white hover:bg-green-100';
    } finally {
        // 읽기 기록 자체는 항상 로컬 데이터를 기준으로 최종 업데이트
        const readRecords = window.stateManager.getState('readRecords');
        if (!readRecords[userId]) readRecords[userId] = {};
        if (!readRecords[userId][bookName]) {
            readRecords[userId][bookName] = { chapters: [], readDates: {} };
        }
        const readList = readRecords[userId][bookName].chapters;
        const chapterIndex = readList.indexOf(chapterNumber);

        if (isCurrentlyRead && chapterIndex > -1) {
            readList.splice(chapterIndex, 1);
        } else if (!isCurrentlyRead && chapterIndex === -1) {
            readList.push(chapterNumber);
        }
        
        window.stateManager.updateState('readRecords', readRecords);
        buttonElement.disabled = false; // 버튼 다시 활성화
    }
};


/**
 * 모달 닫기
 */
window.closeChapterModal = function() {
    const modal = document.getElementById('chapter-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

// 진행 현황 모달
window.openProgressModal = function(userId) {
    currentProgressUserId = userId;
    const family = window.stateManager.getState('family');
    const user = family.find(u => u.id === userId);
    
    if (!user) {
        console.error('사용자를 찾을 수 없습니다:', userId);
        return;
    }
    
    console.log('진행 현황 모달 열기:', user.name);
    
    // 모달 HTML 생성 및 표시
    const modal = document.getElementById('progress-modal');
    if (modal) {
        modal.innerHTML = createProgressModalHTML(user);
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

/**
 * 진행 현황 모달 HTML 생성
 */
function createProgressModalHTML(user) {
    const readRecords = window.stateManager.getState('readRecords');
    const userRecords = readRecords[user.id] || {};
    
    return `
        <div class="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div class="flex items-center mb-4">
                <img src="${user.photo || 'https://placehold.co/80x80'}" class="w-16 h-16 rounded-full mr-4 object-cover" referrerpolicy="no-referrer">
                <div class="flex-grow">
                    <h2 class="text-2xl font-bold">${user.name}님의 진행 현황</h2>
                </div>
                <button onclick="window.closeProgressModal()" class="text-3xl">&times;</button>
            </div>
            
            <div class="border-b border-gray-200 mb-4">
                <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                    <button id="progress-tab-ot" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm tab-active" onclick="window.switchProgressTab('ot')">구약</button>
                    <button id="progress-tab-nt" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300" onclick="window.switchProgressTab('nt')">신약</button>
                </nav>
            </div>
            
            <div class="flex-grow overflow-y-auto custom-scrollbar pr-4">
                <div id="progress-content-ot">
                    ${generateProgressContent(userRecords, 'old')}
                </div>
                <div id="progress-content-nt" class="hidden">
                    ${generateProgressContent(userRecords, 'new')}
                </div>
            </div>
        </div>
    `;
}

/**
 * 진행 현황 콘텐츠 생성
 */
function generateProgressContent(userRecords, testament) {
    const books = BIBLE_BOOKS[testament];
    
    return books.map(book => {
        const bookData = userRecords[book.name];
        let readChapters = [];
        
        if (bookData && bookData.chapters && Array.isArray(bookData.chapters)) {
            readChapters = bookData.chapters;
        } else if (Array.isArray(bookData)) {
            readChapters = bookData;
        }
        
        const progress = book.chapters > 0 ? (readChapters.length / book.chapters) * 100 : 0;
        const isReading = readChapters.length > 0;
        
        return `
            <div class="mb-4 p-3 rounded-lg ${isReading ? 'highlight-bg' : 'bg-gray-50'} cursor-pointer hover:bg-blue-50 transition" onclick="window.openChapterModalFromProgress('${JSON.stringify(book).replace(/"/g, '&quot;')}', '${currentProgressUserId}')">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-bold">${book.name}</h4>
                    <span class="text-sm text-gray-600">${readChapters.length}/${book.chapters} 장</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div class="progress-bar-fill h-2.5 rounded-full" style="width: ${progress.toFixed(2)}%"></div>
                </div>
                <div class="text-xs text-gray-500">진행률: ${progress.toFixed(1)}% • 클릭하여 장 선택</div>
            </div>
        `;
    }).join('');
}

/**
 * 진행 현황 모달 탭 전환
 */
window.switchProgressTab = function(tab) {
    const tabOT = document.getElementById('progress-tab-ot');
    const tabNT = document.getElementById('progress-tab-nt');
    const contentOT = document.getElementById('progress-content-ot');
    const contentNT = document.getElementById('progress-content-nt');
    
    if (tab === 'ot') {
        tabOT.classList.add('tab-active');
        tabOT.classList.remove('border-transparent', 'text-gray-500');
        tabNT.classList.remove('tab-active');
        tabNT.classList.add('border-transparent', 'text-gray-500');
        contentOT.classList.remove('hidden');
        contentNT.classList.add('hidden');
    } else {
        tabNT.classList.add('tab-active');
        tabNT.classList.remove('border-transparent', 'text-gray-500');
        tabOT.classList.remove('tab-active');
        tabOT.classList.add('border-transparent', 'text-gray-500');
        contentNT.classList.remove('hidden');
        contentOT.classList.add('hidden');
    }
};

/**
 * 진행 현황 모달에서 장 선택 모달 열기
 */
window.openChapterModalFromProgress = function(bookStr, userId) {
    try {
        const book = JSON.parse(bookStr.replace(/&quot;/g, '"'));
        currentBook = book;
        
        // 현재 사용자를 설정
        currentUserForModal = userId;
        
        // 기존 진행 현황 모달 닫기
        window.closeProgressModal();
        
        // 장 선택 모달 열기
        const modal = document.getElementById('chapter-modal');
        if (modal) {
            modal.innerHTML = createChapterModalForUser(book, userId);
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    } catch (error) {
        console.error('장 선택 모달 열기 실패:', error);
    }
};

/**
 * 특정 사용자를 위한 장 선택 모달 HTML 생성
 */
function createChapterModalForUser(book, userId) {
    const family = window.stateManager.getState('family');
    const user = family.find(u => u.id === userId);
    
    return `
        <div class="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold">${book.name}</h2>
                <button onclick="window.closeChapterModal()" class="text-3xl">&times;</button>
            </div>
            <div class="flex items-center gap-2 mb-4">
                <span class="font-semibold">📖 ${user ? user.name : '알 수 없음'}님의 읽기 현황</span>
                <button onclick="window.reopenProgressModal()" class="text-sm text-blue-600 hover:underline">← 진행 현황으로 돌아가기</button>
            </div>
            <div id="modal-chapters" class="flex-grow overflow-y-auto grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 p-2 accent-bg rounded custom-scrollbar">
                ${generateChapterButtonsForUser(book, userId)}
            </div>
        </div>
    `;
}

/**
 * 특정 사용자를 위한 장 버튼들 생성
 */
function generateChapterButtonsForUser(book, userId) {
    const readRecords = window.stateManager.getState('readRecords');
    
    let userRecordsForBook = [];
    if (readRecords[userId] && readRecords[userId][book.name]) {
        const bookData = readRecords[userId][book.name];
        if (bookData.chapters && Array.isArray(bookData.chapters)) {
            userRecordsForBook = bookData.chapters;
        } else if (Array.isArray(bookData)) {
            userRecordsForBook = bookData;
        }
    }
    
    let buttons = '';
    for (let i = 1; i <= book.chapters; i++) {
        const isRead = userRecordsForBook.includes(i);
        buttons += `
            <button 
                class="p-2 rounded border transition-colors duration-200 chapter-btn-animate ${isRead ? 'bg-green-500 text-white border-green-500' : 'bg-white hover:bg-green-100'}"
                onclick="window.toggleChapterRead(${i}, this, {bookName: '${book.name}', userId: '${userId}'})"
            >
                ${i}
            </button>
        `;
    }
    
    return buttons;
}

/**
 * 진행 현황 모달 닫기
 */
window.closeProgressModal = function() {
    const modal = document.getElementById('progress-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

/**
 * 진행 현황 모달로 돌아가기
 */
window.reopenProgressModal = function() {
    window.closeChapterModal();
    if (currentProgressUserId) {
        window.openProgressModal(currentProgressUserId);
    }
};

/**
 * ⭐ 개발자 도구용 - 보류 중인 변경사항 정리
 */
window.clearPendingChanges = function() {
    if (window.gapi) {
        window.gapi.clearPendingChanges();
        console.log('보류 중인 변경사항이 정리되었습니다.');
    }
};

/**
 * ⭐ 개발자 도구용 - 비전통장 업데이트 테스트
 */
window.testAllowanceUpdate = async function() {
    console.log('=== 비전통장 업데이트 테스트 시작 ===');
    
    const family = window.stateManager.getState('family');
    const allowanceTargets = family.filter(member => member.is_allowance_target === true);
    
    console.log('1. 적립 대상자:', allowanceTargets.map(m => m.name));
    
    if (allowanceTargets.length > 0) {
        const testUser = allowanceTargets[0];
        console.log('2. 테스트 대상:', testUser.name, testUser.id);
        
        try {
            const result = await window.gapi.saveData({
                type: 'reading',
                userId: testUser.id,
                userName: testUser.name,
                bookName: '창세기',
                chapter: 999  // 테스트용 장 번호
            });
            
            console.log('3. 서버 응답:', result);
            
            const allowanceData = window.stateManager.getState('allowance');
            console.log('4. 현재 비전통장 데이터:', allowanceData.length, '개');
            console.log('5. 최근 3개 항목:', allowanceData.slice(-3));
            
        } catch (error) {
            console.error('테스트 실패:', error);
        }
    } else {
        console.log('적립 대상자가 없습니다.');
    }
};

/**
 * ⭐ 개발자 도구용 - 가족 정보 확인
 */
window.checkFamilyInfo = function() {
    const family = window.stateManager.getState('family');
    console.log('=== 가족 정보 ===');
    family.forEach(member => {
        console.log(`${member.name} (${member.id}): 적립대상=${member.is_allowance_target}`);
    });
    return family;
};

console.log('앱 모듈이 로드되었습니다.');