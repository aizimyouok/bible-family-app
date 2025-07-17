/**
 * Bible Time for Family - 메인 애플리케이션
 * 앱 초기화, 탭 관리, 이벤트 처리 등을 담당
 */

// === 전역 변수 ===
let currentTab = 'reading';
let currentUserForModal = null;
let currentBook = null;
let currentProgressUserId = null;

/**
 * 🔄 로딩 페이지 스킵하고 앱 시작
 */
function skipIntroAndStartApp() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const appContainer = document.getElementById('app');
    
    if (loadingOverlay && appContainer) {
        // 로딩 화면 즉시 숨기기
        loadingOverlay.style.display = 'none';
        
        // 앱 화면 즉시 표시
        appContainer.style.opacity = '1';
        
        console.log('✅ 로딩 페이지 스킵 완료');
    }
}

/**
 * 🎲 3D 큐브 인트로 효과
 */
function initCubeIntro() {
    console.log('🎲 3D 큐브 인트로 시작');
    
    const cube = document.getElementById('family-cube');
    if (!cube) {
        console.error('❌ 큐브 요소를 찾을 수 없습니다');
        return;
    }
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let rotationX = -15;
    let rotationY = 0;
    
    // 마우스/터치 드래그 시작
    function startDrag(e) {
        isDragging = true;
        cube.style.animation = 'none'; // 자동 회전 중지
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        startX = clientX;
        startY = clientY;
        
        e.preventDefault();
    }
    
    // 마우스/터치 드래그 중
    function drag(e) {
        if (!isDragging) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        currentX = clientX - startX;
        currentY = clientY - startY;
        
        // 회전 각도 계산 (감도 조절)
        rotationY += currentX * 0.5;
        rotationX -= currentY * 0.5;
        
        // 회전 범위 제한
        rotationX = Math.max(-60, Math.min(60, rotationX));
        
        // 큐브 회전 적용
        cube.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
        
        startX = clientX;
        startY = clientY;
        
        e.preventDefault();
    }
    
    // 마우스/터치 드래그 종료
    function endDrag() {
        isDragging = false;
    }
    
    // 이벤트 리스너 등록
    // 마우스 이벤트
    cube.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // 터치 이벤트 (모바일)
    cube.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    console.log('✅ 3D 큐브 인터랙션 설정 완료');
}

/**
 * 타이핑 효과 함수 (현재 사용하지 않음 - 3D 큐브로 변경됨)
 */
/*
function typeWriterEffect(element, text, speed = 100) {
    element.textContent = '';
    element.style.borderRight = '2px solid rgba(255,255,255,0.8)';
    
    let i = 0;
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            // 타이핑 완료 후 커서 깜빡임 효과
            setTimeout(() => {
                element.style.borderRight = 'none';
            }, 1000);
        }
    }
    
    type();
}
*/

