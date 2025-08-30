// Content Script for Udemy subtitle translation
console.log('🎬 Content script loaded');

// Configuration
let isActive = true;
let fontSize = 16;
let subtitleWidth = 80;
let isDualSubtitle = false; // 영어/한글 동시 표시 여부

// State
let currentSubtitle = '';
let currentEnglishSubtitle = ''; // 원본 영어 자막 저장
let subtitleElement: HTMLElement | null = null;
let translationCache = new Map<string, string>();

// 자막 위치 저장 (사용자가 드래그한 위치 기억)
let savedPosition = {
  x: null as number | null,
  y: null as number | null,
  isCustomPosition: false
};

// Initialize only on Udemy sites
if (window.location.hostname.includes('udemy.com')) {
  console.log('✅ Udemy site detected');
  initializeSubtitleTranslator();
} else {
  console.log('ℹ️ Not a Udemy site, extension inactive');
}

function initializeSubtitleTranslator() {
  loadUserSettings();
  startSubtitleWatcher();
  setupMessageListener();
  
  // 주기적으로 설정 다시 로드 (popup에서 변경된 설정을 반영하기 위해)
  setInterval(() => {
    loadUserSettings();
  }, 2000);
}

async function loadUserSettings() {
  try {
    const settings = await chrome.storage.local.get({
      isActive: true,
      fontSize: 16,
      subtitleWidth: 80,
      dualSubtitle: false
    });
    
    isActive = settings.isActive;
    fontSize = settings.fontSize;
    subtitleWidth = settings.subtitleWidth;
    isDualSubtitle = settings.dualSubtitle;
    
    // console.log('⚙️ Settings loaded:', settings);
    // console.log('🌐 Dual subtitle mode:', isDualSubtitle);
  } catch (error) {
    console.log('❌ Failed to load settings:', error);
  }
}

function startSubtitleWatcher() {
  // Watch for DOM changes
  const observer = new MutationObserver(() => {
    detectAndTranslateSubtitle();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Also check periodically
  setInterval(detectAndTranslateSubtitle, 1000);
  
  console.log('👀 Subtitle watcher started');
}

function detectAndTranslateSubtitle() {
  if (!isActive) return;

  // Udemy subtitle selectors
  const subtitleSelectors = [
    '[data-purpose="captions-cue-text"]',
    '.captions-cue-text',
    '.transcript-cue'
  ];

  let subtitleText = '';
  
  // Try to find subtitle element
  for (const selector of subtitleSelectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) {
      subtitleText = element.textContent.trim();
      break;
    }
  }

  // If we found new subtitle text
  if (subtitleText && subtitleText !== currentSubtitle) {
    currentSubtitle = subtitleText;
    currentEnglishSubtitle = subtitleText; // 영어 자막도 저장
    console.log('🎯 New subtitle detected:', subtitleText);
    requestTranslation(subtitleText);
  }
}

async function requestTranslation(text: string) {
  // Check cache first
  if (translationCache.has(text)) {
    const cached = translationCache.get(text)!;
    displayKoreanSubtitle(cached);
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'translate',
      text: text
    });

    if (response.success && response.translatedText) {
      // Cache the translation
      translationCache.set(text, response.translatedText);
      displayKoreanSubtitle(response.translatedText);
      console.log('✅ Translation received:', response.translatedText);
    } else {
      console.log('❌ Translation failed:', response.error);
      
      // Google API 에러 유형별 사용자 메시지 표시
      let userMessage = '';
      switch (response.errorType) {
        case 'quotaExceeded':
          userMessage = '일일 번역 한도를 초과했습니다 😔';
          break;
        case 'apiKeyError':
          userMessage = 'API 키를 확인해주세요 🔑';
          break;
        case 'tooManyRequests':
          userMessage = '잠시 후 다시 시도해주세요 ⏳';
          break;
        case 'networkError':
          userMessage = '네트워크 연결을 확인해주세요 🌐';
          break;
        default:
          userMessage = response.error || '번역 오류가 발생했습니다 ⚠️';
      }
      
      displayErrorMessage(userMessage);
    }
  } catch (error) {
    console.log('❌ Failed to request translation:', error);
    displayErrorMessage('번역 서비스에 연결할 수 없습니다 🔌');
  }
}

