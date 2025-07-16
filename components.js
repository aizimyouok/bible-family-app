/**
 * Bible Time for Family - UI 컴포넌트들
 * 각 탭별 UI 컴포넌트와 모달 컴포넌트들을 관리
 */

// === 성경 책 정보 (클라이언트에서 사용) ===
const BIBLE_BOOKS = {
    old: [
        { name: '창세기', chapters: 50 }, { name: '출애굽기', chapters: 40 }, { name: '레위기', chapters: 27 },
        { name: '민수기', chapters: 36 }, { name: '신명기', chapters: 34 }, { name: '여호수아', chapters: 24 },
        { name: '사사기', chapters: 21 }, { name: '룻기', chapters: 4 }, { name: '사무엘상', chapters: 31 },
        { name: '사무엘하', chapters: 24 }, { name: '열왕기상', chapters: 22 }, { name: '열왕기하', chapters: 25 },
        { name: '역대상', chapters: 29 }, { name: '역대하', chapters: 36 }, { name: '에스라', chapters: 10 },
        { name: '느헤미야', chapters: 13 }, { name: '에스더', chapters: 10 }, { name: '욥기', chapters: 42 },
        { name: '시편', chapters: 150 }, { name: '잠언', chapters: 31 }, { name: '전도서', chapters: 12 },
        { name: '아가', chapters: 8 }, { name: '이사야', chapters: 66 }, { name: '예레미야', chapters: 52 },
        { name: '예레미야애가', chapters: 5 }, { name: '에스겔', chapters: 48 }, { name: '다니엘', chapters: 12 },
        { name: '호세아', chapters: 14 }, { name: '요엘', chapters: 3 }, { name: '아모스', chapters: 9 },
        { name: '오바댜', chapters: 1 }, { name: '요나', chapters: 4 }, { name: '미가', chapters: 7 },
        { name: '나훔', chapters: 3 }, { name: '하박국', chapters: 3 }, { name: '스바냐', chapters: 3 },
        { name: '학개', chapters: 2 }, { name: '스가랴', chapters: 14 }, { name: '말라기', chapters: 4 }
    ],
    new: [
        { name: '마태복음', chapters: 28 }, { name: '마가복음', chapters: 16 }, { name: '누가복음', chapters: 24 },
        { name: '요한복음', chapters: 21 }, { name: '사도행전', chapters: 28 }, { name: '로마서', chapters: 16 },
        { name: '고린도전서', chapters: 16 }, { name: '고린도후서', chapters: 13 }, { name: '갈라디아서', chapters: 6 },
        { name: '에베소서', chapters: 6 }, { name: '빌립보서', chapters: 4 }, { name: '골로새서', chapters: 4 },
        { name: '데살로니가전서', chapters: 5 }, { name: '데살로니가후서', chapters: 3 }, { name: '디모데전서', chapters: 6 },
        { name: '디모데후서', chapters: 4 }, { name: '디도서', chapters: 3 }, { name: '빌레몬서', chapters: 1 },
        { name: '히브리서', chapters: 13 }, { name: '야고보서', chapters: 5 }, { name: '베드로전서', chapters: 5 },
        { name: '베드로후서', chapters: 3 }, { name: '요한1서', chapters: 5 }, { name: '요한2서', chapters: 1 },
        { name: '요한3서', chapters: 1 }, { name: '유다서', chapters: 1 }, { name: '요한계시록', chapters: 22 }
    ]
};

const TOTAL_OT_CHAPTERS = BIBLE_BOOKS.old.reduce((s, b) => s + b.chapters, 0);
const TOTAL_NT_CHAPTERS = BIBLE_BOOKS.new.reduce((s, b) => s + b.chapters, 0);

/**
 * 기본 컴포넌트 클래스
 */
class BaseComponent {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.unsubscribers = [];
    }
    
    /**
     * 상태 구독
     */
    subscribe(key, callback) {
        const unsubscriber = window.stateManager.subscribe(key, callback);
        this.unsubscribers.push(unsubscriber);
    }
    
    /**
     * 컴포넌트 정리 (메모리 누수 방지)
     */
    destroy() {
        this.unsubscribers.forEach(unsubscriber => unsubscriber());
        this.unsubscribers = [];
    }
    
    /**
     * 렌더링 메서드 (⭐ 옵저버 시스템에 의해 호출)
     */
    render() {
        // 탭이 활성화 상태일 때만 렌더링하도록 하여 불필요한 렌더링 방지
        if (this.container && !this.container.classList.contains('hidden')) {
            this._doRender();
        }
    }

    // 실제 렌더링 로직
    _doRender() {
        throw new Error('render() method must be implemented by subclass');
    }
    
    /**
     * ⭐ 데이터만 업데이트 (이제 옵저버 차단으로 불필요)
     */
    updateDataOnly() {
        // ⭐ 이제 백그라운드 동기화시 옵저버가 차단되므로 render()와 동일
        this.render();
    }
}
/**
 * 말씀읽기 탭 컴포넌트
 */
class ReadingComponent extends BaseComponent {
    constructor() {
        super('content-reading');
        this.currentUserForModal = null;
        this.currentBook = null;
        
        // 상태 구독
        this.subscribe('family', () => this.render());
        this.subscribe('readRecords', () => this.render());
    }
    
    render() {
        const family = window.stateManager.getState('family');
        if (!family || family.length === 0) {
            this.container.innerHTML = '<div class="text-center p-8">가족 정보를 로드하는 중...</div>';
            return;
        }
        
        if (!this.currentUserForModal) {
            this.currentUserForModal = family[0].id;
        }
        
        this.container.innerHTML = `
            <!-- 오늘의 지혜 말씀 -->
            <section class="mb-8 text-center p-6 border-2 border-dashed slide-in" style="border-color: var(--border-color);">
                <h2 class="text-xl font-bold font-myeongjo accent-text mb-2">오늘의 지혜 말씀</h2>
                <p id="wisdom-verse" class="text-lg">${this.getRandomVerse()}</p>
            </section>

            <!-- 리더보드 -->
            <section id="leaderboard" class="mb-8 leaderboard-animate">
                ${this.renderLeaderboard()}
            </section>
            
            <!-- 가족 대시보드 -->
            <section id="family-dashboard" class="mb-8 accent-bg rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-center text-center">
                ${this.renderFamilyDashboard()}
            </section>
            
            <!-- 성경 책 목록 -->
            <section class="mb-8 space-y-4">
                <details class="group">
                    <summary class="text-2xl font-bold text-center cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition">
                        <span class="group-open:hidden">📖 구약 성경 펼치기 ▼</span>
                        <span class="hidden group-open:inline">📖 구약 성경 접기 ▲</span>
                    </summary>
                    <div class="mt-4">
                        <h3 class="text-xl font-semibold mb-3 text-center accent-text">구약 (39권)</h3>
                        <div id="old-testament" class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                            ${this.renderBibleBooks('old')}
                        </div>
                    </div>
                </details>
                <details class="group">
                    <summary class="text-2xl font-bold text-center cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition">
                        <span class="group-open:hidden">📖 신약 성경 펼치기 ▼</span>
                        <span class="hidden group-open:inline">📖 신약 성경 접기 ▲</span>
                    </summary>
                    <div class="mt-4">
                        <h3 class="text-xl font-semibold mb-3 text-center accent-text">신약 (27권)</h3>
                        <div id="new-testament" class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                            ${this.renderBibleBooks('new')}
                        </div>
                    </div>
                </details>
            </section>
        `;
    }
    getRandomVerse() {
        const verses = [
            "자녀들아 주 안에서 너희 부모에게 순종하라 이것이 옳으니라 (에베소서 6:1)",
            "여호와는 나의 목자시니 내게 부족함이 없으리로다 (시편 23:1)",
            "주 너의 하나님을 사랑하고 또한 네 이웃을 네 자신 같이 사랑하라 (마태복음 22:37-39)",
            "항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라 (데살로니가전서 5:16-18)",
            "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라 (마태복음 11:28)",
            "두려워하지 말라 내가 너와 함께 함이라 놀라지 말라 나는 네 하나님이 됨이라 (이사야 41:10)",
            "사람이 마음으로 자기의 길을 계획할지라도 그의 걸음을 인도하시는 이는 여호와시니라 (잠언 16:9)",
            "그런즉 너희는 먼저 그의 나라와 그의 의를 구하라 그리하면 이 모든 것을 너희에게 더하시리라 (마태복음 6:33)",
            "내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라 (빌립보서 4:13)"
        ];
        return verses[Math.floor(Math.random() * verses.length)];
    }
    
