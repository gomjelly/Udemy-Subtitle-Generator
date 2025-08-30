// Background Script - Enhanced Version
console.log('🚀 Background script started');

interface UsageInfo {
  current: number;
  limit: number;
  resetDate: string;
}

interface ApiStatus {
  apiKey: string;
  isConfigured: boolean;
  isValid: boolean;
  usage: UsageInfo;
}

let apiStatus: ApiStatus = {
  apiKey: '',
  isConfigured: false,
  isValid: false,
  usage: {
    current: 0,
    limit: 500000, // 월 50만 문자 한도
    resetDate: getNextMonthResetDate()
  }
};

function getNextMonthResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString('ko-KR');
}

// 월간 사용량 리셋 확인
function checkMonthlyReset() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
  
  chrome.storage.local.get(['lastResetMonth']).then((result) => {
    if (result.lastResetMonth !== currentMonth) {
      console.log('📅 월간 사용량 리셋');
      apiStatus.usage.current = 0;
      apiStatus.usage.resetDate = getNextMonthResetDate();
      
      chrome.storage.local.set({
        'lastResetMonth': currentMonth,
        'apiUsage': apiStatus.usage
      });
    }
  });
}

async function validateApiKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
  console.log('🔧 Google Cloud Translation API 키 검증 시작');
  
  if (!apiKey || apiKey.length < 30) {
    console.log('❌ API 키가 너무 짧습니다. Google Cloud API 키는 보통 39자입니다.');
    return { isValid: false, error: 'API 키 형식을 확인해주세요.' };
  }
  
  try {
    // Google Cloud Translation API v2 엔드포인트 사용
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: 'Hello World',
        source: 'en',
        target: 'ko',
        format: 'text'
      })
    });

    console.log('API 응답 상태:', response.status);

    if (response.ok) {
      const data = await response.json();
      const translated = data.data?.translations?.[0]?.translatedText;
      console.log('✅ Google Cloud Translation API 검증 성공');
      console.log('테스트 번역 결과:', translated);
      return { isValid: true };
    } else {
      const errorData = await response.text();
      console.log('❌ API 검증 실패 상세:', response.status, errorData);
      
      // 단순히 로그만 출력하고 기본 메시지 반환
      if (response.status === 400) {
        console.log('API 키 형식 오류 또는 잘못된 요청');
      } else if (response.status === 403) {
        console.log('API 키가 유효하지 않거나 Translation API가 활성화되지 않음');
      } else if (response.status === 429) {
        console.log('API 사용량 한도 초과');
      }
      
      return { isValid: false };
    }
  } catch (error) {
    console.log('❌ 네트워크 오류:', error);
    return { isValid: false };
  }
}

async function translateText(text: string): Promise<{ success: boolean; translatedText?: string; error?: string; errorType?: string }> {
  if (!apiStatus.isValid) {
    console.log('⚠️ API 키가 설정되지 않았거나 유효하지 않습니다.');
    return { success: false, error: 'API 키가 설정되지 않았습니다.', errorType: 'noApiKey' };
  }

  const textLength = text.length;
  console.log(`🌐 번역 요청: "${text.substring(0, 50)}..." (${textLength}자)`);

  try {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiStatus.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: 'ko',
        format: 'text'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }

      console.log('❌ 번역 API 오류:', response.status, errorData);
      
      // Google API 에러 코드별 처리
      if (response.status === 403) {
        const errorMessage = errorData.error?.message || '';
        if (errorMessage.includes('quotaExceeded') || errorMessage.includes('rateLimitExceeded')) {
          console.log('🚫 Google API 할당량 초과');
          return { 
            success: false, 
            error: '일일 번역 한도를 초과했습니다. 내일 다시 시도해주세요.', 
            errorType: 'quotaExceeded' 
          };
        } else {
          console.log('❌ API 키 권한 문제');
          return { 
            success: false, 
            error: 'API 키를 확인해주세요.', 
            errorType: 'apiKeyError' 
          };
        }
      } else if (response.status === 429) {
        console.log('🚫 요청 빈도 초과');
        return { 
          success: false, 
          error: '요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요.', 
          errorType: 'tooManyRequests' 
        };
      } else if (response.status === 400) {
        console.log('❌ 잘못된 요청');
        return { 
          success: false, 
          error: '번역 요청 형식에 오류가 있습니다.', 
          errorType: 'badRequest' 
        };
      } else {
        console.log(`❌ 번역 API 오류: ${response.status}`);
        return { 
          success: false, 
          error: `번역 서비스 오류 (${response.status})`, 
          errorType: 'apiError' 
        };
      }
    }

    const data = await response.json();
    const translatedText = data.data?.translations?.[0]?.translatedText;
    
    if (!translatedText) {
      console.log('❌ 번역 결과가 없습니다.');
      return { success: false, error: '번역 결과를 받을 수 없습니다.', errorType: 'noResult' };
    }

    // 번역 성공 시에만 사용량 업데이트
    apiStatus.usage.current += textLength;
    await saveConfiguration();
    
    console.log(`✅ 번역 성공: "${translatedText.substring(0, 50)}..." (사용량: ${apiStatus.usage.current}/${apiStatus.usage.limit})`);

    return { success: true, translatedText };
  } catch (error: any) {
    console.log('❌ 번역 네트워크 오류:', error);
    return { 
      success: false, 
      error: '네트워크 연결을 확인해주세요.', 
      errorType: 'networkError' 
    };
  }
}