function displayKoreanSubtitle(koreanText: string) {
  // Remove existing subtitle
  if (subtitleElement) {
    subtitleElement.remove();
  }

  // 디버깅 로그 추가
  console.log('🎯 Displaying subtitle:', {
    isDualSubtitle,
    currentEnglishSubtitle,
    koreanText
  });

  // Create new subtitle element
  subtitleElement = document.createElement('div');
  subtitleElement.id = 'udemy-korean-subtitle';
  
  // 영어/한글 동시 표시인지에 따라 내용 설정
  if (isDualSubtitle && currentEnglishSubtitle) {
    // 영어 자막을 위에, 한글 자막을 아래에 표시
    console.log('🌐 Dual subtitle mode activated');
    
    // HTML 이스케이프 처리
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    const escapedEnglish = escapeHtml(currentEnglishSubtitle);
    const escapedKorean = escapeHtml(koreanText);
    
    subtitleElement.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: 400; opacity: 0.9; font-size: 0.9em;">${escapedEnglish}</div>
      <div style="font-weight: 600; color: #ffeb3b;">${escapedKorean}</div>
    `;
  } else {
    // 한글 자막만 표시
    console.log('🇰🇷 Korean only mode');
    subtitleElement.textContent = koreanText;
  }

  // Apply styling
  Object.assign(subtitleElement.style, {
    position: 'fixed',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: `${fontSize}px`,
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    width: `${subtitleWidth}%`,
    wordWrap: 'break-word',
    zIndex: '99999',
    cursor: 'move',
    userSelect: 'none',
    boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
    boxSizing: 'border-box',
    lineHeight: '1.4'
  });

  // 위치 설정: 저장된 위치가 있으면 사용, 없으면 기본 위치
  if (savedPosition.isCustomPosition && savedPosition.x !== null && savedPosition.y !== null) {
    // 사용자가 드래그한 위치 사용
    subtitleElement.style.left = `${savedPosition.x}px`;
    subtitleElement.style.top = `${savedPosition.y}px`;
    subtitleElement.style.transform = 'none';
  } else {
    // 기본 위치 (화면 하단 중앙)
    subtitleElement.style.bottom = '100px';
    subtitleElement.style.left = '50%';
    subtitleElement.style.transform = 'translateX(-50%)';
  }

  document.body.appendChild(subtitleElement);
  
  // Make it draggable
  makeDraggable(subtitleElement);
}

function displayErrorMessage(message: string) {
  // Remove existing subtitle
  if (subtitleElement) {
    subtitleElement.remove();
  }

  // Create error message element
  subtitleElement = document.createElement('div');
  subtitleElement.id = 'udemy-korean-subtitle';
  subtitleElement.textContent = message;

  // Apply error styling
  Object.assign(subtitleElement.style, {
    position: 'fixed',
    backgroundColor: 'rgba(220, 53, 69, 0.9)', // 빨간색 배경
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: `${fontSize}px`,
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    width: `${subtitleWidth}%`,
    wordWrap: 'break-word',
    zIndex: '99999',
    cursor: 'move',
    userSelect: 'none',
    boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
    boxSizing: 'border-box',
    lineHeight: '1.4',
    border: '2px solid rgba(255, 255, 255, 0.3)'
  });

  // 위치 설정
  if (savedPosition.isCustomPosition && savedPosition.x !== null && savedPosition.y !== null) {
    subtitleElement.style.left = `${savedPosition.x}px`;
    subtitleElement.style.top = `${savedPosition.y}px`;
    subtitleElement.style.transform = 'none';
  } else {
    subtitleElement.style.bottom = '100px';
    subtitleElement.style.left = '50%';
    subtitleElement.style.transform = 'translateX(-50%)';
  }

  document.body.appendChild(subtitleElement);
  
  // 3초 후 자동으로 제거
  setTimeout(() => {
    if (subtitleElement && subtitleElement.style.backgroundColor.includes('220, 53, 69')) {
      subtitleElement.remove();
      subtitleElement = null;
    }
  }, 3000);
  
  // Make it draggable
  makeDraggable(subtitleElement);
}

function makeDraggable(element: HTMLElement) {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let elementStartX = 0;
  let elementStartY = 0;

  element.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    const rect = element.getBoundingClientRect();
    elementStartX = rect.left;
    elementStartY = rect.top;
    
    element.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    // 새로운 위치 계산
    const newX = elementStartX + deltaX;
    const newY = elementStartY + deltaY;
    
    // 위치만 업데이트 (다른 스타일은 건드리지 않음)
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
    element.style.transform = 'none';
    element.style.bottom = 'auto'; // bottom 속성 제거
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      element.style.cursor = 'move';
      
      // 드래그 완료 시 위치 저장
      const rect = element.getBoundingClientRect();
      savedPosition.x = rect.left;
      savedPosition.y = rect.top;
      savedPosition.isCustomPosition = true;
      
      console.log('🎯 자막 위치 저장:', savedPosition);
    }
  });
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'updateSettings':
        isActive = message.settings.isActive;
        fontSize = message.settings.fontSize;
        subtitleWidth = message.settings.subtitleWidth;
        
        // Update existing subtitle if visible
        if (subtitleElement) {
          subtitleElement.style.fontSize = `${fontSize}px`;
          subtitleElement.style.width = `${subtitleWidth}%`;
        }
        
        sendResponse({ success: true });
        break;

      case 'updateFontSize':
        fontSize = message.value;
        if (subtitleElement) {
          subtitleElement.style.fontSize = `${fontSize}px`;
        }
        sendResponse({ success: true });
        break;

      case 'updateBackgroundWidth':
        subtitleWidth = message.value;
        if (subtitleElement) {
          subtitleElement.style.width = `${subtitleWidth}%`;
        }
        sendResponse({ success: true });
        break;

      case 'updateDualSubtitle':
        isDualSubtitle = message.value;
        console.log('🔄 Dual subtitle setting updated:', isDualSubtitle);
        // 현재 표시된 자막이 있으면 다시 렌더링
        if (subtitleElement && currentSubtitle) {
          const cachedTranslation = translationCache.get(currentSubtitle);
          if (cachedTranslation) {
            console.log('🔄 Re-rendering subtitle with new dual setting');
            displayKoreanSubtitle(cachedTranslation);
          }
        }
        sendResponse({ success: true });
        break;
        
      case 'getStatus':
        sendResponse({
          isValidSite: window.location.hostname.includes('udemy.com'),
          isActive: isActive
        });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  });
}
