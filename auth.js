// ============================================================
// AUTH — Member whitelist + password
// ============================================================

const CLUB_PASSWORD = "GSIF2026Recruit";

const MEMBERS = [
    "Reed Coene",
    "Joao Murta",
    "Colin Murphy",
    "Adam Tahiri",
    "Blake Disler",
];

// ============================================================
// LOGIN / LOGOUT
// ============================================================
function initAuth() {
    // Populate name dropdown
    const select = document.getElementById('login-name');
    MEMBERS.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });

    // Check if already logged in
    const session = getSession();
    if (session && MEMBERS.includes(session.name)) {
        enterApp(session.name);
    }

    // Enter key submits login
    document.getElementById('login-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') attemptLogin();
    });
}

function attemptLogin() {
    const name = document.getElementById('login-name').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    if (!name) {
        errorEl.textContent = 'Please select your name.';
        return;
    }

    if (password !== CLUB_PASSWORD) {
        errorEl.textContent = 'Incorrect password.';
        document.getElementById('login-password').value = '';
        return;
    }

    // Save session
    localStorage.setItem('acct_game_session', JSON.stringify({ name, ts: Date.now() }));
    enterApp(name);
}

function enterApp(name) {
    document.getElementById('user-greeting').textContent = `Welcome, ${name.split(' ')[0]}`;
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('landing-screen').classList.add('active');
    renderProgressDashboard(name);
}

function logout() {
    localStorage.removeItem('acct_game_session');
    document.getElementById('landing-screen').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('login-password').value = '';
    document.getElementById('login-name').value = '';
    document.getElementById('login-error').textContent = '';
}

function getSession() {
    try {
        return JSON.parse(localStorage.getItem('acct_game_session'));
    } catch { return null; }
}

// ============================================================
// PER-USER PROGRESS TRACKING
// ============================================================
function getUserProgressKey() {
    const session = getSession();
    if (!session) return null;
    // Unique key per user
    return 'acct_progress_' + session.name.replace(/\s+/g, '_').toLowerCase();
}

function saveUserProgress(level, pct) {
    const key = getUserProgressKey();
    if (!key || level <= 0) return;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data[level] = Math.max(data[level] || 0, pct);
    data.lastActive = Date.now();
    localStorage.setItem(key, JSON.stringify(data));
}

function getUserProgress(level) {
    const key = getUserProgressKey();
    if (!key) return 0;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return data[level] || 0;
}

function renderProgressDashboard(name) {
    const container = document.getElementById('progress-overview');
    const key = 'acct_progress_' + name.replace(/\s+/g, '_').toLowerCase();
    const data = JSON.parse(localStorage.getItem(key) || '{}');

    const levels = [
        { num: 1, name: 'Remember', color: 'var(--bloom-1)' },
        { num: 2, name: 'Understand', color: 'var(--bloom-2)' },
        { num: 3, name: 'Apply', color: 'var(--bloom-3)' },
        { num: 4, name: 'Analyze', color: 'var(--bloom-4)' },
        { num: 5, name: 'Evaluate', color: 'var(--bloom-5)' },
        { num: 6, name: 'Create', color: 'var(--bloom-6)' }
    ];

    let totalPct = 0;
    let html = '<div class="progress-levels">';
    levels.forEach(l => {
        const pct = data[l.num] || 0;
        totalPct += pct;
        const status = pct >= 90 ? 'mastered' : pct >= 60 ? 'good' : pct > 0 ? 'started' : 'locked';
        html += `
            <div class="progress-level-row">
                <div class="progress-level-info">
                    <span class="progress-level-name" style="color:${l.color}">L${l.num}: ${l.name}</span>
                    <span class="progress-level-pct">${pct}%</span>
                </div>
                <div class="progress-level-bar">
                    <div class="progress-level-fill" style="width:${pct}%;background:${l.color}"></div>
                </div>
                <span class="progress-status ${status}">${status === 'mastered' ? 'Mastered' : status === 'good' ? 'Good' : status === 'started' ? 'In Progress' : 'Not Started'}</span>
            </div>
        `;
    });
    html += '</div>';

    const overallPct = Math.round(totalPct / 6);
    const mastered = levels.filter(l => (data[l.num] || 0) >= 90).length;
    html = `
        <div class="progress-summary">
            <div class="progress-summary-stat">
                <div class="progress-summary-value">${overallPct}%</div>
                <div class="progress-summary-label">Overall</div>
            </div>
            <div class="progress-summary-stat">
                <div class="progress-summary-value">${mastered}/6</div>
                <div class="progress-summary-label">Mastered</div>
            </div>
        </div>
    ` + html;

    container.innerHTML = html;
}

// Override the existing saveProgress to also save per-user
const _originalSaveProgress = typeof saveProgress === 'function' ? saveProgress : null;

// Initialize on load
document.addEventListener('DOMContentLoaded', initAuth);
