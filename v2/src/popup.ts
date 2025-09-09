document.addEventListener('DOMContentLoaded', init);

// 현재 탭이 Udemy 사이트인지 확인하는 헬퍼 함수
async function isUdemySite(): Promise<boolean> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.url?.includes('udemy.com') || false;
  } catch (error) {
    console.error('탭 정보 가져오기 실패:', error);
    return false;
  }
}

// Udemy 사이트에서만 content script에 메시지 보내기
async function sendMessageToContentScript(message: any): Promise<void> {
  const isUdemy = await isUdemySite();
  if (!isUdemy) {
    console.log('Udemy 사이트가 아니므로 content script에 메시지를 보내지 않습니다.');
    return;
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0].id) {
      await chrome.tabs.sendMessage(tabs[0].id, message);
    }
  } catch (error) {
    console.error('Content script 메시지 전송 실패:', error);
  }
}

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
      
      // 사용량 정보 업데이트
      updateUsage(response.status.usage);
      
      // API 키가 설정되어 있으면 사용량과 컨트롤 섹션 표시
      usageSection.classList.remove('hidden');
      subtitleControlsSection.classList.remove('hidden');
      apiKeySection.classList.add('hidden');
    } else {
      status.innerHTML = '<span class="status-icon">⚙️</span> API 키를 설정해주세요.';
      status.className = 'status-item warning';
      
      // API 키가 설정되지 않았으면 설정 섹션만 표시
      usageSection.classList.add('hidden');
      subtitleControlsSection.classList.add('hidden');
      apiKeySection.classList.remove('hidden');
    }
  }).catch(error => {
    console.error('상태 로드 실패:', error);
    const status = document.getElementById('api-status')!;
    status.innerHTML = '<span class="status-icon">❌</span> 확장 프로그램 오류가 발생했습니다.';
    status.className = 'status-item error';
    
    // 오류 시에는 API 키 섹션만 표시
    document.getElementById('usage-section')!.classList.add('hidden');
    document.getElementById('api-key-section')!.classList.remove('hidden');
    const subtitleControls = document.getElementById('subtitle-controls-section');
    if (subtitleControls) {
      subtitleControls.classList.add('hidden');
    }
  });
}

function setupEvents() {
  // 저장된 설정 불러오기
  loadSubtitleSettings();
  
  // 번역 활성/비활성 토글
  const translationToggle = document.getElementById('translation-toggle') as HTMLInputElement;
  translationToggle?.addEventListener('change', (e) => {
    const isEnabled = (e.target as HTMLInputElement).checked;
    
    // 상태 저장
    chrome.storage.local.set({ translationEnabled: isEnabled });
    
    // content script에 상태 전송 (Udemy 사이트에서만)
    sendMessageToContentScript({
      action: 'updateTranslationState',
      value: isEnabled
    });
  });
  
  // 영어/한글 동시 표시 토글
  const dualSubtitleToggle = document.getElementById('dual-subtitle-toggle') as HTMLInputElement;
  dualSubtitleToggle?.addEventListener('change', (e) => {
    const isEnabled = (e.target as HTMLInputElement).checked;
    
    // 설정 저장
    chrome.storage.local.set({ dualSubtitle: isEnabled });
    
    // content script에 설정 전송 (Udemy 사이트에서만)
    sendMessageToContentScript({
      action: 'updateDualSubtitle',
      value: isEnabled
    });
  });
  
  // API 키 저장 버튼
  document.getElementById('save-api-key')!.addEventListener('click', () => {
    const input = document.getElementById('api-key-input') as HTMLInputElement;
    const apiKey = input.value.trim();
    
    if (!apiKey) {
      showMessage('API 키를 입력해주세요.', 'info');
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
        input.value = '';
        
        // 설정 완료 후 상태 다시 로드
        setTimeout(() => {
          loadStatus();
        }, 1000);
      } else {
        // API 키가 틀렸을 때는 warning으로 처리
        showMessage(response.error || 'API 키를 다시 확인해주세요.', 'warning');
      }
      
      btn.textContent = 'API 키 저장';
    }).catch(error => {
      console.error('API 키 설정 실패:', error);
      // 네트워크 오류 등 실제 에러만 error로 처리
      showMessage('네트워크 연결을 확인해주세요.', 'error');
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
    chrome.storage.local.set({ fontSize: parseInt(value) });
    
    // content script에 설정 전송 (Udemy 사이트에서만)
    sendMessageToContentScript({
      action: 'updateFontSize',
      value: parseInt(value)
    });
  });

  // 배경 너비 슬라이더 - 수정된 부분
  const backgroundWidthSlider = document.getElementById('background-width-slider') as HTMLInputElement;
  const backgroundWidthValue = document.getElementById('background-width-value')!;
  
  backgroundWidthSlider?.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    backgroundWidthValue.textContent = value + '%';
    
    // 설정 저장 - backgroundWidth 키 사용
    chrome.storage.local.set({ backgroundWidth: parseInt(value) });
    
    // content script에 설정 전송 (Udemy 사이트에서만)
    sendMessageToContentScript({
      action: 'updateBackgroundWidth',
      value: parseInt(value)
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

function updateTranslationToggle(isEnabled: boolean) {
  const toggle = document.getElementById('translation-toggle') as HTMLInputElement;
  if (toggle) {
    toggle.checked = isEnabled;
  }
}

function showMessage(msg: string, type: 'success' | 'error' | 'info' | 'warning') {
  const messageEl = document.getElementById('api-message')!;
  messageEl.textContent = msg;
  messageEl.className = `message ${type}`;
  messageEl.classList.remove('hidden');
  
  if (type === 'success' || type === 'info') {
    setTimeout(() => messageEl.classList.add('hidden'), 3000);
  } else if (type === 'warning') {
    // warning은 5초 후에 자동으로 사라짐 (사용자가 다시 시도할 시간을 줌)
    setTimeout(() => messageEl.classList.add('hidden'), 5000);
  }
  // error는 수동으로 닫아야 함
}

function loadSubtitleSettings() {
  // 저장된 설정 불러오기 - translationEnabled 추가
  chrome.storage.local.get(['dualSubtitle', 'fontSize', 'backgroundWidth', 'translationEnabled']).then(result => {
    // 번역 활성/비활성 상태 설정
    const translationEnabled = result.translationEnabled !== false; // 기본값은 true
    updateTranslationToggle(translationEnabled);
    
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
    
    // 배경 너비 설정 - backgroundWidth 키 사용
    const backgroundWidthSlider = document.getElementById('background-width-slider') as HTMLInputElement;
    const backgroundWidthValue = document.getElementById('background-width-value')!;
    if (backgroundWidthSlider && result.backgroundWidth) {
      backgroundWidthSlider.value = result.backgroundWidth;
      backgroundWidthValue.textContent = result.backgroundWidth + '%';
    }
  });
}