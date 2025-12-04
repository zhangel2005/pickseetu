// ============================================
// SUPABASE CONFIGURATION
// ============================================
// 🔥 REPLACE THESE WITH YOUR OWN VALUES 🔥
const SUPABASE_URL = 'https://tswumalckqmjsuoilfsj.supabase.co';  // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzd3VtYWxja3FtanN1b2lsZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjY2NzcsImV4cCI6MjA4MDQwMjY3N30.NBGTfoiJmDDtNa8sTCKeAqavfgA4gZDIr27QC_aB2Nw';     // Your anon public key

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// STATE MANAGEMENT
// ============================================
let currentSeetuId = null;
let isHost = false;
let userName = null;
let hasPickedCard = false;
let realtimeChannel = null;

// ============================================
// DOM ELEMENTS
// ============================================
const homepage = document.getElementById('homepage');
const createPage = document.getElementById('createPage');
const linkPage = document.getElementById('linkPage');
const cardsPage = document.getElementById('cardsPage');
const nameModal = document.getElementById('nameModal');
const flipOverlay = document.getElementById('flipOverlay');
const historyModal = document.getElementById('historyModal');
const loadingOverlay = document.getElementById('loadingOverlay');

// Buttons
const createNewBtn = document.getElementById('createNewBtn');
const createSeetuBtn = document.getElementById('createSeetuBtn');
const backBtn = document.getElementById('backBtn');
const copyBtn = document.getElementById('copyBtn');
const viewCardsBtn = document.getElementById('viewCardsBtn');
const createAnotherBtn = document.getElementById('createAnotherBtn');
const enterSeetuBtn = document.getElementById('enterSeetuBtn');
const doneBtn = document.getElementById('doneBtn');
const historyIcon = document.getElementById('historyIcon');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Check if Supabase is configured
    if (SUPABASE_URL === 'YOUR_PROJECT_URL_HERE' || SUPABASE_KEY === 'YOUR_ANON_KEY_HERE') {
        alert('⚠️ Please configure Supabase credentials in script.js!\n\nReplace SUPABASE_URL and SUPABASE_KEY with your actual values.');
    }
    
    // Populate dropdown
    const numPeople = document.getElementById('numPeople');
    for (let i = 2; i <= 50; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        numPeople.appendChild(option);
    }

    // Event listeners
    createNewBtn.addEventListener('click', showCreatePage);
    createSeetuBtn.addEventListener('click', createSeetu);
    backBtn.addEventListener('click', () => showPage('homepage'));
    copyBtn.addEventListener('click', copyLink);
    viewCardsBtn.addEventListener('click', viewCards);
    createAnotherBtn.addEventListener('click', createAnother);
    enterSeetuBtn.addEventListener('click', enterSeetu);
    doneBtn.addEventListener('click', closeFlipOverlay);
    historyIcon.addEventListener('click', showHistory);
    closeHistoryBtn.addEventListener('click', () => historyModal.classList.remove('active'));

    // Check URL for seetu ID
    checkUrlForSeetu();
    
    // Load host state
    loadHostState();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageName).classList.add('active');
}

function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateRandomCards(numPeople) {
    // Create array [1, 2, 3, ..., numPeople]
    const cards = Array.from({ length: numPeople }, (_, i) => i + 1);
    
    // Remove 1 from array (it will be placed first)
    const one = cards.shift();
    
    // Shuffle remaining cards
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    
    // Put 1 at the beginning
    cards.unshift(one);
    
    return cards;
}

// ============================================
// NAVIGATION
// ============================================
function showCreatePage() {
    showPage('createPage');
}

function createAnother() {
    // Reset host state
    isHost = false;
    currentSeetuId = null;
    localStorage.removeItem('hostState');
    
    // Unsubscribe from realtime
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
    
    // Go to create page
    showCreatePage();
}

// ============================================
// SEETU CREATION
// ============================================
async function createSeetu() {
    const numPeople = parseInt(document.getElementById('numPeople').value);
    
    showLoading();
    
    try {
        // Generate unique ID
        const seetuId = generateId();
        
        // Create seetu data
        const seetuData = {
            id: seetuId,
            num_people: numPeople,
            cards: generateRandomCards(numPeople),
            picks: [{ cardIndex: 0, name: 'Shabnum' }] // First card auto-picked
        };
        
        // Save to Supabase
        const { error } = await supabase
            .from('seetus')
            .insert([seetuData]);
        
        if (error) throw error;
        
        // Set current state
        currentSeetuId = seetuId;
        isHost = true;
        
        // Save host state locally
        saveHostState();
        
        // Show link page
        const link = `${window.location.origin}${window.location.pathname}?seetu=${seetuId}`;
        document.getElementById('seetuLink').value = link;
        showPage('linkPage');
        
    } catch (error) {
        console.error('Error creating seetu:', error);
        alert('Failed to create seetu. Please try again.');
    } finally {
        hideLoading();
    }
}

