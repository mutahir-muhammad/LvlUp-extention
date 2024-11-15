// background.js
let studyInterval;
let lastStudyDate;

// Send message to popup when XP is gained
function notifyXPGain() {
  chrome.runtime.sendMessage({ action: 'xpGained' });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startStudying') {
    startStudyTimer();
  } else if (request.action === 'stopStudying') {
    stopStudyTimer();
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.level && changes.level.newValue === 1) {
      // If level was reset to 1, stop the study timer
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
    
    // Notify popup about XP gain
    notifyXPGain();
    
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