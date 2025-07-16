/**
 * Bible Time for Family - API 통신 관리
 * 구글 시트와의 모든 통신을 담당하는 모듈
 */

// === API 설정 ===
const API_CONFIG = {
    scriptUrl: 'https://script.google.com/macros/s/AKfycbx6it5kHR633l5C2AF4e5_sDvoDKx15PwcwT8bA3iGJMEXHX5MpyIIi8yGROLrHx9Zq0g/exec',
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
        
        // ⭐ 스마트 폴링 관련 속성
        this.realtimeSyncInterval = null;
        this.realtimeSyncEnabled = true;
        this.lastServerModified = null;
        this.currentSyncInterval = 1000; // 현재 동기화 간격 (ms)
        this.consecutiveNoChanges = 0; // 연속 변화 없음 횟수
        this.maxSyncInterval = 30000; // 최대 동기화 간격 (30초)
        
        // ⭐ 자동 동기화 제거, 실시간 동기화만 시작
        this.loadPendingChangesFromLocal();
        this.startRealtimeSync();
    }
    
    // ⭐ === 실시간 다중 기기 동기화 시스템 ===
    
    /**
     * 실시간 동기화 시작 (⭐ 스마트 폴링 시스템)
     */
    startRealtimeSync() {
        // 기존 간격이 있다면 먼저 정리
        if (this.realtimeSyncInterval) {
            clearInterval(this.realtimeSyncInterval);
        }
        
        // ⭐ 스마트 폴링: 동적 간격 조정
        const startSmartPolling = () => {
            this.realtimeSyncInterval = setInterval(() => {
                if (this.isConnected && this.realtimeSyncEnabled && !this.syncInProgress) {
                    this.checkForServerUpdates();
                }
            }, this.currentSyncInterval);
        };
        
        // 초기 시작
        startSmartPolling();
        
        console.log(`📡 스마트 실시간 동기화 시작 (${this.currentSyncInterval}ms 간격)`);
        
        // ⭐ 페이지 포커스 시에도 즉시 동기화 + 간격 리셋
        window.addEventListener('focus', () => {
            console.log('🔍 페이지 포커스 감지 - 즉시 동기화 + 간격 리셋');
            this.resetSyncInterval();
            if (this.isConnected && this.realtimeSyncEnabled && !this.syncInProgress) {
                this.checkForServerUpdates();
            }
        });
        
        // ⭐ 페이지 가시성 변경 시에도 동기화 + 간격 리셋
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ 페이지 가시성 변경 감지 - 간격 리셋');
                this.resetSyncInterval();
                if (this.isConnected && this.realtimeSyncEnabled && !this.syncInProgress) {
                    setTimeout(() => this.checkForServerUpdates(), 300);
                }
            }
        });
        
        // ⭐ 탭 전환 감지 추가
        document.addEventListener('DOMContentLoaded', () => {
            const observer = new MutationObserver(() => {
                if (this.isConnected && this.realtimeSyncEnabled && !this.syncInProgress) {
                    console.log('📱 DOM 변경 감지 - 간격 리셋');
                    this.resetSyncInterval();
                    setTimeout(() => this.checkForServerUpdates(), 200);
                }
            });
            
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['class']
            });
        });
        
        // 즉시 한 번 실행
        if (this.isConnected) {
            console.log('🚀 스마트 동기화 즉시 실행');
            this.checkForServerUpdates();
        }
    }
    
    /**
     * ⭐ 스마트 폴링: 동기화 간격 조정
     */
    adjustSyncInterval(hasUpdates) {
        if (hasUpdates) {
            // 변화 감지시: 간격 리셋
            this.resetSyncInterval();
            console.log('📈 변화 감지 - 동기화 간격 1초로 리셋');
        } else {
            // 변화 없음: 점진적 간격 증가
            this.consecutiveNoChanges++;
            
            let newInterval = this.currentSyncInterval;
            
            if (this.consecutiveNoChanges >= 5) { // 5회 연속 변화 없음
                newInterval = Math.min(this.currentSyncInterval * 1.5, this.maxSyncInterval);
            }
            
            if (newInterval !== this.currentSyncInterval) {
                this.currentSyncInterval = newInterval;
                console.log(`📉 ${this.consecutiveNoChanges}회 변화 없음 - 동기화 간격 ${newInterval}ms로 증가`);
                
                // 새로운 간격으로 타이머 재시작
                this.restartSyncWithNewInterval();
            }
        }
    }
    
    /**
     * ⭐ 동기화 간격 리셋 (빠른 간격으로)
     */
    resetSyncInterval() {
        this.currentSyncInterval = 1000; // 1초로 리셋
        this.consecutiveNoChanges = 0;
        this.restartSyncWithNewInterval();
    }
    
    /**
     * ⭐ 새로운 간격으로 타이머 재시작
     */
    restartSyncWithNewInterval() {
        if (this.realtimeSyncInterval) {
            clearInterval(this.realtimeSyncInterval);
        }
        
        this.realtimeSyncInterval = setInterval(() => {
            if (this.isConnected && this.realtimeSyncEnabled && !this.syncInProgress) {
                this.checkForServerUpdates();
            }
        }, this.currentSyncInterval);
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
     * 서버 업데이트 확인 (⭐ 스마트 폴링 지원)
     */
    async checkForServerUpdates() {
        try {
            const clientLastSync = localStorage.getItem('bible_data_timestamp');
            
            const result = await this._request('checkUpdates', {
                lastSync: clientLastSync || new Date(0).toISOString()
            });
            
            const hasUpdates = result.data.hasUpdates;
            
            // ⭐ 스마트 폴링: 간격 조정
            this.adjustSyncInterval(hasUpdates);
            
            if (hasUpdates) {
                console.log('🔄 서버 변경사항 감지 - 실시간 반영');
                await this.applyServerUpdates(result.data);
            }
            
        } catch (error) {
            // ⭐ 에러도 조용히 처리
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.isConnected = false;
                setTimeout(() => {
                    this.testConnection().catch(() => {});
                }, 5000);
            }
        }
    }
    
    /**
     * 서버 업데이트 적용 (⭐ 현재 탭만 선택적 실시간 반영)
     */
    async applyServerUpdates(updateData) {
        try {
            const stateManager = window.stateManager;
            const currentTab = window.currentTab || 'reading';
            
            // ⭐ 모든 옵저버 알림을 차단 (깜빡거림 방지)
            stateManager.disableObservers();
            
            // ⭐ 데이터 업데이트 (옵저버 알림 없음)
            stateManager.updateState('family', updateData.data.family_members || []);
            stateManager.updateState('readRecords', updateData.data.reading_records || {});
            stateManager.updateState('badges', updateData.data.badges || {});
            stateManager.updateState('meditations', updateData.data.meditations || []);
            stateManager.updateState('prayers', updateData.data.prayers || []);
            stateManager.updateState('messages', updateData.data.messages || []);
            stateManager.updateState('allowance', updateData.data.allowance_ledger || []);
            
            // ⭐ 로컬 스토리지 업데이트
            this.saveToLocalStorageSilently();
            localStorage.setItem('bible_data_timestamp', updateData.lastModified);
            
            // ⭐ 옵저버 다시 활성화
            stateManager.enableObservers();
            
            // ⭐ 현재 활성 탭만 조용히 업데이트 (애니메이션 없이)
            if (window.components && window.components[currentTab]) {
                const tabContent = document.getElementById(`content-${currentTab}`);
                if (tabContent && !tabContent.classList.contains('hidden')) {
                    // 부드러운 업데이트를 위한 클래스 추가
                    tabContent.classList.add('smooth-update');
                    
                    console.log(`📱 현재 탭 실시간 반영: ${currentTab}`);
                    window.components[currentTab].render();
                    
                    // 부드러운 업데이트 클래스 제거
                    setTimeout(() => {
                        tabContent.classList.remove('smooth-update');
                    }, 100);
                }
            }
            
        } catch (error) {
            console.error('백그라운드 데이터 동기화 실패:', error);
            // 에러 시에도 옵저버 다시 활성화
            window.stateManager.enableObservers();
        }
    }
    
    /**
     * ⭐ 조용한 로컬 스토리지 저장 (UI 업데이트 없이)
     */
    saveToLocalStorageSilently() {
        const state = window.stateManager.state; // 직접 state 접근
        
        const currentTimestamp = localStorage.getItem('bible_data_timestamp') || new Date().toISOString();
        
        localStorage.setItem('bible_data_timestamp', currentTimestamp);
        localStorage.setItem('bible_family', JSON.stringify(state.family));
        localStorage.setItem('bible_readRecords', JSON.stringify(state.readRecords));
        localStorage.setItem('bible_badges', JSON.stringify(state.badges));
        localStorage.setItem('bible_meditations', JSON.stringify(state.meditations));
        localStorage.setItem('bible_prayers', JSON.stringify(state.prayers));
        localStorage.setItem('bible_messages', JSON.stringify(state.messages));
        localStorage.setItem('bible_allowance', JSON.stringify(state.allowance));
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
        const state = window.stateManager.getAllState();
        
        // ⭐ 타임스탬프 형식 통일 (ISO 문자열 사용)
        const currentTimestamp = localStorage.getItem('bible_data_timestamp') || new Date().toISOString();
        
        localStorage.setItem('bible_data_timestamp', currentTimestamp);
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
                timestamp: timestamp || null,  // ⭐ ISO 문자열 그대로 사용
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
        console.log('🌐 서버 연결 성공! 실시간 동기화 활성화 (1초 간격)');
        
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
     * 모든 데이터 로드 (⭐ 타임스탬프도 함께 가져와서 동기화)
     */
    async loadAllData() {
        const result = await this._request('loadAll');
        
        // ⭐ 서버 데이터를 상태 관리자에 저장
        const stateManager = window.stateManager;
        stateManager.updateState('family', result.data.family_members || []);
        stateManager.updateState('readRecords', result.data.reading_records || {});
        stateManager.updateState('badges', result.data.badges || {});
        stateManager.updateState('meditations', result.data.meditations || []);
        stateManager.updateState('prayers', result.data.prayers || []);
        stateManager.updateState('messages', result.data.messages || []);
        stateManager.updateState('allowance', result.data.allowance_ledger || []);
        
        // ⭐ 서버의 현재 타임스탬프를 가져와서 로컬에 저장
        try {
            const timestampResult = await this._request('getLastModified');
            const serverTimestamp = timestampResult.data.lastModified;
            localStorage.setItem('bible_data_timestamp', serverTimestamp);
            console.log('✅ 서버 타임스탬프 동기화 완료:', serverTimestamp);
        } catch (error) {
            console.warn('⚠️ 서버 타임스탬프 가져오기 실패:', error);
            // 실패하면 현재 시간으로 설정
            localStorage.setItem('bible_data_timestamp', new Date().toISOString());
        }
        
        this.saveToLocalStorage();
        return result.data;
    }
    
    /**
     * 데이터 저장 (⭐ 사용자 액션시 동기화 간격 리셋)
     */
    async saveData(params) {
        try {
            // ⭐ 사용자 액션시 스마트 폴링 간격 리셋
            this.resetSyncInterval();
            
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
     * 데이터 삭제 (⭐ 사용자 액션시 동기화 간격 리셋)
     */
    async deleteData(params) {
        try {
            // ⭐ 사용자 액션시 스마트 폴링 간격 리셋
            this.resetSyncInterval();
            
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
        this.observersDisabled = false; // ⭐ 옵저버 완전 비활성화 플래그
    }
    
    /**
     * ⭐ 옵저버 시스템 완전 비활성화/활성화
     */
    disableObservers() {
        this.observersDisabled = true;
    }
    
    enableObservers() {
        this.observersDisabled = false;
    }
    
    /**
     * 상태 업데이트 및 관찰자들에게 알림 (⭐ 옵저버 비활성화 지원)
     */
    updateState(key, value) {
        this.state[key] = value;
        
        // ⭐ 옵저버가 비활성화되었거나 조용한 업데이트 모드일 때는 알림 안함
        if (!this.observersDisabled && !this.silentUpdate) {
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