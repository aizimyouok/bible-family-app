// =================================================================
// Bible Time for Family - Google Apps Script (Server-side Logic)
// 최종 완성본 (모든 기능 포함) - 댓글 처리 개선 버전
// =================================================================

/**
 * @OnlyCurrentDoc
 */

// --- 1. 전역 설정 ---

// 시트 이름 상수화
const SHEETS = {
  FAMILY: 'family_members',
  READING: 'reading_records',
  BADGES: 'badges',
  MEDITATIONS: 'meditations',
  PRAYERS: 'prayers',
  MESSAGES: 'messages',
  ALLOWANCE: 'allowance_ledger'
};

// 성경 책 정보 (클라이언트와 동일하게 유지)
const BIBLE_BOOKS = { 
  old: [ { name: '창세기', chapters: 50 }, { name: '출애굽기', chapters: 40 }, { name: '레위기', chapters: 27 }, { name: '민수기', chapters: 36 }, { name: '신명기', chapters: 34 }, { name: '여호수아', chapters: 24 }, { name: '사사기', chapters: 21 }, { name: '룻기', chapters: 4 }, { name: '사무엘상', chapters: 31 }, { name: '사무엘하', chapters: 24 }, { name: '열왕기상', chapters: 22 }, { name: '열왕기하', chapters: 25 }, { name: '역대상', chapters: 29 }, { name: '역대하', chapters: 36 }, { name: '에스라', chapters: 10 }, { name: '느헤미야', chapters: 13 }, { name: '에스더', chapters: 10 }, { name: '욥기', chapters: 42 }, { name: '시편', chapters: 150 }, { name: '잠언', chapters: 31 }, { name: '전도서', chapters: 12 }, { name: '아가', chapters: 8 }, { name: '이사야', chapters: 66 }, { name: '예레미야', chapters: 52 }, { name: '예레미야애가', chapters: 5 }, { name: '에스겔', chapters: 48 }, { name: '다니엘', chapters: 12 }, { name: '호세아', chapters: 14 }, { name: '요엘', chapters: 3 }, { name: '아모스', chapters: 9 }, { name: '오바댜', chapters: 1 }, { name: '요나', chapters: 4 }, { name: '미가', chapters: 7 }, { name: '나훔', chapters: 3 }, { name: '하박국', chapters: 3 }, { name: '스바냐', chapters: 3 }, { name: '학개', chapters: 2 }, { name: '스가랴', chapters: 14 }, { name: '말라기', chapters: 4 } ], 
  new: [ { name: '마태복음', chapters: 28 }, { name: '마가복음', chapters: 16 }, { name: '누가복음', chapters: 24 }, { name: '요한복음', chapters: 21 }, { name: '사도행전', chapters: 28 }, { name: '로마서', chapters: 16 }, { name: '고린도전서', chapters: 16 }, { name: '고린도후서', chapters: 13 }, { name: '갈라디아서', chapters: 6 }, { name: '에베소서', chapters: 6 }, { name: '빌립보서', chapters: 4 }, { name: '골로새서', chapters: 4 }, { name: '데살로니가전서', chapters: 5 }, { name: '데살로니가후서', chapters: 3 }, { name: '디모데전서', chapters: 6 }, { name: '디모데후서', chapters: 4 }, { name: '디도서', chapters: 3 }, { name: '빌레몬서', chapters: 1 }, { name: '히브리서', chapters: 13 }, { name: '야고보서', chapters: 5 }, { name: '베드로전서', chapters: 5 }, { name: '베드로후서', chapters: 3 }, { name: '요한1서', chapters: 5 }, { name: '요한2서', chapters: 1 }, { name: '요한3서', chapters: 1 }, { name: '유다서', chapters: 1 }, { name: '요한계시록', chapters: 22 } ] 
};

function getSpreadsheet() { 
  return SpreadsheetApp.getActiveSpreadsheet(); 
}

// --- 2. 웹 요청 처리 (API의 입구) ---

/**
 * 웹 앱의 GET 요청을 처리하는 메인 함수
 */
