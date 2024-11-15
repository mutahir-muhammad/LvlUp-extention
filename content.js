// popup.js
let isStudying = false;
let studyTimer;

// XP required for each level (increases by 100 each time)
const getXPForLevel = (level) => level * 100;

// Sound management
const levelUpSound = document.getElementById('levelUpSound');
const xpSound = document.getElementById('xpSound');
const soundEnabled = document.getElementById('soundEnabled');

const resetButton = document.getElementById('resetProgress');
const resetModal = document.getElementById('resetModal');
const confirmResetButton = document.getElementById('confirmReset');
const cancelResetButton = document.getElementById('cancelReset');

// Load sound preference
chrome.storage.local.get(['soundEnabled'], (result) => {
  soundEnabled.checked = result.soundEnabled !== false;
});

// Save sound preference
soundEnabled.addEventListener('change', () => {
  chrome.storage.local.set({ soundEnabled: soundEnabled.checked });
});

// Function to play sounds
function playSound(sound) {
  if (soundEnabled.checked) {
    // Reset sound to start and play
    sound.currentTime = 0;
    sound.volume = 0.3; // Set volume to 30%
    sound.play().catch(e => console.log('Sound play failed:', e));
  }
}

// Listen for XP gain messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'xpGained' && isStudying) {
    playSound(xpSound);
  }
});

document.getElementById('startStudy').addEventListener('click', async () => {
  isStudying = true;
  chrome.runtime.sendMessage({ action: 'startStudying' });
  updateUI();
  document.getElementById('startStudy').disabled = true;
  document.getElementById('stopStudy').disabled = false;
});

document.getElementById('stopStudy').addEventListener('click', () => {
  isStudying = false;
  chrome.runtime.sendMessage({ action: 'stopStudying' });
  document.getElementById('startStudy').disabled = false;
  document.getElementById('stopStudy').disabled = true;
});


resetButton.addEventListener('click', () => {
  // Show confirmation modal
  resetModal.style.display = 'block';
});

cancelResetButton.addEventListener('click', () => {
  // Hide modal
  resetModal.style.display = 'none';
});

confirmResetButton.addEventListener('click', async () => {
  // Reset all progress
  await resetAllProgress();
  // Hide modal
  resetModal.style.display = 'none';
  // Update UI
  updateUI();
  // Show confirmation notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Progress Reset',
    message: 'All progress has been reset successfully.'
  });
});

// Close modal if clicking outside
resetModal.addEventListener('click', (e) => {
  if (e.target === resetModal) {
    resetModal.style.display = 'none';
  }
});

async function resetAllProgress() {
  // Stop study timer if it's running
  if (isStudying) {
    chrome.runtime.sendMessage({ action: 'stopStudying' });
    isStudying = false;
    document.getElementById('startStudy').disabled = false;
    document.getElementById('stopStudy').disabled = true;
  }
  
  // Reset all stored values
  await chrome.storage.local.set({
    xp: 0,
    level: 1,
    timeToday: 0,
    streak: 0,
    lastStudyDate: null,
    justLeveledUp: false
  });
  
  // Keep sound preference
  const { soundEnabled } = await chrome.storage.local.get(['soundEnabled']);
  await chrome.storage.local.set({ soundEnabled });
  
  // Reset UI elements
  document.getElementById('xpProgress').style.width = '0%';
  playSound(levelUpSound); // Play sound to confirm reset
}

async function updateUI() {
  const stats = await chrome.storage.local.get(['xp', 'level', 'timeToday', 'streak', 'justLeveledUp']);
  const level = stats.level || 1;
  const xp = stats.xp || 0;
  const xpForNextLevel = getXPForLevel(level);
  const progress = (xp / xpForNextLevel) * 100;

  document.getElementById('level').textContent = level;
  document.getElementById('xp').textContent = `${xp} / ${xpForNextLevel}`;
  document.getElementById('xpProgress').style.width = `${progress}%`;
  document.getElementById('timeToday').textContent = `${stats.timeToday || 0} min`;
  document.getElementById('streak').textContent = `${stats.streak || 0} days`;

  // Handle level up animation and sound
  if (stats.justLeveledUp) {
    const levelElement = document.getElementById('level');
    levelElement.classList.add('level-up-animation');
    playSound(levelUpSound);
    
    // Show level up notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Level Up!',
      message: `Congratulations! You've reached level ${level}!`
    });

    // Reset the level up flag
    chrome.storage.local.set({ justLeveledUp: false });
    
    // Remove animation class after it completes
    setTimeout(() => {
      levelElement.classList.remove('level-up-animation');
    }, 1000);
  }
}

// Update UI every second when studying
setInterval(() => {
  if (isStudying) {
    updateUI();
  }
}, 1000);