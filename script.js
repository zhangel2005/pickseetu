const SUPABASE_URL = 'https://dniouvefqaycnjdtjnrx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuaW91dmVmcWF5Y25qZHRqbnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDY0MjUsImV4cCI6MjA4MzUyMjQyNX0.xFksp-h71erLclO1EuQ08GdOHm4kJ8TTm4CVNfLNSlI';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentSeetuId = null;
let isHost = false;
let userName = null;
let hasPickedCard = false;
let realtimeChannel = null;

document.addEventListener('DOMContentLoaded', init);

function init() {
    const numPeople = document.getElementById('numPeople');
    for (let i = 2; i <= 50; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        numPeople.appendChild(option);
    }

    document.getElementById('createNewBtn').onclick = () => showPage('createPage');
    document.getElementById('createSeetuBtn').onclick = createSeetu;
    document.getElementById('backBtn').onclick = () => showPage('homepage');
    document.getElementById('copyBtn').onclick = copyLink;
    document.getElementById('viewCardsBtn').onclick = viewCards;
    document.getElementById('createAnotherBtn').onclick = createAnother;
    document.getElementById('enterSeetuBtn').onclick = enterSeetu;
    document.getElementById('doneBtn').onclick = closeFlipOverlay;
    document.getElementById('historyIcon').onclick = showHistory;
    document.getElementById('closeHistoryBtn').onclick = () => {
        document.getElementById('historyModal').classList.remove('active');
    };

    checkUrlForSeetu();
    loadHostState();
}

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageName).classList.add('active');
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateRandomCards(n) {
    const cards = Array.from({ length: n }, (_, i) => i + 1);
    const one = cards.shift();
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    cards.unshift(one);
    return cards;
}

async function createSeetu() {
    const numPeople = parseInt(document.getElementById('numPeople').value);
    showLoading();

    try {
        const seetuId = generateId();
        const { error } = await supabase.from('seetus').insert([{
            id: seetuId,
            num_people: numPeople,
            cards: generateRandomCards(numPeople),
            picks: [{ cardIndex: 0, name: 'Shabnum' }]
        }]);

        if (error) throw error;

        currentSeetuId = seetuId;
        isHost = true;
        saveHostState();

        const link = `${window.location.origin}${window.location.pathname}?seetu=${seetuId}`;
        document.getElementById('seetuLink').value = link;
        showPage('linkPage');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to create seetu');
    } finally {
        hideLoading();
    }
}

function saveHostState() {
    localStorage.setItem('hostState', JSON.stringify({ currentSeetuId, isHost }));
}

function loadHostState() {
    const state = localStorage.getItem('hostState');
    if (state) {
        const p = JSON.parse(state);
        currentSeetuId = p.currentSeetuId;
        isHost = p.isHost;
        if (isHost && currentSeetuId) {
            document.getElementById('seetuLink').value = 
                `${window.location.origin}${window.location.pathname}?seetu=${currentSeetuId}`;
            showPage('linkPage');
        }
    }
}

function copyLink() {
    const input = document.getElementById('seetuLink');
    
    // Modern approach using Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(() => {
            const btn = document.getElementById('copyBtn');
            btn.textContent = '✓';
            setTimeout(() => btn.textContent = '📋', 1000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            fallbackCopy(input);
        });
    } else {
        fallbackCopy(input);
    }
}

function fallbackCopy(input) {
    input.select();
    input.setSelectionRange(0, 99999); // For mobile devices
    const btn = document.getElementById('copyBtn');
    try {
        document.execCommand('copy');
        btn.textContent = '✓';
        setTimeout(() => btn.textContent = '📋', 1000);
    } catch (err) {
        alert('Please copy the link manually');
    }
}

async function checkUrlForSeetu() {
    const params = new URLSearchParams(window.location.search);
    const seetuId = params.get('seetu');

    if (seetuId) {
        currentSeetuId = seetuId;
        showLoading();

        try {
            const { data, error } = await supabase
                .from('seetus')
                .select('*')
                .eq('id', seetuId)
                .single();

            if (error || !data) throw new Error('Not found');

            const userState = localStorage.getItem(`user_${seetuId}`);
            if (userState) {
                userName = JSON.parse(userState).name;
                hasPickedCard = true;
                displayCards();
            } else {
                hideLoading();
                document.getElementById('nameModal').classList.add('active');
            }
        } catch (error) {
            console.error(error);
            alert('Seetu not found!');
            hideLoading();
        }
    }
}

function enterSeetu() {
    const name = document.getElementById('nameInput').value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    userName = name;
    document.getElementById('nameModal').classList.remove('active');
    displayCards();
}

async function viewCards() {
    displayCards();
}

function createAnother() {
    isHost = false;
    currentSeetuId = null;
    localStorage.removeItem('hostState');
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
    showPage('createPage');
}