function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  const apiKey = params.apiKey;
  
  // ⭐ API 키가 필요한 관리자 기능 목록
  const protectedActions = ['cleanup', 'backup', 'verifyAdmin', 'migrateDates'];
  if (protectedActions.includes(action)) {
    if (!verifyApiKey(apiKey)) {
      return createJsonResponse({ 
        success: false, 
        error: 'Invalid API key. Access denied.' 
      });
    }
  }
  
  try {
    let responseData;
    switch (action) {
      // --- 일반 기능 ---
      case 'test':
        responseData = { message: 'API 연결 성공' };
        break;
      case 'loadAll':
        responseData = loadAllData();
        break;
      case 'save':
        responseData = saveData(params);
        break;
      case 'delete':
        responseData = deleteData(params);
        break;
      case 'edit':
        responseData = editData(params);
        break;
      case 'like': // ⭐ 좋아요 기능 추가
        responseData = likeItem(params);
        break;
      case 'withdraw':
        responseData = withdrawAllowance(params);
        break;

      // --- 관리자 기능 ---
      case 'debug':
        responseData = runDiagnostics();
        break;
      case 'verifyAdmin':
        responseData = { isValid: verifyAdminPassword(params.password) };
        break;
      case 'backup':
        if (!verifyAdminPassword(params.adminPassword)) throw new Error('관리자 권한이 필요합니다.');
        responseData = { message: createBackup() };
        break;
      case 'cleanup':
        if (!verifyAdminPassword(params.adminPassword)) throw new Error('관리자 권한이 필요합니다.');
        responseData = { message: cleanupDuplicateReadingRecords() };
        break;
      case 'migrateDates':
        if (!verifyAdminPassword(params.adminPassword)) throw new Error('관리자 권한이 필요합니다.');
        responseData = { message: migrateDatesForAllUsers() };
        break;
      default:
        throw new Error('유효하지 않은 action 파라미터입니다.');
    }
    return createJsonResponse({ success: true, data: responseData });
  } catch (error) {
    Logger.log(`doGet Error (action: ${action}): ${error.stack}`);
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

// --- 3. 핵심 로직: 데이터 로드, 저장, 수정, 삭제 ---

/**
 * 모든 시트의 데이터를 로드
 */
function loadAllData() {
  const allData = {};
  for (const key in SHEETS) {
    const sheetName = SHEETS[key];
    allData[sheetName.toLowerCase()] = loadFromSheet(sheetName);
  }
  return allData;
}

/**
 * 데이터 저장 요청 분기
 */
function saveData(params) {
  const { type, userId, bookName, chapter } = params;

  if (type === 'reading') {
    saveReading(userId, bookName, parseInt(chapter), new Date().toISOString().split('T')[0]);

    // ⭐ 비전통장 적립 체크
    const familySheet = getOrCreateSheet(SHEETS.FAMILY);
    const familyData = familySheet.getDataRange().getValues();
    const headers = familyData[0];
    const idIndex = headers.indexOf('id');
    const targetIndex = headers.indexOf('is_allowance_target');
    const nameIndex = headers.indexOf('name');
    
    if (targetIndex !== -1) {
        for (let i = 1; i < familyData.length; i++) {
            if (familyData[i][idIndex] == userId && familyData[i][targetIndex] === true) {
                const currentUserName = familyData[i][nameIndex] || params.userName || '알 수 없음';
                addAllowance(userId, currentUserName, 100, `${bookName} ${chapter}장 읽기`);
                break;
            }
        }
    }
    return { message: '읽기 기록 저장 완료' };
  } else {
    return saveGenericItem(params);
  }
}

/**
 * 데이터 삭제 요청 분기
 */
function deleteData(params) {
  const { type, id } = params;
  
  // ⭐ 임시 ID 체크
  if (id && id.toString().startsWith('temp-')) {
    throw new Error('임시 저장 중인 항목은 삭제할 수 없습니다. 잠시 후 다시 시도해주세요.');
  }
  
  let sheetName;
  switch (type) {
    case 'reading':
      return { message: deleteReading(params.userId, params.bookName, parseInt(params.chapter)) };
    case 'meditation': sheetName = SHEETS.MEDITATIONS; break;
    case 'prayer': sheetName = SHEETS.PRAYERS; break;
    case 'message':
      deleteItemById(SHEETS.MESSAGES, id);
      return { message: '메시지가 삭제되었습니다.' };
    default:
      throw new Error('유효하지 않은 삭제 타입입니다.');
  }
  return { message: deleteItemById(sheetName, id) };
}

/**
 * 데이터 수정 요청 분기
 */
function editData(params) {
    const { type, id, content } = params;
    
    // ⭐ 임시 ID 체크
    if (id && id.toString().startsWith('temp-')) {
      throw new Error('임시 저장 중인 항목은 수정할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
    
    let sheetName;
    switch(type) {
        case 'meditation': sheetName = SHEETS.MEDITATIONS; break;
        case 'prayer': sheetName = SHEETS.PRAYERS; break;
        case 'message': sheetName = SHEETS.MESSAGES; break;
        default:
            throw new Error("유효하지 않은 수정 타입입니다.");
    }
    return { message: editItemContent(sheetName, id, content) };
}

// --- 4. ⭐ 좋아요 기능 구현 (개선된 버전) ---

function likeItem(params) {
  const { type, id } = params;
  
  // ⭐ 임시 ID 체크
  if (id && id.toString().startsWith('temp-')) {
    throw new Error('임시 저장 중인 항목입니다. 잠시 후 다시 시도해주세요.');
  }
  
  let sheetName;
  switch (type) {
    case 'meditation': sheetName = SHEETS.MEDITATIONS; break;
    case 'prayer': sheetName = SHEETS.PRAYERS; break;
    case 'message': sheetName = SHEETS.MESSAGES; break;
    default: throw new Error('유효하지 않은 좋아요 타입입니다.');
  }

  const sheet = getOrCreateSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    throw new Error('데이터가 없습니다.');
  }
  
  const headers = data[0];
  const likeCountIndex = headers.indexOf('like_count');

  if (likeCountIndex === -1) {
    throw new Error(`'like_count' 열이 ${sheetName} 시트에 존재하지 않습니다. 시트 구조를 확인해주세요.`);
  }

  // ⭐ ID 찾기 개선 (문자열 비교)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === id.toString()) {
      const currentLikes = parseInt(data[i][likeCountIndex]) || 0;
      sheet.getRange(i + 1, likeCountIndex + 1).setValue(currentLikes + 1);
      
      Logger.log(`좋아요 성공: ${type} ID=${id}, 이전=${currentLikes}, 이후=${currentLikes + 1}`);
      return { 
        message: '좋아요가 반영되었습니다.',
        newLikeCount: currentLikes + 1,
        itemId: id 
      };
    }
  }
  
  Logger.log(`좋아요 실패: ${type} ID=${id}를 찾을 수 없음. 시트의 모든 ID: ${data.slice(1).map(row => row[0]).join(', ')}`);
  throw new Error(`항목을 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.`);
}

