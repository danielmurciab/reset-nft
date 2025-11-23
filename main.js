// --- CONFIGURATION ---
// Reference: 22:40 UTC (Aligns to 19:40 GMT-5 today)
const ANCHOR_UTC_HOUR = 22;
const ANCHOR_UTC_MINUTE = 40;
const CYCLE_DURATION_MS = (8 * 60 + 40) * 60 * 1000; // 8h 40m in milliseconds
const URGENCY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// --- STATE ---
const state = {
    lang: 'es',
    theme: 'light',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isUrgent: false
};

// --- MONSTER DATA (Decoration) ---
const monsters = [
    { emoji: '🐌' }, { emoji: '🍄' }, { emoji: '💧' }, { emoji: '🐷' }, { emoji: '🦍' }
];

// --- I18N DICTIONARY ---
const translations = {
    es: {
        subtitle: "NFT Map Respawn Timer",
        nextEventLabel: "Próximo Spawn En",
        localTimeLabel: "Hora del Spawn",
        nextSchedulesTitle: "Próximos Spawns",
        footer: "Hecho con ❤️ para Maplers",
        wave: "SPAWN",
        copyDiscord: "Copiar Discord",
        copied: "¡Copiado!"
    },
    en: {
        subtitle: "NFT Map Respawn Timer",
        nextEventLabel: "Next Spawn In",
        localTimeLabel: "Spawn Time",
        nextSchedulesTitle: "Upcoming Spawns",
        footer: "Made with ❤️ for Maplers",
        wave: "SPAWN",
        copyDiscord: "Copy Discord",
        copied: "Copied!"
    },
    kr: {
        subtitle: "NFT 맵 리스폰 타이머",
        nextEventLabel: "다음 스폰까지",
        localTimeLabel: "스폰 시간",
        nextSchedulesTitle: "다음 스폰",
        footer: "Maplers를 위해 ❤️로 제작됨",
        wave: "스폰",
        copyDiscord: "디스코드 복사",
        copied: "복사됨!"
    }
};

// --- DOM ELEMENTS ---
const els = {
    html: document.documentElement,
    langSelect: document.getElementById('lang-select'),
    themeToggle: document.getElementById('theme-toggle'),
    timezoneSelect: document.getElementById('timezone-select'),
    countdown: document.getElementById('countdown'),
    nextEventLocal: document.getElementById('next-event-local'),
    futureSchedules: document.getElementById('future-schedules'),
    globalZones: document.getElementById('global-zones'),
    progressBar: document.getElementById('progress-bar'),
    progressSprite: document.getElementById('progress-sprite'),
    mainCard: document.getElementById('main-card'),
    discordBtn: document.getElementById('discord-btn'),
    discordText: document.getElementById('discord-text')
};

// --- AUDIO CONTEXT ---
let audioCtx = null;

// --- DROPDOWN LOGIC ---
const priorityTimezones = [
    { code: 'AR', flag: '🇦🇷', label: 'Argentina', tz: 'America/Argentina/Buenos_Aires' },
    { code: 'CO', flag: '🇨🇴', label: 'Colombia / Perú', tz: 'America/Bogota' },
    { code: 'MX', flag: '🇲🇽', label: 'México CDMX', tz: 'America/Mexico_City' },
    { code: 'PY', flag: '🇵🇾', label: 'Paraguay', tz: 'America/Asuncion' },
    { code: 'VE', flag: '🇻🇪', label: 'Venezuela', tz: 'America/Caracas' },
    { code: 'CL', flag: '🇨🇱', label: 'Chile', tz: 'America/Santiago' },
    { code: 'ES', flag: '🇪🇸', label: 'España', tz: 'Europe/Madrid' },
    { code: 'US', flag: '🇺🇸', label: 'USA (New York)', tz: 'America/New_York' },
    { code: 'US', flag: '🇺🇸', label: 'USA (Los Angeles)', tz: 'America/Los_Angeles' },
    { code: 'BR', flag: '🇧🇷', label: 'Brasil (Sao Paulo)', tz: 'America/Sao_Paulo' },
    { code: 'KR', flag: '🇰🇷', label: 'Korea', tz: 'Asia/Seoul' },
    { code: 'JP', flag: '🇯🇵', label: 'Japan', tz: 'Asia/Tokyo' },
    { code: 'UTC', flag: '🌐', label: 'UTC', tz: 'UTC' }
];

