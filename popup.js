// popup.js
let isStudying = false;
let studyTimer;

// XP required for each level (increases by 100 each time)
const getXPForLevel = (level) => level * 100;

// Sound management
const levelUpSound = document.getElementById('levelUpSound');
const xpSound = document.getElementById('xpSound');
const soundEnabled = document.getElementById('soundEnabled');

// Load sound preference
chrome.storage.local.get(['soundEnabled'], (result) => {
  soundEnabled.checked = result.soundEnabled !== false;
});

// Save sound preference
soundEnabled.addEventListener('change', () => {
  chrome.storage.local.set({ soundEnabled: soundEnabled.checked });
});

function playSound(sound) {
  if (soundEnabled.checked) {
    sound.currentTime = 0;
    sound.play().catch(e => console.log('Sound play failed:', e));
  }
}

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

// background.js
let studyInterval;
let lastStudyDate;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startStudying') {
    startStudyTimer();
  } else if (request.action === 'stopStudying') {
    stopStudyTimer();
  }
});

async function startStudyTimer() {
  studyInterval = setInterval(async () => {
    const stats = await chrome.storage.local.get(['xp', 'level', 'timeToday', 'streak', 'lastStudyDate']);
    let xp = stats.xp || 0;
    let level = stats.level || 1;
    let timeToday = stats.timeToday || 0;
    
    // Add XP and time
    xp += 10;
    timeToday += 1;
    
    // Check for level up
    const xpForNextLevel = level * 100;
    let justLeveledUp = false;
    
    if (xp >= xpForNextLevel) {
      level += 1;
      xp = xp - xpForNextLevel;
      justLeveledUp = true;
    }
    
    // Update streak
    const today = new Date().toDateString();
    let streak = stats.streak || 0;
    if (stats.lastStudyDate !== today) {
      if (stats.lastStudyDate === new Date(Date.now() - 86400000).toDateString()) {
        streak += 1;
      } else if (!stats.lastStudyDate) {
        streak = 1;
      }
    }
    
    await chrome.storage.local.set({
      xp,
      level,
      timeToday,
      streak,
      lastStudyDate: today,
      justLeveledUp
    });
  }, 60000); // Update every minute
}

function stopStudyTimer() {
  clearInterval(studyInterval);
}

// Reset daily stats at midnight
setInterval(async () => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    await chrome.storage.local.set({ timeToday: 0 });
  }
}, 60000);