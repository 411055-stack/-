// ===== 配置 =====
const STORAGE_KEY = 'flashcardWords';
const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/english/';
const REMOTE_API_URL = 'https://script.google.com/macros/s/AKfycbwpUhV1qJKEIBz1y0RLbAuLAR5FHsmK2ZDOeBFmbc-V9KifMAv6wRnkWNW5WfHeq2jq/exec'; // 例如：https://script.google.com/macros/s/.../exec

// ===== DOM 元素 - 導航 =====
const navTabs = document.querySelectorAll('.nav-tab');
const studyView = document.getElementById('study-view');
const manageView = document.getElementById('manage-view');

// ===== DOM 元素 - 學習視圖 =====
const cardEl = document.getElementById('card');
const wordEl = document.getElementById('word');
const translationEl = document.getElementById('translation');
const posEl = document.getElementById('pos');
const phoneticEl = document.getElementById('phonetic');
const exampleEl = document.getElementById('example');
const etymologyEl = document.getElementById('etymology');
const exampleSectionEl = document.getElementById('exampleSection');
const etymologySectionEl = document.getElementById('etymologySection');
const currentEl = document.getElementById('current');
const totalEl = document.getElementById('total');

const prevBtn = document.getElementById('prevBtn');
const flipBtn = document.getElementById('flipBtn');
const nextBtn = document.getElementById('nextBtn');

// ===== DOM 元素 - 管理視圖 =====
const addWordForm = document.getElementById('addWordForm');
const englishWordInput = document.getElementById('englishWord');
const chineseTranslationInput = document.getElementById('chineseTranslation');
const partOfSpeechInput = document.getElementById('partOfSpeech');
const phoneticInput = document.getElementById('phonetic');
const exampleInput = document.getElementById('example');
const etymologyInput = document.getElementById('etymology');
const autoFillBtn = document.getElementById('autoFillBtn');
const autoFillStatus = document.getElementById('autoFillStatus');
const wordList = document.getElementById('wordList');
const wordCount = document.getElementById('wordCount');

// ===== 狀態管理 =====
let wordDatabase = [];
let currentIndex = 0;
let isFlipped = false;

// ===== 初始化 =====
async function init() {
    setupEventListeners();
    await loadWordsFromRemoteOrStorage();
    updateStudyView();
    renderWordList();
}

function setupEventListeners() {
    // 導航標籤
    navTabs.forEach(tab => {
        tab.addEventListener('click', switchView);
    });

    // 學習視圖事件
    cardEl.addEventListener('click', flipCard);
    flipBtn.addEventListener('click', flipCard);
    prevBtn.addEventListener('click', previousWord);
    nextBtn.addEventListener('click', nextWord);

    // 管理視圖事件
    autoFillBtn.addEventListener('click', autoFillWord);
    addWordForm.addEventListener('submit', handleAddWord);

    // 鍵盤事件
    document.addEventListener('keydown', handleKeyboard);
}

// ===== 視圖管理 =====
function switchView(e) {
    const tabName = e.target.dataset.tab;

    // 更新標籤狀態
    navTabs.forEach(tab => tab.classList.remove('active'));
    e.target.classList.add('active');

    // 切換視圖
    if (tabName === 'study') {
        studyView.classList.add('active');
        manageView.classList.remove('active');
    } else {
        studyView.classList.remove('active');
        manageView.classList.add('active');
    }
}

// ===== 本地存儲 =====
function loadWordsFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                wordDatabase = parsed;
                return;
            }
        }
    } catch (error) {
        console.warn('讀取本地單字失敗，將使用預設資料:', error);
    }

    // 預設單字
    wordDatabase = [
        {
            word: 'Serendipity',
            translation: '巧合；幸運的發現',
            pos: 'noun',
            phonetic: '/ˌserənˈdɪpɪti/',
            example: 'Finding this old letter was pure serendipity.',
            etymology: 'From Persian fairy tale "The Three Princes of Serendip"'
        },
        {
            word: 'Ephemeral',
            translation: '短暫的；易消逝的',
            pos: 'adjective',
            phonetic: '/ɪˈfem(ə)rəl/',
            example: 'The beauty of cherry blossoms is ephemeral, lasting only a few weeks.',
            etymology: 'From Greek "ephemerios" meaning "lasting only a day"'
        }
    ];
    saveWordsToStorage();
}

function saveWordsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wordDatabase));
    syncWordsToRemote();
}

async function loadWordsFromRemoteOrStorage() {
    if (REMOTE_API_URL) {
        const remoteLoaded = await loadWordsFromRemote();
        if (remoteLoaded) {
            return;
        }
    }
    loadWordsFromStorage();
}

async function loadWordsFromRemote() {
    if (!REMOTE_API_URL) return false;

    try {
        const response = await fetch(REMOTE_API_URL);
        if (!response.ok) {
            throw new Error('remote fetch failed');
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            wordDatabase = data;
            saveWordsToStorage();
            return true;
        }
    } catch (error) {
        console.warn('無法從遠端取得資料，改用本地資料:', error);
    }

    return false;
}

async function syncWordsToRemote() {
    if (!REMOTE_API_URL) return;

    try {
        await fetch(REMOTE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'saveWords',
                words: wordDatabase
            })
        });
    } catch (error) {
        console.warn('同步到遠端失敗:', error);
    }
}
// ===== 更新卡片 =====
function updateStudyView() {
    if (wordDatabase.length === 0) {
        wordEl.textContent = '暫無單字';
        translationEl.textContent = '請到管理頁面新增單字';
        posEl.textContent = '-';
        phoneticEl.textContent = '-';
        exampleSectionEl.style.display = 'none';
        etymologySectionEl.style.display = 'none';
        totalEl.textContent = '0';
        return;
    }

    const word = wordDatabase[currentIndex];
    
    wordEl.textContent = word.word;
    translationEl.textContent = word.translation;
    posEl.textContent = word.pos || '-';
    phoneticEl.textContent = word.phonetic || '-';
    
    // 例句
    if (word.example) {
        exampleEl.textContent = word.example;
        exampleSectionEl.style.display = 'block';
    } else {
        exampleSectionEl.style.display = 'none';
    }

    // 字根分析
    if (word.etymology) {
        etymologyEl.textContent = word.etymology;
        etymologySectionEl.style.display = 'block';
    } else {
        etymologySectionEl.style.display = 'none';
    }
    
    currentEl.textContent = currentIndex + 1;
    totalEl.textContent = wordDatabase.length;
    
    // 重置翻轉狀態
    isFlipped = false;
    cardEl.classList.remove('flipped');
}

// ===== 翻轉卡片 =====
function flipCard() {
    isFlipped = !isFlipped;
    cardEl.classList.toggle('flipped');
}

// ===== 導航單字 =====
function previousWord() {
    currentIndex = (currentIndex - 1 + wordDatabase.length) % wordDatabase.length;
    updateStudyView();
}

function nextWord() {
    currentIndex = (currentIndex + 1) % wordDatabase.length;
    updateStudyView();
}

// ===== 鍵盤事件 =====
function handleKeyboard(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        if (studyView.classList.contains('active')) {
            flipCard();
        }
    } else if (e.code === 'ArrowLeft') {
        if (studyView.classList.contains('active')) {
            previousWord();
        }
    } else if (e.code === 'ArrowRight') {
        if (studyView.classList.contains('active')) {
            nextWord();
        }
    }
}

// ===== API 自動填入 =====
function getFirstDefinition(entry) {
    if (!entry || !Array.isArray(entry.meanings)) return '';

    for (const meaning of entry.meanings) {
        if (Array.isArray(meaning.definitions) && meaning.definitions.length > 0) {
            return meaning.definitions[0].definition || '';
        }
    }

    return '';
}

function getFirstExample(entry) {
    if (!entry || !Array.isArray(entry.meanings)) return '';

    for (const meaning of entry.meanings) {
        if (Array.isArray(meaning.definitions) && meaning.definitions.length > 0) {
            return meaning.definitions[0].example || '';
        }
    }

    return '';
}

function getFirstPartOfSpeech(entry) {
    if (!entry || !Array.isArray(entry.meanings) || entry.meanings.length === 0) return '';
    return entry.meanings[0].partOfSpeech || '';
}

function getPhoneticText(entry) {
    if (!entry) return '';
    if (entry.phonetic) return entry.phonetic;
    if (Array.isArray(entry.phonetics) && entry.phonetics.length > 0) {
        return entry.phonetics[0].text || '';
    }
    return '';
}