// ============================================
// LOCAL STATE MANAGEMENT
// ============================================
function saveHostState() {
    const hostState = {
        currentSeetuId: currentSeetuId,
        isHost: isHost
    };
    localStorage.setItem('hostState', JSON.stringify(hostState));
}

function loadHostState() {
    const state = localStorage.getItem('hostState');
    if (state) {
        const parsed = JSON.parse(state);
        currentSeetuId = parsed.currentSeetuId;
        isHost = parsed.isHost;
        
        // If host state exists, show link page
        if (isHost && currentSeetuId) {
            const link = `${window.location.origin}${window.location.pathname}?seetu=${currentSeetuId}`;
            document.getElementById('seetuLink').value = link;
            showPage('linkPage');
        }
    }
}

function copyLink() {
    const linkInput = document.getElementById('seetuLink');
    linkInput.select();
    document.execCommand('copy');
    
    // Visual feedback
    copyBtn.innerHTML = '<span>✓</span>';
    setTimeout(() => {
        copyBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>`;
    }, 1000);
}

// ============================================
// URL HANDLING
// ============================================
async function checkUrlForSeetu() {
    const urlParams = new URLSearchParams(window.location.search);
    const seetuId = urlParams.get('seetu');
    
    if (seetuId) {
        currentSeetuId = seetuId;
        
        showLoading();
        
        try {
            // Load seetu from Supabase
            const { data, error } = await supabase
                .from('seetus')
                .select('*')
                .eq('id', seetuId)
                .single();
            
            if (error || !data) {
                throw new Error('Seetu not found');
            }
            
            // Check if user already picked
            const userState = localStorage.getItem(`user_${seetuId}`);
            
            if (userState) {
                const parsed = JSON.parse(userState);
                userName = parsed.name;
                hasPickedCard = true;
                displayCards();
            } else {
                // Show name modal
                hideLoading();
                nameModal.classList.add('active');
            }
            
        } catch (error) {
            console.error('Error loading seetu:', error);
            alert('Seetu not found!');
            hideLoading();
        }
    }
}

function enterSeetu() {
    const nameInput = document.getElementById('nameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    userName = name;
    nameModal.classList.remove('active');
    displayCards();
}

// ============================================
// CARD DISPLAY & INTERACTION
// ============================================
async function viewCards() {
    displayCards();
}

async function displayCards() {
    showLoading();
    
    try {
        // Load seetu from Supabase
        const { data: seetuData, error } = await supabase
            .from('seetus')
            .select('*')
            .eq('id', currentSeetuId)
            .single();
        
        if (error || !seetuData) {
            throw new Error('Seetu not found');
        }
        
        const cardsContainer = document.getElementById('cardsContainer');
        cardsContainer.innerHTML = '';
        
        seetuData.cards.forEach((cardNumber, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            
            // Check if card is picked
            const pick = seetuData.picks.find(p => p.cardIndex === index);
            
            if (pick) {
                card.classList.add('flipped');
            }
            
            // Disable if host or already picked
            if (isHost || hasPickedCard) {
                card.classList.add('disabled');
            }
            
            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-back">?</div>
                    <div class="card-face">
                        <div class="number">${cardNumber}</div>
                        <div class="name">${pick ? pick.name : ''}</div>
                    </div>
                </div>
            `;
            
            // Add click handler
            if (!isHost && !hasPickedCard && !pick) {
                card.addEventListener('click', () => pickCard(index, cardNumber));
            }
            
            cardsContainer.appendChild(card);
        });
        
        showPage('cardsPage');
        
        // Subscribe to realtime updates
        subscribeToRealtime();
        
    } catch (error) {
        console.error('Error displaying cards:', error);
        alert('Failed to load cards. Please try again.');
    } finally {
        hideLoading();
    }
}