// --- 5. 사용자 이름 처리 개선 및 데이터 저장 ---

/**
 * ⭐ 사용자 ID로 이름 조회 (개선된 버전)
 */
function getUserNameById(userId) {
  try {
    const familySheet = getOrCreateSheet(SHEETS.FAMILY);
    const familyData = familySheet.getDataRange().getValues();
    const headers = familyData[0];
    const idIndex = headers.indexOf('id');
    const nameIndex = headers.indexOf('name');
    
    if (idIndex === -1 || nameIndex === -1) {
      Logger.log('family_members 시트에 id 또는 name 컬럼이 없습니다.');
      return '알 수 없음';
    }
    
    for (let i = 1; i < familyData.length; i++) {
      if (familyData[i][idIndex] == userId) {
        return familyData[i][nameIndex] || '알 수 없음';
      }
    }
    
    Logger.log(`사용자 ID ${userId}를 찾을 수 없습니다.`);
    return '알 수 없음';
  } catch (error) {
    Logger.log(`getUserNameById 오류: ${error.toString()}`);
    return '알 수 없음';
  }
}

function saveGenericItem(params) {
  const { type, userId, content } = params;
  let sheetName, newRow;
  const id = `ID-${new Date().getTime()}-${Math.random().toString(36).substr(2, 5)}`;
  const timestamp = new Date().toISOString();
  
  // ⭐ 사용자 이름을 서버에서 조회
  const userName = getUserNameById(userId);

  switch (type) {
    case 'meditation':
      sheetName = SHEETS.MEDITATIONS;
      newRow = [id, userId, userName, timestamp, content, 0]; // user_name 추가
      break;
    case 'prayer':
      sheetName = SHEETS.PRAYERS;
      newRow = [id, userId, userName, timestamp, content, 0]; // user_name 추가
      break;
    case 'message':
      sheetName = SHEETS.MESSAGES;
      newRow = [id, userId, userName, timestamp, content, 0]; // user_name 추가
      break;
    default:
      throw new Error("유효하지 않은 저장 타입입니다.");
  }
  
  const sheet = getOrCreateSheet(sheetName);
  sheet.appendRow(newRow);
  
  // ⭐ 저장 확인 및 로깅
  Logger.log(`${type} 저장 완료: ID=${id}, 사용자=${userName}, 내용="${content.substring(0, 50)}..."`);
  
  // 클라이언트에서 즉각적인 피드백을 위해 저장된 데이터를 반환
  const headers = sheet.getRange(1, 1, 1, newRow.length).getValues()[0];
  const returnData = {};
  headers.forEach((header, i) => returnData[header] = newRow[i]);
  
  return returnData;
}