    renderLeaderboard() {
        const family = window.stateManager.getState('family');
        const readRecords = window.stateManager.getState('readRecords');
        
        if (!family || family.length === 0) {
            return '<div class="text-center p-4 accent-bg rounded-lg">가족 정보를 로드하는 중...</div>';
        }

        const rankedUsers = family.map(member => {
            const userRecords = readRecords[member.id] || {};
            const chaptersRead = Object.values(userRecords).reduce((sum, bookData) => {
                if (bookData && bookData.chapters && Array.isArray(bookData.chapters)) {
                    return sum + bookData.chapters.length;
                }
                if (Array.isArray(bookData)) {
                    return sum + bookData.length;
                }
                return sum;
            }, 0);
            return { ...member, chaptersRead };
        }).sort((a, b) => b.chaptersRead - a.chaptersRead);

        if (rankedUsers[0].chaptersRead === 0) {
            return '<div class="text-center p-4 accent-bg rounded-lg slide-in"><p>아직 성경 읽기 기록이 없습니다. 함께 시작해볼까요?</p></div>';
        }

        const topScore = rankedUsers[0].chaptersRead;
        const winners = rankedUsers.filter(user => user.chaptersRead === topScore);
        const others = rankedUsers.filter(user => user.chaptersRead < topScore);

        const winnersHTML = `
            <div class="text-center">
                <h3 class="text-xl font-bold accent-text mb-2">${winners.length > 1 ? '🏆 공동 1등! 🏆' : '🏆 말씀 읽기 1등! 🏆'}</h3>
                <div class="flex items-center justify-center gap-4">
                    <div class="flex -space-x-4">
                        ${winners.map(winner => `<img src="${winner.photo || 'https://placehold.co/80x80/cccccc/FFFFFF?text=?'}" alt="${winner.name}" class="w-16 h-16 rounded-full border-4 border-yellow-400 object-cover" referrerpolicy="no-referrer">`).join('')}
                    </div>
                    <div>
                        <p class="text-xl font-bold">${winners.map(w => w.name).join(', ')}</p>
                        <p class="text-lg">${topScore}장</p>
                    </div>
                </div>
            </div>`;

        let othersHTML = '<div class="w-full md:w-auto mt-4 md:mt-0">';
        if (others.length > 0) {
            let currentRank = winners.length + 1;
            others.slice(0, 3).forEach(user => {
                othersHTML += `
                    <div class="flex items-center justify-between text-sm mb-2 slide-in">
                        <div class="flex items-center">
                            <span class="font-bold w-8 text-left">${currentRank}.</span>
                            <img src="${user.photo || 'https://placehold.co/40x40/cccccc/FFFFFF?text=?'}" alt="${user.name}" class="w-8 h-8 rounded-full mr-2 object-cover" referrerpolicy="no-referrer">
                            <span>${user.name}</span>
                        </div>
                        <span class="font-semibold">${user.chaptersRead}장</span>
                    </div>`;
                currentRank++;
            });
        }
        othersHTML += '</div>';

        return `<div class="p-4 accent-bg rounded-lg flex flex-col md:flex-row items-center justify-center md:gap-8 lg:gap-16 slide-in">${winnersHTML}${othersHTML}</div>`;
    }
    renderFamilyDashboard() {
        const family = window.stateManager.getState('family');
        const readRecords = window.stateManager.getState('readRecords');
        
        if (!family || family.length === 0) return '';
        
        return family.map(member => {
            const userRecords = readRecords[member.id] || {};
            
            const otRead = BIBLE_BOOKS.old.reduce((sum, book) => {
                const bookData = userRecords[book.name];
                if (bookData && bookData.chapters && Array.isArray(bookData.chapters)) {
                    return sum + bookData.chapters.length;
                }
                if (Array.isArray(bookData)) {
                    return sum + bookData.length;
                }
                return sum;
            }, 0);
            
            const ntRead = BIBLE_BOOKS.new.reduce((sum, book) => {
                const bookData = userRecords[book.name];
                if (bookData && bookData.chapters && Array.isArray(bookData.chapters)) {
                    return sum + bookData.chapters.length;
                }
                if (Array.isArray(bookData)) {
                    return sum + bookData.length;
                }
                return sum;
            }, 0);
            
            const totalRead = otRead + ntRead;
            const totalChapters = TOTAL_OT_CHAPTERS + TOTAL_NT_CHAPTERS;
            
            return `
                <div class="flex flex-col items-center cursor-pointer hover:opacity-80 transition slide-in" onclick="window.openProgressModal('${member.id}')">
                    <img src="${member.photo || 'https://placehold.co/80x80/cccccc/FFFFFF?text=?'}" alt="${member.name}" class="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-white/50 object-cover shadow-md" referrerpolicy="no-referrer">
                    <div class="font-bold mt-2">${member.title} (${member.name})</div>
                    <div class="text-sm mt-2 space-y-1">
                        <div><strong>총:</strong> ${totalRead} / ${totalChapters}</div>
                        <div class="text-xs"><strong>구약:</strong> ${otRead}/${TOTAL_OT_CHAPTERS} | <strong>신약:</strong> ${ntRead}/${TOTAL_NT_CHAPTERS}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderBibleBooks(testament) {
        const books = BIBLE_BOOKS[testament];
        return books.map(book => `
            <button class="p-2 text-sm rounded-md shadow-sm transition-all duration-200 accent-bg hover:shadow-lg hover:-translate-y-1" onclick="window.openChapterModal('${JSON.stringify(book).replace(/"/g, '&quot;')}')">
                ${book.name}
            </button>
        `).join('');
    }
    
    /**
     * ⭐ 데이터 전용 업데이트 (읽기 탭 - 부분 업데이트로 깜빡임 방지)
     */
    updateDataOnly() {
        if (this.container && !this.container.classList.contains('hidden')) {
            console.log('ReadingComponent: 부분 데이터 업데이트 (깜빡임 방지)');
            
            try {
                // ⭐ 리더보드만 조용히 업데이트
                const leaderboard = document.getElementById('leaderboard');
                if (leaderboard) {
                    leaderboard.innerHTML = this.renderLeaderboard();
                }
                
                // ⭐ 가족 대시보드만 조용히 업데이트
                const familyDashboard = document.getElementById('family-dashboard');
                if (familyDashboard) {
                    familyDashboard.innerHTML = this.renderFamilyDashboard();
                }
                
                console.log('✅ ReadingComponent 부분 업데이트 완료');
            } catch (error) {
                console.warn('ReadingComponent 부분 업데이트 실패, 전체 렌더링:', error);
                this.render();
            }
        }
    }
}

/**
 * 묵상기도 탭 컴포넌트
 */
class MeditationComponent extends BaseComponent {
    constructor() {
        super('content-meditation');
        
        // 상태 구독
        this.subscribe('family', () => this.render());
        this.subscribe('meditations', () => this.renderMeditations());
        this.subscribe('prayers', () => this.renderPrayers());
    }
    
    render() {
        const family = window.stateManager.getState('family');
        if (!family || family.length === 0) {
            this.container.innerHTML = '<div class="text-center p-8">가족 정보를 로드하는 중...</div>';
            return;
        }
        
        this.container.innerHTML = `
            <div class="grid grid-cols-1 gap-6">
                <!-- 가족 기도 노트 (위로 이동) -->
                <div class="accent-bg rounded-lg p-4">
                    <h3 class="text-xl font-bold mb-3">🙏 가족 기도 노트</h3>
                    <div id="prayer-list" class="h-64 overflow-y-auto custom-scrollbar pr-2 mb-3 bg-white/50 rounded p-2">
                        <!-- 기도 목록이 여기에 렌더링됩니다 -->
                    </div>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <select id="prayer-user" class="p-2 rounded-md w-full sm:w-auto" style="border-color: var(--border-color);">
                            ${this.renderUserOptions()}
                        </select>
                        <input type="text" id="prayer-input" class="flex-grow p-2 rounded-md min-w-0" placeholder="함께 기도할 제목을 나눠요..." style="border-color: var(--border-color);">
                        <button id="add-prayer" class="bg-white/80 hover:bg-white p-2 rounded-md shadow whitespace-nowrap">등록</button>
                    </div>
                </div>

                <!-- 가족 묵상 나눔 (아래로 이동) -->
                <div class="accent-bg rounded-lg p-4">
                    <h3 class="text-xl font-bold mb-3">💬 가족 묵상 나눔</h3>
                    <div id="meditation-list" class="h-64 overflow-y-auto custom-scrollbar pr-2 mb-3 bg-white/50 rounded p-2">
                        <!-- 묵상 목록이 여기에 렌더링됩니다 -->
                    </div>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <select id="meditation-user" class="p-2 rounded-md w-full sm:w-auto" style="border-color: var(--border-color);">
                            ${this.renderUserOptions()}
                        </select>
                        <input type="text" id="meditation-input" class="flex-grow p-2 rounded-md min-w-0" placeholder="오늘의 묵상을 나눠보세요..." style="border-color: var(--border-color);">
                        <button id="add-meditation" class="bg-white/80 hover:bg-white p-2 rounded-md shadow whitespace-nowrap">등록</button>
                    </div>
                </div>
            </div>

            <!-- 묵상 도우미 -->
            <div class="mt-6 accent-bg rounded-lg p-4">
                <h3 class="text-lg font-bold mb-3 accent-text">💡 묵상 도우미</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div class="bg-white/50 p-3 rounded">
                        <h4 class="font-semibold mb-2">🤔 질문하기</h4>
                        <p class="text-gray-600">이 말씀이 내 삶에 어떤 의미일까?</p>
                    </div>
                    <div class="bg-white/50 p-3 rounded">
                        <h4 class="font-semibold mb-2">❤️ 감사하기</h4>
                        <p class="text-gray-600">오늘 하나님께 감사한 일은?</p>
                    </div>
                    <div class="bg-white/50 p-3 rounded">
                        <h4 class="font-semibold mb-2">🎯 적용하기</h4>
                        <p class="text-gray-600">내일 실천할 수 있는 것은?</p>
                    </div>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
        this.renderMeditations();
        this.renderPrayers();
    }
    renderUserOptions() {
        const family = window.stateManager.getState('family');
        return family.map(member => 
            `<option value="${member.id}">${member.name}</option>`
        ).join('');
    }
    
