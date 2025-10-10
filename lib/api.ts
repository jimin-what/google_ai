import { mockDailyReport, mockSolutions, mockWeeklyReport } from "./mock";

const API_BASE = "https://your-backend-server.com/api";

/**
 * 백엔드 API 래퍼
 * - 실제 서버 연결 시 fetch 사용
 * - 실패하면 mock 데이터 반환 (개발용 fallback)
 */
export const API = {
  async getSolutions(userId: string) {
    try {
      const res = await fetch(`${API_BASE}/solutions?userId=${userId}`);
      if (!res.ok) throw new Error("API error");
      return await res.json();
    } catch (e) {
      console.warn("백엔드 연결 실패, mock 데이터 사용");
      return mockSolutions;
    }
  },
  
  // --- 🔽 리포트 API 함수 추가 🔽 ---
  async getDailyReport(date: string) {
    try {
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
      const res = await fetch(`${API_BASE}/reports/weekly?date=${date}`);
      if (!res.ok) throw new Error("API error");
      return await res.json();
    } catch (e) {
      console.warn("백엔드 연결 실패, mock 데이터 사용");
      return mockWeeklyReport;
    }
  },
  // --- 🔼 리포트 API 함수 추가 🔼 ---
};