// === 애플리케이션 초기화 ===
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Bible Time for Family - 애플리케이션 시작');
    
    // 🔄 새로고침 감지: BGM 상태가 있고 최근에 활동이 있었던 경우만 스킵
    const savedBGMState = localStorage.getItem('bgmState');
    const lastActivityTime = localStorage.getItem('lastActivityTime');
    const currentTime = Date.now();
    
    // 마지막 활동이 30분 이내인 경우만 스킵 (새로고침으로 간주)
    const isRecentActivity = lastActivityTime && (currentTime - parseInt(lastActivityTime)) < 30 * 60 * 1000;
    const shouldSkipIntro = savedBGMState && JSON.parse(savedBGMState).hasStarted && isRecentActivity;
    
    console.log('🔍 로딩 페이지 스킵 조건 확인:', {
        hasBGMState: !!savedBGMState,
        isRecentActivity,
        shouldSkip: shouldSkipIntro
    });
    
    if (shouldSkipIntro) {
        console.log('🔄 새로고침 감지: 로딩 페이지 스킵');
        skipIntroAndStartApp();
    } else {
        console.log('🎲 첫 방문 또는 오래된 세션: 3D 큐브 인트로 표시');
        // 🎲 3D 큐브 인트로 효과 초기화
        initCubeIntro();
    }
    
    // ⭐ 전역 탭 상태 초기화
    window.currentTab = 'reading';
    
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
    
    // ⭐ 관리자 버튼
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            window.openAdminModal();
        });
    }
    // BGM 관련 전역 변수와 함수 정의
    const bgmPlayer = document.getElementById('bgm-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const nextSongBtn = document.getElementById('next-song-btn');

    // 랜덤 재생을 위한 음악 목록
    const bgmList = [
        'https://github.com/aizimyouok/my-bgm/raw/refs/heads/main/%EC%82%B4%EC%95%84%EA%B3%84%EC%8B%A0%20%EC%A3%BC%20(Live)%E3%85%A3%EC%98%88%EC%88%98%EC%A0%84%EB%8F%84%EB%8B%A8%20%ED%99%94%EC%9A%94%EB%AA%A8%EC%9E%84.mp3',
        'https://github.com/aizimyouok/my-bgm/raw/refs/heads/main/%EB%B9%84%20%EC%A4%80%EB%B9%84%ED%95%98%EC%8B%9C%EB%8B%88%20Psalm%20147%20_%20%EC%98%88%EB%9E%8C%EC%9B%8C%EC%8B%AD%204.mp3',
        'https://github.com/aizimyouok/my-bgm/raw/refs/heads/main/In%20the%20Garden(I%20come%20to%20the%20garden%20alone)%20-%20Yeram%20Worship.mp3',
        'https://github.com/aizimyouok/my-bgm/raw/refs/heads/main/Great%20is%20the%20Lord%20_%20Because%20He%20lives%20_%20Yeram%20Worship.mp3',
        'https://github.com/aizimyouok/my-bgm/raw/refs/heads/main/%EC%A3%BC%EB%8B%98%EC%97%AC%20%EC%9D%B4%20%EC%86%90%EC%9D%84%20-%20%EB%A7%88%EC%BB%A4%EC%8A%A4%EC%9B%8C%EC%8B%AD%20_%20%EC%86%8C%EC%A7%84%EC%98%81%20%EC%9D%B8%EB%8F%84%20_%20Precious%20Lord,%20take%20my%20hand.mp3',
        'https://github.com/aizimyouok/my-bgm/raw/refs/heads/main/05.%EB%82%B4%20%EC%A7%84%EC%A0%95%20%EC%82%AC%EB%AA%A8%ED%95%98%EB%8A%94(%EC%B0%AC%EC%86%A1%EA%B0%80)%20_%2006.%EC%A2%8B%EC%9C%BC%EC%8B%A0%20%ED%95%98%EB%82%98%EB%8B%98%20(Official%20Lyrics)%20_%20%EC%96%B4%EB%85%B8%EC%9D%B8%ED%8C%85%EC%98%88%EB%B0%B0%EC%BA%A0%ED%94%842013.mp3'
    ];
    let currentSongIndex = -1; // 현재 재생 중인 곡의 인덱스

    // 다음 곡을 랜덤으로 재생하는 함수 (전역 함수로 정의)
    window.playRandomSong = function() {
        console.log('🎵 랜덤 BGM 재생 시도...');
        console.log('🔍 현재 상태:', { currentSongIndex, totalSongs: bgmList.length });
        
        if (!bgmPlayer) {
            console.error('❌ BGM 플레이어를 찾을 수 없습니다.');
            return;
        }
        
        let nextSongIndex;
        let attempts = 0;
        const maxAttempts = 10; // 무한루프 방지
        
        // 이전에 재생한 곡과 다른 곡이 선택될 때까지 반복
        do {
            nextSongIndex = Math.floor(Math.random() * bgmList.length);
            attempts++;
            console.log(`🎲 시도 ${attempts}: 선택된 인덱스 ${nextSongIndex}, 현재 인덱스 ${currentSongIndex}`);
        } while (bgmList.length > 1 && nextSongIndex === currentSongIndex && attempts < maxAttempts);
        
        // 만약 같은 곡이 계속 선택된다면 강제로 다음 곡으로
        if (nextSongIndex === currentSongIndex && bgmList.length > 1) {
            nextSongIndex = (currentSongIndex + 1) % bgmList.length;
            console.log(`🔄 강제 다음곡 선택: ${nextSongIndex}`);
        }
        
        const previousIndex = currentSongIndex;
        currentSongIndex = nextSongIndex;
        bgmPlayer.src = bgmList[currentSongIndex];
        bgmPlayer.muted = false; // 음소거 해제
        
        console.log(`🎵 곡 변경: ${previousIndex} → ${currentSongIndex} (${bgmList.length}곡 중)`);
        
        // BGM 상태를 localStorage에 저장
        saveBGMState();
        
        // 재생 시도
        bgmPlayer.play().then(() => {
            console.log(`✅ BGM 재생 시작: 곡 ${currentSongIndex + 1}/${bgmList.length}`);
        }).catch(error => {
            console.error('❌ BGM 재생 실패:', error);
        });
    }

    // BGM 상태 저장 함수
    function saveBGMState() {
        // 유효한 상태인지 확인
        if (currentSongIndex < 0 || currentSongIndex >= bgmList.length) {
            console.log('⚠️ 유효하지 않은 currentSongIndex, 저장 생략:', currentSongIndex);
            return;
        }
        
        const bgmState = {
            currentSongIndex: currentSongIndex,
            currentTime: bgmPlayer.currentTime || 0,
            isPlaying: !bgmPlayer.paused,
            hasStarted: true
        };
        localStorage.setItem('bgmState', JSON.stringify(bgmState));
        
        // 활동 시간도 함께 저장
        localStorage.setItem('lastActivityTime', Date.now().toString());
        
        console.log('💾 BGM 상태 저장:', { 
            songIndex: currentSongIndex + 1, 
            totalSongs: bgmList.length,
            currentTime: Math.floor(bgmState.currentTime),
            isPlaying: bgmState.isPlaying 
        });
    }

    // BGM 상태 복원 함수
    function restoreBGMState() {
        const savedState = localStorage.getItem('bgmState');
        if (savedState) {
            try {
                const bgmState = JSON.parse(savedState);
                console.log('🔄 BGM 상태 복원:', bgmState);
                
                if (bgmState.hasStarted && bgmState.currentSongIndex >= 0 && bgmState.currentSongIndex < bgmList.length) {
                    currentSongIndex = bgmState.currentSongIndex;
                    bgmPlayer.src = bgmList[currentSongIndex];
                    bgmPlayer.muted = false;
                    
                    console.log(`🔄 복원된 곡: ${currentSongIndex + 1}/${bgmList.length}`);
                    
                    // 재생 위치 먼저 복원
                    if (bgmState.currentTime > 0) {
                        bgmPlayer.addEventListener('loadedmetadata', () => {
                            bgmPlayer.currentTime = bgmState.currentTime;
                        }, { once: true });
                    }
                    
                    // 즉시 재생 시도
                    bgmPlayer.play().then(() => {
                        console.log('✅ BGM 복원 재생 성공 (자동재생 허용됨)');
                    }).catch(error => {
                        console.log('⚠️ 자동재생 차단됨, 사용자 클릭 대기 중...');
                        
                        // 자동재생 실패 시 BGM 컨트롤러에 시각적 표시
                        showAutoplayBlocked();
                        
                        // 첫 번째 사용자 클릭 시 자동으로 재생 재개
                        setupAutoplayResume();
                    });
                    
                    return true; // 복원됨
                } else {
                    console.log('🔄 유효하지 않은 BGM 상태, 초기화');
                    currentSongIndex = -1;
                }
            } catch (error) {
                console.error('❌ BGM 상태 복원 실패:', error);
                currentSongIndex = -1;
            }
        }
        return false; // 복원되지 않음
    }

    // 자동재생 차단 표시 함수
    function showAutoplayBlocked() {
        const bgmController = document.getElementById('bgm-controller');
        if (bgmController) {
            bgmController.style.animation = 'pulse-notification 1s ease-in-out infinite';
            bgmController.title = '클릭해서 음악 재생을 계속하세요';
            
            // 3초 후 애니메이션 제거
            setTimeout(() => {
                bgmController.style.animation = '';
                bgmController.title = '';
            }, 3000);
        }
    }

    // 자동재생 재개 설정 함수
    function setupAutoplayResume() {
        let isResumed = false;
        
        const resumePlayback = () => {
            if (!isResumed && bgmPlayer.src && bgmPlayer.paused) {
                isResumed = true;
                console.log('🎵 사용자 인터랙션으로 BGM 재개');
                bgmPlayer.play().catch(error => {
                    console.error('❌ BGM 재개 실패:', error);
                });
                
                // 이벤트 리스너 제거
                document.removeEventListener('click', resumePlayback);
                document.removeEventListener('keydown', resumePlayback);
                document.removeEventListener('touchstart', resumePlayback);
            }
        };
        
        // 어떤 사용자 인터랙션이든 감지해서 재생 재개
        document.addEventListener('click', resumePlayback, { once: true });
        document.addEventListener('keydown', resumePlayback, { once: true });
        document.addEventListener('touchstart', resumePlayback, { once: true });
    }

    // BGM 재생/일시정지 버튼 이벤트 리스너
    if (bgmPlayer && playPauseBtn) {
        // 프로그레스 바 요소들
        const progressBar = document.getElementById('bgm-progress');
        const currentTimeEl = document.getElementById('current-time');
        const totalTimeEl = document.getElementById('total-time');

        const updateButtonIcon = () => {
            playPauseBtn.innerHTML = bgmPlayer.paused ? '▶️' : '⏸️';
        };

        // 시간 포맷 함수
        function formatTime(seconds) {
            if (isNaN(seconds) || seconds === 0) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        // 프로그레스 바 업데이트
        function updateProgress() {
            if (bgmPlayer.duration && !isNaN(bgmPlayer.duration)) {
                const progress = (bgmPlayer.currentTime / bgmPlayer.duration) * 100;
                progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
                currentTimeEl.textContent = formatTime(bgmPlayer.currentTime);
                totalTimeEl.textContent = formatTime(bgmPlayer.duration);
                
                // 재생 상태 저장 (자주 저장)
                saveBGMState();
            } else {
                // 메타데이터가 로드되지 않았을 때
                progressBar.style.width = '0%';
                currentTimeEl.textContent = '0:00';
                totalTimeEl.textContent = '0:00';
            }
        }

        playPauseBtn.addEventListener('click', () => {
            console.log('🎵 BGM 버튼 클릭, 현재 상태:', bgmPlayer.paused ? '정지됨' : '재생중');
            
            if (bgmPlayer.paused) {
                // 음악이 멈춰있고, 주소가 없으면 첫 곡을 재생
                if (!bgmPlayer.src || bgmPlayer.src === '') {
                    console.log('🎵 소스가 없어서 랜덤 곡 재생');
                    window.playRandomSong();
                } else {
                    console.log('🎵 기존 곡 재생 재개');
                    
                    // 저장된 상태에서 재생 위치 복원
                    const savedState = localStorage.getItem('bgmState');
                    if (savedState) {
                        try {
                            const bgmState = JSON.parse(savedState);
                            if (bgmState.currentTime > 0 && bgmPlayer.duration) {
                                bgmPlayer.currentTime = bgmState.currentTime;
                                console.log(`🔄 재생 위치 복원: ${Math.floor(bgmState.currentTime)}초`);
                            }
                        } catch (error) {
                            console.error('❌ 재생 위치 복원 실패:', error);
                        }
                    }
                    
                    bgmPlayer.play().catch(error => {
                        console.error('❌ 재생 실패:', error);
                        // 재생 실패 시 새로운 랜덤 곡 시도
                        window.playRandomSong();
                    });
                }
            } else {
                console.log('🎵 BGM 일시정지');
                bgmPlayer.pause();
            }
            saveBGMState();
        });
        
        // 음악이 끝나면 다음 곡을 랜덤으로 재생
        bgmPlayer.addEventListener('ended', () => {
            console.log('🎵 곡이 끝남! 다음 랜덤 곡 재생 시작');
            console.log('🔍 ended 이벤트 발생 시점:', {
                currentTime: bgmPlayer.currentTime,
                duration: bgmPlayer.duration,
                currentSong: currentSongIndex + 1
            });
            
            setTimeout(() => {
                window.playRandomSong();
            }, 500); // 0.5초 후 다음곡 재생 (안정성을 위해)
        });

        // 재생 시간 업데이트 시 곡 종료 임박 알림
        bgmPlayer.addEventListener('timeupdate', () => {
            if (bgmPlayer.duration && bgmPlayer.currentTime) {
                const remaining = bgmPlayer.duration - bgmPlayer.currentTime;
                
                // 곡 종료 5초 전 알림
                if (remaining <= 5 && remaining > 4.5) {
                    console.log('⏰ 곡 종료 5초 전!');
                }
                
                // 곡 종료 1초 전 알림
                if (remaining <= 1 && remaining > 0.5) {
                    console.log('⏰ 곡 종료 1초 전!');
                }
            }
        });

        // 재생/일시정지 상태 변경 시 버튼 아이콘 업데이트
        bgmPlayer.addEventListener('play', () => {
            updateButtonIcon();
            saveBGMState();
        });
        bgmPlayer.addEventListener('pause', () => {
            updateButtonIcon();
            saveBGMState();
        });

        // 프로그레스 바 업데이트
        bgmPlayer.addEventListener('timeupdate', updateProgress);
        bgmPlayer.addEventListener('loadedmetadata', updateProgress);
        
        // 초기 아이콘 설정
        updateButtonIcon();
    }
    
    // 다음곡 버튼 이벤트 리스너
    if (bgmPlayer && nextSongBtn) {
        nextSongBtn.addEventListener('click', () => {
            console.log('⏭️ 다음곡 버튼 클릭');
            window.playRandomSong();
        });
    }

    // 🔄 새로고침 대응: BGM 상태 복원 시도
    const wasRestored = restoreBGMState();
    console.log('🔄 BGM 상태 복원 결과:', wasRestored ? '성공' : '실패 또는 첫 방문');

    // 🧪 테스트용: 콘솔에서 localStorage 초기화 함수 제공
    window.resetIntro = function() {
        localStorage.removeItem('bgmState');
        localStorage.removeItem('lastActivityTime');
        console.log('✅ 인트로 상태 초기화 완료! 페이지를 새로고침하세요.');
        setTimeout(() => location.reload(), 1000);
    };

    // 🧪 테스트용: BGM 상태 확인 함수
    window.checkBGM = function() {
        console.log('🔍 현재 BGM 상태:', {
            currentSongIndex,
            totalSongs: bgmList.length,
            currentSong: bgmList[currentSongIndex] ? `곡 ${currentSongIndex + 1}/${bgmList.length}` : '없음',
            isPlaying: !bgmPlayer.paused,
            currentTime: Math.floor(bgmPlayer.currentTime || 0),
            duration: Math.floor(bgmPlayer.duration || 0),
            src: bgmPlayer.src ? '설정됨' : '없음'
        });
        return { currentSongIndex, totalSongs: bgmList.length };
    };

    // 🧪 테스트용: 다음곡 강제 재생
    window.forceNext = function() {
        console.log('🎵 강제 다음곡 재생');
        window.playRandomSong();
    };

    // 🧪 테스트용: BGM 상태 완전 리셋
    window.resetBGM = function() {
        console.log('🔄 BGM 상태 완전 리셋');
        bgmPlayer.pause();
        bgmPlayer.src = '';
        currentSongIndex = -1;
        localStorage.removeItem('bgmState');
        localStorage.removeItem('lastActivityTime');
        console.log('✅ BGM 리셋 완료');
    };

    // 🧪 테스트용: 자동재생 테스트
    window.testAutoplay = function() {
        console.log('🧪 자동재생 테스트 시작');
        const testAudio = new Audio(bgmList[0]);
        testAudio.play().then(() => {
            console.log('✅ 자동재생 허용됨');
            testAudio.pause();
        }).catch(error => {
            console.log('❌ 자동재생 차단됨:', error.name);
        });
    };

    // 🧪 테스트용: 곡 강제 종료 (ended 이벤트 테스트)
    window.endCurrentSong = function() {
        if (bgmPlayer.src && !bgmPlayer.paused) {
            console.log('🧪 현재 곡 강제 종료 테스트');
            // 곡을 거의 끝으로 이동
            if (bgmPlayer.duration) {
                bgmPlayer.currentTime = bgmPlayer.duration - 0.1;
                console.log('⏰ 곡을 종료 0.1초 전으로 이동');
            } else {
                console.log('❌ 곡 길이 정보 없음');
            }
        } else {
            console.log('❌ 재생 중인 곡이 없습니다');
        }
    };

    // 🧪 테스트용: ended 이벤트 강제 발생
    window.triggerEnded = function() {
        console.log('🧪 ended 이벤트 강제 발생');
        bgmPlayer.dispatchEvent(new Event('ended'));
    };

    console.log('💡 테스트용 함수들:');
    console.log('  - resetIntro(): 인트로 초기화');
    console.log('  - checkBGM(): BGM 상태 확인');
    console.log('  - forceNext(): 강제 다음곡 재생');
    console.log('  - resetBGM(): BGM 완전 리셋');
    console.log('  - testAutoplay(): 자동재생 정책 테스트');
    console.log('  - endCurrentSong(): 현재 곡 강제 종료 (자동 다음곡 테스트)');
    console.log('  - triggerEnded(): ended 이벤트 강제 발생');

    // ⭐ 새로고침 감지 (F5, Ctrl+R, Cmd+R)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5' || 
            (e.ctrlKey && e.key === 'r') || 
            (e.metaKey && e.key === 'r')) {
            console.log('🔄 새로고침 감지 - 서버 데이터 우선 로딩 모드');
            localStorage.setItem('force_server_reload', 'true');
        }
    });
    
    // ⭐ 페이지 로드시 강제 서버 로딩 플래그 확인
    if (localStorage.getItem('force_server_reload') === 'true') {
        localStorage.removeItem('force_server_reload');
        console.log('🚀 강제 서버 로딩 모드 활성화');
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
 * 탭 전환 함수 (⭐ 완전 조용한 백그라운드 동기화 + 탭 전환시에만 UI 업데이트)
 */
function switchTab(tabName) {
    console.log('탭 전환:', tabName);
    
    if (!tabName) {
        console.error('탭 이름이 없습니다.');
        return;
    }
    
    // ⭐ 현재 탭을 전역 변수에 저장
    window.currentTab = tabName;
    currentTab = tabName;
    
    // ⭐ 사용자가 직접 탭을 전환하는 것임을 표시
    window.isUserTabSwitch = true;
    
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
        
        // ⭐ 탭 전환시에만 최신 데이터로 렌더링 (백그라운드 동기화는 UI 변경 없음)
        setTimeout(() => {
            if (window.components[tabName]) {
                console.log(`탭 전환시 최신 데이터로 렌더링: ${tabName}`);
                window.components[tabName].render();
            }
            window.isUserTabSwitch = false;
        }, 50);
        
        console.log('탭 전환 완료:', tabName);
    } else {
        console.error('탭 요소를 찾을 수 없음:', tabName);
        window.isUserTabSwitch = false;
    }
}