async function pickCard(cardIndex, cardNumber) {
    if (hasPickedCard || isHost) return;
    
    showLoading();
    
    try {
        // Load current seetu data
        const { data: seetuData, error: fetchError } = await supabase
            .from('seetus')
            .select('*')
            .eq('id', currentSeetuId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Check if card already picked (race condition protection)
        const alreadyPicked = seetuData.picks.find(p => p.cardIndex === cardIndex);
        if (alreadyPicked) {
            alert('This card has already been picked!');
            displayCards();
            return;
        }
        
        // Add new pick
        const updatedPicks = [...seetuData.picks, { cardIndex, name: userName }];
        
        // Update in Supabase
        const { error: updateError } = await supabase
            .from('seetus')
            .update({ picks: updatedPicks })
            .eq('id', currentSeetuId);
        
        if (updateError) throw updateError;
        
        // Save user state locally
        localStorage.setItem(`user_${currentSeetuId}`, JSON.stringify({ name: userName }));
        hasPickedCard = true;
        
        hideLoading();
        
        // Show flip animation
        showFlipAnimation(cardNumber, userName);
        
    } catch (error) {
        console.error('Error picking card:', error);
        alert('Failed to pick card. Please try again.');
        hideLoading();
    }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================
function subscribeToRealtime() {
    // Unsubscribe from existing channel
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }
    
    // Subscribe to changes
    realtimeChannel = supabase
        .channel(`seetu_${currentSeetuId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'seetus',
                filter: `id=eq.${currentSeetuId}`
            },
            (payload) => {
                console.log('Realtime update:', payload);
                // Refresh cards without showing loading
                refreshCards();
            }
        )
        .subscribe();
}

async function refreshCards() {
    try {
        // Load seetu from Supabase
        const { data: seetuData, error } = await supabase
            .from('seetus')
            .select('*')
            .eq('id', currentSeetuId)
            .single();
        
        if (error || !seetuData) return;
        
        // Update cards
        const cardsContainer = document.getElementById('cardsContainer');
        const cards = cardsContainer.querySelectorAll('.card');
        
        cards.forEach((card, index) => {
            const pick = seetuData.picks.find(p => p.cardIndex === index);
            
            if (pick && !card.classList.contains('flipped')) {
                // Card was just picked - animate it
                card.classList.add('flipped');
                
                const nameDiv = card.querySelector('.name');
                if (nameDiv) {
                    nameDiv.textContent = pick.name;
                }
            }
        });
        
    } catch (error) {
        console.error('Error refreshing cards:', error);
    }
}

// ============================================
// ANIMATION
// ============================================
function showFlipAnimation(cardNumber, name) {
    const overlay = document.getElementById('flipOverlay');
    const flipCard = document.getElementById('flipCardLarge');
    const doneBtn = document.getElementById('doneBtn');
    
    // Set card content
    flipCard.querySelector('.card-number').textContent = cardNumber;
    flipCard.querySelector('.card-name').textContent = name;
    
    // Show overlay
    overlay.classList.add('active');
    
    // Flip animation
    setTimeout(() => {
        flipCard.classList.add('flipping');
    }, 300);
    
    // Pop and confetti
    setTimeout(() => {
        flipCard.classList.add('popping');
        createConfetti();
    }, 1100);
    
    // Show done button
    setTimeout(() => {
        doneBtn.classList.add('visible');
    }, 1500);
}

function createConfetti() {
    const overlay = document.getElementById('flipOverlay');
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${50 + (Math.random() - 0.5) * 40}%`;
        confetti.style.top = '50%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = `${Math.random() * 0.3}s`;
        confetti.style.animationDuration = `${0.8 + Math.random() * 0.4}s`;
        
        overlay.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 1500);
    }
}

function closeFlipOverlay() {
    const overlay = document.getElementById('flipOverlay');
    const flipCard = document.getElementById('flipCardLarge');
    const doneBtn = document.getElementById('doneBtn');
    
    overlay.classList.remove('active');
    flipCard.classList.remove('flipping', 'popping');
    doneBtn.classList.remove('visible');
    
    // Refresh cards view
    displayCards();
}

// ============================================
// HISTORY
// ============================================
async function showHistory() {
    showLoading();
    
    try {
        // Load all seetus from Supabase (ordered by created_at)
        const { data: seetus, error } = await supabase
            .from('seetus')
            .select('id, num_people, created_at')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        const historyList = document.getElementById('historyList');
        
        if (!seetus || seetus.length === 0) {
            historyList.innerHTML = '<div class="history-empty">No history yet</div>';
        } else {
            historyList.innerHTML = seetus.map(item => {
                const date = new Date(item.created_at);
                return `
                    <div class="history-item" onclick="loadHistoryItem('${item.id}')">
                        <div class="history-item-date">${date.toLocaleString()}</div>
                        <div class="history-item-info">${item.num_people} people</div>
                    </div>
                `;
            }).join('');
        }
        
        historyModal.classList.add('active');
        
    } catch (error) {
        console.error('Error loading history:', error);
        alert('Failed to load history');
    } finally {
        hideLoading();
    }
}

function loadHistoryItem(seetuId) {
    currentSeetuId = seetuId;
    isHost = true;
    saveHostState();
    
    const link = `${window.location.origin}${window.location.pathname}?seetu=${seetuId}`;
    document.getElementById('seetuLink').value = link;
    
    historyModal.classList.remove('active');
    showPage('linkPage');
}