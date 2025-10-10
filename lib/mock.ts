/**
 * 개발용 mock 데이터
 * - 실제 백엔드 연결 전, 프론트엔드에서 UI 테스트할 때 사용
 */
export const mockSolutions = [
  {
    title: "4-6 호흡법",
    way: "4초 동안 숨을 마시고, 6초 동안 내쉽니다.",
    effect: "심장 박동이 안정되고 즉각적인 진정 효과",
    level: 1,
    time: "2분",
    progress: 0,
  },
  {
    title: "10분 산책",
    way: "실외에서 10분간 가볍게 걷습니다.",
    effect: "기분 전환과 스트레스 완화",
    level: 1,
    time: "10분",
    progress: 0,
  },
  {
    title: "음악 감상",
    way: "차분한 음악 3곡 감상",
    effect: "긍정적인 감정 회복",
    level: 1,
    time: "15분",
    progress: 0,
  },
];

export const mockDailyReport = {
  title: "10월 10일 상담 요약",
  summary_text: "전반적으로 불안감이 높게 나타났지만, 저녁에는 안정되는 모습을 보였습니다. 특히 출퇴근 스트레스가 주된 원인으로 파악됩니다.",
  key_points: ["출근길 스트레스", "업무 압박", "저녁의 안정"],
  mood_snapshot: {
    top: "anxious",
    dist: { "행복": 20, "분노": 50, "불안": 30 }
  },
  routine_stats: { recommended: 3, accepted: 2, completion_rate: 0.5 },
  usage_stats: { messages: 24, duration_min: 32, inputs: 5 },
};

export const mockWeeklyReport = {
  summary_text: "이번 주는 사용자의 감정이 전반적으로 안정적이었으며, 금요일에 스트레스 반응이 관찰되었습니다. 주 초반에는 부정적인 감정이 강했지만 주말에는 매우 긍정적인 한 주였어요! 지난주와 비교하여 전체적으로 긍정적인 한 주였어요!",
  highlights: [
    { title: "감정 관리 팁", desc: "아침 시간에 부정적인 감정이 발생하는 경향이 높아요. 기상 후에 좋아하는 음악을 한 곡 듣거나 가볍게 스트레칭을 해보는 것은 어떨까요? 작은 행동으로도 하루를 훨씬 긍정적으로 시작할 수 있어요!" },
    { title: "긍정적 하이라이트", desc: "화요일에 맛있는 저녁 식사를 해서 엄청 행복하셨네요! 토요일에 본 영화가 엄청 재미있었나 봐요. 일주일 중 가장 긍정적인 날이에요!" },
  ],
  mood_overview: {
    top: "calm",
    dist: { "월": 85, "화": 50, "수": 32, "목": 75, "금": 50, "토": 12, "일": 80 },
    trend: "up"
  },
  routine_overview: {
    recommended: 10,
    accepted: 7,
    completion_rate: 0.6,
    top_routines: ["4-6 호흡법", "5감각 그라운딩"]
  },
  usage_overview: { sessions: 5, total_minutes: 140, inputs: 18 },
};