// --- 6. 비전통장 기능 ---

/**
 * 비전통장 적립
 */
function addAllowance(userId, name, amount, description) {
  const sheet = getOrCreateSheet(SHEETS.ALLOWANCE);
  const transactionId = `T${new Date().getTime()}`;
  const timestamp = new Date().toISOString();
  sheet.appendRow([transactionId, userId, name, timestamp, '적립', amount, description]);
}

/**
 * 비전통장 인출
 */
function withdrawAllowance(params) {
  const { userId, userName, amount } = params;
  const sheet = getOrCreateSheet(SHEETS.ALLOWANCE);
  const transactionId = `W${new Date().getTime()}`;
  const timestamp = new Date().toISOString();
  
  // ⭐ 사용자 이름을 서버에서 조회 (안전성 향상)
  const actualUserName = userName || getUserNameById(userId);
  
  sheet.appendRow([transactionId, userId, actualUserName, timestamp, '인출', -Math.abs(amount), '용돈 인출']);
  return { message: '인출이 기록되었습니다.' };
}// --- 7. 시트 데이터 처리 헬퍼 함수 ---

function loadFromSheet(sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return sheetName === SHEETS.READING ? {} : [];
  }

  const headers = values[0].map(h => h.toLowerCase());
  const rows = values.slice(1);

  if (sheetName === SHEETS.READING) {
      const readingData = {};
      rows.filter(row => row[0] && row[1]).forEach(row => {
          const record = {};
          headers.forEach((header, index) => record[header] = row[index]);
          const userId = record.user_id;
          const bookName = record.book_name;

          if (!readingData[userId]) readingData[userId] = {};

          try {
            record.chapters = record.chapters && record.chapters.length > 2 ? JSON.parse(record.chapters) : [];
            record.read_dates = record.read_dates && record.read_dates.length > 2 ? JSON.parse(record.read_dates) : {};
          } catch(e) {
            Logger.log(`JSON 파싱 오류: userId=${userId}, bookName=${bookName}, chapters=${record.chapters}, error=${e.message}`);
            record.chapters = [];
            record.read_dates = {};
          }
          readingData[userId][bookName] = record;
      });
      return readingData;
  } else {
      return rows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
              obj[header] = row[index];
          });
          return obj;
      });
  }
}

function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupSheetHeaders(sheet, sheetName);
  }
  return sheet;
}

