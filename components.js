/**
 * Bible Time for Family - UI 컴포넌트들
 * 각 탭별 UI 컴포넌트와 모달 컴포넌트들을 관리
 */

const likedMessageCooldown = new Set();

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
        this.subscribe('messages', () => this.render()); // ⭐ 공지글 표시를 위해 messages 구독 추가
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
            <!-- 오늘의 지혜 말씀 & 공지사항 -->
            ${this.renderWisdomAndNoticeSection()}

            <!-- 리더보드 -->
            <section id="leaderboard" class="mb-8 leaderboard-animate">
                ${this.renderLeaderboard()}
            </section>
            
            <!-- 가족 대시보드 -->
            <section id="family-dashboard" class="mb-8 accent-bg rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-center text-center">
                ${this.renderFamilyDashboard()}
            </section>
            
            <!-- 성경 책 목록 -->
            <section class="mb-8 space-y-6">
                <details class="group">
                    <summary class="text-2xl font-bold text-center cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition">
                        <span class="group-open:hidden">📚 구약 책장 열기 ▼</span>
                        <span class="hidden group-open:inline">📚 구약 책장 닫기 ▲</span>
                    </summary>
                    <div class="mt-4 bookshelf-container testament-old">
                        <h3 class="bookshelf-title">📖 구약 성경 (39권)</h3>
                        <div class="book-grid">
                            ${this.renderBibleBooks('old')}
                        </div>
                        <div class="bookshelf-stats">
                            ${this.renderTestamentStats('old')}
                        </div>
                    </div>
                </details>
                <details class="group">
                    <summary class="text-2xl font-bold text-center cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition">
                        <span class="group-open:hidden">📚 신약 책장 열기 ▼</span>
                        <span class="hidden group-open:inline">📚 신약 책장 닫기 ▲</span>
                    </summary>
                    <div class="mt-4 bookshelf-container testament-new">
                        <h3 class="bookshelf-title">📖 신약 성경 (27권)</h3>
                        <div class="book-grid">
                            ${this.renderBibleBooks('new')}
                        </div>
                        <div class="bookshelf-stats">
                            ${this.renderTestamentStats('new')}
                        </div>
                    </div>
                </details>
            </section>
        `;
        
        // ⭐ AI 기능은 환경에서 지원되지 않으므로 제거
        
        // ⭐ data-verse를 innerHTML로 설정하여 HTML 태그가 렌더링되도록 함
        setTimeout(() => {
            const wisdomVerse = document.getElementById('wisdom-verse');
            if (wisdomVerse && wisdomVerse.dataset.verse) {
                wisdomVerse.innerHTML = wisdomVerse.dataset.verse;
            }
        }, 0);
    }
    getRandomVerse() {
        const verses = [
            // 가족 관련
            "자녀들아 주 안에서 너희 부모에게 순종하라<br>이것이 옳으니라 (에베소서 6:1)",
            "또 아버지들아 너희 자녀를 노엽게 하지 말고<br>오직 주의 교훈과 훈계로 양육하라 (에베소서 6:4)",
            "지혜로운 아들은 아버지를 기쁘게 하거니와<br>미련한 아들은 어머니의 근심이니라 (잠언 10:1)",
            
            // 믿음과 위로
            "여호와는 나의 목자시니<br>내게 부족함이 없으리로다 (시편 23:1)",
            "수고하고 무거운 짐 진 자들아 다 내게로 오라<br>내가 너희를 쉬게 하리라 (마태복음 11:28)",
            "두려워하지 말라 내가 너와 함께 함이라<br>놀라지 말라 나는 네 하나님이 됨이라 (이사야 41:10)",
            "내게 능력 주시는 자 안에서<br>내가 모든 것을 할 수 있느니라 (빌립보서 4:13)",
            "여호와를 의뢰하는 자는 시온 산이 요동하지 아니하고<br>영원히 있음 같으니라 (시편 125:1)",
            
            // 사랑
            "주 너의 하나님을 사랑하고<br>또한 네 이웃을 네 자신 같이 사랑하라 (마태복음 22:37-39)",
            "사랑하는 자들아 하나님이 이같이 우리를 사랑하셨은즉<br>우리도 서로 사랑하는 것이 마땅하도다 (요한1서 4:11)",
            "무엇보다도 열심으로 서로 사랑할지니<br>사랑은 허다한 죄를 덮느니라 (베드로전서 4:8)",
            
            // 기쁨과 감사
            "항상 기뻐하라 쉬지 말고 기도하라<br>범사에 감사하라 (데살로니가전서 5:16-18)",
            "여호와 안에서 항상 기뻐하라<br>내가 다시 말하노니 기뻐하라 (빌립보서 4:4)",
            "범사에 우리 주 예수 그리스도의 이름으로<br>항상 아버지 하나님께 감사하며 (에베소서 5:20)",
            
            // 지혜와 인도
            "사람이 마음으로 자기의 길을 계획할지라도<br>그의 걸음을 인도하시는 이는 여호와시니라 (잠언 16:9)",
            "그런즉 너희는 먼저 그의 나라와 그의 의를 구하라<br>그리하면 이 모든 것을 너희에게 더하시리라 (마태복음 6:33)",
            "여호와를 경외하는 것이 지혜의 근본이요<br>거룩하신 자를 아는 것이 명철이니라 (잠언 9:10)",
            "너는 마음을 다하여 여호와를 신뢰하고<br>네 명철을 의지하지 말라 (잠언 3:5)",
            
            // 평안
            "평안을 너희에게 끼치노니<br>곧 나의 평안을 너희에게 주노라 (요한복음 14:27)",
            "하나님의 평강이 모든 지각에 뛰어나서<br>그리스도 예수 안에서 너희 마음과 생각을 지키시리라 (빌립보서 4:7)",
            
            // 소망
            "우리가 환난 중에도 즐거워하나니<br>환난은 인내를, 인내는 연단을, 연단은 소망을 이루는 줄 앎이로다 (로마서 5:3-4)",
            "소망이 부끄럽게 하지 아니함은<br>우리에게 주신 성령으로 말미암아 하나님의 사랑이 우리 마음에 부은 바 됨이니 (로마서 5:5)"
        ];
        return verses[Math.floor(Math.random() * verses.length)];
    }
    
    /**
     * ⭐ 현재 공지글 가져오기
     */
    getCurrentNotice() {
        const messages = window.stateManager.getState('messages') || [];
        return messages.find(m => m.is_notice === true);
    }
    
    /**
     * ⭐ 오늘의 지혜 말씀 & 공지사항 섹션 렌더링
     */
    renderWisdomAndNoticeSection() {
        const currentNotice = this.getCurrentNotice();
        const family = window.stateManager.getState('family');
        
        if (currentNotice) {
            // 공지가 있을 때: 6:4 비율로 나누기
            const noticeAuthor = family.find(u => u.id === currentNotice.user_id);
            const noticeDate = new Date(currentNotice.timestamp).toLocaleDateString('ko-KR');
            
            return `
                <section class="mb-8 grid grid-cols-1 lg:grid-cols-10 gap-4 slide-in">
                    <!-- 오늘의 말씀 (60%) -->
                    <div class="lg:col-span-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <div class="flex items-center justify-center mb-2">
                            <h2 class="text-lg font-bold text-blue-800 flex items-center">
                                📖 오늘의 말씀
                            </h2>
                        </div>
                        <div class="text-center">
                            <p id="wisdom-verse" class="text-blue-800 leading-relaxed" style="font-size: 20px" data-verse="${this.getRandomVerse()}"></p>
                        </div>
                    </div>
                    
                    <!-- 공지사항 (40%) -->
                    <div class="lg:col-span-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-lg font-bold text-yellow-800 flex items-center">
                                📢 공지사항
                            </h3>
                            <span class="text-xs text-yellow-600">${noticeDate}</span>
                        </div>
                        <div class="text-sm text-yellow-700 mb-2">
                            <span class="font-semibold">${noticeAuthor ? noticeAuthor.name : '관리자'}</span>
                        </div>
                        <div class="text-sm text-yellow-800 leading-relaxed max-h-24 overflow-y-auto">
                            ${currentNotice.content}
                        </div>
                    </div>
                </section>
            `;
        } else {
            // 공지가 없을 때: 전체 공간 사용
            return `
                <section class="mb-8 slide-in">
                    <div class="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <div class="flex items-center justify-center mb-2">
                            <h2 class="text-lg font-bold text-blue-800 flex items-center">
                                📖 오늘의 말씀
                            </h2>
                        </div>
                        <div class="text-center">
                            <p id="wisdom-verse" class="text-blue-800 leading-relaxed" style="font-size: 20px" data-verse="${this.getRandomVerse()}"></p>
                        </div>
                    </div>
                </section>
            `;
        }
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
    
    renderTestamentStats(testament) {
        const books = BIBLE_BOOKS[testament];
        const family = window.stateManager.getState('family');
        const readRecords = window.stateManager.getState('readRecords');
        
        // 현재 선택된 사용자 (첫 번째 사용자를 기본값으로 사용)
        const currentUser = family && family.length > 0 ? family[0] : null;
        
        if (!currentUser || !readRecords[currentUser.id]) {
            return `총 ${books.length}권 중 0권 완독 (0%)`;
        }
        
        let fullyReadBooks = 0;
        let partiallyReadBooks = 0;
        let totalChaptersRead = 0;
        let totalChapters = 0;
        
        books.forEach(book => {
            totalChapters += book.chapters;
            
            const bookData = readRecords[currentUser.id][book.name];
            if (bookData) {
                let chaptersRead = 0;
                
                if (bookData.chapters && Array.isArray(bookData.chapters)) {
                    chaptersRead = bookData.chapters.length;
                } else if (Array.isArray(bookData)) {
                    chaptersRead = bookData.length;
                }
                
                totalChaptersRead += chaptersRead;
                
                if (chaptersRead === book.chapters) {
                    fullyReadBooks++;
                } else if (chaptersRead > 0) {
                    partiallyReadBooks++;
                }
            }
        });
        
        const completionRate = Math.round((fullyReadBooks / books.length) * 100);
        const chapterProgress = Math.round((totalChaptersRead / totalChapters) * 100);
        
        return `
            ${currentUser.name}님 진도: 
            📚 완독 ${fullyReadBooks}/${books.length}권 (${completionRate}%) | 
            📖 전체 ${totalChaptersRead}/${totalChapters}장 (${chapterProgress}%)
        `;
    }
    
    renderBibleBooks(testament) {
        const books = BIBLE_BOOKS[testament];
        const family = window.stateManager.getState('family');
        const readRecords = window.stateManager.getState('readRecords');
        
        // 현재 선택된 사용자 (첫 번째 사용자를 기본값으로 사용)
        const currentUser = family && family.length > 0 ? family[0] : null;
        
        return books.map(book => {
            let readStatus = 'unread';
            let progressWidth = 0;
            
            if (currentUser && readRecords[currentUser.id] && readRecords[currentUser.id][book.name]) {
                const bookData = readRecords[currentUser.id][book.name];
                let chaptersRead = 0;
                
                if (bookData.chapters && Array.isArray(bookData.chapters)) {
                    chaptersRead = bookData.chapters.length;
                } else if (Array.isArray(bookData)) {
                    chaptersRead = bookData.length;
                }
                
                const progress = chaptersRead / book.chapters;
                progressWidth = Math.round(progress * 100);
                
                if (chaptersRead === 0) {
                    readStatus = 'unread';
                } else if (chaptersRead === book.chapters) {
                    readStatus = 'fully-read';
                } else {
                    readStatus = 'partially-read';
                }
            }
            
            return `
                <button 
                    class="bible-book ${readStatus}" 
                    style="--progress-width: ${progressWidth}%"
                    onclick="window.openChapterModal('${JSON.stringify(book).replace(/"/g, '&quot;')}')"
                    title="${book.name} (${progressWidth}% 완료)"
                >
                    ${book.name}
                </button>
            `;
        }).join('');
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
        
        this.currentPage = 1;
        this.itemsPerPage = 10;

        this.subscribe('family', () => this.render());
        this.subscribe('prayers', () => {
            this.currentPage = 1;
            this.renderItems();
        });
    }
    
    render() {
        const family = window.stateManager.getState('family');
        if (!family || family.length === 0) {
            this.container.innerHTML = '<div class="text-center p-8">가족 정보를 로드하는 중...</div>';
            return;
        }
        
        this.container.innerHTML = `
            <section class="mb-6 accent-bg rounded-lg p-4">
                <h3 class="text-xl font-bold mb-3">🙏 기도 노트</h3>
                <div id="prayer-list" class="h-[40rem] overflow-y-auto custom-scrollbar pr-2 mb-3 bg-white/50 rounded p-2 space-y-3">
                    </div>
                <div id="prayer-pagination" class="flex justify-center items-center my-4"></div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <select id="prayer-user" class="p-2 rounded-md w-full sm:w-auto" style="border-color: var(--border-color);">
                        ${this.renderUserOptions()}
                    </select>
                    <input type="text" id="prayer-input" class="flex-grow p-2 rounded-md min-w-0" placeholder="함께 기도할 제목을 나눠요..." style="border-color: var(--border-color);">
                    <button id="add-prayer" class="bg-white/80 hover:bg-white p-2 rounded-md shadow whitespace-nowrap">🙏 기도 등록</button>
                </div>
            </section>
        `;
        
        this.attachEventListeners();
        this.renderItems();
    }
    
    renderUserOptions() {
        const family = window.stateManager.getState('family');
        return family.map(member => 
            `<option value="${member.id}">${member.name}</option>`
        ).join('');
    }
    
    renderItems() {
        const list = document.getElementById('prayer-list');
        const paginationContainer = document.getElementById('prayer-pagination');
        if (!list || !paginationContainer) return;
        
        list.innerHTML = '';
        paginationContainer.innerHTML = '';
        
        const family = window.stateManager.getState('family');
        const items = window.stateManager.getState('prayers') || [];
        const currentUserId = document.getElementById('prayer-user')?.value;
        
        const sortedItems = items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const totalPages = Math.ceil(sortedItems.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedItems = sortedItems.slice(startIndex, endIndex);

        if (items.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-500 p-8">가족의 첫 기도제목을 나눠주세요 🙏</div>';
            return;
        }
        
        paginatedItems.forEach(item => {
            list.appendChild(this.createItemElement(item, family, currentUserId));
        });

        if (totalPages > 1) {
            let paginationHTML = '';
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <button onclick="window.changePrayerPage(${i})" class="px-3 py-1 mx-1 rounded ${i === this.currentPage ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}">
                        ${i}
                    </button>
                `;
            }
            paginationContainer.innerHTML = paginationHTML;
        }
    }

    createItemElement(item, family, currentUserId) {
    const user = family.find(u => u.id === item.user_id);
    const itemEl = document.createElement('div');
    itemEl.className = 'p-3 bg-white/80 rounded-lg shadow-sm';
    
    const likeCount = item.like_count || 0;
    const isCurrentUser = item.user_id === currentUserId;
    
    itemEl.innerHTML = `
        <div class="flex items-start gap-3">
            <img src="${user ? user.photo : 'https://placehold.co/40x40'}" class="w-10 h-10 rounded-full object-cover flex-shrink-0" referrerpolicy="no-referrer">
            <div class="flex-grow min-w-0">
                <div class="text-sm mb-2">
                    <strong class="font-bold">${user ? user.name : '알 수 없음'}:</strong>
                    <span class="whitespace-pre-wrap">${item.content}</span>
                </div>
                <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-500">${new Date(item.timestamp).toLocaleString('ko-KR')}</span>
                    <div class="flex items-center gap-3">
                        <button onclick="window.likePrayer('${item.id}')" class="text-gray-500 hover:text-red-500 flex items-center gap-1">
                            ❤️ ${likeCount}
                        </button>
                        ${isCurrentUser ? `
                            <button onclick="window.editPrayer('${item.id}')" class="text-blue-600 hover:underline">수정</button>
                            <button onclick="window.deletePrayer('${item.id}')" class="text-red-600 hover:underline">삭제</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    return itemEl;
}
    
    attachEventListeners() {
        const addBtn = document.getElementById('add-prayer');
        const input = document.getElementById('prayer-input');
        const userSelect = document.getElementById('prayer-user');

        if (addBtn) addBtn.addEventListener('click', () => this.addItem());
        if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addItem(); });
        if (userSelect) userSelect.addEventListener('change', () => this.renderItems());
    }
    
    async addItem() {
        const userInput = document.getElementById('prayer-user');
        const textInput = document.getElementById('prayer-input');
        const content = textInput.value.trim();
        if (!content) return;
        
        textInput.value = '';
        textInput.disabled = true;
        
        try {
            const family = window.stateManager.getState('family');
            const user = family.find(u => u.id === userInput.value);
            
            const result = await window.gapi.saveData({
                type: 'prayer',
                userId: userInput.value,
                userName: user ? user.name : '알 수 없음',
                content: content
            });
            
            const items = window.stateManager.getState('prayers');
            items.push({
                id: result.data.id, user_id: userInput.value, user_name: user ? user.name : '알 수 없음',
                timestamp: result.data.timestamp, content: content, like_count: 0
            });
            window.stateManager.updateState('prayers', items);
            
        } catch (e) {
            console.error('기도 등록 실패:', e);
            alert('기도 등록에 실패했습니다. 다시 시도해주세요.');
            textInput.value = content;
        } finally {
            textInput.disabled = false;
        }
    }
    
    updateDataOnly() {
        if (this.container && !this.container.classList.contains('hidden')) {
            this.renderItems();
        }
    }
}


