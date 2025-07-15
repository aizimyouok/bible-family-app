/**
 * Bible Time for Family - API 통신 관리
 * 구글 시트와의 모든 통신을 담당하는 모듈
 */

// === API 설정 ===
const API_CONFIG = {
    scriptUrl: 'https://script.google.com/macros/s/AKfycbzJF_KRYdVB0SmO1mrtIMTDT1iO_ANjMfXhjf4tQ4gr_8hUkKjKwiWVpachHRoi9VfIyg/exec',
    apiKey: 'bible_family_default',
    enableSecurity: false
};

/**
 * 향상된 구글 시트 API 클래스
 * ⭐ 실시간 다중 기기 동기화 전용 (자동 동기화 제거)
 */
class EnhancedGoogleSheetsAPI {
    constructor() {
        this.scriptUrl = API_CONFIG.scriptUrl;
        this.apiKey = API_CONFIG.apiKey;
        this.enableSecurity = API_CONFIG.enableSecurity;
        this.isConnected = false;
        this.pendingChanges = [];
        this.syncInProgress = false;
        this.lastSyncTime = null;
        
        // ⭐ 실시간 동기화 관련 속성만 유지
        this.realtimeSyncInterval = null;
        this.realtimeSyncEnabled = true;
        this.lastServerModified = null;
        
        // ⭐ 자동 동기화 제거, 실시간 동기화만 시작
        this.loadPendingChangesFromLocal();
        this.startRealtimeSync();
    }
    
    // ⭐ === 실시간 다중 기기 동기화 시스템 ===
    