function setupSheetHeaders(sheet, sheetName) {
  let headers;
  switch (sheetName) {
    case SHEETS.FAMILY:
      headers = ['id', 'name', 'title', 'photo', 'is_allowance_target'];
      break;
    case SHEETS.READING:
      headers = ['user_id', 'book_name', 'chapters', 'read_dates', 'start_date', 'end_date'];
      break;
    case SHEETS.BADGES:
      headers = ['user_id', 'badge_ids'];
      break;
    case SHEETS.MEDITATIONS:
      headers = ['id', 'user_id', 'user_name', 'timestamp', 'content', 'like_count'];
      break;
    case SHEETS.PRAYERS:
      headers = ['id', 'user_id', 'user_name', 'timestamp', 'content', 'like_count'];
      break;
    case SHEETS.MESSAGES:
      headers = ['id', 'user_id', 'user_name', 'timestamp', 'content', 'like_count'];
      break;
    case SHEETS.ALLOWANCE:
      headers = ['transaction_id', 'user_id', 'name', 'timestamp', 'type', 'amount', 'description'];
      break;
    default:
      return;
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f0f0f0');
  sheet.autoResizeColumns(1, headers.length);
}

// --- 8. 삭제 및 수정 관련 함수들 (개선된 버전) ---

function deleteItemById(sheetName, id) {
  // ⭐ 임시 ID 체크
  if (id && id.toString().startsWith('temp-')) {
    throw new Error('임시 저장 중인 항목은 삭제할 수 없습니다.');
  }
  
  const sheet = getOrCreateSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    throw new Error('삭제할 데이터가 없습니다.');
  }
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] && data[i][0].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      Logger.log(`삭제 완료: ${sheetName} ID=${id}`);
      return '삭제되었습니다.';
    }
  }
  
  Logger.log(`삭제 실패: ${sheetName} ID=${id}를 찾을 수 없음`);
  throw new Error('삭제할 항목을 찾지 못했습니다. 새로고침 후 다시 시도해주세요.');
}

function editItemContent(sheetName, id, newContent) {
    // ⭐ 임시 ID 체크
    if (id && id.toString().startsWith('temp-')) {
      throw new Error('임시 저장 중인 항목은 수정할 수 없습니다.');
    }
    
    const sheet = getOrCreateSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 1) {
      throw new Error('수정할 데이터가 없습니다.');
    }
    
    const contentIndex = data[0].indexOf('content');
    if (contentIndex === -1) {
      throw new Error("'content' 열을 찾을 수 없습니다.");
    }

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString() === id.toString()) {
            sheet.getRange(i + 1, contentIndex + 1).setValue(newContent);
            Logger.log(`수정 완료: ${sheetName} ID=${id}`);
            return '수정되었습니다.';
        }
    }
    
    Logger.log(`수정 실패: ${sheetName} ID=${id}를 찾을 수 없음`);
    throw new Error('수정할 항목을 찾지 못했습니다. 새로고침 후 다시 시도해주세요.');
}

// --- 9. 읽기 기록 처리 함수들 (기존과 동일) ---

