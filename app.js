// ===== 配置 =====
const STORAGE_KEY = 'flashcardWords';
const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/english/';

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
function init() {
    loadWordsFromStorage();
    setupEventListeners();
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
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        wordDatabase = JSON.parse(stored);
    } else {
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
}

function saveWordsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wordDatabase));
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
async function autoFillWord() {
    const word = englishWordInput.value.trim();
    
    if (!word) {
        showStatus('請輸入英文單字', 'error');
        return;
    }

    autoFillBtn.disabled = true;
    showStatus('⏳ 正在查詢...', 'loading');

    try {
        const response = await fetch(`${API_URL}${word.toLowerCase()}`);
        
        if (!response.ok) {
            throw new Error('單字不存在');
        }

        const data = await response.json();
        const firstEntry = data[0];

        // 提取詞性
        let pos = '-';
        if (firstEntry.meanings && firstEntry.meanings[0]) {
            pos = firstEntry.meanings[0].partOfSpeech;
        }

        // 提取音標
        let phonetic = '-';
        if (firstEntry.phonetic) {
            phonetic = firstEntry.phonetic;
        }

        // 提取第一個定義作為翻譯
        let definition = '-';
        if (firstEntry.meanings && firstEntry.meanings[0].definitions[0]) {
            definition = firstEntry.meanings[0].definitions[0].definition;
        }

        // 提取例句
        let example = '';
        if (firstEntry.meanings[0].definitions[0].example) {
            example = firstEntry.meanings[0].definitions[0].example;
        }

        // 填充表單
        chineseTranslationInput.value = definition;
        partOfSpeechInput.value = pos;
        phoneticInput.value = phonetic;
        exampleInput.value = example;
        etymologyInput.value = ''; // API 沒有字根分析，用戶可自行填寫

        showStatus('✅ 填入成功！', 'success');
    } catch (error) {
        showStatus(`❌ 錯誤：${error.message}`, 'error');
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
    wordDatabase.push({
        word,
        translation,
        pos: pos || '-',
        phonetic: phonetic || '-',
        example,
        etymology
    });

    saveWordsToStorage();
    
    // 重置表單
    addWordForm.reset();
    autoFillStatus.textContent = '';

    alert('✅ 單字新增成功！');
    
    // 更新列表
    renderWordList();
    updateStudyView();
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
