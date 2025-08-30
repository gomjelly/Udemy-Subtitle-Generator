document.addEventListener('DOMContentLoaded', init);

function init() {
  checkSite();
  loadStatus();
  setupEvents();
}

function checkSite() {
  chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    const status = document.getElementById('udemy-status')!;
    if (tabs[0].url?.includes('udemy.com')) {
      status.innerHTML = '<span class="status-icon">✅</span> Udemy 사이트입니다. 정상동작합니다.';
      status.className = 'status-item success';
    } else {
      status.innerHTML = '<span class="status-icon">⚠️</span> Udemy 사이트에서만 동작합니다.';
      status.className = 'status-item warning';
    }
  });
}

function loadStatus() {
  chrome.runtime.sendMessage({ action: 'getStatus' }).then(response => {
    const status = document.getElementById('api-status')!;
    const usageSection = document.getElementById('usage-section')!;
    const apiKeySection = document.getElementById('api-key-section')!;
    const subtitleControlsSection = document.getElementById('subtitle-controls-section')!;
    
    console.log('API 상태:', response);
    
    if (response.success && response.status?.isValid) {
      status.innerHTML = '<span class="status-icon">✅</span> API 키가 정상적으로 설정되었습니다.';
      status.className = 'status-item success';
      
      // API 키가 인증되면 입력 창 숨기고 사용량과 자막 컨트롤 보여주기
      apiKeySection.classList.add('hidden');
      usageSection.classList.remove('hidden');
      subtitleControlsSection.classList.remove('hidden');
      
      if (response.status.usage) {
        updateUsage(response.status.usage);
      }
    } else {
      status.innerHTML = '<span class="status-icon">❌</span> API 키를 설정해주세요.';
      status.className = 'status-item error';
      
      // API 키가 없으면 입력 창 보여주고 다른 섹션 숨기기
      apiKeySection.classList.remove('hidden');
      usageSection.classList.add('hidden');
      subtitleControlsSection.classList.add('hidden');
    }
  });
}

function setupEvents() {
  // 저장된 설정 불러오기
  loadSubtitleSettings();
  
  // 영어/한글 동시 표시 토글
  const dualSubtitleToggle = document.getElementById('dual-subtitle-toggle') as HTMLInputElement;
  dualSubtitleToggle?.addEventListener('change', (e) => {
    const isEnabled = (e.target as HTMLInputElement).checked;
    
    // 설정 저장
    chrome.storage.local.set({ dualSubtitle: isEnabled });
    
    // content script에 설정 전송
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateDualSubtitle',
          value: isEnabled
        });
      }
    });
  });
  
  // API 키 저장 버튼
  document.getElementById('save-api-key')!.addEventListener('click', () => {
    const input = document.getElementById('api-key-input') as HTMLInputElement;
    const apiKey = input.value.trim();
    
    if (!apiKey) {
      showMessage('API 키를 입력해주세요.', 'error');
      return;
    }
    
    const btn = document.getElementById('save-api-key')!;
    btn.textContent = '검증 중...';
    
    showMessage('API 키를 검증하고 있습니다...', 'info');
    
    chrome.runtime.sendMessage({ 
      action: 'setApiKey', 
      apiKey: apiKey 
    }).then(response => {
      console.log('API 설정 결과:', response);
      
      if (response.success) {
        showMessage('API 키가 성공적으로 설정되었습니다!', 'success');
        setTimeout(() => loadStatus(), 500);
      } else {
        showMessage(response.error || 'API 키 설정 실패', 'error');
      }
    }).finally(() => {
      btn.textContent = 'API 키 저장';
    });
  });

  // 글자 크기 슬라이더
  const fontSizeSlider = document.getElementById('font-size-slider') as HTMLInputElement;
  const fontSizeValue = document.getElementById('font-size-value')!;
  
  fontSizeSlider?.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    fontSizeValue.textContent = value + 'px';
    
    // 설정 저장
    chrome.storage.local.set({ fontSize: value });
    
    // content script에 설정 전송
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateFontSize',
          value: parseInt(value)
        });
      }
    });
  });

  // 배경 너비 슬라이더
  const backgroundWidthSlider = document.getElementById('background-width-slider') as HTMLInputElement;
  const backgroundWidthValue = document.getElementById('background-width-value')!;
  
  backgroundWidthSlider?.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    backgroundWidthValue.textContent = value + '%';
    
    // 설정 저장
    chrome.storage.local.set({ backgroundWidth: value });
    
    // content script에 설정 전송
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateBackgroundWidth',
          value: parseInt(value)
        });
      }
    });
  });
}

function updateUsage(usage: any) {
  const current = document.getElementById('usage-current');
  const limit = document.getElementById('usage-limit');
  const reset = document.getElementById('usage-reset');
  const percentage = document.getElementById('usage-percentage');
  const fill = document.querySelector('.usage-fill') as HTMLElement;
  
  if (current) current.textContent = usage.current.toLocaleString();
  if (limit) limit.textContent = usage.limit.toLocaleString();
  if (reset) reset.textContent = usage.resetDate;
  
  const pct = Math.round((usage.current / usage.limit) * 100);
  if (percentage) percentage.textContent = `${pct}%`;
  if (fill) fill.style.width = `${pct}%`;
}

function showMessage(msg: string, type: 'success' | 'error' | 'info') {
  const messageEl = document.getElementById('api-message')!;
  messageEl.textContent = msg;
  messageEl.className = `message ${type}`;
  messageEl.classList.remove('hidden');
  
  if (type === 'success' || type === 'info') {
    setTimeout(() => messageEl.classList.add('hidden'), 3000);
  }
}

function loadSubtitleSettings() {
  // 저장된 설정 불러오기
  chrome.storage.local.get(['dualSubtitle', 'fontSize', 'backgroundWidth']).then(result => {
    // 영어/한글 동시 표시 토글 설정
    const dualSubtitleToggle = document.getElementById('dual-subtitle-toggle') as HTMLInputElement;
    if (dualSubtitleToggle) {
      dualSubtitleToggle.checked = result.dualSubtitle || false;
    }
    
    // 글자 크기 설정
    const fontSizeSlider = document.getElementById('font-size-slider') as HTMLInputElement;
    const fontSizeValue = document.getElementById('font-size-value')!;
    if (fontSizeSlider && result.fontSize) {
      fontSizeSlider.value = result.fontSize;
      fontSizeValue.textContent = result.fontSize + 'px';
    }
    
    // 배경 너비 설정
    const backgroundWidthSlider = document.getElementById('background-width-slider') as HTMLInputElement;
    const backgroundWidthValue = document.getElementById('background-width-value')!;
    if (backgroundWidthSlider && result.backgroundWidth) {
      backgroundWidthSlider.value = result.backgroundWidth;
      backgroundWidthValue.textContent = result.backgroundWidth + '%';
    }
  });
}