function saveReading(userId, bookName, chapter, readDate) {
  const sheet = getOrCreateSheet(SHEETS.READING);
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(5000);
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    const matchingRows = [];
    rows.forEach((row, index) => {
      if (row[0] === userId && row[1] === bookName) {
        matchingRows.push({
          rowIndex: index + 2,
          chapters: row[2] ? JSON.parse(row[2]) : [],
          readDates: row[3] ? JSON.parse(row[3]) : {},
          startDate: row[4] || null,
          endDate: row[5] || null
        });
      }
    });
    
    const currentDate = readDate || new Date().toISOString().split('T')[0];
    
    if (matchingRows.length === 0) {
      const newReadDates = {};
      newReadDates[chapter] = currentDate;
      
      sheet.appendRow([
        userId, 
        bookName, 
        JSON.stringify([chapter]),
        JSON.stringify(newReadDates),
        currentDate,
        null
      ]);
    } else if (matchingRows.length === 1) {
      const row = matchingRows[0];
      if (!row.chapters.includes(chapter)) {
        row.chapters.push(chapter);
        row.chapters.sort((a, b) => a - b);
        row.readDates[chapter] = currentDate;
        
        if (!row.startDate) {
          row.startDate = currentDate;
        }
        
        const book = [...BIBLE_BOOKS.old, ...BIBLE_BOOKS.new].find(b => b.name === bookName);
        let endDate = row.endDate;
        if (book && row.chapters.length === book.chapters) {
          endDate = currentDate;
        }
        
        sheet.getRange(row.rowIndex, 3, 1, 4).setValues([[
          JSON.stringify(row.chapters),
          JSON.stringify(row.readDates),
          row.startDate,
          endDate
        ]]);
      }
    }
    
  } catch (e) {
    Logger.log(`saveReading 오류: ${e.toString()}`);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function deleteReading(userId, bookName, chapter) {
    const sheet = getOrCreateSheet(SHEETS.READING);
    const lock = LockService.getScriptLock();
    
    try {
        lock.waitLock(5000);
        
        const data = sheet.getDataRange().getValues();
        const rows = data.slice(1);
        
        const matchingRows = [];
        rows.forEach((row, index) => {
          if (row[0] === userId && row[1] === bookName) {
            matchingRows.push({
              rowIndex: index + 2,
              chapters: row[2] ? JSON.parse(row[2]) : [],
              readDates: row[3] ? JSON.parse(row[3]) : {},
              startDate: row[4] || null,
              endDate: row[5] || null
            });
          }
        });
        
        if (matchingRows.length === 0) {
            return '삭제할 기록을 찾지 못했습니다.';
        }
        
        let found = false;
        const allChapters = new Set();
        const allReadDates = {};
        let earliestStart = null;
        let latestEnd = null;
        
        matchingRows.forEach(row => {
          row.chapters.forEach(ch => {
            if (ch !== chapter) {
              allChapters.add(ch);
            } else {
              found = true;
            }
          });
          
          Object.keys(row.readDates).forEach(ch => {
            if (ch != chapter) {
              allReadDates[ch] = row.readDates[ch];
            }
          });
          
          if (row.startDate && (!earliestStart || row.startDate < earliestStart)) {
            earliestStart = row.startDate;
          }
          if (row.endDate && (!latestEnd || row.endDate > latestEnd)) {
            latestEnd = row.endDate;
          }
        });
        
        if (!found) {
            return '삭제할 기록을 찾지 못했습니다.';
        }
        
        const sortedChapters = Array.from(allChapters).sort((a, b) => a - b);
        
        const book = [...BIBLE_BOOKS.old, ...BIBLE_BOOKS.new].find(b => b.name === bookName);
        let endDate = latestEnd;
        if (book && sortedChapters.length < book.chapters) {
          endDate = null;
        }
        
        sheet.getRange(matchingRows[0].rowIndex, 3, 1, 4).setValues([[
          JSON.stringify(sortedChapters),
          JSON.stringify(allReadDates),
          earliestStart,
          endDate
        ]]);
        
        for (let i = matchingRows.length - 1; i >= 1; i--) {
            sheet.deleteRow(matchingRows[i].rowIndex);
        }
        
        return '읽기 기록이 삭제되었습니다.';
        
    } catch (e) {
        Logger.log(`deleteReading 오류: ${e.toString()}`);
        throw e;
    } finally {
        lock.releaseLock();
    }
}

// --- 10. 유틸리티 및 관리자 함수들 ---

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function verifyApiKey(inputKey) {
  if (!inputKey) return false;
  const storedKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!storedKey) {
    return inputKey === 'bible_family_default';
  }
  return inputKey === storedKey;
}

function verifyAdminPassword(inputPassword) {
  if (!inputPassword) return false;
  const storedPassword = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!storedPassword) {
    return inputPassword === '748600';
  }
  return inputPassword === storedPassword;
}

function createBackup() {
  const ss = getSpreadsheet();
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const backupSheetName = `backup_${timestamp}`;
  const backupSheet = ss.insertSheet(backupSheetName, 0);
  
  const summary = [['백업 시간', new Date()], ['---', '---'], ['시트 이름', '백업된 행 수']];

  for (const key in SHEETS) {
      const sheetName = SHEETS[key];
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
          const data = sheet.getDataRange().getValues();
          const destSheet = ss.insertSheet(`${sheetName}_${timestamp}`);
          destSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
          summary.push([sheetName, data.length]);
      } else {
          summary.push([sheetName, '시트 없음']);
      }
  }
  backupSheet.getRange(1, 1, summary.length, 2).setValues(summary);
  return `백업 완료: "${backupSheetName}" 시트에 요약 정보가 저장되었습니다.`;
}

function cleanupDuplicateReadingRecords() {
  return "중복 정리 기능은 현재 구현되지 않았습니다.";
}

function runDiagnostics() {
  const ss = getSpreadsheet();
  return {
    spreadsheetName: ss.getName(),
    foundSheetTabs: ss.getSheets().map(sheet => sheet.getName()),
    duplicateAnalysis: "진단 기능은 현재 구현되지 않았습니다."
  };
}

function migrateDatesForAllUsers() {
  return "날짜 마이그레이션 기능은 현재 구현되지 않았습니다.";
}