async function displayCards() {
    showLoading();

    try {
        const { data, error } = await supabase
            .from('seetus')
            .select('*')
            .eq('id', currentSeetuId)
            .single();

        if (error || !data) throw new Error('Not found');

        const container = document.getElementById('cardsContainer');
        container.innerHTML = '';

        data.cards.forEach((num, idx) => {
            const card = document.createElement('div');
            card.className = 'card';

            const pick = data.picks.find(p => p.cardIndex === idx);
            if (pick) card.classList.add('flipped');
            if (isHost || hasPickedCard) card.classList.add('disabled');

            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-back">?</div>
                    <div class="card-face">
                        <div class="number">${num}</div>
                        <div class="name">${pick ? pick.name : ''}</div>
                    </div>
                </div>
            `;

            if (!isHost && !hasPickedCard && !pick) {
                card.onclick = () => pickCard(idx, num);
            }

            container.appendChild(card);
        });

        showPage('cardsPage');
        subscribeToRealtime();
    } catch (error) {
        console.error(error);
        alert('Failed to load cards');
    } finally {
        hideLoading();
    }
}

async function pickCard(idx, num) {
    if (hasPickedCard || isHost) return;
    showLoading();

    try {
        const { data, error: e1 } = await supabase
            .from('seetus')
            .select('*')
            .eq('id', currentSeetuId)
            .single();

        if (e1) throw e1;

        if (data.picks.find(p => p.cardIndex === idx)) {
            alert('Already picked!');
            displayCards();
            return;
        }

        const { error: e2 } = await supabase
            .from('seetus')
            .update({ picks: [...data.picks, { cardIndex: idx, name: userName }] })
            .eq('id', currentSeetuId);

        if (e2) throw e2;

        localStorage.setItem(`user_${currentSeetuId}`, JSON.stringify({ name: userName }));
        hasPickedCard = true;
        hideLoading();
        showFlipAnimation(num, userName);
    } catch (error) {
        console.error(error);
        alert('Failed to pick card');
        hideLoading();
    }
}

function subscribeToRealtime() {
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);

    realtimeChannel = supabase
        .channel(`seetu_${currentSeetuId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'seetus',
            filter: `id=eq.${currentSeetuId}`
        }, () => refreshCards())
        .subscribe();
}

async function refreshCards() {
    try {
        const { data } = await supabase
            .from('seetus')
            .select('*')
            .eq('id', currentSeetuId)
            .single();

        if (!data) return;

        const cards = document.querySelectorAll('.card');
        cards.forEach((card, idx) => {
            const pick = data.picks.find(p => p.cardIndex === idx);
            if (pick && !card.classList.contains('flipped')) {
                card.classList.add('flipped');
                const name = card.querySelector('.name');
                if (name) name.textContent = pick.name;
            }
        });
    } catch (e) {
        console.error(e);
    }
}

function showFlipAnimation(num, name) {
    const overlay = document.getElementById('flipOverlay');
    const card = document.getElementById('flipCardLarge');
    
    card.querySelector('.card-number').textContent = num;
    card.querySelector('.card-name').textContent = name;

    overlay.classList.add('active');
    setTimeout(() => card.classList.add('flipping'), 300);
    setTimeout(() => {
        card.classList.add('popping');
        createConfetti();
        document.getElementById('doneBtn').classList.add('visible');
    }, 1100);
}

function createConfetti() {
    const overlay = document.getElementById('flipOverlay');
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];

    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = `${50 + (Math.random() - 0.5) * 40}%`;
        c.style.top = '50%';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        overlay.appendChild(c);
        setTimeout(() => c.remove(), 1500);
    }
}

function closeFlipOverlay() {
    document.getElementById('flipOverlay').classList.remove('active');
    document.getElementById('flipCardLarge').classList.remove('flipping', 'popping');
    document.getElementById('doneBtn').classList.remove('visible');
    displayCards();
}

async function showHistory() {
    showLoading();

    try {
        const { data, error } = await supabase
            .from('seetus')
            .select('id, num_people, created_at')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const list = document.getElementById('historyList');
        if (!data || data.length === 0) {
            list.innerHTML = '<div style="padding:40px;color:#999">No history yet</div>';
        } else {
            list.innerHTML = data.map(item => `
                <div class="history-item" onclick="loadHistoryItem('${item.id}')">
                    <div>${new Date(item.created_at).toLocaleString()}</div>
                    <div>${item.num_people} people</div>
                </div>
            `).join('');
        }

        document.getElementById('historyModal').classList.add('active');
    } catch (error) {
        console.error(error);
        alert('Failed to load history');
    } finally {
        hideLoading();
    }
}

window.loadHistoryItem = function(id) {
    currentSeetuId = id;
    isHost = true;
    saveHostState();
    document.getElementById('seetuLink').value = 
        `${window.location.origin}${window.location.pathname}?seetu=${id}`;
    document.getElementById('historyModal').classList.remove('active');
    showPage('linkPage');
};