/**
 * 데이터 초기화 (⭐ 서버 데이터 우선 로딩)
 */
async function initializeData() {
    // 앱 진입 버튼 클릭 시 BGM 재생 시작
    const loadingOverlay = document.getElementById('loading-overlay');
    const appContainer = document.getElementById('app');
    const enterBtn = document.getElementById('enter-app-btn');

    console.log('🔍 버튼 요소 확인:', {
        enterBtn: !!enterBtn,
        loadingOverlay: !!loadingOverlay,
        appContainer: !!appContainer
    });

    if (enterBtn && loadingOverlay && appContainer) {
        console.log('✅ 버튼 이벤트 리스너 등록');
        enterBtn.addEventListener('click', () => {
            console.log('🚀 앱 진입, BGM 자동 재생 시작');
            
            // BGM 자동 재생 시작
            if (window.playRandomSong) {
                window.playRandomSong();
                // 앱 시작 상태 저장
                localStorage.setItem('bgmState', JSON.stringify({
                    hasStarted: true,
                    currentSongIndex: -1,
                    currentTime: 0,
                    isPlaying: true
                }));
                // 활동 시간 저장
                localStorage.setItem('lastActivityTime', Date.now().toString());
            } else {
                console.error('❌ playRandomSong 함수를 찾을 수 없습니다.');
            }

            // 로딩 화면 숨기기
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);

            // 앱 화면 표시
            appContainer.style.opacity = '1';
        });
    } else {
        console.error('❌ 버튼 또는 컨테이너 요소를 찾을 수 없습니다:', {
            enterBtn,
            loadingOverlay,
            appContainer
        });
    }

    try {
        await loadAllDataAndRender();
        updateConnectionStatus('connected');
        console.log('✅ 서버 데이터 로드 및 렌더링 완료!');
        window.gapi.startRealtimeSync();

    } catch (error) {
        console.log('❌ 서버 연결 또는 데이터 로드 실패', error);
        updateConnectionStatus('disconnected');
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
            console.log('✅ 로컬 데이터로 UI 시작');
        } else {
            console.warn('❌ 데이터 없음');
            alert('데이터를 불러올 수 없습니다.');
        }
    }
    // finally 블록은 더 이상 필요 없으므로 제거
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