function initDropdown() {
    const trigger = document.getElementById('select-trigger');
    const dropdown = document.getElementById('select-dropdown');
    const optionsContainer = document.getElementById('timezone-options');
    const searchInput = document.getElementById('timezone-search');
    const selectedFlag = document.getElementById('selected-flag');
    const selectedText = document.getElementById('selected-timezone');

    // Populate Options
    function renderOptions(filter = '') {
        optionsContainer.innerHTML = '';

        // Priority Group
        const priorityLabel = document.createElement('div');
        priorityLabel.className = 'select-group-label';
        priorityLabel.textContent = 'Prioridad / Priority';
        optionsContainer.appendChild(priorityLabel);

        priorityTimezones.forEach(item => {
            if (item.label.toLowerCase().includes(filter.toLowerCase()) || item.tz.toLowerCase().includes(filter.toLowerCase())) {
                createOption(item);
            }
        });

        // Global Group (All other timezones)
        const globalLabel = document.createElement('div');
        globalLabel.className = 'select-group-label';
        globalLabel.textContent = 'Global';
        optionsContainer.appendChild(globalLabel);

        // Add some common global ones if not in priority
        const commonGlobal = [
            'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Australia/Sydney'
        ];

        commonGlobal.forEach(tz => {
            if (tz.toLowerCase().includes(filter.toLowerCase())) {
                createOption({ code: 'GL', flag: '🌍', label: tz, tz: tz });
            }
        });
    }

    function createOption(item) {
        const div = document.createElement('div');
        div.className = 'select-option';
        if (item.tz === state.timezone) div.classList.add('selected');

        // Calculate offset
        const offset = getTimezoneOffset(item.tz);

        div.innerHTML = `<span class="text-xl">${item.flag}</span> <span>${item.label} <span class="text-xs opacity-50">(${offset})</span></span>`;

        div.onclick = () => {
            selectTimezone(item);
            dropdown.classList.remove('open');
        };
        optionsContainer.appendChild(div);
    }

    function selectTimezone(item) {
        state.timezone = item.tz;
        selectedFlag.textContent = item.flag;
        const offset = getTimezoneOffset(item.tz);
        selectedText.textContent = `${item.label} (${offset})`;
        updateUI();

        // Update native select for compatibility if needed
        if (els.timezoneSelect) els.timezoneSelect.value = item.tz;
    }

    // Toggle Dropdown
    if (trigger) {
        trigger.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
            if (dropdown.classList.contains('open')) {
                searchInput.focus();
            }
        };
    }

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (trigger && dropdown && !trigger.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });

    // Search Filter
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderOptions(e.target.value);
        });
    }

    // Initial Render
    renderOptions();

    // Set Initial Selection
    const initial = priorityTimezones.find(t => t.tz === state.timezone) || priorityTimezones[1]; // Default to Colombia
    if (initial) selectTimezone(initial);
}

