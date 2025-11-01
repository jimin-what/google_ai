// lib/api.ts
import * as SecureStore from 'expo-secure-store';
import { mockDailyReport, mockSolutions, mockWeeklyReport } from "./mock";

// 백엔드 API 주소를 실제 주소로 변경해야 합니다.
// auth 경로는 /api 접두사가 없으므로 분리합니다.
const API_BASE_AUTH = "http://localhost:8000"; // (예: http://your-backend-ip:8000)
const API_BASE = "http://localhost:8000/api"; // (예: http://your-backend-ip:8000/api)

// --- 토큰 저장/로드 (SecureStore 사용) ---
const TOKEN_KEYS = {
  ACCESS: '@user_access_token',
  REFRESH: '@user_refresh_token',
};

const saveTokens = async (accessToken: string, refreshToken: string) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, accessToken);
    await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH, refreshToken);
    console.log("Tokens saved successfully.");
  } catch (e) {
    console.error("Failed to save tokens", e);
  }
};

const getToken = async (tokenType: 'access' | 'refresh' = 'access') => {
  try {
    const tokenKey = tokenType === 'refresh' ? TOKEN_KEYS.REFRESH : TOKEN_KEYS.ACCESS;
    return await SecureStore.getItemAsync(tokenKey);
  } catch (e) {
    console.error("Failed to fetch token", e);
    return null;
  }
};

const clearTokens = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS);
    await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH);
    console.log("Tokens cleared successfully.");
  } catch (e) {
    console.error("Failed to clear tokens", e);
  }
};
// ------------------------------------


// API 호출 래퍼
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = await getToken('access');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body) {
     headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  
  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`API Error (${res.status}) on ${url}:`, errorBody);
    throw new Error(`API error: ${res.status} - ${errorBody}`);
  }
  
  // No Content 응답 처리
  if (res.status === 204) {
    return null;
  }

  return await res.json();
};