    renderMeditations() {
        const list = document.getElementById('meditation-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        const family = window.stateManager.getState('family');
        const meditations = window.stateManager.getState('meditations') || [];
        const currentUserId = document.getElementById('meditation-user')?.value;
        
        meditations.forEach(item => {
            const user = family.find(u => u.id === item.user_id);
            const itemEl = document.createElement('div');
            itemEl.className = 'p-2 mb-2 rounded bg-white/70 text-sm slide-in';
            
            const likeCount = item.like_count || 0;
            const isCurrentUser = item.user_id === currentUserId;
            
            let buttons = '';
            if (isCurrentUser) {
                buttons += `<button onclick="window.editMeditation('${item.id}')" class="text-xs text-blue-600 hover:underline mr-2">수정</button>`;
                buttons += `<button onclick="window.deleteMeditation('${item.id}')" class="text-xs text-red-600 hover:underline">삭제</button>`;
            }
            
            itemEl.innerHTML = `
                <div><strong class="accent-text">${user ? user.name : '?'}:</strong> ${item.content}</div>
                <div class="flex justify-between items-center mt-2">
                    <div class="text-gray-500 text-xs">${formatDate(item.timestamp || item.id)}</div>
                    <div class="flex items-center gap-2">
                        <button onclick="window.likeMeditation('${item.id}')" class="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                            ❤️ <span>${likeCount}</span>
                        </button>
                        <div class="text-xs">${buttons}</div>
                    </div>
                </div>
            `;
            list.appendChild(itemEl);
        });
        
        list.scrollTop = list.scrollHeight;
    }
    
    renderPrayers() {
        const list = document.getElementById('prayer-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        const family = window.stateManager.getState('family');
        const prayers = window.stateManager.getState('prayers') || [];
        const currentUserId = document.getElementById('prayer-user')?.value;
        
        prayers.forEach(item => {
            const user = family.find(u => u.id === item.user_id);
            const itemEl = document.createElement('div');
            itemEl.className = 'p-2 mb-2 rounded bg-white/70 text-sm slide-in';
            
            const likeCount = item.like_count || 0;
            const isCurrentUser = item.user_id === currentUserId;
            
            let buttons = '';
            if (isCurrentUser) {
                buttons += `<button onclick="window.editPrayer('${item.id}')" class="text-xs text-blue-600 hover:underline mr-2">수정</button>`;
                buttons += `<button onclick="window.deletePrayer('${item.id}')" class="text-xs text-red-600 hover:underline">삭제</button>`;
            }
            
            itemEl.innerHTML = `
                <div><strong class="accent-text">${user ? user.name : '?'}:</strong> ${item.content}</div>
                <div class="flex justify-between items-center mt-2">
                    <div class="text-gray-500 text-xs">${formatDate(item.timestamp || item.id)}</div>
                    <div class="flex items-center gap-2">
                        <button onclick="window.likePrayer('${item.id}')" class="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                            ❤️ <span>${likeCount}</span>
                        </button>
                        <div class="text-xs">${buttons}</div>
                    </div>
                </div>
            `;
            list.appendChild(itemEl);
        });
        
        list.scrollTop = list.scrollHeight;
    }
    attachEventListeners() {
        // 묵상 추가
        const addMeditationBtn = document.getElementById('add-meditation');
        const meditationInput = document.getElementById('meditation-input');
        const meditationUser = document.getElementById('meditation-user');
        
        if (addMeditationBtn) {
            addMeditationBtn.addEventListener('click', () => this.addMeditation());
        }
        
        if (meditationInput) {
            meditationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addMeditation();
            });
        }
        
        if (meditationUser) {
            meditationUser.addEventListener('change', () => this.renderMeditations());
        }
        
        // 기도 추가
        const addPrayerBtn = document.getElementById('add-prayer');
        const prayerInput = document.getElementById('prayer-input');
        const prayerUser = document.getElementById('prayer-user');
        
        if (addPrayerBtn) {
            addPrayerBtn.addEventListener('click', () => this.addPrayer());
        }
        
        if (prayerInput) {
            prayerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addPrayer();
            });
        }
        
        if (prayerUser) {
            prayerUser.addEventListener('change', () => this.renderPrayers());
        }
    }
    
    async addMeditation() {
        const userInput = document.getElementById('meditation-user');
        const textInput = document.getElementById('meditation-input');
        
        if (!textInput || textInput.value.trim() === '') return;
        
        const content = textInput.value.trim();
        textInput.value = '';
        textInput.disabled = true;
        
        try {
            const family = window.stateManager.getState('family');
            const user = family.find(u => u.id === userInput.value);
            
            // ⭐ 서버에 즉시 저장
            const result = await window.gapi.saveData({
                type: 'meditation',
                userId: userInput.value,
                userName: user ? user.name : '알 수 없음',
                content: content
            });
            
            // 서버 저장 성공 시 로컬 상태 업데이트
            const meditations = window.stateManager.getState('meditations');
            meditations.push({
                id: result.data.id,
                user_id: userInput.value,
                user_name: user ? user.name : '알 수 없음',
                timestamp: result.data.timestamp,
                content: content,
                like_count: 0
            });
            window.stateManager.updateState('meditations', meditations);
            
            textInput.disabled = false;
            
        } catch (error) {
            console.error('묵상 저장 실패:', error);
            alert('묵상 저장에 실패했습니다. 다시 시도해주세요.');
            textInput.value = content; // 내용 복구
            textInput.disabled = false;
        }
    }
    
    async addPrayer() {
        const userInput = document.getElementById('prayer-user');
        const textInput = document.getElementById('prayer-input');
        
        if (!textInput || textInput.value.trim() === '') return;
        
        const content = textInput.value.trim();
        textInput.value = '';
        textInput.disabled = true;
        
        try {
            const family = window.stateManager.getState('family');
            const user = family.find(u => u.id === userInput.value);
            
            // ⭐ 서버에 즉시 저장
            const result = await window.gapi.saveData({
                type: 'prayer',
                userId: userInput.value,
                userName: user ? user.name : '알 수 없음',
                content: content
            });
            
            // 서버 저장 성공 시 로컬 상태 업데이트
            const prayers = window.stateManager.getState('prayers');
            prayers.push({
                id: result.data.id,
                user_id: userInput.value,
                user_name: user ? user.name : '알 수 없음',
                timestamp: result.data.timestamp,
                content: content,
                like_count: 0
            });
            window.stateManager.updateState('prayers', prayers);
            
            textInput.disabled = false;
            
        } catch (error) {
            console.error('기도제목 저장 실패:', error);
            alert('기도제목 저장에 실패했습니다. 다시 시도해주세요.');
            textInput.value = content; // 내용 복구
            textInput.disabled = false;
        }
    }
    
    /**
     * ⭐ 데이터만 업데이트 (묵상 기도 - 애니메이션 없이 부분 업데이트)
     */
    updateDataOnly() {
        if (this.container && !this.container.classList.contains('hidden')) {
            console.log('MeditationComponent: 데이터 전용 업데이트 (깜빡거림 방지)');
            
            // ⭐ 묵상 목록과 기도 목록만 업데이트
            this.renderMeditations();
            this.renderPrayers();
        }
    }
}
/**
 * 메시지보드 탭 컴포넌트
 */