function getEtymologyText(entry) {
    if (!entry) return '';
    if (entry.etymology) return entry.etymology;
    if (Array.isArray(entry.etymologies) && entry.etymologies.length > 0) {
        return entry.etymologies.join(' ');
    }
    if (entry.origin) return entry.origin;
    return '';
}

async function autoFillWord() {
    const word = englishWordInput.value.trim();

    if (!word) {
        showStatus('請輸入英文單字', 'error');
        return;
    }

    autoFillBtn.disabled = true;
    showStatus('⏳ 正在查詢...', 'loading');

    try {
        const encodedWord = encodeURIComponent(word.toLowerCase());
        const response = await fetch(`${API_URL}${encodedWord}`);

        if (!response.ok) {
            throw new Error('查詢失敗，請確認單字是否正確');
        }

        const data = await response.json();
        const firstEntry = Array.isArray(data) && data.length > 0 ? data[0] : null;

        if (!firstEntry) {
            throw new Error('API 沒有回傳有效資料');
        }

        const translation = getFirstDefinition(firstEntry) || '尚未取得翻譯';
        const pos = getFirstPartOfSpeech(firstEntry) || '';
        const phonetic = getPhoneticText(firstEntry) || '';
        const example = getFirstExample(firstEntry) || '';
        const etymology = getEtymologyText(firstEntry) || '';

        chineseTranslationInput.value = translation;
        partOfSpeechInput.value = pos;
        phoneticInput.value = phonetic;
        exampleInput.value = example;
        etymologyInput.value = etymology;

        showStatus('✅ 已自動填入相關資訊', 'success');
    } catch (error) {
        showStatus(`❌ ${error.message}`, 'error');
    } finally {
        autoFillBtn.disabled = false;
    }
}

function showStatus(message, type) {
    autoFillStatus.textContent = message;
    autoFillStatus.className = `status-message ${type}`;
}

// ===== 新增單字 =====
function handleAddWord(e) {
    e.preventDefault();

    const word = englishWordInput.value.trim();
    const translation = chineseTranslationInput.value.trim();
    const pos = partOfSpeechInput.value.trim();
    const phonetic = phoneticInput.value.trim();
    const example = exampleInput.value.trim();
    const etymology = etymologyInput.value.trim();

    if (!word || !translation) {
        alert('請填入英文單字和中文翻譯');
        return;
    }

    // 檢查重複
    if (wordDatabase.some(w => w.word.toLowerCase() === word.toLowerCase())) {
        alert('此單字已存在');
        return;
    }

    // 新增單字
    const newWord = {
        word,
        translation,
        pos: pos || '-',
        phonetic: phonetic || '-',
        example,
        etymology
    };

    wordDatabase.push(newWord);
    saveWordsToStorage();

    // 重置表單
    addWordForm.reset();
    showStatus('', '');

    // 顯示新加入的單字
    currentIndex = wordDatabase.length - 1;
    updateStudyView();
    renderWordList();

    alert('✅ 單字新增成功！');
}

// ===== 渲染單字列表 =====
function renderWordList() {
    wordList.innerHTML = '';
    wordCount.textContent = wordDatabase.length;

    if (wordDatabase.length === 0) {
        wordList.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 20px;">尚無單字，請新增</p>';
        return;
    }

    wordDatabase.forEach((word, index) => {
        const div = document.createElement('div');
        div.className = 'word-item';
        div.innerHTML = `
            <div class="word-item-info">
                <div class="word-item-word">${word.word}</div>
                <div class="word-item-trans">${word.translation}</div>
            </div>
            <button type="button" class="btn-delete" onclick="deleteWord(${index})">刪除</button>
        `;
        wordList.appendChild(div);
    });
}

// ===== 刪除單字 =====
function deleteWord(index) {
    if (confirm(`確定要刪除 "${wordDatabase[index].word}" 嗎？`)) {
        wordDatabase.splice(index, 1);
        saveWordsToStorage();
        
        if (currentIndex >= wordDatabase.length && currentIndex > 0) {
            currentIndex--;
        }
        
        renderWordList();
        updateStudyView();
    }
}

// ===== 啟動應用 =====
init();
