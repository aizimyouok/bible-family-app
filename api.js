/**
 * Bible Time for Family - API 통신 관리
 * 구글 시트와의 모든 통신을 담당하는 모듈
 */

// === API 설정 ===
const API_CONFIG = {
    scriptUrl: 'https://script.google.com/macros/s/AKfycbxEB-oaexQ6CUGEyIeKCRYrPclwfFb6kEcudu9dryYwF1zePZbSzixID3oKBZKkEVAelQ/exec',
    apiKey: 'bible_family_default',
    enableSecurity: false
};

/**
 * 향상된 구글 시트 API 클래스
 * 오프라인 지원, 큐 시스템, 자동 동기화 포함
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
        this.autoSyncInterval = null;
        
        // 자동 동기화 시작 (5초마다)
        this.startAutoSync();
        this.loadPendingChangesFromLocal();
    }
    
    /**
     * 자동 동기화 시작
     */
    startAutoSync() {
        this.autoSyncInterval = setInterval(() => {
            if (this.pendingChanges.length > 0 && this.isConnected && !this.syncInProgress) {
                this.processPendingChanges();
            }
        }, 5000);
    }
    
    /**
     * 자동 동기화 중지
     */
    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
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
            this.pendingChanges = JSON.parse(stored);
            this.updatePendingCounter();
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
            const changes = [...this.pendingChanges];
            
            for (const change of changes) {
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
                        await this._request('delete', {
                            type: change.type,
                            userId: change.userId,
                            bookName: change.bookName,
                            chapter: change.chapter,
                            id: change.id
                        });
                    }
                    
                    this.pendingChanges = this.pendingChanges.filter(c => c.id !== change.id);
                } catch (error) {
                    console.error('개별 변경사항 동기화 실패:', error);
                }
            }
            
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
     * 연결 테스트
     */
    async testConnection() {
        await this._request('test');
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
            return result;
        } catch (error) {
            console.error('즉시 저장 실패:', error);
            throw error;
        }
    }
    
    /**
     * 데이터 삭제 (큐 시스템 사용)
     */
    async deleteData(params) {
        const changeId = this.addPendingChange({
            action: 'delete',
            ...params
        });
        
        // 온라인이면 즉시 동기화 시도
        if (this.isConnected) {
            setTimeout(() => this.processPendingChanges(), 100);
        }
        
        return { success: true };
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
 * Observer 패턴을 사용한 실시간 UI 업데이트
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
    }
    
    /**
     * 상태 업데이트 및 관찰자들에게 알림
     */
    updateState(key, value) {
        this.state[key] = value;
        this.notifyObservers(key, value);
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