class MessageBoardComponent extends BaseComponent {
    constructor() {
        super('content-messages');
        
        // 상태 구독 (댓글 제거)
        this.subscribe('family', () => this.render());
        this.subscribe('messages', () => this.renderMessages());
    }
    
    render() {
        const family = window.stateManager.getState('family');
        if (!family || family.length === 0) {
            this.container.innerHTML = '<div class="text-center p-8">가족 정보를 로드하는 중...</div>';
            return;
        }
        
        this.container.innerHTML = `
            <!-- 사랑의 대화 -->
            <section class="mb-6 accent-bg rounded-lg p-4">
                <h3 class="text-xl font-bold mb-3">💝 사랑의 대화</h3>
                <div id="message-board-list" class="h-[32rem] overflow-y-auto custom-scrollbar pr-2 mb-3 bg-white/50 rounded p-2 space-y-3">
                    <!-- 메시지 목록이 여기에 렌더링됩니다 -->
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <select id="message-user" class="p-2 rounded-md w-full sm:w-auto" style="border-color: var(--border-color);">
                        ${this.renderUserOptions()}
                    </select>
                    <textarea id="message-input" class="flex-grow p-2 rounded-md min-w-0" placeholder="가족에게 남길 따뜻한 메시지를 작성하세요..." rows="1" style="border-color: var(--border-color);"></textarea>
                    <button id="add-message" class="bg-white/80 hover:bg-white p-2 rounded-md shadow whitespace-nowrap">💌 메시지 남기기</button>
                </div>
            </section>
        `;
        
        this.attachEventListeners();
        this.renderMessages();
    }
    
    renderUserOptions() {
        const family = window.stateManager.getState('family');
        return family.map(member => 
            `<option value="${member.id}">${member.name}</option>`
        ).join('');
    }
    
    renderMessages() {
        const list = document.getElementById('message-board-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        const family = window.stateManager.getState('family');
        const messages = window.stateManager.getState('messages') || [];
        const currentUserId = document.getElementById('message-user')?.value;

        // 공지와 일반 메시지 분리
        const notices = messages.filter(m => m.is_notice === true);
        const regularMessages = messages.filter(m => m.is_notice !== true);
        
        const sortedMessages = regularMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (messages.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-500 p-8">가족에게 따뜻한 첫 메시지를 남겨보세요! 💝</div>';
            return;
        }

        // 공지 먼저 렌더링
        notices.forEach(message => {
            list.appendChild(this.createMessageElement(message, family, currentUserId, true));
        });
        
        // 일반 메시지 렌더링
        sortedMessages.forEach(message => {
            list.appendChild(this.createMessageElement(message, family, currentUserId, false));
        });
    }

    // [새로 추가] 메시지 HTML 요소를 생성하는 헬퍼 함수
    createMessageElement(message, family, currentUserId, isNotice) {
        const user = family.find(u => u.id === message.user_id);
        const messageEl = document.createElement('div');
        
        // 공지일 경우 스타일 변경
        messageEl.className = isNotice 
            ? 'p-3 bg-yellow-100 rounded-lg shadow-md border-l-4 border-yellow-400' 
            : 'p-3 bg-white/80 rounded-lg shadow-sm';
        
        const likeCount = message.like_count || 0;
        const isCurrentUser = message.user_id === currentUserId;
        
        messageEl.innerHTML = `
            <div class="flex items-start gap-3">
                <img src="${user ? user.photo : 'https://placehold.co/40x40'}" class="w-10 h-10 rounded-full object-cover" referrerpolicy="no-referrer">
                <div class="flex-grow min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        ${isNotice ? '<span class="text-yellow-600 font-bold">📌 공지</span>' : ''}
                        <span class="font-bold text-sm flex-shrink-0">${user ? user.name : '알 수 없음'}:</span>
                    </div>
                    <p class="text-sm whitespace-pre-wrap flex-grow min-w-0 mb-2">${message.content}</p>
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-gray-500">${new Date(message.timestamp).toLocaleString('ko-KR')}</span>
                        <div class="flex items-center gap-3">
                            <button onclick="window.toggleMessageNotice('${message.id}')" class="text-gray-600 hover:text-blue-500 flex items-center gap-1">
                                📌 ${isNotice ? '공지 해제' : '공지로 등록'}
                            </button>
                            <button onclick="window.likeMessage('${message.id}')" class="text-gray-600 hover:text-red-500 flex items-center gap-1">
                                ❤️ ${likeCount}
                            </button>
                            ${isCurrentUser ? `
                                <button onclick="window.editMessage('${message.id}')" class="text-blue-600 hover:underline">수정</button>
                                <button onclick="window.deleteMessage('${message.id}')" class="text-red-600 hover:underline">삭제</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        return messageEl;
    }
    
    attachEventListeners() {
        // 메시지 추가
        const addMessageBtn = document.getElementById('add-message');
        const messageInput = document.getElementById('message-input');
        
        if (addMessageBtn) {
            addMessageBtn.addEventListener('click', () => this.addMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.addMessage();
                }
            });
        }
    }
    
    async addMessage() {
        const userInput = document.getElementById('message-user');
        const textInput = document.getElementById('message-input');
        const content = textInput.value.trim();
        
        if (!content) return;
        
        try {
            const family = window.stateManager.getState('family');
            const user = family.find(u => u.id === userInput.value);
            
            // ⭐ 서버에 즉시 저장 (낙관적 업데이트 제거)
            textInput.value = '';
            textInput.disabled = true;
            
            const result = await window.gapi.saveData({
                type: 'message',
                userId: userInput.value,
                userName: user ? user.name : '알 수 없음',
                content: content
            });
            
            // 서버 저장 성공 시 로컬 상태 업데이트
            const messages = window.stateManager.getState('messages');
            messages.push({
                id: result.data.id,
                user_id: userInput.value,
                user_name: user ? user.name : '알 수 없음',
                timestamp: result.data.timestamp,
                content: content,
                like_count: 0
            });
            window.stateManager.updateState('messages', messages);
            
            textInput.disabled = false;
            
        } catch (e) {
            console.error('메시지 저장 실패:', e);
            alert('메시지 저장에 실패했습니다. 다시 시도해주세요.');
            textInput.disabled = false;
        }
    }
    
    /**
     * ⭐ 데이터만 업데이트 (메시지 보드 - 애니메이션 없이 부분 업데이트)
     */
    updateDataOnly() {
        if (this.container && !this.container.classList.contains('hidden')) {
            console.log('MessageBoardComponent: 데이터 전용 업데이트 (깜빡거림 방지)');
            
            // ⭐ 메시지 목록만 업데이트
            this.renderMessages();
        }
    }
}

