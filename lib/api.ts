// lib/api.ts
import { mockDailyReport, mockSolutions, mockWeeklyReport } from "./mock";

// 백엔드 API 주소를 실제 주소로 변경해야 합니다.
// 예시: http://localhost:8000 또는 실제 배포된 서버 주소
const API_BASE = "http://localhost:8000"; // 실제 백엔드 주소로 변경

/**
 * 백엔드 API 래퍼
 * - 실제 서버 연결 시 fetch 사용
 * - 실패하면 mock 데이터 반환 (개발용 fallback)
 */
export const API = {
  // --- 👇 구글 로그인 API 함수 추가 👇 ---
  async loginWithGoogle(credential: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, { // 백엔드 엔드포인트 확인
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
      // 성공 시 { access_token, refresh_token, token_type } 반환 가정
      return await res.json();
    } catch (e) {
      console.error("백엔드 연결 실패(Google Login):", e);
      // 실제 앱에서는 에러 처리 로직 필요 (예: 사용자에게 알림)
      throw e; // 에러를 다시 던져서 호출 부분에서 처리하도록 함
    }
  },
  // --- 🔼 구글 로그인 API 함수 추가 🔼 ---

  async getSolutions(userId: string) {
    try {
      // 헤더에 Access Token 추가 필요 시 아래와 같이 수정
      // const token = await getToken(); // 토큰 가져오는 로직 (예: AsyncStorage)
      const res = await fetch(`${API_BASE}/solutions?userId=${userId}`/*, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }*/);
      if (!res.ok) throw new Error("API error");
      return await res.json();
    } catch (e) {
      console.warn("백엔드 연결 실패, mock 데이터 사용");
      return mockSolutions;
    }
  },

  async getDailyReport(date: string) {
     try {
       // 헤더에 Access Token 추가 필요 시 위 getSolutions 참고
       const res = await fetch(`${API_BASE}/reports/daily?date=${date}`);
       if (!res.ok) throw new Error("API error");
       return await res.json();
     } catch (e) {
       console.warn("백엔드 연결 실패, mock 데이터 사용");
       return mockDailyReport;
     }
   },

  async getWeeklyReport(date: string) {
     try {
       // 헤더에 Access Token 추가 필요 시 위 getSolutions 참고
       const res = await fetch(`${API_BASE}/reports/weekly?date=${date}`);
       if (!res.ok) throw new Error("API error");
       return await res.json();
     } catch (e) {
       console.warn("백엔드 연결 실패, mock 데이터 사용");
       return mockWeeklyReport;
     }
   },
};

// // 토큰 저장 및 로드 함수 (예시 - 실제 구현 필요)
// const saveTokens = async (accessToken, refreshToken) => {
//   // 예: AsyncStorage 사용
//   // await AsyncStorage.setItem('accessToken', accessToken);
//   // await AsyncStorage.setItem('refreshToken', refreshToken);
// };

// const getToken = async () => {
//   // 예: AsyncStorage 사용
//   // return await AsyncStorage.getItem('accessToken');
// };

// const clearTokens = async () => {
//  // await AsyncStorage.removeItem('accessToken');
//  // await AsyncStorage.removeItem('refreshToken');
// }