async function saveConfiguration() {
  try {
    await chrome.storage.local.set({
      'apiConfig': {
        apiKey: apiStatus.apiKey,
        isConfigured: apiStatus.isConfigured,
        isValid: apiStatus.isValid
      },
      'apiUsage': apiStatus.usage,
      'lastSaved': Date.now()
    });
    console.log('💾 설정 저장 완료');
  } catch (error) {
    console.error('❌ 설정 저장 실패:', error);
  }
}

async function loadConfiguration() {
  try {
    const result = await chrome.storage.local.get(['apiConfig', 'apiUsage']);
    
    if (result.apiConfig) {
      apiStatus.apiKey = result.apiConfig.apiKey || '';
      apiStatus.isConfigured = result.apiConfig.isConfigured || false;
      apiStatus.isValid = result.apiConfig.isValid || false;
      
      console.log('📋 API 설정 복원:', {
        apiKey: apiStatus.apiKey ? '설정됨' : '미설정',
        isConfigured: apiStatus.isConfigured,
        isValid: apiStatus.isValid
      });
    }
    
    if (result.apiUsage) {
      apiStatus.usage = { ...apiStatus.usage, ...result.apiUsage };
      console.log('📊 사용량 복원:', apiStatus.usage);
    }
    
    // 월간 리셋 확인
    checkMonthlyReset();
    
  } catch (error) {
    console.error('❌ 설정 로드 실패:', error);
  }
}

// 메시지 핸들러
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 메시지 수신:', request.action);

  handleMessage(request, sendResponse);
  return true; // 비동기 응답 유지
});

async function handleMessage(request: any, sendResponse: (response: any) => void) {
  try {
    switch (request.action) {
      case 'translate':
        const result = await translateText(request.text);
        if (result.success) {
          sendResponse({ 
            success: true, 
            translatedText: result.translatedText 
          });
        } else {
          sendResponse({ 
            success: false, 
            error: result.error,
            errorType: result.errorType 
          });
        }
        break;

      case 'setApiKey':
        const validationResult = await validateApiKey(request.apiKey);
        if (validationResult.isValid) {
          apiStatus.apiKey = request.apiKey;
          apiStatus.isConfigured = true;
          apiStatus.isValid = true;
          await saveConfiguration();
          sendResponse({ 
            success: true, 
            message: 'API 키가 성공적으로 설정되었습니다.',
            status: getStatusForResponse()
          });
        } else {
          sendResponse({ 
            success: false, 
            error: validationResult.error || '유효하지 않은 API 키입니다.'
          });
        }
        break;

      case 'getStatus':
        sendResponse({ 
          success: true, 
          status: getStatusForResponse()
        });
        break;

      default:
        sendResponse({ success: false, error: '알 수 없는 액션입니다.' });
    }
  } catch (error: any) {
    console.error('❌ 메시지 처리 오류:', error);
    sendResponse({ 
      success: false, 
      error: error.message || '알 수 없는 오류가 발생했습니다.' 
    });
  }
}

function getStatusForResponse() {
  return {
    apiKey: apiStatus.apiKey ? '••••••••••••••••••••' : '',
    isConfigured: apiStatus.isConfigured,
    isValid: apiStatus.isValid,
    usage: { ...apiStatus.usage }
  };
}

// 확장 프로그램 시작 시 설정 로드
chrome.runtime.onStartup.addListener(loadConfiguration);
chrome.runtime.onInstalled.addListener(loadConfiguration);

// 즉시 설정 로드
loadConfiguration();

console.log('✅ Background Script 준비 완료');