/**
 * 비전통장 탭 컴포넌트 (성경읽기 적립 시스템)
 */
class AllowanceComponent extends BaseComponent {
    constructor() {
        super('content-allowance');
        
        // ⭐ 상태 구독: 데이터 변경 시 전체를 다시 그리도록 render()를 직접 호출
        this.subscribe('family', () => {
            console.log('AllowanceComponent: family 상태 변경 감지');
            this.render();
        });
        this.subscribe('allowance', () => {
            console.log('AllowanceComponent: allowance 상태 변경 감지');
            this.render();
        });
        this.subscribe('readRecords', () => {
            console.log('AllowanceComponent: readRecords 상태 변경 감지 (비전통장 적립 가능성)');
            this.render();
        });
    }
    
    render() {
        console.log('AllowanceComponent render 시작');
        const family = window.stateManager.getState('family');
        if (!family || family.length === 0) {
            this.container.innerHTML = '<div class="text-center p-8">가족 정보를 로드하는 중...</div>';
            return;
        }
        
        // ⭐ 현재 비전통장 데이터 로깅
        const allowanceData = window.stateManager.getState('allowance') || [];
        console.log('AllowanceComponent render - 현재 비전통장 데이터:', allowanceData.length, '개 항목');
        console.log('AllowanceComponent render - 비전통장 데이터 샘플:', allowanceData.slice(-3));
        
        // 적립 대상자 필터링
        const allowanceTargets = family.filter(member => member.is_allowance_target === true);
        console.log('AllowanceComponent render - 적립 대상자:', allowanceTargets.length, '명');
        
        if (allowanceTargets.length === 0) {
            this.container.innerHTML = `
                <div class="text-center p-8 accent-bg rounded-lg">
                    <h3 class="text-xl font-bold mb-4">💰 비전통장</h3>
                    <p class="text-gray-600">현재 적립 대상자가 없습니다.</p>
                    <p class="text-sm text-gray-500 mt-2">관리자가 가족 정보에서 적립 대상을 설정해주세요.</p>
                </div>
            `;
            return;
        }
        
        this.container.innerHTML = `
            <!-- 비전통장 헤더 -->
            <div class="text-center mb-6 accent-bg rounded-lg p-6">
                <h3 class="text-2xl font-bold font-myeongjo accent-text mb-2">💰 우리 가족 비전통장</h3>
                <p class="text-gray-600">성경 한 장을 읽을 때마다 100원씩 적립됩니다!</p>
            </div>
            
            <!-- 잔액 현황 -->
            <div class="grid grid-cols-1 md:grid-cols-${allowanceTargets.length} gap-4 mb-6">
                ${allowanceTargets.map(member => this.renderBalanceCard(member)).join('')}
            </div>
            
            <!-- 적립 내역 -->
            <div class="accent-bg rounded-lg p-4">
                <h4 class="text-lg font-bold mb-3">📋 적립 내역</h4>
                <div id="transaction-list" class="h-64 overflow-y-auto custom-scrollbar pr-2 bg-white/50 rounded p-2">
                    ${this.renderTransactions()}
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    renderBalanceCard(member) {
        const allowanceData = window.stateManager.getState('allowance') || [];
        
        // 잔액 계산
        const balance = this.calculateBalance(member.id, allowanceData);
        const totalEarned = this.calculateTotalEarned(member.id, allowanceData);
        const totalWithdrawn = this.calculateTotalWithdrawn(member.id, allowanceData);
        const goalAmount = member.goal_amount || 118900; // 목표 금액 (없으면 118,900원)
        const achievementPercentage = Math.min(100, (balance / goalAmount) * 100);
        const remainingPercentage = Math.max(0, 100 - achievementPercentage);
        
        return `
            <div class="bg-white rounded-lg p-4 shadow-md balance-card">
                <div class="flex items-center mb-3">
                    <img src="${member.photo || 'https://placehold.co/50x50'}" class="w-12 h-12 rounded-full mr-3 object-cover" referrerpolicy="no-referrer">
                    <div>
                        <h5 class="font-bold member-name">${member.name}</h5>
                        <p class="text-sm text-gray-600">${member.title}</p>
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-sm">현재 잔액:</span>
                        <span class="font-bold text-lg text-green-600 current-balance">${balance.toLocaleString()}원</span>
                    </div>
                    <div class="flex justify-between text-sm text-gray-600">
                        <span>총 적립:</span>
                        <span class="total-earned">+${totalEarned.toLocaleString()}원</span>
                    </div>
                    <div class="flex justify-between text-sm text-gray-600">
                        <span>총 인출:</span>
                        <span class="total-withdrawn">-${totalWithdrawn.toLocaleString()}원</span>
                    </div>
                </div>
                <div class="mt-3 bg-gray-100 rounded p-2">
                    <div class="flex justify-between items-center text-xs text-gray-600 mb-1">
                        <span>목표까지</span>
                        <span class="achievement-percentage">${achievementPercentage.toFixed(1)}% 달성 (${remainingPercentage.toFixed(1)}% 남음)</span>
                    </div>
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium remaining-amount">${Math.max(0, goalAmount - balance).toLocaleString()}원</span>
                        <span class="text-xs text-gray-500">/${goalAmount.toLocaleString()}원</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div class="bg-green-500 h-2 rounded-full transition-all progress-bar" style="width: ${achievementPercentage}%"></div>
                    </div>
                    <div class="flex gap-2">
                        <input type="number" 
                               id="withdraw-amount-${member.id}" 
                               class="flex-1 p-2 text-sm rounded border border-gray-300" 
                               placeholder="인출 금액" 
                               min="100" 
                               step="100">
                        <button onclick="window.handleIndividualWithdraw('${member.id}')" 
                                class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded whitespace-nowrap">
                            💸 인출
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-1 text-center">※ 100원 단위로만 인출 가능</p>
                </div>
            </div>
        `;
    }
    calculateBalance(userId, allowanceData) {
        return allowanceData
            .filter(transaction => transaction.user_id === userId)
            .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    }
    
    calculateTotalEarned(userId, allowanceData) {
        return allowanceData
            .filter(transaction => transaction.user_id === userId && Number(transaction.amount) > 0)
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    }
    
    calculateTotalWithdrawn(userId, allowanceData) {
        return Math.abs(allowanceData
            .filter(transaction => transaction.user_id === userId && Number(transaction.amount) < 0)
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0));
    }
    
    renderTransactions() {
        const family = window.stateManager.getState('family');
        const allowanceData = window.stateManager.getState('allowance') || [];
        
        const sortedTransactions = allowanceData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (sortedTransactions.length === 0) {
            return '<div class="text-center text-gray-500 p-8">아직 거래 내역이 없습니다.</div>';
        }
        
        return sortedTransactions.map(transaction => {
            const user = family.find(u => u.id === transaction.user_id);
            const isEarning = Number(transaction.amount) > 0;
            
            return `
                <div class="p-3 mb-2 rounded-lg ${isEarning ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center">
                            <img src="${user ? user.photo : 'https://placehold.co/32x32'}" class="w-8 h-8 rounded-full mr-2 object-cover" referrerpolicy="no-referrer">
                            <div>
                                <div class="font-medium">${user ? user.name : '알 수 없음'}</div>
                                <div class="text-sm text-gray-600">${transaction.description || '설명 없음'}</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="font-bold ${isEarning ? 'text-green-600' : 'text-red-600'}">
                                ${isEarning ? '+' : ''}${Number(transaction.amount).toLocaleString()}원
                            </div>
                            <div class="text-xs text-gray-500">
                                ${new Date(transaction.timestamp).toLocaleString('ko-KR')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    attachEventListeners() {
        // 중앙 인출 섹션이 제거되었으므로 개별 인출 이벤트 리스너는 전역 함수로 처리
        // handleIndividualWithdraw 함수는 app.js나 전역에서 정의됨
    }
    
    /**
     * ⭐ 데이터만 업데이트 (비전통장 - 애니메이션 없이 부분 업데이트)
     */
    updateDataOnly() {
        if (this.container && !this.container.classList.contains('hidden')) {
            console.log('AllowanceComponent: 데이터 전용 업데이트 (깜빡거림 방지)');
            
            const family = window.stateManager.getState('family');
            if (!family || family.length === 0) return;
            
            const allowanceTargets = family.filter(member => member.is_allowance_target === true);
            if (allowanceTargets.length === 0) return;
            
            // ⭐ 잔액 카드들만 업데이트 (전체 DOM 재생성 대신)
            allowanceTargets.forEach(member => {
                this.updateBalanceCardData(member);
            });
            
            // ⭐ 거래 내역만 업데이트
            this.updateTransactionListData();
        }
    }
    
    /**
     * ⭐ 개별 잔액 카드 데이터 업데이트
     */
    updateBalanceCardData(member) {
        const allowanceData = window.stateManager.getState('allowance') || [];
        const balance = this.calculateBalance(member.id, allowanceData);
        const totalEarned = this.calculateTotalEarned(member.id, allowanceData);
        const totalWithdrawn = this.calculateTotalWithdrawn(member.id, allowanceData);
        const goalAmount = member.goal_amount || 118900;
        const achievementPercentage = Math.min(100, (balance / goalAmount) * 100);
        const remainingPercentage = Math.max(0, 100 - achievementPercentage);
        
        // DOM 요소를 찾아서 텍스트만 업데이트 (애니메이션 방지)
        const balanceElements = this.container.querySelectorAll('.balance-card');
        balanceElements.forEach(card => {
            const nameElement = card.querySelector('.member-name');
            if (nameElement && nameElement.textContent.includes(member.name)) {
                const balanceElement = card.querySelector('.current-balance');
                const earnedElement = card.querySelector('.total-earned');
                const withdrawnElement = card.querySelector('.total-withdrawn');
                const progressBar = card.querySelector('.progress-bar');
                const remainingElement = card.querySelector('.remaining-amount');
                const achievementElement = card.querySelector('.achievement-percentage');
                
                if (balanceElement) balanceElement.textContent = `${balance.toLocaleString()}원`;
                if (earnedElement) earnedElement.textContent = `+${totalEarned.toLocaleString()}원`;
                if (withdrawnElement) withdrawnElement.textContent = `-${totalWithdrawn.toLocaleString()}원`;
                if (remainingElement) remainingElement.textContent = `${Math.max(0, goalAmount - balance).toLocaleString()}원`;
                if (progressBar) progressBar.style.width = `${achievementPercentage}%`;
                if (achievementElement) achievementElement.textContent = `${achievementPercentage.toFixed(1)}% 달성 (${remainingPercentage.toFixed(1)}% 남음)`;
            }
        });
    }
    
    /**
     * ⭐ 거래 내역 리스트 데이터 업데이트
     */
    updateTransactionListData() {
        const transactionList = document.getElementById('transaction-list');
        if (transactionList) {
            // 거래 내역은 전체 업데이트가 필요하므로 HTML 재생성
            transactionList.innerHTML = this.renderTransactions();
        }
    }
}
/**
 * 통계 현황 탭 컴포넌트
 */
class StatsComponent extends BaseComponent {
    constructor() {
        super('content-stats');
        // Chart.js 인스턴스를 관리하기 위한 객체
        this.charts = {}; 
        
        // 상태 구독: 데이터 변경 시 전체를 다시 그리도록 render()를 직접 호출
        this.subscribe('family', () => this.render());
        this.subscribe('readRecords', () => this.render());
    }
    
    render() {
        const family = window.stateManager.getState('family');
        if (!family || family.length === 0) {
            this.container.innerHTML = '<div class="text-center p-8">가족 정보를 로드하는 중...</div>';
            return;
        }
        
        this.container.innerHTML = `
            <section class="mb-8">
                <h3 class="text-xl font-bold mb-4 accent-text text-center">👥 개인별 상세 진행 현황</h3>
                <div id="detailed-progress" class="grid grid-cols-1 gap-6">
                    ${this.renderDetailedProgress()}
                </div>
            </section>
        `;
        
        // 개인별 차트 초기화 (개선된 함수 호출)
        setTimeout(() => {
            this.initCharts();
        }, 50);
    }
    
    /**
     * Chart.js를 사용하여 통계 차트를 초기화하는 함수
     */
    initCharts() {
        const family = window.stateManager.getState('family');
        if (!family || family.length === 0) return;
        
        family.forEach(member => {
            const canvas = document.getElementById(`mini-chart-${member.id}`);
            if (!canvas) return;
            
            if (this.charts[member.id]) {
                this.charts[member.id].destroy();
            }
            
            const weeklyResult = this.getWeeklyReadingData(member.id);
            
            // --- [수정된 부분 1] ---
            // 항상 일주일 전체의 라벨을 생성합니다.
            const today = new Date();
            const dayOfWeek = today.getDay();
            const thisWeekSunday = new Date(today);
            thisWeekSunday.setDate(today.getDate() - dayOfWeek);
            const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
            const labels = [];

            for (let i = 0; i < 7; i++) { // 오늘까지가 아닌, 7일 전체를 순회
                const currentDate = new Date(thisWeekSunday);
                currentDate.setDate(thisWeekSunday.getDate() + i);
                const dateString = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
                labels.push(`${weekDays[i]} (${dateString})`);
            }
            
            const chartData = {
                labels: labels,
                datasets: [{
                    label: '읽은 장 수',
                    data: weeklyResult.data,
                    backgroundColor: 'rgba(141, 110, 99, 0.6)',
                    borderColor: 'rgba(141, 110, 99, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            };
            
            const config = {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title: function(tooltipItems) {
                                    return tooltipItems[0].label;
                                },
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += `${context.parsed.y}장`;
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                callback: function(value) {
                                    if (Math.floor(value) === value) {
                                        return value;
                                    }
                                }
                            }
                        }
                    }
                }
            };
            
            this.charts[member.id] = new Chart(canvas.getContext('2d'), config);
        });
    }
    
    renderDetailedProgress() {
        const family = window.stateManager.getState('family');
        const readRecordsRaw = window.stateManager.getState('readRecords');
        
        const readRecords = {};
        if (Array.isArray(readRecordsRaw)) {
            readRecordsRaw.forEach(record => {
                if (record.user_id && record.book_name) {
                    if (!readRecords[record.user_id]) {
                        readRecords[record.user_id] = {};
                    }
                    readRecords[record.user_id][record.book_name] = record;
                }
            });
        } else {
            Object.assign(readRecords, readRecordsRaw || {});
        }
        
        if (!family || family.length === 0) return '';
        
        return family.map(member => {
            const userRecords = readRecords[member.id] || {};
            
            let totalRead = 0;
            let completedBooks = [];
            
            Object.entries(userRecords).forEach(([bookName, bookData]) => {
                let chapters = [];
                if (bookData && bookData.chapters && Array.isArray(bookData.chapters)) {
                    chapters = bookData.chapters;
                } else if (Array.isArray(bookData)) {
                    chapters = bookData;
                }
                
                totalRead += chapters.length;
                
                const book = [...BIBLE_BOOKS.old, ...BIBLE_BOOKS.new].find(b => b.name === bookName);
                if (book && chapters.length === book.chapters) {
                    completedBooks.push({
                        name: bookName,
                        endDate: bookData.endDate,
                        chapters: book.chapters
                    });
                }
            });
            
            const totalChapters = TOTAL_OT_CHAPTERS + TOTAL_NT_CHAPTERS;
            const percentage = totalChapters > 0 ? ((totalRead / totalChapters) * 100).toFixed(1) : 0;
            const weeklyResult = this.getWeeklyReadingData(member.id);
            const thisWeekSummary = weeklyResult.summary;
            const thisWeekTotal = weeklyResult.totalChapters;
            
            return `
                <div class="accent-bg rounded-lg p-4 cursor-pointer hover:opacity-90 transition slide-in" onclick="window.openProgressModal('${member.id}')">
                    <div class="flex items-center mb-4">
                        <img src="${member.photo || 'https://placehold.co/60x60/cccccc/FFFFFF?text=?'}" 
                             alt="${member.name}" 
                             class="w-16 h-16 rounded-full mr-4 object-cover border-2 border-white/50" 
                             referrerpolicy="no-referrer">
                        <div class="flex-grow">
                            <h4 class="font-bold text-xl">${member.title} (${member.name})</h4>
                            <p class="text-sm text-gray-600">전체 진행률 ${percentage}%</p>
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <div class="flex justify-between text-sm mb-1">
                            <span>전체 진도</span>
                            <span>${totalRead} / ${totalChapters}장</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="progress-bar-fill h-3 rounded-full" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <div class="text-sm mb-2 font-medium">📊 이번주 읽기 현황 (일 ~ 토)</div>
                        <div class="bg-white/50 p-3 rounded h-24">
                            <canvas id="mini-chart-${member.id}"></canvas>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <div class="bg-white/40 rounded p-3">
                            <div class="text-sm font-medium mb-1">🎉 완독한 책 (${completedBooks.length}권)</div>
                            ${completedBooks.length > 0 ? `
                                <div class="text-xs text-gray-700">
                                    ${completedBooks.slice(0, 3).map(book => book.name).join(', ')}
                                    ${completedBooks.length > 3 ? ` 외 ${completedBooks.length - 3}권` : ''}
                                </div>
                            ` : '<div class="text-xs text-gray-500">아직 완독한 책이 없습니다</div>'}
                        </div>
                        
                        <div class="bg-white/40 rounded p-3">
                            <div class="text-sm font-medium mb-1">📚 이번주 읽은 장 (총 ${thisWeekTotal}장)</div>
                            <div class="text-xs text-gray-700">${thisWeekSummary}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getWeeklyReadingData(userId) {
        const readRecordsRaw = window.stateManager.getState('readRecords');
        
        const readRecords = {};
        if (Array.isArray(readRecordsRaw)) {
            readRecordsRaw.forEach(record => {
                if (record.user_id && record.book_name) {
                    if (!readRecords[record.user_id]) {
                        readRecords[record.user_id] = {};
                    }
                    readRecords[record.user_id][record.book_name] = record;
                }
            });
        } else {
            Object.assign(readRecords, readRecordsRaw || {});
        }
        
        const userRecords = readRecords[userId] || {};
        
        const today = new Date();
        const dayOfWeek = today.getDay();
        
        const thisWeekSunday = new Date(today);
        thisWeekSunday.setDate(today.getDate() - dayOfWeek);
        
        const weeklyData = [];
        const thisWeekBooks = {};
        
        // --- [수정된 부분 2] ---
        // 항상 일주일 전체의 데이터를 계산합니다.
        for (let i = 0; i < 7; i++) { // 오늘까지가 아닌, 7일 전체를 순회
            const date = new Date(thisWeekSunday);
            date.setDate(thisWeekSunday.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            let chaptersReadOnDay = 0;
            
            Object.entries(userRecords).forEach(([bookName, bookData]) => {
                let dateInfo = bookData.read_dates;
                
                if (!dateInfo && bookData[""]) {
                    dateInfo = bookData[""];
                }
                
                if (typeof dateInfo === 'string' && dateInfo.trim().startsWith('{')) {
                    try {
                        dateInfo = JSON.parse(dateInfo);
                    } catch (e) {
                        dateInfo = null;
                    }
                }
                
                if (dateInfo && typeof dateInfo === 'object') {
                    Object.entries(dateInfo).forEach(([chapter, readDate]) => {
                        if (readDate === dateStr) {
                            chaptersReadOnDay++;
                            if (!thisWeekBooks[bookName]) {
                                thisWeekBooks[bookName] = [];
                            }
                            thisWeekBooks[bookName].push(parseInt(chapter));
                        }
                    });
                }
            });
            
            weeklyData.push(chaptersReadOnDay);
        }
        
        const thisWeekSummary = Object.entries(thisWeekBooks).map(([book, chapters]) => {
            const sortedChapters = [...new Set(chapters)].sort((a, b) => a - b);
            return `${book} ${sortedChapters.length}장`;
        }).join(', ') || '이번주 읽은 장이 없습니다';
        
        return { 
            data: weeklyData, 
            summary: thisWeekSummary,
            totalChapters: weeklyData.reduce((a, b) => a + b, 0)
        };
    }
    
    // ... (findCommonReadBooks, generateDiscussionTopic 함수는 기존과 동일)
    findCommonReadBooks() {
        const family = window.stateManager.getState('family');
        const readRecords = window.stateManager.getState('readRecords');
        
        if (!family || family.length < 2) return [];
        
        const allBooks = [...BIBLE_BOOKS.old, ...BIBLE_BOOKS.new].map(b => b.name);
        const commonBooks = [];
        
        allBooks.forEach(bookName => {
            let readByAll = true;
            family.forEach(member => {
                const userRecords = readRecords[member.id] || {};
                const bookData = userRecords[bookName];
                
                let hasChapters = false;
                if (bookData && bookData.chapters && Array.isArray(bookData.chapters)) {
                    hasChapters = bookData.chapters.length > 0;
                } else if (Array.isArray(bookData)) {
                    hasChapters = bookData.length > 0;
                }
                
                if (!hasChapters) {
                    readByAll = false;
                }
            });
            
            if (readByAll) {
                commonBooks.push(bookName);
            }
        });
        
        return commonBooks;
    }
    
    generateDiscussionTopic(bookName) {
        const topics = {
            "창세기": "창조주 하나님의 놀라운 작품들을 보며, 우리 가족만의 특별함은 무엇일까요?",
            "출애굽기": "하나님이 이스라엘을 이집트에서 구원하신 것처럼, 우리 가족이 함께 벗어나고 싶은 것이 있나요?",
            "시편": "다윗처럼 하나님께 찬양하며, 우리 가족만의 감사 제목을 나누어볼까요?",
            "마태복음": "예수님의 사랑을 실천하며, 우리 가족이 이웃에게 베풀 수 있는 일은?",
            "사무엘상": "다윗이 골리앗을 이긴 것처럼, 우리 가족의 '골리앗'은 무엇이고 어떻게 이겨낼까요?"
        };
        
        return topics[bookName] || "오늘 읽은 말씀이 우리 가족에게 주는 교훈은 무엇일까요?";
    }
}

// === 전역 함수들 (HTML onclick 속성용) ===

// 묵상/기도 관련
window.editMeditation = async function(id) {
    const family = window.stateManager.getState('family');
    const meditations = window.stateManager.getState('meditations');
    const item = meditations.find(item => item.id === id);
    const newContent = prompt('묵상 내용 수정:', item.content);
    
    if (newContent === null || newContent.trim() === '' || newContent.trim() === item.content) return;
    
    try {
        await window.gapi.editData({ type: 'meditation', id: id, content: newContent.trim() });
        item.content = newContent.trim();
        window.stateManager.updateState('meditations', meditations);
    } catch (error) {
        alert('묵상 수정 실패: ' + error.message);
    }
};

window.deleteMeditation = async function(id) {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    
    try {
        await window.gapi.deleteData({ type: 'meditation', id: id });
        const meditations = window.stateManager.getState('meditations');
        const filtered = meditations.filter(item => item.id !== id);
        window.stateManager.updateState('meditations', filtered);
    } catch (error) {
        alert('묵상 삭제 실패: ' + error.message);
    }
};

window.likeMeditation = async function(id) {
    try {
        // ⭐ 로컬 상태 먼저 즉시 업데이트
        const meditations = window.stateManager.getState('meditations');
        const item = meditations.find(m => m.id === id);
        if (item) {
            item.like_count = (item.like_count || 0) + 1;
            window.stateManager.updateState('meditations', meditations);
        }
        
        // 서버에 전송 (백그라운드)
        await window.gapi.likeItem({ type: 'meditation', id: id });
    } catch (error) {
        // 오류 시 롤백
        const meditations = window.stateManager.getState('meditations');
        const item = meditations.find(m => m.id === id);
        if (item) {
            item.like_count = Math.max(0, (item.like_count || 1) - 1);
            window.stateManager.updateState('meditations', meditations);
        }
        alert('좋아요 실패: ' + error.message);
    }
};
// 기도 관련
window.editPrayer = async function(id) {
    const prayers = window.stateManager.getState('prayers');
    const item = prayers.find(item => item.id === id);
    const newContent = prompt('기도제목 수정:', item.content);
    
    if (newContent === null || newContent.trim() === '' || newContent.trim() === item.content) return;
    
    try {
        await window.gapi.editData({ type: 'prayer', id: id, content: newContent.trim() });
        item.content = newContent.trim();
        window.stateManager.updateState('prayers', prayers);
    } catch (error) {
        alert('기도제목 수정 실패: ' + error.message);
    }
};

window.deletePrayer = async function(id) {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    
    try {
        await window.gapi.deleteData({ type: 'prayer', id: id });
        const prayers = window.stateManager.getState('prayers');
        const filtered = prayers.filter(item => item.id !== id);
        window.stateManager.updateState('prayers', filtered);
    } catch (error) {
        alert('기도제목 삭제 실패: ' + error.message);
    }
};

window.likePrayer = async function(id) {
    try {
        // ⭐ 로컬 상태 먼저 즉시 업데이트
        const prayers = window.stateManager.getState('prayers');
        const item = prayers.find(p => p.id === id);
        if (item) {
            item.like_count = (item.like_count || 0) + 1;
            window.stateManager.updateState('prayers', prayers);
        }
        
        // 서버에 전송 (백그라운드)
        await window.gapi.likeItem({ type: 'prayer', id: id });
    } catch (error) {
        // 오류 시 롤백
        const prayers = window.stateManager.getState('prayers');
        const item = prayers.find(p => p.id === id);
        if (item) {
            item.like_count = Math.max(0, (item.like_count || 1) - 1);
            window.stateManager.updateState('prayers', prayers);
        }
        alert('좋아요 실패: ' + error.message);
    }
};

// 메시지 관련
window.editMessage = async function(id) {
    const messages = window.stateManager.getState('messages');
    const message = messages.find(m => m.id === id);
    const newContent = prompt('메시지 수정:', message.content);
    if (newContent === null || newContent.trim() === '' || newContent.trim() === message.content) return;
    
    try {
        await window.gapi.editData({ type: 'message', id, content: newContent.trim() });
        message.content = newContent.trim();
        window.stateManager.updateState('messages', messages);
    } catch (e) {
        alert('메시지 수정 실패: ' + e.message);
    }
};

window.deleteMessage = async function(id) {
    if (!confirm('정말로 메시지를 삭제하시겠습니까?')) return;
    try {
        await window.gapi.deleteData({ type: 'message', id });
        const messages = window.stateManager.getState('messages');
        window.stateManager.updateState('messages', messages.filter(m => m.id !== id));
    } catch (e) {
        alert('메시지 삭제 실패: ' + e.message);
    }
};

window.likeMessage = async function(id) {
    try {
        // 로컬 상태 먼저 즉시 업데이트 (사용자 경험 개선)
        const messages = window.stateManager.getState('messages');
        const message = messages.find(m => m.id === id);
        if (message) {
            message.like_count = (message.like_count || 0) + 1;
            window.stateManager.updateState('messages', messages);
        }
        
        // 서버에 전송 (백그라운드)
        await window.gapi.likeItem({ type: 'message', id });
    } catch (error) {
        // 오류 시 롤백 (원상 복구)
        const messages = window.stateManager.getState('messages');
        const message = messages.find(m => m.id === id);
        if (message) {
            message.like_count = Math.max(0, (message.like_count || 1) - 1);
            window.stateManager.updateState('messages', messages);
        }
        alert('좋아요 실패: ' + error.message);
    }
};

window.toggleMessageNotice = async function(id) {
    if (!confirm('메시지의 공지 상태를 변경하시겠습니까?')) return;
    try {
        const result = await window.gapi.toggleNotice(id);
        
        // 서버 응답 성공 후, 로컬 데이터를 직접 업데이트하여 즉시 반영
        const messages = window.stateManager.getState('messages');
        const message = messages.find(m => m.id === id);
        if (message) {
            message.is_notice = result.data.isNotice;
        }
        // 다른 공지들은 해제
        messages.forEach(m => {
            if (m.id !== id) {
                m.is_notice = false;
            }
        });
        window.stateManager.updateState('messages', messages);

    } catch (e) {
        alert('공지 상태 변경 실패: ' + e.message);
    }
};

// 기타 유틸리티 함수들
window.regenerateDiscussionTopic = function() {
    if (window.components.stats) {
        const container = document.getElementById('family-discussion-topic');
        if (container) {
            container.innerHTML = window.components.stats.renderFamilyDiscussionTopic();
        }
    }
};

// === 헬퍼 함수들 ===

/**
 * 날짜 포맷팅 헬퍼 함수 (Invalid Date 오류 방지)
 */
function formatDate(dateInput) {
    try {
        let date;
        
        if (typeof dateInput === 'string') {
            // ISO 형식의 timestamp 문자열인 경우
            if (dateInput.includes('T') || dateInput.includes('-')) {
                date = new Date(dateInput);
            } else {
                // ID에서 파싱하는 경우 (ID- 형식)
                const timestamp = dateInput.split('-')[1];
                date = new Date(parseInt(timestamp));
            }
        } else if (typeof dateInput === 'number') {
            date = new Date(dateInput);
        } else {
            date = new Date();
        }
        
        // 유효한 날짜인지 확인
        if (isNaN(date.getTime())) {
            return '방금 전';
        }
        
        return date.toLocaleDateString('ko-KR');
    } catch (error) {
        console.warn('날짜 파싱 오류:', error, dateInput);
        return '방금 전';
    }
}

console.log('컴포넌트 모듈이 로드되었습니다.');