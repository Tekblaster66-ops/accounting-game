// ============================================================
// GAME STATE
// ============================================================
let state = {
    mode: 'guided',        // guided, practice, challenge
    currentLevel: 1,
    questionIndex: 0,
    questions: [],
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    total: 0,
    answered: [],
    timer: null,
    timeLeft: 0,
    questionsPerLevel: 10,
};

const BLOOM_NAMES = {
    1: 'Remember', 2: 'Understand', 3: 'Apply',
    4: 'Analyze', 5: 'Evaluate', 6: 'Create'
};

// ============================================================
// NAVIGATION
// ============================================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function startGame(mode) {
    state.mode = mode;
    if (mode === 'practice') {
        updateLevelProgress();
        showScreen('level-select-screen');
    } else if (mode === 'guided') {
        state.currentLevel = 1;
        startLevel(1);
    } else if (mode === 'challenge') {
        startChallenge();
    }
}

function startLevel(level) {
    state.currentLevel = level;
    state.questionIndex = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.correct = 0;
    state.total = 0;
    state.answered = [];

    // Build question set for this level
    let pool = [];
    if (level === 1) {
        // Flashcards
        pool = shuffle([...ALL_QUESTIONS[1]]).slice(0, state.questionsPerLevel);
    } else {
        // Mix MC + ordering + fill-in-the-blank for this level
        const mc = shuffle([...ALL_QUESTIONS[level] || []]);
        const order = shuffle(ALL_QUESTIONS.order.filter(q => q.level === level));
        const fillin = shuffle((ALL_QUESTIONS.fillin || []).filter(q => q.level === level));
        pool = shuffle([...mc, ...order, ...fillin]).slice(0, state.questionsPerLevel);
    }

    // Ensure we have enough questions
    if (pool.length < state.questionsPerLevel) {
        // Pad with repeated shuffled questions
        while (pool.length < state.questionsPerLevel) {
            const extra = shuffle([...(ALL_QUESTIONS[level] || [])]);
            pool.push(...extra);
        }
        pool = pool.slice(0, state.questionsPerLevel);
    }

    state.questions = pool;
    state.total = pool.length;

    updateGameHeader();
    showScreen('game-screen');
    showQuestion();
}

function startChallenge() {
    state.currentLevel = 0; // special
    state.questionIndex = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.correct = 0;
    state.answered = [];

    // Mix questions from all levels
    let pool = [];
    for (let l = 2; l <= 6; l++) {
        const qs = shuffle([...(ALL_QUESTIONS[l] || [])]).slice(0, 3);
        pool.push(...qs);
    }
    pool = shuffle(pool).slice(0, 15);
    state.questions = pool;
    state.total = pool.length;

    // Start timer
    state.timeLeft = 300; // 5 minutes
    document.getElementById('timer-container').style.display = 'flex';
    updateTimer();
    state.timer = setInterval(() => {
        state.timeLeft--;
        updateTimer();
        if (state.timeLeft <= 0) {
            clearInterval(state.timer);
            showResults();
        }
    }, 1000);

    updateGameHeader();
    showScreen('game-screen');
    showQuestion();
}

function exitGame() {
    if (state.timer) clearInterval(state.timer);
    document.getElementById('timer-container').style.display = 'none';
    showScreen('landing-screen');
}

// ============================================================
// DISPLAY QUESTIONS
// ============================================================
function showQuestion() {
    if (state.questionIndex >= state.questions.length) {
        showResults();
        return;
    }

    const q = state.questions[state.questionIndex];
    updateGameHeader();

    // Hide all areas
    document.getElementById('flashcard-area').style.display = 'none';
    document.getElementById('mc-area').style.display = 'none';
    document.getElementById('order-area').style.display = 'none';
    document.getElementById('builder-area').style.display = 'none';
    document.getElementById('fillin-area').style.display = 'none';

    if (q.type === 'flashcard') {
        showFlashcard(q);
    } else if (q.type === 'fillin') {
        showFillin(q);
    } else if (q.type === 'mc') {
        showMC(q);
    } else if (q.items) {
        showOrder(q);
    }
}