function getTimezoneOffset(tz) {
    try {
        const now = new Date();
        const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        const offsetMinutes = (tzDate - utcDate) / (1000 * 60);
        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
        const offsetMins = Math.abs(offsetMinutes) % 60;
        const sign = offsetMinutes >= 0 ? '+' : '-';
        return `GMT${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    } catch (e) {
        return 'GMT+00:00';
    }
}

// --- LOGIC ---

function init() {
    initDropdown();
    setupEventListeners();
    loadState();
    updateUI();
    setInterval(updateTimer, 1000);
    updateTimer(); // Initial call
}

function setupEventListeners() {
    els.langSelect.addEventListener('change', (e) => {
        state.lang = e.target.value;
        updateUI();
    });

    els.themeToggle.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        updateUI();
    });

    els.timezoneSelect.addEventListener('change', (e) => {
        state.timezone = e.target.value;
        updateUI();
    });

    els.discordBtn.addEventListener('click', copyToDiscord);

    // Initialize Audio Context on first interaction
    document.body.addEventListener('click', () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }, { once: true });
}

function loadState() {
    els.langSelect.value = state.lang;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        state.theme = 'dark';
    }
}

// --- TIMER LOGIC ---

function getNextEventTime() {
    const now = new Date();
    const nowUTC = now.getTime();

    // Get current UTC date components
    const nowDate = new Date(nowUTC);
    const year = nowDate.getUTCFullYear();
    const month = nowDate.getUTCMonth();
    const date = nowDate.getUTCDate();

    // Create today's anchor at 00:40 UTC
    const todayAnchor = Date.UTC(year, month, date, ANCHOR_UTC_HOUR, ANCHOR_UTC_MINUTE, 0);

    // Start from the most recent anchor (today or yesterday)
    let anchorTime = todayAnchor;
    if (nowUTC < todayAnchor) {
        // If we haven't reached today's anchor yet, start from yesterday's
        anchorTime = todayAnchor - (24 * 60 * 60 * 1000);
    }

    // Find the next event by adding cycles until we're in the future
    while (anchorTime <= nowUTC) {
        anchorTime += CYCLE_DURATION_MS;
    }

    return new Date(anchorTime);
}

function getPreviousEventTime() {
    const next = getNextEventTime();
    return new Date(next.getTime() - CYCLE_DURATION_MS);
}

function updateTimer() {
    const nextEvent = getNextEventTime();
    const now = new Date();
    const diff = nextEvent - now;

    if (diff <= 0) {
        // Trigger sound if we just hit 0 (approx)
        if (diff > -1000) playSound();
        return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    els.countdown.innerText = timeString;

    // Dynamic Title
    document.title = `(${timeString}) Reset Henesys`;

    // Urgency Mode
    if (diff < URGENCY_THRESHOLD_MS && !state.isUrgent) {
        state.isUrgent = true;
        document.body.classList.add('urgency-pulse');
    } else if (diff >= URGENCY_THRESHOLD_MS && state.isUrgent) {
        state.isUrgent = false;
        document.body.classList.remove('urgency-pulse');
    }

    // Update Progress Bar
    const prevEvent = getPreviousEventTime();
    const totalCycle = nextEvent - prevEvent;
    const elapsed = now - prevEvent;
    const percent = Math.min(100, Math.max(0, (elapsed / totalCycle) * 100));

    els.progressBar.style.width = `${percent}%`;
    els.progressSprite.textContent = '🍄';
}

function playSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function copyToDiscord() {
    const nextEvent = getNextEventTime();
    const timestamp = Math.floor(nextEvent.getTime() / 1000);
    const discordFormat = `<t:${timestamp}:R>`;

    navigator.clipboard.writeText(discordFormat).then(() => {
        const originalText = els.discordText.innerText;
        els.discordText.innerText = translations[state.lang].copied;
        setTimeout(() => {
            els.discordText.innerText = translations[state.lang].copyDiscord;
        }, 2000);
    });
}

function formatTime(date, timeZone) {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timeZone
        }).format(date);
    } catch (e) {
        return "Invalid Zone";
    }
}

function updateUI() {
    if (state.theme === 'dark') {
        els.html.classList.add('dark');
    } else {
        els.html.classList.remove('dark');
    }

    const t = translations[state.lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerText = t[key];
    });

    const nextEvent = getNextEventTime();
    els.nextEventLocal.innerText = formatTime(nextEvent, state.timezone);

    // Render WAVE Grid
    let futureHtml = '';
    let tempTime = new Date(nextEvent.getTime());

    for (let i = 1; i <= 5; i++) {
        tempTime = new Date(tempTime.getTime() + CYCLE_DURATION_MS);
        const timeStr = formatTime(tempTime, state.timezone);
        const dateStr = new Intl.DateTimeFormat(state.lang === 'kr' ? 'ko-KR' : 'es-AR', {
            day: 'numeric', month: 'numeric', timeZone: state.timezone
        }).format(tempTime);

        const monster = monsters[(i - 1) % monsters.length];

        futureHtml += `
            <div class="wave-card">
                <div class="wave-title">${t.wave} 0${i}</div>
                <div class="wave-time">${timeStr}</div>
                <div class="wave-date">${dateStr}</div>
                <div class="wave-icon">${monster.emoji}</div>
            </div>
        `;
    }
    els.futureSchedules.innerHTML = futureHtml;
}

// Run
init();
