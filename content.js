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