function showFlashcard(q) {
    document.getElementById('flashcard-area').style.display = 'block';
    document.getElementById('flash-term').textContent = q.term;
    document.getElementById('flash-definition').textContent = q.definition;
    document.getElementById('flashcard-inner').classList.remove('flipped');
}

function flipCard() {
    document.getElementById('flashcard-inner').classList.toggle('flipped');
}

function rateFlashcard(gotIt) {
    state.answered.push({ correct: gotIt, question: state.questions[state.questionIndex].term });
    if (gotIt) {
        state.correct++;
        state.score += 10;
        state.streak++;
        if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    } else {
        state.streak = 0;
    }
    state.questionIndex++;
    showQuestion();
}

function showMC(q) {
    document.getElementById('mc-area').style.display = 'block';
    document.getElementById('mc-explanation').style.display = 'none';
    document.getElementById('mc-context').textContent = q.context || '';
    document.getElementById('mc-question').textContent = q.question;

    const optionsEl = document.getElementById('mc-options');
    optionsEl.innerHTML = '';

    // Shuffle options (preserving correct index tracking)
    const indexed = q.options.map((opt, i) => ({ text: opt, origIndex: i }));
    const shuffled = shuffle(indexed);
    const newCorrect = shuffled.findIndex(o => o.origIndex === q.correct);

    const letters = ['A', 'B', 'C', 'D'];
    shuffled.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span class="option-letter">${letters[i]}</span><span>${opt.text}</span>`;
        btn.onclick = () => selectMCOption(i, { ...q, correct: newCorrect, _shuffled: true });
        optionsEl.appendChild(btn);
    });
}

function selectMCOption(selected, q) {
    const buttons = document.querySelectorAll('#mc-options .option-btn');
    const isCorrect = selected === q.correct;

    buttons.forEach((btn, i) => {
        btn.classList.add('disabled');
        if (i === q.correct) btn.classList.add('correct');
        if (i === selected && !isCorrect) btn.classList.add('wrong');
    });

    state.answered.push({ correct: isCorrect, question: q.question.substring(0, 60) + '...' });

    if (isCorrect) {
        state.correct++;
        state.streak++;
        if (state.streak > state.bestStreak) state.bestStreak = state.streak;
        const points = 10 + Math.min(state.streak * 2, 20); // streak bonus
        state.score += points;
    } else {
        state.streak = 0;
    }

    // Show explanation
    const expBox = document.getElementById('mc-explanation');
    expBox.style.display = 'block';
    const header = document.getElementById('explanation-header');
    header.className = 'explanation-header ' + (isCorrect ? 'correct' : 'wrong');
    header.textContent = isCorrect ? 'Correct!' : 'Not quite...';
    document.getElementById('explanation-text').textContent = q.explanation;

    updateGameHeader();
    expBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showOrder(q) {
    document.getElementById('order-area').style.display = 'block';
    document.getElementById('order-explanation').style.display = 'none';
    document.getElementById('order-question').textContent = q.question;
    document.getElementById('order-submit').style.display = 'block';

    const listEl = document.getElementById('order-list');
    listEl.innerHTML = '';

    const shuffled = shuffle([...q.items]);
    shuffled.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'order-item';
        div.draggable = true;
        div.dataset.value = item;
        div.innerHTML = `<span class="order-handle">&#x2630;</span><span>${item}</span>`;

        // Drag events
        div.addEventListener('dragstart', (e) => {
            div.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        div.addEventListener('dragend', () => div.classList.remove('dragging'));
        div.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = listEl.querySelector('.dragging');
            if (dragging && dragging !== div) {
                const rect = div.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (e.clientY < mid) {
                    listEl.insertBefore(dragging, div);
                } else {
                    listEl.insertBefore(dragging, div.nextSibling);
                }
            }
        });

        // Touch support
        let touchY = 0;
        div.addEventListener('touchstart', (e) => {
            touchY = e.touches[0].clientY;
            div.classList.add('dragging');
        });
        div.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && target.closest('.order-item') && target.closest('.order-item') !== div) {
                const other = target.closest('.order-item');
                const rect = other.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (touch.clientY < mid) {
                    listEl.insertBefore(div, other);
                } else {
                    listEl.insertBefore(div, other.nextSibling);
                }
            }
        }, { passive: false });
        div.addEventListener('touchend', () => div.classList.remove('dragging'));

        listEl.appendChild(div);
    });
}