/**
 * 메시지보드 탭 컴포넌트
 */
class MessageBoardComponent extends BaseComponent {
    constructor() {
        super('content-messages');
        
        // 페이지네이션을 위한 상태 변수 추가
        this.currentPage = 1;
        this.itemsPerPage = 10;

        this.subscribe('family', () => this.render());
        this.subscribe('messages', () => {
            // 메시지가 업데이트되면 첫 페이지로 이동하여 보여주기
            this.currentPage = 1;
            this.renderMessages();
        });
    }
    
    render() {
        const family = window.stateManager.getState('family');
        if (!family || family.length === 0) {
            this.container.innerHTML = '<div class="text-center p-8">가족 정보를 로드하는 중...</div>';
            return;
        }
        
        this.container.innerHTML = `
            <section class="mb-6 accent-bg rounded-lg p-4">
                <h3 class="text-xl font-bold mb-3">💝 사랑의 대화</h3>
                
                <div id="message-board-list" class="h-[40rem] overflow-y-auto custom-scrollbar pr-2 mb-3 bg-white/50 rounded p-2 space-y-3">
                    </div>

                <div id="message-pagination" class="flex justify-center items-center my-4"></div>

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
        const paginationContainer = document.getElementById('message-pagination');
        if (!list || !paginationContainer) return;

        list.innerHTML = '';
        paginationContainer.innerHTML = '';

        const family = window.stateManager.getState('family');
        const messages = window.stateManager.getState('messages') || [];
        const currentUserId = document.getElementById('message-user')?.value;

        // 공지와 일반 메시지 분리 (⭐ 댓글 제외 - parent_id가 실제 값을 가진 것은 댓글)
        const isMainMessage = (m) => !m.parent_id || m.parent_id === '' || m.parent_id === null || m.parent_id === undefined;
        
        // ⭐ 디버깅용 로그
        const comments = messages.filter(m => !isMainMessage(m));
        console.log('전체 메시지 수:', messages.length);
        console.log('댓글 메시지 수:', comments.length);
        console.log('댓글 메시지들:', comments.map(c => ({ id: c.id, parent_id: c.parent_id, content: c.content ? c.content.substring(0, 30) : '내용없음' })));
        
        const notices = messages.filter(m => m.is_notice === true && isMainMessage(m));
        const regularMessages = messages.filter(m => m.is_notice !== true && isMainMessage(m));
        const sortedMessages = regularMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // --- [추가] 페이지네이션 로직 ---
        const totalPages = Math.ceil(sortedMessages.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedMessages = sortedMessages.slice(startIndex, endIndex);
        // ---------------------------------

        if (messages.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-500 p-8">가족에게 따뜻한 첫 메시지를 남겨보세요! 💝</div>';
            return;
        }

        // 공지는 항상 모든 페이지 상단에 표시
        notices.forEach(message => {
            list.appendChild(this.createMessageElement(message, family, currentUserId, true));
        });
        
        // 현재 페이지의 메시지 렌더링
        paginatedMessages.forEach(message => {
            list.appendChild(this.createMessageElement(message, family, currentUserId, false));
        });

        // 페이지네이션 컨트롤 렌더링
        if (totalPages > 1) {
            let paginationHTML = '';
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <button 
                        onclick="window.changeMessagePage(${i})" 
                        class="px-3 py-1 mx-1 rounded ${i === this.currentPage ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}">
                        ${i}
                    </button>
                `;
            }
            paginationContainer.innerHTML = paginationHTML;
        }
        
        // ⭐ 페이지 로드 후 댓글이 있는 메시지들의 버튼 텍스트 업데이트
        setTimeout(() => {
            paginatedMessages.forEach(message => {
                window.updateCommentToggleButton(message.id);
            });
        }, 100);
    }

    createMessageElement(message, family, currentUserId, isNotice) {
        const user = family.find(u => u.id === message.user_id);
        const messageEl = document.createElement('div');
        
        // ⭐ 축하 메시지인지 확인
        const isCelebration = message.is_celebration === true;
        
        // 메시지 스타일 결정
        if (isCelebration) {
            messageEl.className = 'p-3 celebration-message rounded-lg shadow-md border-l-4';
        } else if (isNotice) {
            messageEl.className = 'p-3 bg-yellow-100 rounded-lg shadow-md border-l-4 border-yellow-400';
        } else {
            messageEl.className = 'p-3 bg-white/80 rounded-lg shadow-sm';
        }
        
        const likeCount = message.like_count || 0;
        const isCurrentUser = message.user_id === currentUserId;
        
        // ⭐ 댓글 개수 계산
        const comments = this.getCommentsForMessage(message.id);
        const commentCount = comments.length;
        
        // ⭐ 축하 메시지 전용 렌더링
        if (isCelebration) {
            messageEl.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="celebration-icon text-2xl">🎉</div>
                    <div class="flex-grow min-w-0">
                        <div class="text-sm mb-2">
                            <strong class="font-bold celebration-text">🤖 축하봇:</strong>
                            <span class="whitespace-pre-wrap celebration-text">${message.content}</span>
                        </div>
                        <div class="flex justify-between items-center text-xs mb-2">
                            <span class="text-gray-600">${new Date(message.timestamp).toLocaleString('ko-KR')}</span>
                            <div class="flex items-center gap-3">
                                <button onclick="window.likeMessage('${message.id}', this)" class="text-red-500 hover:text-red-600 flex items-center gap-1">
                                    ❤️ ${likeCount}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return messageEl;
        }
        
        // ⭐ 일반 메시지 렌더링 (기존 코드)
        messageEl.innerHTML = `
            <div class="flex items-start gap-3">
                <img src="${user ? user.photo : 'https://placehold.co/40x40'}" class="w-10 h-10 rounded-full object-cover flex-shrink-0" referrerpolicy="no-referrer">
                <div class="flex-grow min-w-0">
                    <div class="text-sm mb-2">
                        ${isNotice ? '<span class="text-yellow-600 font-bold">📌 공지</span> ' : ''}
                        <strong class="font-bold">${user ? user.name : '알 수 없음'}:</strong>
                        <span class="whitespace-pre-wrap">${message.content}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs mb-2">
                        <span class="text-gray-500">${new Date(message.timestamp).toLocaleString('ko-KR')}</span>
                        <div class="flex items-center gap-3">
                            <!-- ⭐ 댓글 토글 버튼 -->
                            <button onclick="window.toggleComments('${message.id}')" class="text-gray-500 hover:text-blue-500 flex items-center gap-1">
                                💬 ${commentCount > 0 ? `댓글 ${commentCount}개 접기` : '댓글 쓰기'}
                            </button>
                            
                            <button onclick="window.toggleMessageNotice('${message.id}')" class="text-gray-500 hover:text-blue-500 flex items-center gap-1">
                                📌 ${isNotice ? '해제' : '등록'}
                            </button>
                            
                            <button onclick="window.likeMessage('${message.id}', this)" class="text-gray-500 hover:text-red-500 flex items-center gap-1">
                                ❤️ ${likeCount}
                            </button>

                            ${isCurrentUser ? `
                                <button onclick="window.editMessage('${message.id}')" class="text-blue-600 hover:underline">수정</button>
                                <button onclick="window.deleteMessage('${message.id}')" class="text-red-600 hover:underline">삭제</button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- ⭐ 댓글 섹션 - 댓글이 있으면 기본적으로 열려있음 -->
                    <div id="comments-${message.id}" class="${commentCount > 0 ? '' : 'hidden'}">
                        <div class="border-t border-gray-200 pt-2 mt-2">
                            <!-- 댓글 목록 -->
                            <div id="comment-list-${message.id}" class="space-y-2 mb-3">
                                ${this.renderComments(comments, family, currentUserId)}
                            </div>
                            
                            <!-- 댓글 작성 입력창 -->
                            <div class="flex gap-2">
                                <input type="text" 
                                       id="comment-input-${message.id}" 
                                       class="flex-1 p-2 text-sm border rounded-md" 
                                       placeholder="댓글을 작성하세요..." 
                                       style="border-color: var(--border-color);"
                                       onkeypress="if(event.key==='Enter') window.addComment('${message.id}')">
                                <button onclick="window.addComment('${message.id}')" 
                                        class="px-3 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600">
                                    💬 댓글
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return messageEl;
    }
    
    /**
     * ⭐ 특정 메시지의 댓글들을 가져오는 헬퍼 함수
     */
    getCommentsForMessage(messageId) {
        const messages = window.stateManager.getState('messages') || [];
        return messages.filter(m => m.parent_id === messageId)
                      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    /**
     * ⭐ 댓글 목록을 렌더링하는 함수
     */
    renderComments(comments, family, currentUserId) {
        if (comments.length === 0) {
            return '<div class="text-gray-500 text-xs text-center py-2">아직 댓글이 없습니다</div>';
        }
        
        return comments.map(comment => {
            const user = family.find(u => u.id === comment.user_id);
            const isCurrentUser = comment.user_id === currentUserId;
            const likeCount = comment.like_count || 0;
            
            return `
                <div class="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
                    <img src="${user ? user.photo : 'https://placehold.co/32x32'}" class="w-8 h-8 rounded-full object-cover flex-shrink-0" referrerpolicy="no-referrer">
                    <div class="flex-grow min-w-0">
                        <div class="text-xs mb-1">
                            <strong class="font-semibold">${user ? user.name : '알 수 없음'}:</strong>
                            <span class="whitespace-pre-wrap">${comment.content}</span>
                        </div>
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-gray-400">${new Date(comment.timestamp).toLocaleString('ko-KR')}</span>
                            <div class="flex items-center gap-2">
                                <button onclick="window.likeComment('${comment.id}')" class="text-gray-400 hover:text-red-500 flex items-center gap-1">
                                    ❤️ ${likeCount}
                                </button>
                                ${isCurrentUser ? `
                                    <button onclick="window.editComment('${comment.id}')" class="text-blue-500 hover:underline">수정</button>
                                    <button onclick="window.deleteComment('${comment.id}')" class="text-red-500 hover:underline">삭제</button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    
    attachEventListeners() {
        const addMessageBtn = document.getElementById('add-message');
        const messageInput = document.getElementById('message-input');
        const userSelect = document.getElementById('message-user');
        
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
        
        // ⭐ 사용자 선택 변경 시 메시지 목록을 다시 렌더링하여 수정/삭제 버튼 업데이트
        if (userSelect) {
            userSelect.addEventListener('change', () => this.renderMessages());
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
            
            textInput.value = '';
            textInput.disabled = true;
            
            const result = await window.gapi.saveData({
                type: 'message',
                userId: userInput.value,
                userName: user ? user.name : '알 수 없음',
                content: content
            });
            
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
    
    updateDataOnly() {
        if (this.container && !this.container.classList.contains('hidden')) {
            console.log('MessageBoardComponent: 데이터 전용 업데이트 (깜빡거림 방지)');
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
    // 1. 현재 메시지가 '좋아요 잠금' 상태인지 확인
    if (likedMessageCooldown.has(id)) {
        console.log(`메시지 ${id}는 현재 쿨다운 상태입니다.`);
        return; // 잠금 상태이면 아무것도 하지 않고 종료
    }

    try {
        // 2. '좋아요'를 누르자마자 잠금 목록에 추가
        likedMessageCooldown.add(id);

        // 로컬 상태를 먼저 업데이트
        const messages = window.stateManager.getState('messages');
        const message = messages.find(m => m.id === id);
        if (message) {
            message.like_count = (message.like_count || 0) + 1;
            window.stateManager.updateState('messages', messages);
        }

        // 서버에 좋아요 요청
        await window.gapi.likeItem({ type: 'message', id });

    } catch (error) {
        // 오류 발생 시 롤백
        const messages = window.stateManager.getState('messages');
        const message = messages.find(m => m.id === id);
        if (message) {
            message.like_count = Math.max(0, (message.like_count || 1) - 1);
            window.stateManager.updateState('messages', messages);
        }
        alert('좋아요 실패: ' + error.message);
    } finally {
        // 3. 10초 후에 잠금 목록에서 제거
        setTimeout(() => {
            likedMessageCooldown.delete(id);
            console.log(`메시지 ${id} 쿨다운 해제.`);
        }, 10000); // 10초
    }
};

window.toggleMessageNotice = async function(id) {
    // 1. 비밀번호를 먼저 묻습니다.
    const password = prompt('관리자 비밀번호를 입력하세요:');
    if (!password) {
        return; // 사용자가 취소하거나 아무것도 입력하지 않으면 종료
    }

    try {
        // 2. 서버에 비밀번호가 맞는지 확인 요청
        const verifyResult = await window.gapi.verifyAdminPassword(password);
        if (!verifyResult.data.isValid) {
            alert('비밀번호가 올바르지 않습니다.');
            return;
        }

        // 3. 비밀번호가 맞으면, 기존 로직을 실행
        const confirmAction = confirm('메시지의 공지 상태를 변경하시겠습니까?');
        if (!confirmAction) return;

        const result = await window.gapi.toggleNotice(id);

        // 로컬 데이터를 즉시 업데이트하여 바로 반영
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
        alert('작업 중 오류가 발생했습니다: ' + e.message);
    }
};

// ⭐ === 댓글 관련 전역 함수들 ===

/**
 * 댓글 섹션 토글 (접기/펼치기)
 */
window.toggleComments = function(messageId) {
    const commentsSection = document.getElementById(`comments-${messageId}`);
    if (commentsSection) {
        commentsSection.classList.toggle('hidden');
        
        // 댓글 섹션이 열릴 때 댓글 목록 새로고침
        if (!commentsSection.classList.contains('hidden')) {
            window.refreshComments(messageId);
        }
        
        // ⭐ 토글 버튼 텍스트 업데이트
        window.updateCommentToggleButton(messageId);
    }
};

/**
 * ⭐ 댓글 토글 버튼 텍스트 업데이트
 */
window.updateCommentToggleButton = function(messageId) {
    const messages = window.stateManager.getState('messages') || [];
    const commentCount = messages.filter(m => m.parent_id === messageId).length;
    const commentsSection = document.getElementById(`comments-${messageId}`);
    const isHidden = commentsSection && commentsSection.classList.contains('hidden');
    
    // 댓글 토글 버튼 찾기
    const toggleButton = document.querySelector(`button[onclick="window.toggleComments('${messageId}')"]`);
    if (toggleButton) {
        if (commentCount > 0) {
            toggleButton.innerHTML = `💬 댓글 ${commentCount}개 ${isHidden ? '펼치기' : '접기'}`;
        } else {
            toggleButton.innerHTML = `💬 댓글 쓰기`;
        }
    }
};

/**
 * 댓글 목록 새로고침
 */
window.refreshComments = function(messageId) {
    const commentList = document.getElementById(`comment-list-${messageId}`);
    if (!commentList) return;
    
    const family = window.stateManager.getState('family');
    const messages = window.stateManager.getState('messages') || [];
    const currentUserId = document.getElementById('message-user')?.value;
    
    const comments = messages.filter(m => m.parent_id === messageId)
                           .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (window.components.messages) {
        commentList.innerHTML = window.components.messages.renderComments(comments, family, currentUserId);
    }
};

/**
 * 댓글 추가
 */
window.addComment = async function(messageId) {
    const commentInput = document.getElementById(`comment-input-${messageId}`);
    const userSelect = document.getElementById('message-user');
    
    if (!commentInput || !userSelect) return;
    
    const content = commentInput.value.trim();
    if (!content) {
        alert('댓글 내용을 입력해주세요.');
        return;
    }
    
    try {
        const family = window.stateManager.getState('family');
        const user = family.find(u => u.id === userSelect.value);
        
        commentInput.value = '';
        commentInput.disabled = true;
        
        // ⭐ 댓글 저장 중에는 실시간 동기화 잠시 중지
        console.log('댓글 저장 중 - 실시간 동기화 3초간 중지');
        const originalSyncEnabled = window.gapi.realtimeSyncEnabled;
        window.gapi.disableRealtimeSync();
        
        const result = await window.gapi.saveData({
            type: 'message',
            userId: userSelect.value,
            userName: user ? user.name : '알 수 없음',
            content: content,
            parentId: messageId,  // ⭐ 부모 메시지 ID 추가
            parent_id: messageId  // ⭐ 백업용 파라미터명
        });
        
        console.log('댓글 저장 결과:', result);
        console.log('댓글 parent_id 확인:', result.data.parent_id);
        
        const messages = window.stateManager.getState('messages');
        // ⭐ 서버 응답과 관계없이 parent_id는 반드시 설정
        const newComment = {
            id: result.data.id,
            user_id: result.data.user_id || userSelect.value,
            user_name: result.data.user_name || (user ? user.name : '알 수 없음'),
            timestamp: result.data.timestamp,
            content: result.data.content || content,
            like_count: result.data.like_count || 0,
            is_notice: false,
            parent_id: messageId  // ⭐ 무조건 messageId로 설정 (서버 응답 무시)
        };
        
        console.log('로컬에 추가할 댓글 데이터:', newComment);
        messages.push(newComment);
        window.stateManager.updateState('messages', messages);
        
        // 댓글 목록 새로고침
        window.refreshComments(messageId);
        
        // 댓글 개수 업데이트
        window.updateCommentCount(messageId);
        
        // ⭐ 댓글 섹션 자동으로 열기
        const commentsSection = document.getElementById(`comments-${messageId}`);
        if (commentsSection) {
            commentsSection.classList.remove('hidden');
        }
        
        // ⭐ 댓글 토글 버튼 텍스트 업데이트
        window.updateCommentToggleButton(messageId);
        
        commentInput.disabled = false;
        
        // ⭐ 3초 후 실시간 동기화 재활성화
        setTimeout(() => {
            console.log('댓글 저장 완료 - 실시간 동기화 재활성화');
            if (originalSyncEnabled) {
                window.gapi.enableRealtimeSync();
            }
        }, 3000);
        
    } catch (e) {
        console.error('댓글 저장 실패:', e);
        alert('댓글 저장에 실패했습니다. 다시 시도해주세요.');
        commentInput.disabled = false;
        commentInput.value = content; // 내용 복원
        
        // ⭐ 오류 시에도 실시간 동기화 재활성화
        console.log('댓글 저장 실패 - 실시간 동기화 재활성화');
        window.gapi.enableRealtimeSync();
    }
};

/**
 * 댓글 수정
 */
window.editComment = async function(commentId) {
    const messages = window.stateManager.getState('messages');
    const comment = messages.find(m => m.id === commentId);
    
    if (!comment) {
        alert('댓글을 찾을 수 없습니다.');
        return;
    }
    
    const newContent = prompt('댓글 수정:', comment.content);
    if (newContent === null || newContent.trim() === '' || newContent.trim() === comment.content) return;
    
    try {
        await window.gapi.editData({ type: 'message', id: commentId, content: newContent.trim() });
        comment.content = newContent.trim();
        window.stateManager.updateState('messages', messages);
        
        // 해당 메시지의 댓글 목록 새로고침
        if (comment.parent_id) {
            window.refreshComments(comment.parent_id);
        }
        
    } catch (e) {
        alert('댓글 수정 실패: ' + e.message);
    }
};

/**
 * 댓글 삭제
 */
window.deleteComment = async function(commentId) {
    if (!confirm('정말로 댓글을 삭제하시겠습니까?')) return;
    
    const messages = window.stateManager.getState('messages');
    const comment = messages.find(m => m.id === commentId);
    const parentId = comment?.parent_id;
    
    try {
        await window.gapi.deleteData({ type: 'message', id: commentId });
        window.stateManager.updateState('messages', messages.filter(m => m.id !== commentId));
        
        // 해당 메시지의 댓글 목록 새로고침
        if (parentId) {
            window.refreshComments(parentId);
            window.updateCommentCount(parentId);
            
            // ⭐ 댓글이 0개가 되면 댓글 섹션 자동으로 닫기
            const messages = window.stateManager.getState('messages') || [];
            const remainingComments = messages.filter(m => m.parent_id === parentId).length;
            if (remainingComments === 0) {
                const commentsSection = document.getElementById(`comments-${parentId}`);
                if (commentsSection) {
                    commentsSection.classList.add('hidden');
                }
            }
        }
        
    } catch (e) {
        alert('댓글 삭제 실패: ' + e.message);
    }
};

/**
 * 댓글 좋아요
 */
window.likeComment = async function(commentId) {
    try {
        // 로컬 상태를 먼저 업데이트
        const messages = window.stateManager.getState('messages');
        const comment = messages.find(m => m.id === commentId);
        const parentId = comment?.parent_id;
        
        if (comment) {
            comment.like_count = (comment.like_count || 0) + 1;
            window.stateManager.updateState('messages', messages);
            
            // 댓글 목록 새로고침
            if (parentId) {
                window.refreshComments(parentId);
            }
        }
        
        // 서버에 전송 (백그라운드)
        await window.gapi.likeItem({ type: 'message', id: commentId });
        
    } catch (error) {
        // 오류 시 롤백
        const messages = window.stateManager.getState('messages');
        const comment = messages.find(m => m.id === commentId);
        const parentId = comment?.parent_id;
        
        if (comment) {
            comment.like_count = Math.max(0, (comment.like_count || 1) - 1);
            window.stateManager.updateState('messages', messages);
            
            // 댓글 목록 새로고침
            if (parentId) {
                window.refreshComments(parentId);
            }
        }
        alert('좋아요 실패: ' + error.message);
    }
};

/**
 * 댓글 개수 업데이트
 */
window.updateCommentCount = function(messageId) {
    const messages = window.stateManager.getState('messages') || [];
    const commentCount = messages.filter(m => m.parent_id === messageId).length;
    
    // ⭐ 댓글 토글 버튼 텍스트 업데이트 (기존 코드 제거하고 새 함수 사용)
    window.updateCommentToggleButton(messageId);
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

/**
 * 메시지 보드 페이지 변경
 */
window.changeMessagePage = function(page) {
    if (window.components.messages) {
        window.components.messages.currentPage = page;
        window.components.messages.renderMessages();
    }
};

/**
 * 기도 노트 페이지 변경
 */
window.changePrayerPage = function(page) {
    if (window.components.meditation) {
        window.components.meditation.currentPage = page;
        window.components.meditation.renderPrayers();
    }
};

/**
 * 📅 캘린더 탭 컴포넌트
 */
class CalendarComponent extends BaseComponent {
    constructor() {
        super('content-calendar');
        
        this.currentDate = new Date();
        
        // 상태 구독
        this.subscribe('family', () => this.render());
        this.subscribe('events', () => this.render()); // 새 이벤트 데이터 구독
    }
    
    render() {
        const family = window.stateManager.getState('family');
        if (!family || family.length === 0) {
            this.container.innerHTML = '<div class="text-center p-8">가족 정보를 로드하는 중...</div>';
            return;
        }
        
        this.container.innerHTML = `
            <section class="mb-6 accent-bg rounded-lg p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">📅 가족 일정</h3>
                    <button id="add-event-btn" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                        ➕ 일정 추가
                    </button>
                </div>
                
                <!-- 달력 + 리스트 분할 레이아웃 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- 왼쪽: 월 달력 -->
                    <div class="bg-white/70 rounded-lg p-4">
                        <div class="flex justify-between items-center mb-4">
                            <button id="prev-month" class="p-2 hover:bg-gray-200 rounded">
                                ← 이전달
                            </button>
                            <h4 id="calendar-title" class="text-lg font-semibold">
                                ${this.currentDate.getFullYear()}년 ${this.currentDate.getMonth() + 1}월
                            </h4>
                            <button id="next-month" class="p-2 hover:bg-gray-200 rounded">
                                다음달 →
                            </button>
                        </div>
                        
                        <!-- 달력 그리드 -->
                        <div class="calendar-grid">
                            ${this.renderCalendarGrid()}
                        </div>
                    </div>
                    
                    <!-- 오른쪽: 상세 일정 리스트 -->
                    <div class="bg-white/70 rounded-lg p-4">
                        <!-- 오늘 일정 -->
                        <div class="mb-6">
                            <h4 class="text-lg font-semibold mb-3 flex items-center">
                                🔸 오늘 (${this.formatDate(new Date())})
                            </h4>
                            <div id="today-events" class="space-y-2 min-h-[60px]">
                                ${this.renderTodayEvents()}
                            </div>
                        </div>
                        
                        <!-- 이번 주 일정 -->
                        <div class="mb-6">
                            <h4 class="text-lg font-semibold mb-3 flex items-center">
                                🔸 이번 주
                            </h4>
                            <div id="week-events" class="space-y-2 min-h-[80px]">
                                ${this.renderWeekEvents()}
                            </div>
                        </div>
                        
                        <!-- 다음 주 일정 -->
                        <div>
                            <h4 class="text-lg font-semibold mb-3 flex items-center">
                                🔸 다음 주
                            </h4>
                            <div id="next-week-events" class="space-y-2 min-h-[80px]">
                                ${this.renderNextWeekEvents()}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
        
        this.attachEventListeners();
    }
    
    /**
     * 달력 그리드 렌더링
     */
    renderCalendarGrid() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 이번 달 첫째 날과 마지막 날
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // 첫째 날의 요일 (0=일요일)
        const startDayOfWeek = firstDay.getDay();
        
        // 달력에 표시할 모든 날짜들
        const calendarDays = [];
        
        // 이전 달의 날짜들 (빈 공간 채우기)
        const prevMonth = new Date(year, month - 1, 0);
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            calendarDays.push({
                date: prevMonth.getDate() - i,
                isCurrentMonth: false,
                fullDate: new Date(year, month - 1, prevMonth.getDate() - i)
            });
        }
        
        // 이번 달의 날짜들
        for (let date = 1; date <= lastDay.getDate(); date++) {
            calendarDays.push({
                date: date,
                isCurrentMonth: true,
                fullDate: new Date(year, month, date)
            });
        }
        
        // 다음 달의 날짜들 (42일로 맞추기 - 6주)
        const totalCells = 42;
        const nextMonthDays = totalCells - calendarDays.length;
        for (let date = 1; date <= nextMonthDays; date++) {
            calendarDays.push({
                date: date,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, date)
            });
        }
        
        // 오늘 날짜
        const today = new Date();
        const todayStr = this.formatDateForComparison(today);
        
        // 이벤트가 있는 날짜들 미리 계산
        const eventsMap = this.getEventsForMonth(year, month);
        
        let html = `
            <div class="grid grid-cols-7 gap-1 mb-2">
                <div class="text-center py-2 font-semibold text-red-600">일</div>
                <div class="text-center py-2 font-semibold">월</div>
                <div class="text-center py-2 font-semibold">화</div>
                <div class="text-center py-2 font-semibold">수</div>
                <div class="text-center py-2 font-semibold">목</div>
                <div class="text-center py-2 font-semibold">금</div>
                <div class="text-center py-2 font-semibold text-blue-600">토</div>
            </div>
            <div class="grid grid-cols-7 gap-1">
        `;
        
        calendarDays.forEach(day => {
            const dayStr = this.formatDateForComparison(day.fullDate);
            const isToday = dayStr === todayStr;
            const hasEvents = eventsMap[dayStr] && eventsMap[dayStr].length > 0;
            
            const dayClasses = [
                'relative h-10 flex items-center justify-center text-sm cursor-pointer rounded transition-colors',
                day.isCurrentMonth ? 'hover:bg-blue-100' : 'text-gray-400 hover:bg-gray-100',
                isToday ? 'bg-blue-500 text-white font-bold' : ''
            ].filter(Boolean).join(' ');
            
            html += `
                <div class="${dayClasses}" 
                     data-date="${dayStr}" 
                     onclick="window.showDayEvents('${dayStr}', '${day.fullDate.getFullYear()}-${(day.fullDate.getMonth()+1).toString().padStart(2,'0')}-${day.fullDate.getDate().toString().padStart(2,'0')}')">
                    <span>${day.date}</span>
                    ${hasEvents ? '<div class="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full"></div>' : ''}
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    /**
     * 특정 월의 모든 이벤트 가져오기
     */
    getEventsForMonth(year, month) {
        const events = this.getAllEvents();
        const eventsMap = {};
        
        events.forEach(event => {
            if (event.is_recurring) {
                // 반복 이벤트는 매년 같은 월-일에 표시
                const eventDate = new Date(event.start_date);
                if (eventDate.getMonth() === month) {
                    const thisYearDate = new Date(year, month, eventDate.getDate());
                    const dateStr = this.formatDateForComparison(thisYearDate);
                    if (!eventsMap[dateStr]) eventsMap[dateStr] = [];
                    eventsMap[dateStr].push(event);
                }
            } else {
                // 일반 이벤트는 날짜 범위 확인
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date || event.start_date);
                
                // 날짜 범위의 모든 날에 이벤트 추가
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    if (d.getFullYear() === year && d.getMonth() === month) {
                        const dateStr = this.formatDateForComparison(d);
                        if (!eventsMap[dateStr]) eventsMap[dateStr] = [];
                        eventsMap[dateStr].push(event);
                    }
                }
            }
        });
        
        return eventsMap;
    }
    
    /**
     * 모든 이벤트 가져오기 (생일 + 기념일 + 일정)
     */
    getAllEvents() {
        const family = window.stateManager.getState('family') || [];
        const events = window.stateManager.getState('events') || [];
        const allEvents = [];
        
        // 1. 생일 이벤트 추가
        family.forEach(member => {
            if (member.birthday) {
                const birthday = new Date(member.birthday);
                allEvents.push({
                    id: `birthday_${member.id}`,
                    title: `🎂 ${member.name} 생일`,
                    date: this.formatDateForComparison(birthday),
                    time: '',
                    type: 'birthday',
                    user_id: member.id,
                    description: `${member.name}님의 생일입니다.`,
                    color: '#FF6B6B',
                    is_recurring: true,
                    isAutoGenerated: true
                });
            }
        });
        
        // 2. 기념일 이벤트 추가
        family.forEach(member => {
            if (member.anniversary) {
                const anniversaries = member.anniversary.split(/[|;]/).map(a => a.trim()).filter(a => a);
                
                anniversaries.forEach(anniversaryStr => {
                    let anniversaryDate, anniversaryName = '기념일';
                    
                    if (anniversaryStr.includes(':')) {
                        const [dateStr, description] = anniversaryStr.split(':');
                        anniversaryDate = new Date(dateStr.trim());
                        anniversaryName = description.trim();
                    } else {
                        anniversaryDate = new Date(anniversaryStr.trim());
                    }
                    
                    allEvents.push({
                        id: `anniversary_${member.id}_${anniversaryName}`,
                        title: `💐 ${member.name} ${anniversaryName}`,
                        date: this.formatDateForComparison(anniversaryDate),
                        time: '',
                        type: 'anniversary',
                        user_id: member.id,
                        description: `${member.name}님의 ${anniversaryName}입니다.`,
                        color: '#FF69B4',
                        is_recurring: true,
                        isAutoGenerated: true
                    });
                });
            }
        });
        
        // 3. 일반 일정 이벤트 추가
        events.forEach(event => {
            allEvents.push({
                ...event,
                date: event.start_date, // date 필드 통일
                isAutoGenerated: false
            });
        });
        
        return allEvents;
    }
    
    /**
     * 오늘 일정 렌더링
     */
    renderTodayEvents() {
        const today = new Date();
        const todayEvents = this.getAllEvents().filter(event => {
            if (event.is_recurring) {
                // 반복 이벤트는 월-일만 비교
                const eventDate = new Date(event.start_date);
                return eventDate.getMonth() === today.getMonth() && 
                       eventDate.getDate() === today.getDate();
            } else {
                // 일반 이벤트는 오늘 날짜가 시작일과 종료일 사이에 있는지 확인 (날짜만 비교)
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date || event.start_date);
                
                // 날짜만 비교 (시간 제외)
                const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                
                return todayOnly >= startDateOnly && todayOnly <= endDateOnly;
            }
        });
        
        if (todayEvents.length === 0) {
            return '<div class="text-gray-500 text-center py-4">오늘 일정이 없습니다.</div>';
        }
        
        return todayEvents.map(event => this.renderEventCard(event)).join('');
    }
    
    /**
     * 이번 주 일정 렌더링
     */
    renderWeekEvents() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // 일요일
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // 토요일
        
        const weekEvents = this.getAllEvents().filter(event => {
            const eventDate = new Date(event.date);
            
            if (event.is_recurring) {
                // 반복 이벤트는 이번 주 내에 해당 월-일이 있는지 확인
                const thisWeekDates = [];
                for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
                    if (d.getMonth() === eventDate.getMonth() && d.getDate() === eventDate.getDate()) {
                        return true;
                    }
                }
                return false;
            } else {
                // 일반 이벤트는 날짜 범위 확인 (날짜만 비교)
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date || event.start_date);
                
                // 날짜만 비교 (시간 제외)
                const startOfWeekOnly = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
                const endOfWeekOnly = new Date(endOfWeek.getFullYear(), endOfWeek.getMonth(), endOfWeek.getDate());
                const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                
                // 이벤트가 이번 주와 겹치는지 확인
                return startDateOnly <= endOfWeekOnly && endDateOnly >= startOfWeekOnly;
            }
        }).filter(event => {
            // 오늘 이벤트는 제외
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            if (event.is_recurring) {
                const eventDate = new Date(event.start_date);
                return !(eventDate.getMonth() === today.getMonth() && eventDate.getDate() === today.getDate());
            } else {
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date || event.start_date);
                const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                
                // 오늘 날짜와 겹치지 않는 이벤트만
                return !(todayOnly >= startDateOnly && todayOnly <= endDateOnly);
            }
        });
        
        if (weekEvents.length === 0) {
            return '<div class="text-gray-500 text-center py-4">이번 주 다른 일정이 없습니다.</div>';
        }
        
        return weekEvents.map(event => this.renderEventCard(event, true)).join('');
    }
    
    /**
     * 이번 달 일정 렌더링
     */
    /**
     * 다음 주 일정 렌더링
     */
    renderNextWeekEvents() {
        const today = new Date();
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(today.getDate() + (7 - today.getDay())); // 다음 주 일요일
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6); // 다음 주 토요일
        
        const nextWeekEvents = this.getAllEvents().filter(event => {
            if (event.is_recurring) {
                // 반복 이벤트는 다음 주에 해당 월-일이 있는지 확인
                const eventDate = new Date(event.start_date);
                for (let d = new Date(nextWeekStart); d <= nextWeekEnd; d.setDate(d.getDate() + 1)) {
                    if (d.getMonth() === eventDate.getMonth() && d.getDate() === eventDate.getDate()) {
                        return true;
                    }
                }
                return false;
            } else {
                // 일반 이벤트는 날짜 범위 확인 (날짜만 비교)
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date || event.start_date);
                
                // 날짜만 비교 (시간 제외)
                const nextWeekStartOnly = new Date(nextWeekStart.getFullYear(), nextWeekStart.getMonth(), nextWeekStart.getDate());
                const nextWeekEndOnly = new Date(nextWeekEnd.getFullYear(), nextWeekEnd.getMonth(), nextWeekEnd.getDate());
                const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                
                // 이벤트가 다음 주와 겹치는지 확인
                return startDateOnly <= nextWeekEndOnly && endDateOnly >= nextWeekStartOnly;
            }
        });
        
        if (nextWeekEvents.length === 0) {
            return '<div class="text-gray-500 text-center py-4">다음 주 일정이 없습니다.</div>';
        }
        
        return nextWeekEvents.map(event => this.renderEventCard(event, true)).join('');
    }
    
    /**
     * 이벤트 카드 렌더링
     */
    renderEventCard(event, showDate = false) {
        const family = window.stateManager.getState('family') || [];
        const user = family.find(u => u.id === event.user_id);
        
        // 범위 이벤트 처리
        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date || event.start_date);
        const isMultiDay = event.start_date !== event.end_date;
        
        // 반복 이벤트인 경우 올해 날짜로 표시
        let displayStartDate = startDate;
        let displayEndDate = endDate;
        if (event.is_recurring) {
            displayStartDate = new Date(new Date().getFullYear(), startDate.getMonth(), startDate.getDate());
            displayEndDate = new Date(new Date().getFullYear(), endDate.getMonth(), endDate.getDate());
        }
        
        // 날짜 표시
        const dateStr = showDate ? (isMultiDay ? `${this.formatDate(displayStartDate)} ~ ${this.formatDate(displayEndDate)}` : this.formatDate(displayStartDate)) : '';
        
        // 시간 표시 (문자열로 안전하게 처리)
        let timeStr = '';
        const startTime = event.start_time ? String(event.start_time).includes('T') ? event.start_time.split('T')[1].slice(0,5) : event.start_time : '';
        const endTime = event.end_time ? String(event.end_time).includes('T') ? event.end_time.split('T')[1].slice(0,5) : event.end_time : '';
        
        console.log('이벤트 시간 디버깅:', {
            event_id: event.id,
            title: event.title,
            원본_start_time: event.start_time,
            원본_end_time: event.end_time,
            파싱된_startTime: startTime,
            파싱된_endTime: endTime
        });
        
        if (startTime && endTime && startTime !== endTime) {
            timeStr = ` ${startTime} ~ ${endTime}`;
        } else if (startTime) {
            timeStr = ` ${startTime}`;
        }
        
        return `
            <div class="bg-white/80 rounded-lg p-3 border-l-4 shadow-sm event-card" style="border-left-color: ${event.color || '#6B7280'}">
                <div class="flex justify-between items-start">
                    <div class="flex-grow">
                        <div class="font-semibold text-sm mb-1">
                            ${event.title}
                            ${showDate ? `<span class="text-gray-500 ml-2">(${dateStr}${timeStr})</span>` : timeStr ? `<span class="text-gray-500 ml-2">${timeStr}</span>` : ''}
                        </div>
                        ${event.description ? `<div class="text-xs text-gray-600 mb-2">${event.description}</div>` : ''}
                        <div class="text-xs text-gray-500">
                            ${user ? user.name : ''}
                            ${event.is_recurring ? ' • 매년 반복' : ''}
                        </div>
                    </div>
                    ${!event.isAutoGenerated ? `
                        <div class="flex gap-1 ml-2">
                            <button onclick="window.editEvent('${event.id}')" class="text-blue-600 hover:underline text-xs">수정</button>
                            <button onclick="window.deleteEvent('${event.id}')" class="text-red-600 hover:underline text-xs">삭제</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 이벤트 리스너 설정
     */
    attachEventListeners() {
        const addEventBtn = document.getElementById('add-event-btn');
        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => this.showAddEventModal());
        }
        
        // 달력 네비게이션 버튼들
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');
        
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.render();
            });
        }
        
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.render();
            });
        }
    }
    
    /**
     * 일정 추가 모달 표시
     */
    showAddEventModal(defaultDate = null) {
        const family = window.stateManager.getState('family') || [];
        
        // 기본 날짜 설정 (매개변수로 받은 날짜 또는 오늘 날짜)
        const baseDate = defaultDate ? new Date(defaultDate) : new Date();
        const defaultDateValue = this.formatDateForInput(baseDate);
        
        const modalHTML = `
            <div id="event-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 class="text-lg font-bold mb-4">새 일정 추가</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">제목</label>
                            <input type="text" id="event-title" class="w-full p-2 border rounded-md" placeholder="일정 제목을 입력하세요">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">날짜</label>
                            <div class="flex items-center space-x-2">
                                <input type="date" id="event-start-date" class="flex-1 p-2 border rounded-md" value="${defaultDateValue}">
                                <span class="text-gray-500">~</span>
                                <input type="date" id="event-end-date" class="flex-1 p-2 border rounded-md" value="${defaultDateValue}">
                            </div>
                            <div class="flex items-center mt-2">
                                <input type="checkbox" id="single-day" class="mr-2" checked>
                                <label for="single-day" class="text-sm text-gray-600">하루 일정</label>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">시간 (선택사항)</label>
                            <div class="flex items-center space-x-2">
                                <input type="time" id="event-start-time" class="flex-1 p-2 border rounded-md">
                                <span class="text-gray-500">~</span>
                                <input type="time" id="event-end-time" class="flex-1 p-2 border rounded-md">
                            </div>
                            <div class="flex items-center mt-2">
                                <input type="checkbox" id="no-time" class="mr-2" checked>
                                <label for="no-time" class="text-sm text-gray-600">시간 없음</label>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">관련 가족</label>
                            <select id="event-user" class="w-full p-2 border rounded-md">
                                <option value="">전체 가족</option>
                                ${family.map(member => `<option value="${member.id}">${member.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">설명 (선택사항)</label>
                            <textarea id="event-description" class="w-full p-2 border rounded-md" rows="2" placeholder="일정에 대한 설명을 입력하세요"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">색상</label>
                            <select id="event-color" class="w-full p-2 border rounded-md">
                                <option value="#3B82F6">파란색 (일반)</option>
                                <option value="#10B981">초록색 (가족모임)</option>
                                <option value="#F59E0B">주황색 (중요)</option>
                                <option value="#EF4444">빨간색 (긴급)</option>
                                <option value="#8B5CF6">보라색 (개인)</option>
                            </select>
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" id="event-recurring" class="mr-2">
                            <label for="event-recurring" class="text-sm">매년 반복</label>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 mt-6">
                        <button onclick="window.closeEventModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">취소</button>
                        <button onclick="window.saveEvent()" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">저장</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 이벤트 리스너 추가
        this.setupEventModalListeners();
    }
    
    /**
     * 이벤트 모달 리스너 설정
     */
    setupEventModalListeners() {
        const singleDayCheckbox = document.getElementById('single-day');
        const noTimeCheckbox = document.getElementById('no-time');
        const startDate = document.getElementById('event-start-date');
        const endDate = document.getElementById('event-end-date');
        const startTime = document.getElementById('event-start-time');
        const endTime = document.getElementById('event-end-time');
        
        // 하루 일정 체크박스 처리
        if (singleDayCheckbox) {
            singleDayCheckbox.addEventListener('change', () => {
                if (singleDayCheckbox.checked) {
                    endDate.value = startDate.value;
                    endDate.disabled = true;
                    endDate.style.backgroundColor = '#f3f4f6';
                } else {
                    endDate.disabled = false;
                    endDate.style.backgroundColor = '';
                }
            });
        }
        
        // 시작 날짜 변경 시 종료 날짜도 동기화 (하루 일정인 경우)
        if (startDate) {
            startDate.addEventListener('change', () => {
                if (singleDayCheckbox.checked) {
                    endDate.value = startDate.value;
                }
            });
        }
        
        // 시간 없음 체크박스 처리
        if (noTimeCheckbox) {
            noTimeCheckbox.addEventListener('change', () => {
                if (noTimeCheckbox.checked) {
                    startTime.value = '';
                    endTime.value = '';
                    startTime.disabled = true;
                    endTime.disabled = true;
                    startTime.style.backgroundColor = '#f3f4f6';
                    endTime.style.backgroundColor = '#f3f4f6';
                } else {
                    startTime.disabled = false;
                    endTime.disabled = false;
                    startTime.style.backgroundColor = '';
                    endTime.style.backgroundColor = '';
                }
            });
        }
        
        // 시작 시간 변경 시 종료 시간 자동 설정
        if (startTime) {
            startTime.addEventListener('change', () => {
                if (startTime.value && !endTime.value) {
                    // 시작 시간에서 1시간 후로 설정
                    const [hours, minutes] = startTime.value.split(':');
                    const endHour = parseInt(hours) + 1;
                    const endTimeValue = `${endHour.toString().padStart(2, '0')}:${minutes}`;
                    endTime.value = endTimeValue;
                }
            });
        }
        
        // 초기 상태 설정
        endDate.disabled = true;
        endDate.style.backgroundColor = '#f3f4f6';
        startTime.disabled = true;
        endTime.disabled = true;
        startTime.style.backgroundColor = '#f3f4f6';
        endTime.style.backgroundColor = '#f3f4f6';
    }
    
    /**
     * 날짜 포맷팅 (한국어)
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = dayNames[date.getDay()];
        
        return `${year}년 ${month}월 ${day}일 (${dayName})`;
    }
    
    /**
     * 날짜 포맷팅 (비교용 YYYY-MM-DD) - 로컬 시간대 기준
     */
    formatDateForComparison(date) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            console.warn('유효하지 않은 날짜:', date);
            return '1970-01-01'; // 기본값
        }
        
        // UTC 시간대 문제 해결: 로컬 시간대 기준으로 YYYY-MM-DD 형식 생성
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * 날짜 포맷팅 (input용 YYYY-MM-DD)
     */
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * 데이터만 업데이트
     */
    updateDataOnly() {
        if (this.container && !this.container.classList.contains('hidden')) {
            this.render();
        }
    }
}