    /**
     * 실시간 동기화 시작 (⭐ 디버깅 강화)
     */
    startRealtimeSync() {
        // 기존 간격이 있다면 먼저 정리
        if (this.realtimeSyncInterval) {
            clearInterval(this.realtimeSyncInterval);
        }
        
        this.realtimeSyncInterval = setInterval(() => {
            if (this.isConnected && this.realtimeSyncEnabled && !this.syncInProgress) {
                console.log('⏰ 실시간 동기화 체크 시작 (2초 간격)');
                this.checkForServerUpdates();
            } else {
                console.log('⏸️ 실시간 동기화 스킵:', {
                    connected: this.isConnected,
                    enabled: this.realtimeSyncEnabled,
                    syncing: this.syncInProgress
                });
            }
        }, 2000); // ⭐ 2초로 더 단축하여 더 빠른 실시간 동기화
        
        console.log('📡 실시간 동기화 시작됨 (2초 간격)');
        
        // ⭐ 페이지 포커스 시에도 즉시 동기화 실행
        window.addEventListener('focus', () => {
            console.log('🔍 페이지 포커스 감지 - 즉시 동기화 실행');
            if (this.isConnected && this.realtimeSyncEnabled && !this.syncInProgress) {
                this.checkForServerUpdates();
            }
        });
        
        // ⭐ 페이지 가시성 변경 시에도 동기화 실행
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ 페이지 가시성 변경 감지 - 즉시 동기화 실행');
                if (this.isConnected && this.realtimeSyncEnabled && !this.syncInProgress) {
                    setTimeout(() => this.checkForServerUpdates(), 500); // 0.5초 지연
                }
            }
        });
        
        // 즉시 한 번 실행
        if (this.isConnected) {
            console.log('🚀 실시간 동기화 즉시 실행');
            this.checkForServerUpdates();
        }
    }
    
    /**
     * 실시간 동기화 중지
     */
    stopRealtimeSync() {
        if (this.realtimeSyncInterval) {
            clearInterval(this.realtimeSyncInterval);
            this.realtimeSyncInterval = null;
            console.log('실시간 동기화가 중지되었습니다.');
        }
    }
    
    /**
     * 실시간 동기화 활성화/비활성화
     */
    enableRealtimeSync() {
        this.realtimeSyncEnabled = true;
        if (!this.realtimeSyncInterval) {
            this.startRealtimeSync();
        }
        console.log('실시간 동기화가 활성화되었습니다.');
    }
    
    disableRealtimeSync() {
        this.realtimeSyncEnabled = false;
        console.log('실시간 동기화가 비활성화되었습니다.');
    }
    
    /**
     * ⭐ 보류 중인 변경사항 초기화 (수동 정리용)
     */
    clearPendingChanges() {
        console.log('보류 중인 변경사항 초기화:', this.pendingChanges.length, '개 항목');
        this.pendingChanges = [];
        this.savePendingChangesToLocal();
        this.updatePendingCounter();
    }
    
    /**
     * 서버 업데이트 확인 (⭐ 디버깅 강화)
     */
    async checkForServerUpdates() {
        try {
            console.log('🔍 실시간 동기화 - 서버 업데이트 확인 중...');
            
            const clientLastSync = localStorage.getItem('bible_data_timestamp');
            const clientTime = clientLastSync ? new Date(clientLastSync).getTime() : 0;
            console.log('클라이언트 마지막 동기화 시간:', clientLastSync);
            console.log('클라이언트 타임스탬프 (ms):', clientTime);
            
            const result = await this._request('checkUpdates', {
                lastSync: clientLastSync || new Date(0).toISOString()
            });
            
            console.log('서버 응답:', result);
            console.log('서버 업데이트 확인 결과:', {
                hasUpdates: result.data.hasUpdates,
                serverLastModified: result.data.lastModified,
                clientLastSync: clientLastSync
            });
            
            if (result.data.hasUpdates) {
                console.log('🔄 서버에서 새로운 변경사항 감지됨!');
                console.log('서버 마지막 수정:', result.data.lastModified);
                console.log('클라이언트 마지막 동기화:', clientLastSync);
                
                await this.applyServerUpdates(result.data);
            } else {
                console.log('✅ 서버에 새로운 변경사항 없음');
            }
            
        } catch (error) {
            console.error('❌ 서버 업데이트 확인 실패:', error);
            
            // ⭐ 연결 실패 시 재연결 시도
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                console.log('🔌 네트워크 오류 감지 - 5초 후 재연결 시도');
                this.isConnected = false;
                setTimeout(() => {
                    console.log('🔄 재연결 시도 중...');
                    this.testConnection().then(() => {
                        console.log('✅ 재연결 성공');
                    }).catch(() => {
                        console.log('❌ 재연결 실패 - 계속 시도 중...');
                    });
                }, 5000);
            }
        }
    }
    
    /**
     * 서버 업데이트 적용 (⭐ 디버깅 강화 + 현재 탭 즉시 반영)
     */
    async applyServerUpdates(updateData) {
        try {
            console.log('📥 실시간 서버 업데이트 적용 중...');
            console.log('업데이트 데이터:', updateData);
            
            // ⭐ 현재 활성 탭 저장
            const currentTab = window.currentTab || 'reading';
            console.log('현재 활성 탭:', currentTab);
            
            // ⭐ 백그라운드 업데이트 모드 활성화
            window.isBackgroundUpdate = true;
            
            // ⭐ 현재 탭 컨테이너에 애니메이션 비활성화 클래스 추가
            const currentTabContent = document.getElementById(`content-${currentTab}`);
            if (currentTabContent) {
                currentTabContent.classList.add('background-update');
                console.log('현재 탭 애니메이션 비활성화:', currentTab);
            }
            
            // ⭐ 모든 컴포넌트 데이터 업데이트 (조용히)
            window.stateManager.silentUpdate = true;
            console.log('상태 관리자 조용한 업데이트 모드 활성화');
            
            // 상태 관리자에 서버 데이터 업데이트
            const stateManager = window.stateManager;
            console.log('서버 데이터로 상태 업데이트 중...');
            stateManager.updateState('family', updateData.data.family_members || []);
            stateManager.updateState('readRecords', updateData.data.reading_records || {});
            stateManager.updateState('badges', updateData.data.badges || {});
            stateManager.updateState('meditations', updateData.data.meditations || []);
            stateManager.updateState('prayers', updateData.data.prayers || []);
            stateManager.updateState('messages', updateData.data.messages || []);
            stateManager.updateState('allowance', updateData.data.allowance_ledger || []);
            console.log('모든 상태 업데이트 완료');
            
            // ⭐ 조용한 업데이트 모드 비활성화
            window.stateManager.silentUpdate = false;
            console.log('조용한 업데이트 모드 비활성화');
            
            // ⭐ 현재 탭만 즉시 반영 (다른 탭들은 전환 시 자동 업데이트)
            if (window.components && window.components[currentTab]) {
                console.log(`현재 탭 컴포넌트 업데이트: ${currentTab}`);
                if (window.components[currentTab].updateDataOnly) {
                    console.log('updateDataOnly 메서드 사용');
                    window.components[currentTab].updateDataOnly();
                } else {
                    console.log(`${currentTab} 컴포넌트에 updateDataOnly 메서드 없음 - render() 사용`);
                    window.components[currentTab].render();
                }
            } else {
                console.warn('현재 탭 컴포넌트를 찾을 수 없음:', currentTab);
            }
            
            // ⭐ 애니메이션 비활성화 클래스 제거 (0.1초 후)
            setTimeout(() => {
                if (currentTabContent) {
                    currentTabContent.classList.remove('background-update');
                    console.log('현재 탭 애니메이션 재활성화:', currentTab);
                }
                window.isBackgroundUpdate = false;
            }, 100);
            
            // 로컬 스토리지 업데이트
            console.log('로컬 스토리지 업데이트 중...');
            this.saveToLocalStorage();
            
            // 타임스탬프 업데이트
            console.log('클라이언트 타임스탬프 업데이트:', updateData.lastModified);
            localStorage.setItem('bible_data_timestamp', updateData.lastModified);
            
            console.log('✅ 실시간 서버 업데이트 완료! (현재 탭:', currentTab, ')');
            
            // UI에 변경사항 알림 (매우 조용하게)
            this.showUpdateNotification();
            
        } catch (error) {
            console.error('서버 업데이트 적용 실패:', error);
            // 에러 발생 시에도 플래그 정리
            window.stateManager.silentUpdate = false;
            window.isBackgroundUpdate = false;
        }
    }
    
    /**
     * 업데이트 알림 표시 (⭐ 매우 조용하고 부드럽게)
     */
    showUpdateNotification() {
        // ⭐ 콘솔에만 조용히 알림
        console.log('🔄 다른 기기에서 변경된 내용이 백그라운드에서 동기화되었습니다.');
        
        // ⭐ 상태 표시기를 매우 짧게 파란색으로 변경 (1초)
        const indicator = document.getElementById('status-indicator');
        if (indicator) {
            const originalClass = indicator.className;
            indicator.className = 'w-3 h-3 rounded-full bg-blue-400';
            setTimeout(() => {
                indicator.className = originalClass;
            }, 1000); // 1초로 단축
        }
    }
    
    /**
     * 데이터 변경 시 서버에 알림 (기존 저장/삭제 후 호출)
     */
    async notifyServerDataChanged(changeType, details) {
        try {
            await this._request('notifyChange', {
                changeType,
                details,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            // 알림 실패는 무시 (중요하지 않음)
            console.warn('서버 변경 알림 실패:', error);
        }
    }
    
    /**
     * API 요청 공통 처리
     */
    async _request(action, params = {}) {
        const url = new URL(this.scriptUrl);
        url.searchParams.set('action', action);
        
        for (const key in params) {
            url.searchParams.set(key, params[key]);
        }
        
        try {
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`Server Error: ${response.status}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'API 요청 실패');
            
            this.isConnected = true;
            this.lastSyncTime = Date.now();
            return result;
        } catch (error) {
            this.isConnected = false;
            console.error(`API Error (${action}):`, error);
            throw error;
        }
    }    
    /**
     * 변경사항을 큐에 추가하고 로컬에 즉시 저장
     */
    addPendingChange(changeData) {
        // ⭐ 데이터 유효성 검사
        if (!changeData.type || !changeData.action) {
            console.error('필수 필드 누락:', changeData);
            return null;
        }
        
        // ⭐ 임시 ID 체크
        if (changeData.id && changeData.id.toString().startsWith('temp-')) {
            console.warn('임시 ID 항목은 큐에 추가하지 않음:', changeData.id);
            return null;
        }
        
        // ⭐ 삭제 액션 유효성 검사
        if (changeData.action === 'delete') {
            if (!['reading', 'meditation', 'prayer', 'message'].includes(changeData.type)) {
                console.error('유효하지 않은 삭제 타입:', changeData.type);
                return null;
            }
        }
        
        const changeId = Date.now() + Math.random();
        const change = {
            id: changeId,
            timestamp: Date.now(),
            ...changeData
        };
        
        this.pendingChanges.push(change);
        this.savePendingChangesToLocal();
        this.updatePendingCounter();
        
        // 로컬 데이터 즉시 업데이트
        this.applyChangeLocally(change);
        
        return changeId;
    }
    
    /**
     * 로컬에 변경사항 즉시 적용
     */
    applyChangeLocally(change) {
        const { type, userId, bookName, chapter, content } = change;
        
        if (type === 'reading') {
            if (!window.stateManager.getState('readRecords')[userId]) {
                window.stateManager.updateState('readRecords', {
                    ...window.stateManager.getState('readRecords'),
                    [userId]: {}
                });
            }
            
            const readRecords = window.stateManager.getState('readRecords');
            if (!readRecords[userId][bookName]) {
                readRecords[userId][bookName] = {
                    chapters: [],
                    readDates: {},
                    startDate: null,
                    endDate: null
                };
            }
            
            const bookData = readRecords[userId][bookName];
            const readList = bookData.chapters;
            const chapterIndex = readList.indexOf(chapter);
            
            if (change.action === 'delete' && chapterIndex > -1) {
                readList.splice(chapterIndex, 1);
                delete bookData.readDates[chapter];
            } else if (change.action === 'save' && chapterIndex === -1) {
                readList.push(chapter);
                bookData.readDates[chapter] = new Date().toISOString().split('T')[0];
            }
            
            window.stateManager.updateState('readRecords', readRecords);
        }
        
        this.saveToLocalStorage();
    }    
    /**
     * 보류 중인 변경사항을 로컬에 저장
     */
    savePendingChangesToLocal() {
        localStorage.setItem('bible_pending_changes', JSON.stringify(this.pendingChanges));
    }
    
    /**
     * 로컬에서 보류 중인 변경사항 로드
     */
    loadPendingChangesFromLocal() {
        const stored = localStorage.getItem('bible_pending_changes');
        if (stored) {
            try {
                const rawChanges = JSON.parse(stored);
                
                // ⭐ 유효하지 않은 항목들 필터링
                this.pendingChanges = rawChanges.filter(change => {
                    // 임시 ID 항목 제거
                    if (change.id && change.id.toString().startsWith('temp-')) {
                        console.warn('로컬에서 임시 ID 항목 제거:', change.id);
                        return false;
                    }
                    
                    // 필수 필드 검증
                    if (!change.type || !change.action) {
                        console.warn('필수 필드 누락 항목 제거:', change);
                        return false;
                    }
                    
                    // 삭제 액션의 경우 추가 검증
                    if (change.action === 'delete') {
                        if (!['reading', 'meditation', 'prayer', 'message'].includes(change.type)) {
                            console.warn('유효하지 않은 삭제 타입 제거:', change.type);
                            return false;
                        }
                    }
                    
                    return true;
                });
                
                // ⭐ 정리된 데이터를 다시 저장
                this.savePendingChangesToLocal();
                this.updatePendingCounter();
                
                console.log('로컬 pending changes 정리 완료:', this.pendingChanges.length, '개 항목');
                
            } catch (error) {
                console.error('로컬 pending changes 로드 실패:', error);
                this.pendingChanges = [];
                localStorage.removeItem('bible_pending_changes');
            }
        }
    }
    
    /**
     * 보류 중인 변경사항 카운터 업데이트
     */
    updatePendingCounter() {
        const counter = document.getElementById('pending-count');
        const badge = document.getElementById('pending-changes');
        
        if (this.pendingChanges.length > 0) {
            if (counter) counter.textContent = this.pendingChanges.length;
            if (badge) badge.classList.remove('hidden');
        } else {
            if (badge) badge.classList.add('hidden');
        }
    }
    
    /**
     * 보류 중인 변경사항들을 서버에 동기화
     */
    async processPendingChanges() {
        if (this.syncInProgress || this.pendingChanges.length === 0) return;
        
        this.syncInProgress = true;
        
        try {
            // ⭐ 임시 ID 항목들을 먼저 필터링
            const validChanges = this.pendingChanges.filter(change => {
                if (change.id && change.id.toString().startsWith('temp-')) {
                    console.warn('임시 ID 항목 스킵:', change.id);
                    return false;
                }
                return true;
            });
            
            // ⭐ 필터링된 항목들을 처리
            for (const change of validChanges) {
                try {
                    if (change.action === 'save') {
                        await this._request('save', {
                            type: change.type,
                            userId: change.userId,
                            bookName: change.bookName,
                            chapter: change.chapter,
                            content: change.content,
                            messageId: change.messageId,
                            parentId: change.parentId,
                        });
                    } else if (change.action === 'delete') {
                        // ⭐ 삭제 요청 시 필요한 모든 파라미터 전달
                        const deleteParams = {
                            type: change.type,
                            userId: change.userId,
                            bookName: change.bookName,
                            chapter: change.chapter,
                            id: change.id || change.messageId
                        };
                        
                        // ⭐ 삭제 타입 검증
                        if (!deleteParams.type || !['reading', 'meditation', 'prayer', 'message'].includes(deleteParams.type)) {
                            console.warn('유효하지 않은 삭제 타입:', deleteParams.type, '변경사항:', change);
                            this.pendingChanges = this.pendingChanges.filter(c => c.id !== change.id);
                            continue;
                        }
                        
                        await this._request('delete', deleteParams);
                    }
                    
                    // ⭐ 성공한 항목만 큐에서 제거
                    this.pendingChanges = this.pendingChanges.filter(c => c.id !== change.id);
                    
                } catch (error) {
                    console.error('개별 변경사항 동기화 실패:', error);
                    
                    // ⭐ 복구 불가능한 에러인 경우 큐에서 제거
                    if (error.message.includes('유효하지 않은') || 
                        error.message.includes('임시 저장 중인') ||
                        error.message.includes('찾을 수 없습니다')) {
                        console.warn('복구 불가능한 에러로 큐에서 제거:', change.id);
                        this.pendingChanges = this.pendingChanges.filter(c => c.id !== change.id);
                    }
                }
            }
            
            // ⭐ 임시 ID 항목들도 큐에서 제거
            this.pendingChanges = this.pendingChanges.filter(change => {
                return !(change.id && change.id.toString().startsWith('temp-'));
            });
            
            this.savePendingChangesToLocal();
            this.updatePendingCounter();
            
        } catch (error) {
            console.error('동기화 실패:', error);
        } finally {
            this.syncInProgress = false;
        }
    }    
    /**
     * 로컬 스토리지에 데이터 저장
     */
    saveToLocalStorage() {
        const timestamp = Date.now();
        const state = window.stateManager.getAllState();
        
        localStorage.setItem('bible_data_timestamp', timestamp.toString());
        localStorage.setItem('bible_family', JSON.stringify(state.family));
        localStorage.setItem('bible_readRecords', JSON.stringify(state.readRecords));
        localStorage.setItem('bible_badges', JSON.stringify(state.badges));
        localStorage.setItem('bible_meditations', JSON.stringify(state.meditations));
        localStorage.setItem('bible_prayers', JSON.stringify(state.prayers));
        localStorage.setItem('bible_messages', JSON.stringify(state.messages));
        localStorage.setItem('bible_allowance', JSON.stringify(state.allowance));
    }
    
    /**
     * 로컬 스토리지에서 데이터 로드
     */
    loadFromLocalStorage() {
        try {
            const timestamp = localStorage.getItem('bible_data_timestamp');
            const family = JSON.parse(localStorage.getItem('bible_family') || '[]');
            const readRecords = JSON.parse(localStorage.getItem('bible_readRecords') || '{}');
            const badges = JSON.parse(localStorage.getItem('bible_badges') || '{}');
            const meditations = JSON.parse(localStorage.getItem('bible_meditations') || '[]');
            const prayers = JSON.parse(localStorage.getItem('bible_prayers') || '[]');
            const messages = JSON.parse(localStorage.getItem('bible_messages') || '[]');
            const allowance = JSON.parse(localStorage.getItem('bible_allowance') || '[]');
            
            return {
                timestamp: timestamp ? parseInt(timestamp) : null,
                family, readRecords, badges, meditations, prayers, 
                messages, allowance
            };
        } catch (error) {
            console.error('로컬 데이터 로드 실패:', error);
            return null;
        }
    }
    
    /**
     * 연결 테스트 (⭐ 연결 성공 시 실시간 동기화 즉시 시작)
     */
    async testConnection() {
        await this._request('test');
        
        // ⭐ 연결 성공 시 상태 설정 및 실시간 동기화 시작
        this.isConnected = true;
        console.log('🌐 서버 연결 성공! 실시간 동기화 활성화');
        
        // ⭐ 실시간 동기화가 아직 시작되지 않았다면 시작
        if (!this.realtimeSyncInterval) {
            this.startRealtimeSync();
        } else {
            // ⭐ 이미 시작되었다면 즉시 한 번 실행
            console.log('🚀 실시간 동기화 즉시 실행');
            this.checkForServerUpdates();
        }
        
        return true;
    }    
    /**
     * 모든 데이터 로드
     */
    async loadAllData() {
        const result = await this._request('loadAll');
        
        // 서버 데이터를 상태 관리자에 저장
        const stateManager = window.stateManager;
        stateManager.updateState('family', result.data.family_members || []);
        stateManager.updateState('readRecords', result.data.reading_records || {});
        stateManager.updateState('badges', result.data.badges || {});
        stateManager.updateState('meditations', result.data.meditations || []);
        stateManager.updateState('prayers', result.data.prayers || []);
        stateManager.updateState('messages', result.data.messages || []);
        stateManager.updateState('allowance', result.data.allowance_ledger || []);
        
        this.saveToLocalStorage();
        return result.data;
    }
    
    /**
     * 데이터 저장 (즉시 저장)
     */
    async saveData(params) {
        try {
            // ⭐ 즉시 서버에 저장
            const result = await this._request('save', params);
            console.log('즉시 저장 완료:', params.type, result);
            
            // ⭐ 서버 응답 상세 로깅
            if (result.data) {
                console.log('서버 응답 데이터:', result.data);
                if (result.data.newAllowance) {
                    console.log('새로운 비전통장 데이터 발견:', result.data.newAllowance);
                } else {
                    console.log('비전통장 데이터 없음 - 적립 대상이 아니거나 서버 설정 문제');
                }
            }
            
            // ⭐ 비전통장 데이터가 포함된 경우 즉시 로컬 상태 업데이트
            if (result.data && result.data.newAllowance) {
                const allowance = window.stateManager.getState('allowance');
                allowance.push(result.data.newAllowance);
                window.stateManager.updateState('allowance', allowance);
                console.log('비전통장 로컬 상태 업데이트 완료:', result.data.newAllowance);
                console.log('현재 비전통장 데이터 개수:', allowance.length);
            }
            
            // ⭐ 로컬 스토리지 업데이트 (서버 타임스탬프는 실시간 동기화에서 처리)
            this.saveToLocalStorage();
            
            return result;
        } catch (error) {
            console.error('즉시 저장 실패:', error);
            throw error;
        }
    }
    
    /**
     * 데이터 삭제 (⭐ 즉시 실행 방식으로 변경)
     */
    async deleteData(params) {
        try {
            // ⭐ 즉시 서버에 삭제 요청하고 결과를 반환
            const result = await this._request('delete', params);
            console.log('즉시 삭제 완료:', params.type, result);
            
            // ⭐ 읽기 기록 삭제 시 비전통장 데이터도 함께 업데이트
            if (params.type === 'reading' && result.data && result.data.deletedTransactionInfo) {
                const allowance = window.stateManager.getState('allowance');
                const info = result.data.deletedTransactionInfo;
                const filteredAllowance = allowance.filter(t => 
                    !(t.user_id == info.userId && t.description === info.description && t.amount > 0)
                );
                window.stateManager.updateState('allowance', filteredAllowance);
                console.log('비전통장 적립 기록 삭제 완료:', info);
            }
            
            // ⭐ 로컬 스토리지 업데이트 (서버 타임스탬프는 실시간 동기화에서 처리)
            this.saveToLocalStorage();
            
            return result;
        } catch (error) {
            console.error('즉시 삭제 실패:', error);
            throw error;
        }
    }
    
    /**
     * 데이터 수정
     */
    async editData(params) {
        return this._request('edit', params);
    }
    
    /**
     * 좋아요 기능
     */
    async likeItem(params) {
        return this._request('like', params);
    }    
    /**
     * 비전 통장 인출
     */
    async withdrawAllowance(params) {
        return this._request('withdraw', params);
    }
    
    /**
     * 관리자 비밀번호 검증
     */
    async verifyAdminPassword(password) {
        return this._request('verifyAdmin', { password });
    }
    
    /**
     * 데이터 백업 생성
     */
    async createBackup(adminPassword) {
        return this._request('backup', { adminPassword });
    }
    
    /**
     * 중복 데이터 정리
     */
    async cleanupDuplicates(adminPassword) {
        return this._request('cleanup', { adminPassword });
    }
    
    /**
     * 시스템 진단
     */
    async runDiagnostics() {
        return this._request('debug');
    }
}

/**
 * 상태 관리 클래스
 * Observer 패턴을 사용한 실시간 UI 업데이트 + ⭐ 백그라운드 조용한 업데이트 지원
 */
class StateManager {
    constructor() {
        this.state = {
            family: [],
            readRecords: {},
            badges: {},
            meditations: [],
            prayers: [],
            messages: [],
            allowance: []
        };
        this.observers = new Map();
        this.silentUpdate = false; // ⭐ 조용한 업데이트 모드
    }
    
    /**
     * 상태 업데이트 및 관찰자들에게 알림 (⭐ 조용한 모드 지원)
     */
    updateState(key, value) {
        this.state[key] = value;
        
        // ⭐ 조용한 업데이트 모드가 아닐 때만 관찰자들에게 알림
        if (!this.silentUpdate) {
            this.notifyObservers(key, value);
        }
    }
    
    /**
     * 상태 값 조회
     */
    getState(key) {
        return this.state[key];
    }
    
    /**
     * 모든 상태 값 조회
     */
    getAllState() {
        return { ...this.state };
    }    
    /**
     * 관찰자 등록 (UI 컴포넌트가 데이터 변경을 자동 감지)
     */
    subscribe(key, callback) {
        if (!this.observers.has(key)) {
            this.observers.set(key, []);
        }
        this.observers.get(key).push(callback);
        
        // 구독 해제 함수 반환
        return () => {
            const callbacks = this.observers.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * 관찰자들에게 변경사항 알림
     */
    notifyObservers(key, value) {
        const callbacks = this.observers.get(key);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(value, key);
                } catch (error) {
                    console.error(`Observer callback error for key ${key}:`, error);
                }
            });
        }
    }
    
    /**
     * 여러 상태를 일괄 업데이트
     */
    updateMultipleStates(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.updateState(key, value);
        });
    }
}

// === 전역 인스턴스 생성 ===
window.gapi = new EnhancedGoogleSheetsAPI();
window.stateManager = new StateManager();

console.log('API 모듈이 로드되었습니다.');