function checkOrder() {
    const q = state.questions[state.questionIndex];
    const items = document.querySelectorAll('#order-list .order-item');
    const userOrder = Array.from(items).map(el => el.dataset.value);

    let allCorrect = true;
    items.forEach((item, i) => {
        if (item.dataset.value === q.items[i]) {
            item.classList.add('correct-pos');
        } else {
            item.classList.add('wrong-pos');
            allCorrect = false;
        }
    });

    document.getElementById('order-submit').style.display = 'none';
    state.answered.push({ correct: allCorrect, question: q.question.substring(0, 60) + '...' });

    if (allCorrect) {
        state.correct++;
        state.streak++;
        if (state.streak > state.bestStreak) state.bestStreak = state.streak;
        state.score += 15; // ordering is harder
    } else {
        state.streak = 0;
    }

    const expBox = document.getElementById('order-explanation');
    expBox.style.display = 'block';
    const header = document.getElementById('order-explanation-header');
    header.className = 'explanation-header ' + (allCorrect ? 'correct' : 'wrong');
    header.textContent = allCorrect ? 'Perfect order!' : 'Not quite right...';
    document.getElementById('order-explanation-text').textContent =
        (allCorrect ? '' : 'Correct order: ' + q.items.join(' → ') + '\n\n') + q.explanation;

    updateGameHeader();
    expBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================================
// FILL-IN-THE-BLANK: Walk the Statements
// ============================================================
let fillinAttempts = 0;

function showFillin(q) {
    document.getElementById('fillin-area').style.display = 'block';
    document.getElementById('fillin-explanation').style.display = 'none';
    document.getElementById('fillin-feedback').style.display = 'none';
    document.getElementById('fillin-submit').style.display = 'inline-block';
    document.getElementById('fillin-retry').style.display = 'none';
    document.getElementById('fillin-scenario').textContent = q.scenario;
    fillinAttempts = 0;

    const grid = document.getElementById('fillin-grid');
    grid.innerHTML = '';

    const panels = [
        { key: 'is', label: 'Income Statement', cls: 'panel-is', fields: q.is_fields },
        { key: 'cfs', label: 'Cash Flow Statement', cls: 'panel-cfs', fields: q.cfs_fields },
        { key: 'bs', label: 'Balance Sheet', cls: 'panel-bs', fields: q.bs_fields }
    ];

    panels.forEach(panel => {
        const div = document.createElement('div');
        div.className = `fillin-panel ${panel.cls}`;
        div.innerHTML = `<h3>${panel.label}</h3>`;

        panel.fields.forEach((field, i) => {
            const row = document.createElement('div');
            row.className = 'fillin-row';
            row.innerHTML = `
                <label>${field.label}</label>
                <input type="text" data-panel="${panel.key}" data-index="${i}"
                       placeholder="$?" autocomplete="off">
                <div class="field-hint" id="hint-${panel.key}-${i}"></div>
            `;
            div.appendChild(row);
        });

        grid.appendChild(div);
    });

    // Focus first input
    const firstInput = grid.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

function parseFillinValue(str) {
    // Accept formats: 25, +25, -25, $25, +$25, -$25, etc.
    const cleaned = str.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

function checkFillin() {
    const q = state.questions[state.questionIndex];
    fillinAttempts++;
    const allFields = [
        ...q.is_fields.map((f, i) => ({ ...f, panel: 'is', index: i })),
        ...q.cfs_fields.map((f, i) => ({ ...f, panel: 'cfs', index: i })),
        ...q.bs_fields.map((f, i) => ({ ...f, panel: 'bs', index: i }))
    ];

    let allCorrect = true;
    const wrongFields = [];

    allFields.forEach(field => {
        const input = document.querySelector(`input[data-panel="${field.panel}"][data-index="${field.index}"]`);
        const userVal = parseFillinValue(input.value);
        const correctVal = field.answer;

        // Allow small tolerance for rounding
        const isCorrect = userVal !== null && Math.abs(userVal - correctVal) < 0.1;

        input.classList.remove('field-correct', 'field-wrong');
        if (isCorrect) {
            input.classList.add('field-correct');
            input.disabled = true;
        } else {
            input.classList.add('field-wrong');
            allCorrect = false;
            wrongFields.push(field);
        }
    });

    if (allCorrect) {
        // All correct!
        state.answered.push({ correct: true, question: q.scenario.substring(0, 60) + '...' });
        state.correct++;
        state.streak++;
        if (state.streak > state.bestStreak) state.bestStreak = state.streak;
        state.score += 20; // Higher points for fill-in-the-blank

        document.getElementById('fillin-submit').style.display = 'none';
        document.getElementById('fillin-retry').style.display = 'none';
        document.getElementById('fillin-feedback').style.display = 'none';

        const expBox = document.getElementById('fillin-explanation');
        expBox.style.display = 'block';
        const header = document.getElementById('fillin-explanation-header');
        header.className = 'explanation-header correct';
        header.textContent = fillinAttempts === 1 ? 'Perfect on the first try!' : 'Got it!';
        document.getElementById('fillin-explanation-text').textContent = q.explanation;

        updateGameHeader();
        expBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (fillinAttempts >= 3) {
        // After 3 attempts, show the answer
        state.answered.push({ correct: false, question: q.scenario.substring(0, 60) + '...' });
        state.streak = 0;

        // Fill in correct answers
        allFields.forEach(field => {
            const input = document.querySelector(`input[data-panel="${field.panel}"][data-index="${field.index}"]`);
            if (!input.classList.contains('field-correct')) {
                input.value = field.answer >= 0 ? `+${field.answer}` : `${field.answer}`;
                input.classList.remove('field-wrong');
                input.classList.add('field-correct');
                input.disabled = true;
            }
        });

        document.getElementById('fillin-submit').style.display = 'none';
        document.getElementById('fillin-retry').style.display = 'none';
        document.getElementById('fillin-feedback').style.display = 'none';

        const expBox = document.getElementById('fillin-explanation');
        expBox.style.display = 'block';
        const header = document.getElementById('fillin-explanation-header');
        header.className = 'explanation-header wrong';
        header.textContent = 'Here\'s how it works:';
        document.getElementById('fillin-explanation-text').textContent = q.explanation;

        updateGameHeader();
        expBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        // Show targeted hints for wrong fields
        document.getElementById('fillin-submit').style.display = 'none';
        document.getElementById('fillin-retry').style.display = 'inline-block';

        const feedbackBox = document.getElementById('fillin-feedback');
        feedbackBox.style.display = 'block';
        feedbackBox.innerHTML = `<h4>Not quite — ${wrongFields.length} field${wrongFields.length > 1 ? 's' : ''} ${wrongFields.length > 1 ? 'are' : 'is'} off. Try again!</h4>`;

        wrongFields.forEach(field => {
            const hint = document.createElement('div');
            hint.className = 'hint-item';
            hint.innerHTML = `<span class="hint-label">${field.label}:</span> ${field.hint || 'Think about how this item flows through the statements.'}`;
            feedbackBox.appendChild(hint);
        });

        feedbackBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function retryFillin() {
    document.getElementById('fillin-submit').style.display = 'inline-block';
    document.getElementById('fillin-retry').style.display = 'none';
    document.getElementById('fillin-feedback').style.display = 'none';

    // Clear wrong fields for retry
    document.querySelectorAll('#fillin-grid input.field-wrong').forEach(input => {
        input.classList.remove('field-wrong');
        input.value = '';
    });

    // Focus first empty input
    const firstEmpty = document.querySelector('#fillin-grid input:not(:disabled)');
    if (firstEmpty) firstEmpty.focus();
}

function nextQuestion() {
    state.questionIndex++;
    showQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// RESULTS
// ============================================================
function showResults() {
    if (state.timer) clearInterval(state.timer);
    document.getElementById('timer-container').style.display = 'none';

    const pct = state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;

    let icon, title, subtitle;
    if (pct >= 90) {
        icon = '&#x1F31F;'; title = 'Outstanding!'; subtitle = 'You\'ve mastered this level.';
    } else if (pct >= 70) {
        icon = '&#x1F4AA;'; title = 'Great Work!'; subtitle = 'You\'re getting strong at this.';
    } else if (pct >= 50) {
        icon = '&#x1F4DA;'; title = 'Good Effort'; subtitle = 'Review the explanations and try again.';
    } else {
        icon = '&#x1F331;'; title = 'Keep Growing'; subtitle = 'Focus on the concepts you missed.';
    }

    document.getElementById('results-icon').innerHTML = icon;
    document.getElementById('results-title').textContent = title;
    document.getElementById('results-subtitle').textContent = subtitle;
    document.getElementById('result-score').textContent = state.score;
    document.getElementById('result-correct').textContent = `${state.correct}/${state.total}`;
    document.getElementById('result-streak').textContent = state.bestStreak;

    // Breakdown
    const breakdown = document.getElementById('results-breakdown');
    breakdown.innerHTML = '<h4 style="margin-bottom: 12px; color: var(--text-muted); font-size: 0.85rem;">Question Breakdown</h4>';
    state.answered.forEach((a, i) => {
        const div = document.createElement('div');
        div.className = 'breakdown-item';
        div.innerHTML = `
            <span>Q${i + 1}: ${a.question}</span>
            <span class="${a.correct ? 'breakdown-correct' : 'breakdown-wrong'}">${a.correct ? 'Correct' : 'Wrong'}</span>
        `;
        breakdown.appendChild(div);
    });

    // Save progress
    saveProgress(state.currentLevel, pct);

    // Show/hide next level button
    const nextBtn = document.getElementById('next-level-btn');
    if (state.currentLevel > 0 && state.currentLevel < 6 && pct >= 60) {
        nextBtn.style.display = 'inline-block';
    } else {
        nextBtn.style.display = 'none';
    }

    showScreen('results-screen');
}

function retryLevel() {
    if (state.currentLevel === 0) {
        startChallenge();
    } else {
        startLevel(state.currentLevel);
    }
}

function goNextLevel() {
    if (state.currentLevel < 6) {
        startLevel(state.currentLevel + 1);
    }
}

// ============================================================
// UI UPDATES
// ============================================================
function updateGameHeader() {
    const level = state.currentLevel;
    const badge = document.getElementById('current-bloom-badge');

    if (level === 0) {
        badge.textContent = 'Interview Challenge';
        badge.setAttribute('data-level', '6');
    } else {
        badge.textContent = `Level ${level}: ${BLOOM_NAMES[level]}`;
        badge.setAttribute('data-level', level);
    }

    document.getElementById('question-counter').textContent =
        `${Math.min(state.questionIndex + 1, state.total)} / ${state.total}`;
    document.getElementById('score-display').textContent = state.score;
    document.getElementById('streak-display').textContent = state.streak;

    const pct = state.total > 0 ? ((state.questionIndex) / state.total * 100) : 0;
    document.getElementById('game-progress').style.width = pct + '%';
}

function updateTimer() {
    const mins = Math.floor(state.timeLeft / 60);
    const secs = state.timeLeft % 60;
    document.getElementById('timer-display').textContent =
        `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateLevelProgress() {
    for (let l = 1; l <= 6; l++) {
        const pct = getProgress(l);
        const fill = document.getElementById(`prog-${l}`);
        if (fill) fill.style.width = pct + '%';
    }
}

// ============================================================
// PERSISTENCE
// ============================================================
function saveProgress(level, pct) {
    if (level <= 0) return;
    const key = 'accounting_game_progress';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data[level] = Math.max(data[level] || 0, pct);
    localStorage.setItem(key, JSON.stringify(data));
}

function getProgress(level) {
    const data = JSON.parse(localStorage.getItem('accounting_game_progress') || '{}');
    return data[level] || 0;
}

// ============================================================
// UTILITIES
// ============================================================
// ============================================================
// LEARN MODE
// ============================================================
let lessonState = { topicIndex: 0, cardIndex: 0 };

function openLearn() {
    const grid = document.getElementById('topic-grid');
    grid.innerHTML = '';
    LESSONS.forEach((lesson, i) => {
        const card = document.createElement('button');
        card.className = 'mode-card';
        card.style.borderLeft = `4px solid ${lesson.color}`;
        card.innerHTML = `
            <div class="mode-icon">${lesson.icon}</div>
            <h4>${lesson.title}</h4>
            <p>${lesson.cards.length} concepts</p>
        `;
        card.onclick = () => openLesson(i);
        grid.appendChild(card);
    });
    showScreen('learn-topics-screen');
}

function openLesson(topicIndex) {
    lessonState.topicIndex = topicIndex;
    lessonState.cardIndex = 0;
    const lesson = LESSONS[topicIndex];

    document.getElementById('lesson-topic-title').textContent = lesson.title;
    renderLessonCard();
    updateLessonNav();
    showScreen('lesson-screen');
}

function renderLessonCard() {
    const lesson = LESSONS[lessonState.topicIndex];
    const card = lesson.cards[lessonState.cardIndex];
    const area = document.getElementById('lesson-card-area');

    area.innerHTML = `
        <div class="lesson-card" style="border-top: 3px solid ${lesson.color}">
            <h3 class="lesson-card-term">${card.term}</h3>
            <div class="lesson-section">
                <div class="lesson-section-label">What is it?</div>
                <p>${card.what}</p>
            </div>
            <div class="lesson-section">
                <div class="lesson-section-label">Why does it work this way?</div>
                <p>${card.why}</p>
            </div>
            <div class="lesson-section">
                <div class="lesson-section-label">Example</div>
                <p class="lesson-example">${card.example}</p>
            </div>
        </div>
    `;
}

function updateLessonNav() {
    const lesson = LESSONS[lessonState.topicIndex];
    const total = lesson.cards.length;
    const current = lessonState.cardIndex;

    document.getElementById('lesson-card-counter').textContent = `${current + 1} / ${total}`;
    document.getElementById('lesson-prev').style.visibility = current === 0 ? 'hidden' : 'visible';
    document.getElementById('lesson-next').textContent = current === total - 1 ? 'Done' : 'Next \u2192';

    // Progress bar
    document.getElementById('lesson-progress').style.width = ((current + 1) / total * 100) + '%';

    // Dots
    const dots = document.getElementById('lesson-dots');
    dots.innerHTML = '';
    for (let i = 0; i < total; i++) {
        const dot = document.createElement('span');
        dot.className = 'lesson-dot' + (i === current ? ' active' : '');
        dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${i === current ? lesson.color : 'var(--border)'};display:inline-block;margin:0 3px;cursor:pointer;transition:0.2s;`;
        dot.onclick = () => { lessonState.cardIndex = i; renderLessonCard(); updateLessonNav(); };
        dots.appendChild(dot);
    }
}

function lessonPrev() {
    if (lessonState.cardIndex > 0) {
        lessonState.cardIndex--;
        renderLessonCard();
        updateLessonNav();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function lessonNext() {
    const lesson = LESSONS[lessonState.topicIndex];
    if (lessonState.cardIndex < lesson.cards.length - 1) {
        lessonState.cardIndex++;
        renderLessonCard();
        updateLessonNav();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        showScreen('learn-topics-screen');
    }
}

// ============================================================
// UTILITIES
// ============================================================
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