// ⭐ connectToServerInBackground 함수 제거됨 - 더 이상 필요하지 않음
/**
 * 연결 상태 표시 업데이트 (⭐ 자동 동기화 UI 제거, 관리자 버튼만 유지)
 */
function updateConnectionStatus(status) {
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    const adminBtn = document.getElementById('admin-btn');
    
    if (indicator) indicator.classList.remove('loading');
    
    switch (status) {
        case 'connected':
            if (indicator) indicator.className = 'w-3 h-3 rounded-full bg-green-500';
            if (text) text.textContent = '온라인';
            if (adminBtn) adminBtn.classList.remove('hidden');
            break;
        case 'disconnected':
            if (indicator) indicator.className = 'w-3 h-3 rounded-full bg-red-500';
            if (text) text.textContent = '오프라인';
            if (adminBtn) adminBtn.classList.add('hidden');
            break;
        case 'loading':
            if (indicator) indicator.className = 'w-3 h-3 rounded-full bg-yellow-500 loading';
            if (text) text.textContent = '연결 중...';
            if (adminBtn) adminBtn.classList.add('hidden');
            break;
        case 'syncing':
            if (indicator) indicator.className = 'w-3 h-3 rounded-full bg-blue-500 loading';
            if (text) text.textContent = '동기화 중...';
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
 * ⭐ 관리자 모달 열기 (전역 함수로 노출)
 */
window.openAdminModal = function() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.innerHTML = createAdminModalHTML();
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

/**
 * ⭐ 관리자 모달 닫기 (전역 함수로 노출)
 */
window.closeAdminModal = function() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

/**
 * ⭐ 관리자 모달 HTML 생성
 */
function createAdminModalHTML() {
    return `
        <div class="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-purple-600">⚙️ 관리자 기능</h2>
                <button onclick="window.closeAdminModal()" class="text-3xl hover:text-gray-600">&times;</button>
            </div>
            
            <div class="space-y-4">
                <!-- 실시간 동기화 제어 -->
                <div class="p-4 border rounded-lg">
                    <h3 class="font-bold mb-2">📡 스마트 실시간 동기화</h3>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm">다중 기기 스마트 동기화 (적응형 간격)</span>
                        <button id="admin-realtime-toggle" class="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600" onclick="window.toggleRealtimeSync()">
                            ${window.gapi?.realtimeSyncEnabled ? '비활성화' : '활성화'}
                        </button>
                    </div>
                    <div class="text-xs text-gray-600">
                        현재 간격: ${window.gapi?.currentSyncInterval ? Math.round(window.gapi.currentSyncInterval/1000) + '초' : '1초'} 
                        (변화 없음: ${window.gapi?.consecutiveNoChanges || 0}회)
                    </div>
                </div>
                
                <!-- 데이터 관리 -->
                <div class="p-4 border rounded-lg">
                    <h3 class="font-bold mb-2">💾 데이터 관리</h3>
                    <div class="space-y-2">
                        <button onclick="window.manualDataRefresh()" class="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                            🔄 데이터 새로고침
                        </button>
                        <button onclick="window.testRealtimeSync()" class="w-full px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                            🧪 실시간 동기화 테스트
                        </button>
                        <button onclick="window.clearLocalData()" class="w-full px-3 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600">
                            🗑️ 로컬 데이터 초기화
                        </button>
                    </div>
                </div>
                
                <!-- 시스템 정보 -->
                <div class="p-4 border rounded-lg">
                    <h3 class="font-bold mb-2">📊 시스템 상태</h3>
                    <div class="text-sm space-y-1">
                        <div>연결 상태: <span class="font-semibold">${window.gapi?.isConnected ? '🟢 온라인' : '🔴 오프라인'}</span></div>
                        <div>스마트 동기화: <span class="font-semibold">${window.gapi?.realtimeSyncEnabled ? '🟢 활성화' : '🔴 비활성화'}</span></div>
                        <div>현재 간격: <span class="font-semibold">${window.gapi?.currentSyncInterval ? Math.round(window.gapi.currentSyncInterval/1000) + '초' : '1초'}</span></div>
                        <div>현재 탭: <span class="font-semibold">${window.currentTab || 'unknown'}</span></div>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 text-center">
                <button onclick="window.closeAdminModal()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                    닫기
                </button>
            </div>
        </div>
    `;
}

/**
 * ⭐ 관리자 기능들
 */
window.toggleRealtimeSync = function() {
    if (window.gapi) {
        if (window.gapi.realtimeSyncEnabled) {
            window.gapi.disableRealtimeSync();
        } else {
            window.gapi.enableRealtimeSync();
        }
        // 모달 새로고침
        openAdminModal();
    }
};

window.manualDataRefresh = function() {
    closeAdminModal();
    initializeData();
    alert('데이터 새로고침이 완료되었습니다.');
};

window.clearLocalData = function() {
    if (confirm('로컬 데이터를 초기화하시겠습니까? 저장되지 않은 변경사항이 손실될 수 있습니다.')) {
        localStorage.clear();
        closeAdminModal();
        alert('로컬 데이터가 초기화되었습니다. 페이지를 새로고침합니다.');
        location.reload();
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
 * ⭐ 개발자 도구용 - 실시간 동기화 제어
 */
window.disableRealtimeSync = function() {
    if (window.gapi) {
        window.gapi.disableRealtimeSync();
        console.log('📡 실시간 동기화가 비활성화되었습니다.');
    }
};

window.enableRealtimeSync = function() {
    if (window.gapi) {
        window.gapi.enableRealtimeSync();
        console.log('📡 실시간 동기화가 활성화되었습니다.');
    }
};

/**
 * ⭐ 개발자 도구용 - 실시간 동기화 즉시 테스트
 */
window.testRealtimeSync = function() {
    if (window.gapi) {
        console.log('🔍 실시간 동기화 강제 테스트 중...');
        console.log('연결 상태:', window.gapi.isConnected);
        console.log('실시간 동기화 활성화:', window.gapi.realtimeSyncEnabled);
        console.log('동기화 진행 중:', window.gapi.syncInProgress);
        
        if (window.gapi.isConnected) {
            window.gapi.checkForServerUpdates();
            console.log('✅ 실시간 동기화 테스트 실행됨');
        } else {
            console.log('❌ 서버에 연결되지 않음');
        }
    } else {
        console.log('❌ API 객체를 찾을 수 없음');
    }
};

/**
 * ⭐ 개발자 도구용 - 실시간 동기화 재시작
 */
window.restartRealtimeSync = function() {
    if (window.gapi) {
        console.log('🔄 실시간 동기화 재시작 중...');
        window.gapi.stopRealtimeSync();
        setTimeout(() => {
            window.gapi.startRealtimeSync();
            console.log('✅ 실시간 동기화 재시작 완료');
        }, 1000);
    }
};

/**
 * ⭐ 개발자 도구용 - 현재 동기화 상태 확인
 */
window.checkSyncStatus = function() {
    if (window.gapi) {
        console.log('=== 동기화 상태 ===');
        console.log('연결 상태:', window.gapi.isConnected);
        console.log('실시간 동기화:', window.gapi.realtimeSyncEnabled);
        console.log('스마트 동기화 간격:', window.gapi.currentSyncInterval ? Math.round(window.gapi.currentSyncInterval/1000) + '초' : '1초');
        console.log('현재 탭:', window.currentTab);
        console.log('마지막 서버 수정:', window.gapi.lastServerModified);
        console.log('클라이언트 마지막 동기화:', localStorage.getItem('bible_data_timestamp'));
        
        return {
            connected: window.gapi.isConnected,
            realtimeSync: window.gapi.realtimeSyncEnabled,
            currentTab: window.currentTab,
            lastServerModified: window.gapi.lastServerModified,
            lastClientSync: localStorage.getItem('bible_data_timestamp')
        };
    }
};

/**
 * ⭐ 개발자 도구용 - 애니메이션 및 백그라운드 업데이트 상태 확인
 */
window.checkAnimationStatus = function() {
    console.log('=== 애니메이션 상태 ===');
    console.log('백그라운드 업데이트 중:', window.isBackgroundUpdate || false);
    console.log('사용자 탭 전환 중:', window.isUserTabSwitch || false);
    console.log('조용한 업데이트 모드:', window.stateManager?.silentUpdate || false);
    console.log('현재 탭:', window.currentTab);
    
    // 현재 탭의 애니메이션 상태 확인
    const currentTabContent = document.getElementById(`content-${window.currentTab}`);
    if (currentTabContent) {
        console.log('현재 탭 CSS 클래스:', currentTabContent.className);
        console.log('백그라운드 업데이트 클래스 존재:', currentTabContent.classList.contains('background-update'));
        console.log('애니메이션 비활성화 클래스 존재:', currentTabContent.classList.contains('no-animation'));
    }
    
    return {
        isBackgroundUpdate: window.isBackgroundUpdate || false,
        isUserTabSwitch: window.isUserTabSwitch || false,
        silentUpdate: window.stateManager?.silentUpdate || false,
        currentTab: window.currentTab,
        currentTabClasses: currentTabContent?.className || 'none'
    };
};

/**
 * ⭐ 개발자 도구용 - 강제로 백그라운드 업데이트 테스트
 */
window.testBackgroundUpdate = function() {
    console.log('🧪 백그라운드 업데이트 테스트 실행...');
    if (window.gapi) {
        // 강제로 서버 업데이트 확인
        window.gapi.checkForServerUpdates();
    }
};

/**
 * ⭐ 개별 인출 처리 함수 (비전통장)
 */
window.handleIndividualWithdraw = async function(userId) {
    const amountInput = document.getElementById(`withdraw-amount-${userId}`);
    if (!amountInput) return;
    
    const amount = parseInt(amountInput.value);
    
    if (!amount || amount < 100 || amount % 100 !== 0) {
        alert('100원 단위로만 인출 가능합니다.');
        return;
    }
    
    const family = window.stateManager.getState('family');
    const user = family.find(u => u.id === userId);
    const allowanceData = window.stateManager.getState('allowance');
    
    // 잔액 계산 (AllowanceComponent의 메서드 재사용)
    const currentBalance = allowanceData
        .filter(transaction => transaction.user_id === userId)
        .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    
    if (amount > currentBalance) {
        alert(`잔액이 부족합니다. 현재 잔액: ${currentBalance.toLocaleString()}원`);
        return;
    }
    
    if (!confirm(`${user.name}님의 용돈 ${amount.toLocaleString()}원을 인출하시겠습니까?`)) {
        return;
    }
    
    try {
        await window.gapi.withdrawAllowance({
            userId: userId,
            userName: user.name,
            amount: amount
        });
        
        // 로컬 상태 업데이트
        const newTransaction = {
            transaction_id: `W${Date.now()}`,
            user_id: userId,
            name: user.name,
            timestamp: new Date().toISOString(),
            type: '인출',
            amount: -amount,
            description: '용돈 인출'
        };
        
        allowanceData.push(newTransaction);
        window.stateManager.updateState('allowance', allowanceData);
        
        amountInput.value = '';
        alert('인출이 완료되었습니다!');
        
    } catch (error) {
        alert('인출 실패: ' + error.message);
    }
};

console.log('앱 모듈이 로드되었습니다.');