export const API = {
  // --- 토큰 관리 함수 노출 ---
  saveTokens,
  getToken,
  clearTokens,
  
  // --- 인증 API ---
  async loginWithGoogle(credential: string) {
    // 로그인 API는 인증 토큰이 필요 없음
    try {
      const res = await fetch(`${API_BASE_AUTH}/auth/google`, { // '/api' 접두사 없음
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential }),
      });
      if (!res.ok) {
        const errorBody = await res.text();
        console.error("Google Login API Error:", res.status, errorBody);
        throw new Error(`API error: ${res.status}`);
      }
      return await res.json(); // { access_token, refresh_token, token_type }
    } catch (e) {
      console.error("백엔드 연결 실패(Google Login):", e);
      throw e;
    }
  },

  async getMe(token: string) {
    // 자동 로그인 시 토큰 유효성 검사용
    try {
      const res = await fetch(`${API_BASE_AUTH}/me`, { // '/api' 접두사 없음
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
       if (!res.ok) throw new Error("API error: Invalid token");
       return await res.json(); // UserClaims 반환
    } catch (e) {
       console.error("백엔드 연결 실패(getMe):", e);
       throw e;
    }
  },

  // --- RAG 분석 흐름 API ---
  async runFullRAGAnalysis(text: string) {
    try {
      // 1. Retrieve
      const retrievePayload = { input_text: text, top_k: 5 };
      const retrieveResult = await fetchWithAuth(`${API_BASE}/retrieve`, {
        method: 'POST',
        body: JSON.stringify(retrievePayload),
      });

      // 2. Aggregate
      const aggregatePayload = { docs: retrieveResult.docs };
      const aggregateResult = await fetchWithAuth(`${API_BASE}/aggregate`, {
        method: 'POST',
        body: JSON.stringify(aggregatePayload),
      });

      // 3. Compose (user_profile은 일단 비워둠 - BE에서 처리)
      const composePayload = { 
        routine_draft: aggregateResult.routine_draft,
        user_profile: {} // 필요시 /me API 호출 결과 전달
      };
      const composeResult = await fetchWithAuth(`${API_BASE}/compose`, {
        method: 'POST',
        body: JSON.stringify(composePayload),
      });

      // 최종적으로 { message, card } 반환
      return composeResult;

    } catch (e) {
      console.warn("백엔드 RAG 흐름 연결 실패, mock 데이터 사용");
      // Fallback to mock data structure
      const mockSolution = mockSolutions[0];
      return {
        message: '마음 분석이 끝났어요. 간단한 솔루션을 알려드릴게요!',
        card: {
          title: mockSolution.title,
          steps: [mockSolution.way], // Mock 데이터 구조에 맞게 조정
          why: mockSolution.effect,
          duration_min: parseInt(mockSolution.time, 10) || 2,
        },
      };
    }
  },


  // --- 리포트 API (백엔드 스펙에 맞춤) ---
  async getDailyReport() {
     try {
       // 1. 리포트 목록 조회
       const reportList = await fetchWithAuth(`${API_BASE}/reports/sessionReports`);
       if (!reportList || reportList.length === 0) {
         console.warn("표시할 세션 리포트가 없습니다.");
         // mockDailyReport의 구조를 백엔드 스키마에 맞게 변형하여 반환
         return {
           ...mockDailyReport,
           report_id: "mock-daily-id",
           created_at: new Date().toISOString(),
           summary: { text: mockDailyReport.summary_text },
           mood_overview: mockDailyReport.mood_snapshot, // 'dist' 포함
           routine_overview: mockDailyReport.routine_stats,
           usage_overview: mockDailyReport.usage_stats,
         };
       }
       
       // 2. 가장 최신 리포트 ID로 상세 조회
       const latestReportId = reportList[0].report_id;
       const reportDetail = await fetchWithAuth(`${API_BASE}/reports/sessionReports/${latestReportId}`);
       return reportDetail;

     } catch (e) {
       console.warn("백엔드 연결 실패(Daily Report), mock 데이터 사용");
       return {
         ...mockDailyReport,
         report_id: "mock-daily-id",
         created_at: new Date().toISOString(),
         summary: { text: mockDailyReport.summary_text },
         mood_overview: mockDailyReport.mood_snapshot, // 'dist' 포함
         routine_overview: mockDailyReport.routine_stats,
         usage_overview: mockDailyReport.usage_stats,
       };
     }
   },

  async getWeeklyReport() {
     try {
       // 1. 주간 리포트 목록 조회
       const reportList = await fetchWithAuth(`${API_BASE}/reports/weeklyReports`);
       if (!reportList || reportList.length === 0) {
         console.warn("표시할 주간 리포트가 없습니다.");
          // mockWeeklyReport의 구조를 백엔드 스키마에 맞게 변형하여 반환
         return {
           ...mockWeeklyReport,
           weekly_id: "mock-weekly-id",
           week_start_date: new Date().toISOString().split('T')[0],
           created_at: new Date().toISOString(),
           mood_overview: mockWeeklyReport.mood_overview, // 'dist' 포함
           routine_overview: mockWeeklyReport.routine_overview, // 'top_routines' 포함
           usage_overview: mockWeeklyReport.usage_overview,
           highlights: mockWeeklyReport.highlights,
         };
       }
       
       // 2. 가장 최신 리포트 ID로 상세 조회
       const latestReportId = reportList[0].weekly_id;
       const reportDetail = await fetchWithAuth(`${API_BASE}/reports/weeklyReports/${latestReportId}`);
       return reportDetail;

     } catch (e) {
       console.warn("백엔드 연결 실패(Weekly Report), mock 데이터 사용");
       return {
         ...mockWeeklyReport,
         weekly_id: "mock-weekly-id",
         week_start_date: new Date().toISOString().split('T')[0],
         created_at: new Date().toISOString(),
         mood_overview: mockWeeklyReport.mood_overview, // 'dist' 포함
         routine_overview: mockWeeklyReport.routine_overview, // 'top_routines' 포함
         usage_overview: mockWeeklyReport.usage_overview,
         highlights: mockWeeklyReport.highlights,
       };
     }
   },
};