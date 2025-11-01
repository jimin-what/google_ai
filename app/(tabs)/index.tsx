// app/(tabs)/index.tsx

import { API } from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Camera, CameraView } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// --- Google Sign In ---
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
// --- Secure Store ---
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

// --- 타입 정의 (백엔드 스키마 기준) ---
type ChatMessage = {
  role: 'user' | 'ai';
  content: any;
  type?: string;
};

// app/schemas/reports.py 기반 SessionReportDetail
type DailyReport = {
  report_id: string; // UUID
  summary: { [key: string]: any }; // 예: { text: "요약..." }
  highlights: { [key: string]: any };
  mood_overview: { 
    dist: { [key: string]: number }; // DonutChart용 데이터
    [key: string]: any; 
  };
  routine_overview: { 
    recommended: number;
    accepted: number;
    completion_rate: number;
    [key: string]: any;
  };
  usage_overview: { [key: string]: any };
  created_at: string; // datetime
};

// app/schemas/reports.py 기반 WeeklyReportDetail
type WeeklyReport = {
  weekly_id: string; // UUID
  week_start_date: string; // date
  mood_overview: { 
    dist: { [key: string]: number }; // BarChart용 데이터
    trend: string;
    [key: string]: any;
  };
  routine_overview: { 
    top_routines: string[];
    [key: string]: any;
  };
  usage_overview: { [key: string]: any };
  highlights: { title: string; desc: string }[];
  created_at: string; // datetime
};

// app/schemas/user.py 기반 UserClaims
type User = {
    id: string; // sub
    email: string | null;
    name?: string | null;
    picture?: string | null; // 백엔드 스키마와 일치 (picture_url -> picture)
};

// app/schemas/compose.py 기반 RoutineDraft (card)
type RoutineDraft = {
    title: string;
    duration_min: number;
    steps: string[];
    why: string | null;
};


// =================================================================
// 컴포넌트들
// =================================================================

const LoginScreen = ({ onLoginSuccess, setIsLoading }: { onLoginSuccess: (user: User, accessToken: string, refreshToken: string) => void; setIsLoading: (loading: boolean) => void; }) => {
  // --- Google Sign In ---
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // 👇 ******** 중요 ******** 👇
    // 👇 실제 Google Cloud Console에서 발급받은 웹 클라이언트 ID로 변경하세요! 👇
    clientId: '<생성한 구글 클라이언트 id 입력 !!>', //
    // 👆 ******** 중요 ******** 👆
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    } else if (response?.type === 'error') {
      console.error('Google Sign-In Error:', response.error);
      Alert.alert('로그인 실패', '구글 로그인 중 오류가 발생했습니다.');
      setIsLoading(false);
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
       setIsLoading(false);
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string | null) => {
     if (!idToken) {
       Alert.alert('로그인 실패', '구글 ID 토큰을 얻지 못했습니다.');
       setIsLoading(false);
       return;
     }
    setIsLoading(true);
    try {
      // 백엔드 API 호출
      const tokenData = await API.loginWithGoogle(idToken); // { access_token, refresh_token, ... }

      // Access Token 디코딩해서 사용자 정보 즉시 추출
      const decodedToken = decodeJwt(tokenData.access_token);
      const user: User = {
        id: decodedToken.sub, // sub 클레임 사용
        email: decodedToken.email || null,
        name: decodedToken.name || null,
        picture: decodedToken.picture || null,
      };

      // 토큰 저장 (onLoginSuccess에서 처리)
      onLoginSuccess(user, tokenData.access_token, tokenData.refresh_token);
    } catch (error) {
      console.error("Google Sign-In Error (Backend):", error);
      Alert.alert('로그인 실패', '서버 통신 중 오류가 발생했습니다. 서버가 실행 중인지 확인하세요.');
      setIsLoading(false);
    }
  };

  const handleLoginPress = () => {
    setIsLoading(true);
    promptAsync();
  }

  return (
    <SafeAreaView style={styles.centerScreen}>
      <Text style={{ fontSize: 80 }}>👋</Text>
      <Text style={styles.title}>AI 감정 케어</Text>
      <Text style={styles.subtitle}>로그인하고 마음 관리를 시작해보세요.</Text>
      <TouchableOpacity
        style={[styles.onboardingButton, { marginTop: 32, backgroundColor: '#4285F4' }]}
        onPress={handleLoginPress}
        disabled={!request}
      >
        <Text style={styles.primaryButtonText}>Google 계정으로 로그인</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// =================================================================
// RecordScreen, ChatScreen (수정됨)
// =================================================================
const RecordScreen = ({ textInput, setTextInput, photoURI, soundURI, handleAnalyze, handleTakePhoto, handleRecordVoice, isRecording }) => {
    // ... (내용 동일)
    const [showCamera, setShowCamera] = useState(false);
    const cameraRef = useRef(null);

    const onSnap = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync();
            handleTakePhoto(photo.uri);
            setShowCamera(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.fixedScreen}>
                <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
                    <View style={{ flex: 1 }}>
                        <CameraView style={StyleSheet.absoluteFillObject} ref={cameraRef} facing="front" />
                        <View style={styles.cameraButtonContainer}>
                            <TouchableOpacity style={styles.snapButton} onPress={onSnap}><Text style={styles.snapButtonText}>사진 찍기</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCamera(false)}><Text style={styles.closeButtonText}>X</Text></TouchableOpacity>
                        </View>
                    </View>
                </Modal>
                <View>
                    <Text style={styles.screenTitle}>감정 기록하기</Text>
                    <View style={styles.card}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.cardTitle}>지금의 기분을 글로 기록하기</Text>
                            <View style={styles.row}>
                                <Text style={styles.charCount}>{textInput.length} / 500</Text>
                                {textInput ? (<TouchableOpacity style={{ marginLeft: 8 }} onPress={() => setTextInput('')}><Text style={styles.link}>다시 작성</Text></TouchableOpacity>) : null}
                            </View>
                        </View>
                        <TextInput value={textInput} onChangeText={setTextInput} placeholder="여기에 오늘의 감정을 적어보세요..." style={styles.textArea} multiline maxLength={500} />
                    </View>
                    <View style={styles.rowBetween}>
                        <TouchableOpacity activeOpacity={0.8} style={styles.squareButton} onPress={() => photoURI ? handleTakePhoto(null) : setShowCamera(true)}>
                            <Feather name={photoURI ? 'check-circle' : 'camera'} size={32} color={photoURI ? COLORS.green : COLORS.primary} />
                            <Text style={styles.squareButtonLabel}>{photoURI ? '촬영 완료!' : '사진으로 기록'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={styles.squareButton} onPress={handleRecordVoice}>
                            <Feather name={soundURI ? 'check-circle' : (isRecording ? 'stop-circle' : 'mic')} size={32} color={soundURI ? COLORS.green : COLORS.primary} />
                            <Text style={styles.squareButtonLabel}>{soundURI ? '녹음 완료!' : (isRecording ? '녹음 중지' : '음성으로 기록')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {/* 텍스트만 있어도 분석 가능하도록 수정 */}
                <TouchableOpacity style={[styles.primaryButton, (!textInput && !photoURI && !soundURI) && styles.disabledButton]} disabled={!textInput && !photoURI && !soundURI} onPress={handleAnalyze}>
                    <Text style={styles.primaryButtonText}>분석하기</Text>
                </TouchableOpacity>
            </View>
        </TouchableWithoutFeedback>
    );
};
const ChatScreen = ({ analysisResult, chatHistory, chatInput, setChatInput, handleSendMessage, handleCreateReport }) => {
    const scrollViewRef = useRef(null);

    const handleCompleteSolution = (solutionTitle: string) => {
        console.log(`솔루션 완료: ${solutionTitle}. 이 정보를 백엔드로 전송해야 합니다.`);
        // TODO: 백엔드에 루틴 완료 API 호출
        Alert.alert('솔루션 완료!', `${solutionTitle}을(를) 완료했습니다. 다음 리포트에 반영됩니다.`);
    };

    if (!analysisResult && chatHistory.length === 0) { // chatHistory도 확인
        return (
            <View style={styles.centerScreen}>
                <Text style={{ fontSize: 80 }}>💬</Text>
                <Text style={styles.title}>AI와 대화하기</Text>
                <Text style={styles.subtitle}>'감정 기록' 탭에서 먼저 오늘의 마음을 알려주세요!</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={100}>
            <Text style={styles.screenTitle}>AI와의 대화</Text>
            <ScrollView style={styles.chatScrollView} ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}>
                {chatHistory.map((message, index) => {
                    // 백엔드 스키마 (RoutineDraft)에 맞게 'carePlan' 렌더링 수정
                    if (message.type === 'carePlan') {
                        const card = message.content as RoutineDraft; // 타입 단언
                        return (
                            <View key={index} style={styles.card}>
                                <Text style={styles.cardTitle}>{card.title}</Text>
                                <Text style={styles.cardSubtitle}>진행 방법</Text>
                                {card.steps.map((step, i) => (
                                   <Text key={i} style={styles.bodyText}>- {step}</Text>
                                ))}
                                <Text style={styles.cardSubtitle}>효과</Text>
                                <Text style={styles.bodyText}>{card.why}</Text>
                                <TouchableOpacity
                                    style={[styles.primaryButton, { backgroundColor: COLORS.green, marginTop: 16 }]}
                                    onPress={() => handleCompleteSolution(card.title)}
                                >
                                    <Text style={styles.primaryButtonText}>시작 (약 {card.duration_min}분)</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }
                    // 일반 텍스트 메시지
                    return (
                        <View key={index} style={[styles.chatBubble, message.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                            <Text style={[styles.chatText, message.role === 'user' && styles.userChatText]}>{message.content}</Text>
                        </View>
                    );
                })}
            </ScrollView>
            <View style={styles.reportButtonContainer}>
                {/* TODO: 일간 리포트 생성 API가 백엔드에 정의되지 않음. 임시로 handleCreateReport 호출 유지 */}
                <TouchableOpacity style={styles.reportButton} onPress={handleCreateReport}>
                    <Text style={styles.primaryButtonText}>일간 리포트 만들기 ✍️</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.chatInputContainer}>
                <TextInput style={styles.chatInput} placeholder="메시지를 입력하세요..." value={chatInput} onChangeText={setChatInput} />
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                    <Feather name="arrow-up" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};
// =================================================================
// Report 관련 컴포넌트 (백엔드 스키마에 맞게 수정됨)
// =================================================================
const ReportCard = ({ title, children }) => (
    <View style={styles.reportCard}>
        <Text style={styles.reportCardTitle}>{title}</Text>
        {children}
    </View>
);
const EMOTION_COLORS = { '행복': '#60A5FA', '분노': '#F87171', '불안': '#FBBF24', '슬픔': '#9CA3AF', '평온': '#86EFAC', '기본': '#E5E7EB' };
// DonutChart: 백엔드 스키마 (mood_overview.dist)를 받도록 수정
const DonutChart = ({ data }: { data: { [key: string]: number } | undefined }) => {
    // ... (내용 동일)
    const size = 120;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    let accumulatedPercentage = 0;

    // data가 undefined일 경우 빈 차트
    const chartData = Object.entries(data || {}).map(([key, value]) => ({
        label: key,
        percentage: value,
        color: EMOTION_COLORS[key] || EMOTION_COLORS['기본']
    }));

    return (
        <View style={styles.chartContainer}>
            <View style={{ width: size, height: size, position: 'relative' }}>
                {/* ... (내부 로직 동일) ... */}
                 {chartData.map((item, index) => {
                    const rotation = accumulatedPercentage * 3.6;
                    accumulatedPercentage += item.percentage;
                    const validRotation = isNaN(rotation) ? 0 : rotation;
                    return (
                        <View key={index} style={{ width: size, height: size, position: 'absolute', transform: [{ rotate: `${validRotation}deg` }] }}>
                             <View style={{ width: size, height: size, borderRadius: radius + strokeWidth, borderWidth: strokeWidth, borderStyle: 'dashed', borderColor: item.color, borderLeftColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: 'transparent', transform: [{rotate: '45deg'}] }}/>
                        </View>
                    );
                })}
                 <View style={styles.donutCenter} />
            </View>
            <View style={styles.legendContainer}>
                {chartData.map(item => (
                    <View key={item.label} style={styles.legendItem}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                        <Text style={styles.legendText}>{item.label}</Text>
                        <Text style={styles.legendPercentage}>{item.percentage}%</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};
// BarChart: 백엔드 스키마 (mood_overview.dist)를 받도록 수정
const BarChart = ({ data }: { data: { [key: string]: number } | undefined }) => {
    // ... (내용 동일)
     const chartData = Object.entries(data || {}).map(([key, value]) => ({
      day: key,
      negative: value,
      positive: 100 - value
    }));
    const validChartData = chartData.map(item => ({
        ...item,
        negative: Math.max(0, Math.min(100, item.negative || 0)),
        positive: Math.max(0, Math.min(100, item.positive || 0)),
    }));

    return (
        <View style={styles.barChartContainer}>
            {validChartData.map((item, index) => (
                <View key={index} style={styles.barWrapper}>
                    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                        <View style={{ height: `${item.negative}%`, backgroundColor: COLORS.red, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                        <View style={{ height: `${item.positive}%`, backgroundColor: COLORS.blue, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
                    </View>
                    <Text style={styles.barLabel}>{item.day}</Text>
                </View>
            ))}
        </View>
    );
};
// DailyReportView: 백엔드 스키마 (SessionReportDetail)에 맞게 props 수정
const DailyReportView = ({ report, onBack }: { report: DailyReport; onBack: () => void }) => (
    <ScrollView style={styles.scroll}>
        <View style={styles.reportHeader}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}><Feather name="chevron-left" size={24} color={COLORS.text} /></TouchableOpacity>
            <Text style={styles.screenTitle}>일간 리포트</Text>
            <View style={{width: 40}} />
        </View>
        {/*
          NOTE: 백엔드 스키마의 'mood_overview'가 DonutChart용 'dist' 객체를 포함한다고 가정합니다.
          예: report.mood_overview = { dist: { "행복": 20, "불안": 80 } }
        */}
        <ReportCard title="감정 분포">
            <DonutChart data={report.mood_overview?.dist} />
        </ReportCard>
        {/* NOTE: 백엔드 스키마의 'summary'가 { text: "요약..." } 형태라고 가정합니다.
        */}
        <ReportCard title="종합 요약">
             <Text style={styles.bodyText}>{report.summary?.text || '요약 정보가 없습니다.'}</Text>
        </ReportCard>
        {/*
          NOTE: 백엔드 스키마의 'routine_overview'가 통계 정보를 포함한다고 가정합니다.
        */}
        <ReportCard title="솔루션 통계">
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{report.routine_overview?.recommended ?? 0}</Text>
                    <Text style={styles.statLabel}>추천</Text>
                </View>
                 <View style={styles.statBox}>
                    <Text style={styles.statValue}>{report.routine_overview?.accepted ?? 0}</Text>
                    <Text style={styles.statLabel}>수락</Text>
                </View>
                 <View style={styles.statBox}>
                    <Text style={styles.statValue}>{Math.round((report.routine_overview?.completion_rate ?? 0) * 100)}%</Text>
                    <Text style={styles.statLabel}>완료율</Text>
                </View>
            </View>
        </ReportCard>
    </ScrollView>
);
// WeeklyReportView: 백엔드 스키마 (WeeklyReportDetail)에 맞게 props 수정
const WeeklyReportView = ({ report, onBack }: { report: WeeklyReport; onBack: () => void }) => (
    <ScrollView style={styles.scroll}>
       <View style={styles.reportHeader}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}><Feather name="chevron-left" size={24} color={COLORS.text} /></TouchableOpacity>
            <Text style={styles.screenTitle}>주간 리포트</Text>
            <View style={{width: 40}} />
        </View>
        {/*
          NOTE: 백엔드 스키마 'mood_overview'가 BarChart용 'dist' 객체를 포함한다고 가정합니다.
          예: report.mood_overview = { dist: { "월": 80, "화": 20 ... } }
        */}
        <ReportCard title="감정 트렌드 (부정 감정 비율)">
             <BarChart data={report.mood_overview?.dist} />
        </ReportCard>
        
        {/* NOTE: 백엔드 스키마 'highlights' 배열을 사용합니다. */}
        {report.highlights?.map((highlight, index) => (
            <ReportCard key={index} title={highlight.title}>
                <Text style={styles.bodyText}>{highlight.desc}</Text>
            </ReportCard>
        ))}
        {/* NOTE: 백엔드 스키마 'routine_overview.top_routines' 배열을 사용합니다. */}
        <ReportCard title="가장 유용했던 솔루션">
             {(report.routine_overview?.top_routines ?? []).map((sol_title, i) => (
                <View key={i} style={[styles.solutionCard, {marginBottom: i === (report.routine_overview.top_routines.length - 1) ? 0 : 8}]}>
                    <Text style={styles.cardTitle}>{sol_title}</Text>
                </View>
            ))}
        </ReportCard>
    </ScrollView>
);
// =================================================================
// ArchiveScreen, ProfileScreen, LoadingScreen (내용 동일)
// =================================================================
const ArchiveScreen = ({ viewingReport, dailyReport, weeklyReport, handleViewReport, setViewingReport, isLoading }) => {
    if (isLoading && viewingReport !== 'list') return <LoadingScreen message="리포트를 불러오는 중입니다..." />;

    if (viewingReport === 'daily' && dailyReport) {
        return <DailyReportView report={dailyReport} onBack={() => setViewingReport('list')} />;
    }
    if (viewingReport === 'weekly' && weeklyReport) {
        return <WeeklyReportView report={weeklyReport} onBack={() => setViewingReport('list')} />;
    }

    return (
        <ScrollView style={styles.scroll}>
            <Text style={styles.screenTitle}>기록함</Text>
            <Text style={styles.subtitle}>생성된 리포트를 확인하세요.</Text>
            <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={() => handleViewReport('daily')}>
                <Text style={styles.cardTitle}>📅 일간 리포트</Text>
                <Text style={styles.bodyText}>AI와의 대화를 기반으로 생성된 일일 분석 리포트입니다.</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={() => handleViewReport('weekly')}>
                <Text style={styles.cardTitle}>📈 주간 리포트</Text>
                <Text style={styles.bodyText}>일주일간의 감정 변화 추이를 시각적으로 보여주는 리포트입니다.</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};
const ProfileScreen = ({ user, onLogout }: { user: User | null; onLogout: () => void }) => (
    <View style={styles.fixedScreen}>
        <View>
            <Text style={styles.screenTitle}>내 정보</Text>
            <View style={styles.card}>
                {user?.name && (
                    <>
                        <Text style={styles.cardSubtitle}>이름</Text>
                        <Text style={[styles.bodyText, { marginBottom: 10 }]}>{user.name}</Text>
                    </>
                )}
                <Text style={styles.cardSubtitle}>이메일</Text>
                <Text style={styles.bodyText}>{user?.email || '로그인 정보 없음'}</Text>
            </View>
        </View>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: COLORS.subtleText }]} onPress={onLogout}>
            <Text style={styles.primaryButtonText}>로그아웃</Text>
        </TouchableOpacity>
    </View>
);
const LoadingScreen = ({ message = '잠시만 기다려주세요...' }) => (
    <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.subtitle, {marginTop: 20}]}>{message}</Text>
    </View>
);


// =================================================================
// 메인 컴포넌트 (로직 수정됨)
// =================================================================
export default function IndexScreen() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null); // Access Token 상태
    const [activeTab, setActiveTab] = useState<'record' | 'chat' | 'archive' | 'profile'>('record');
    const [isLoading, setIsLoading] = useState(true); // 앱 시작 시 자동 로그인 확인을 위해 true로 변경

    // --- Record ---
    const [textInput, setTextInput] = useState('');
    const [photoURI, setPhotoURI] = useState<string | null>(null);
    const [soundURI, setSoundURI] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    
    // --- Chat ---
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null); // 세션 ID (향후 사용)
    const [analysisResult, setAnalysisResult] = useState<RoutineDraft | null>(null); // 백엔드 스키마(RoutineDraft)로 변경
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');

    // --- Archive ---
    const [viewingReport, setViewingReport] = useState<'list' | 'daily' | 'weekly'>('list');
    const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
    const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);


    // --- 자동 로그인 Effect ---
    useEffect(() => {
        Camera.requestCameraPermissionsAsync();
        
        const checkLogin = async () => {
          setIsLoading(true);
          const token = await API.getToken('access');
          if (token) {
            try {
              // API.ts에 getMe 함수 추가 필요
              const user = await API.getMe(token); // 토큰으로 /me API 호출
              setCurrentUser(user);
              setAccessToken(token); // AccessToken 상태에도 저장
            } catch (e) {
              console.log("저장된 토큰이 유효하지 않습니다. 토큰 삭제.", e);
              await API.clearTokens(); // Token이 유효하지 않으면 삭제
            }
          }
          setIsLoading(false);
        };
        
        checkLogin();
    }, []);


    // --- 함수 정의 (handleTakePhoto, start/stopRecording, handleRecordVoice 등) ---
     const handleTakePhoto = (uri: string | null) => setPhotoURI(uri);

     async function startRecording() {
         try {
             await Audio.requestPermissionsAsync();
             await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
             setIsRecording(true);
             console.log('Recording started');
             const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
             setRecording(recording);
         } catch (err) {
             console.error('Failed to start recording', err);
             Alert.alert('녹음 오류', '녹음을 시작할 수 없습니다. 마이크 권한을 확인해주세요.');
             setIsRecording(false);
         }
     }

     async function stopRecording() {
         if (!recording) return;
         console.log('Stopping recording..');
         setIsRecording(false);
         try {
             await recording.stopAndUnloadAsync();
             const uri = recording.getURI();
             console.log('Recording stored at', uri);
             setSoundURI(uri);
             setRecording(null);
         } catch(error) {
             console.error("Error stopping recording: ", error);
             Alert.alert('녹음 오류', '녹음을 중지하는 중 오류가 발생했습니다.');
         }
     }

     const handleRecordVoice = () => {
         if (soundURI) {
            setSoundURI(null);
         }
         else if (isRecording) {
            stopRecording();
         } else {
            startRecording();
         }
     };

     // [수정됨] '분석하기' 핸들러
     const handleAnalyze = async () => {
         // 텍스트 입력은 필수라고 가정 (RAG Retrieve에 필요)
         if (!textInput.trim()) {
            Alert.alert('입력 필요', '분석을 위해 현재 기분을 글로 기록해주세요.');
            return;
         }
         if (!accessToken) { // 토큰 확인
            Alert.alert('로그인 필요', '분석 기능을 사용하려면 먼저 로그인해주세요.');
            return;
         }
         
         setIsLoading(true);
         try {
             // TODO: 텍스트 외에 이미지/오디오 파일도 업로드하는 로직 추가
             
             // 백엔드의 RAG 파이프라인 호출
             const result = await API.runFullRAGAnalysis(textInput);
             
             // result는 { message: string, card: RoutineDraft } 형태
             setAnalysisResult(result.card); // 루틴 카드 정보 저장
             
             // 채팅 내역 구성
             setChatHistory([
                 { role: 'ai', content: result.message }, // AI가 생성한 첫 메시지
                 { role: 'ai', type: 'carePlan', content: result.card } // AI가 제안한 카드
             ]);
             
             // TODO: 백엔드에서 session_id를 반환한다면 설정
             // setCurrentSessionId(result.session_id);

             setActiveTab('chat');
         } catch (error) {
             console.error("분석 실패:", error);
             Alert.alert("오류", `데이터를 분석하는 중 문제가 발생했습니다: ${error.message}`);
         } finally {
             setIsLoading(false);
         }
     };

     const handleSendMessage = async () => {
         if (!chatInput.trim() || !accessToken) return;
         
         const userMessage: ChatMessage = { role: 'user', content: chatInput };
         setChatHistory(prev => [...prev, userMessage]);
         const currentInput = chatInput;
         setChatInput('');

         try {
             // TODO: 실제 백엔드 채팅 API 호출 로직 (현재 BE에 없음)
             // 예: const reply = await API.sendChatMessage(currentInput, currentSessionId, accessToken);
             
             // 임시 Mock 응답
             const mockReply: ChatMessage = { role: 'ai', content: '그랬군요. 더 자세히 이야기해주세요.'};
             await new Promise(resolve => setTimeout(resolve, 1000));
             
             setChatHistory(prev => [...prev, mockReply]);
         } catch (error) {
             console.error('채팅 메시지 전송/응답 오류:', error);
             const errorMessage: ChatMessage = { role: 'ai', content: '죄송해요, 지금은 답변을 드릴 수 없어요. 잠시 후 다시 시도해주세요.'};
             setChatHistory(prev => [...prev, errorMessage]);
         }
     };

     // [수정됨] 리포트 생성 핸들러
     const handleCreateReport = async () => {
         if (!accessToken) return;
         
         // TODO: 현재 백엔드에는 '리포트 생성' API가 없고 '조회' API만 있습니다. 
         // 여기서는 '조회'를 '생성'처럼 동작시킵니다.
         if (chatHistory.filter(m => m.role === 'user').length === 0) {
             Alert.alert('알림', '리포트를 생성하려면 대화 내용이 필요합니다.');
             return;
         }

         setIsLoading(true);
         try {
             const reportData = await API.getDailyReport(); // 수정됨 (파라미터 없음)
             setDailyReport(reportData as DailyReport); // 타입 캐스팅
             setViewingReport('daily');
             setActiveTab('archive');
         } catch (error) {
             console.error('일간 리포트 생성/조회 오류:', error);
             Alert.alert('오류', '일간 리포트를 가져오는 중 문제가 발생했습니다.');
         } finally {
             setIsLoading(false);
         }
     };

     // [수정됨] 리포트 조회 핸들러
     const handleViewReport = async (type: 'daily' | 'weekly') => {
         if (!accessToken) return;

         setIsLoading(true);
         setViewingReport(type);
         try {
            if (type === 'daily') {
                 const data = await API.getDailyReport(); // 수정됨 (파라미터 없음)
                 setDailyReport(data as DailyReport); // 타입 캐스팅
             } else {
                 const data = await API.getWeeklyReport(); // 수정됨 (파라미터 없음)
                 setWeeklyReport(data as WeeklyReport); // 타입 캐스팅
             }
         } catch (error) {
             console.error(`${type} 리포트 로딩 오류:`, error);
             Alert.alert('오류', '리포트를 불러오는 중 문제가 발생했습니다.');
             setViewingReport('list');
         } finally {
             setIsLoading(false);
         }
     }

     // --- 상태 초기화 및 로그아웃 ---
     const resetFlow = () => {
         setTextInput(''); setPhotoURI(null); setSoundURI(null);
         setIsRecording(false);
         if(recording) {
            try { recording.stopAndUnloadAsync(); } catch {}
         }
         setRecording(null);
         setAnalysisResult(null); setChatHistory([]); setChatInput('');
         setViewingReport('list');
         setCurrentSessionId(null);
         // setActiveTab('record'); // 탭은 유지
     };

    // [수정됨] 로그아웃
    const handleLogout = async () => {
        setIsLoading(true);
        await API.clearTokens(); // 저장된 토큰 삭제
        setCurrentUser(null);
        setAccessToken(null);
        resetFlow(); // 상태 초기화
        setActiveTab('record'); // 탭 초기화
        setIsLoading(false); // 로딩 종료 (로그인 화면으로 전환됨)
    };

    // [수정됨] 로그인 성공
    const handleLoginSuccess = async (user: User, accessToken: string, refreshToken: string) => {
        console.log("Login Success:", user);
        await API.saveTokens(accessToken, refreshToken); // 토큰 저장
        setCurrentUser(user);
        setAccessToken(accessToken);
        setIsLoading(false);
    };

    // --- 탭 렌더링 ---
    const renderTabContent = () => {
        // ... (내용 동일)
        switch (activeTab) {
            case 'record':
                return <RecordScreen textInput={textInput} setTextInput={setTextInput} photoURI={photoURI} soundURI={soundURI} handleAnalyze={handleAnalyze} handleTakePhoto={handleTakePhoto} handleRecordVoice={handleRecordVoice} isRecording={isRecording} />;
            case 'chat':
                return <ChatScreen analysisResult={analysisResult} chatHistory={chatHistory} chatInput={chatInput} setChatInput={setChatInput} handleSendMessage={handleSendMessage} handleCreateReport={handleCreateReport} />;
            case 'archive':
                return <ArchiveScreen isLoading={isLoading} viewingReport={viewingReport} dailyReport={dailyReport} weeklyReport={weeklyReport} handleViewReport={handleViewReport} setViewingReport={setViewingReport} />;
            case 'profile':
                return <ProfileScreen user={currentUser} onLogout={handleLogout} />;
            default:
                return null;
        }
    };

     const BottomTabBar = () => (
         // ... (내용 동일)
         <View style={styles.tabBar}>
             {[
                 { key: 'record', label: '감정 기록', icon: 'edit-3' },
                 { key: 'chat', label: '채팅', icon: 'message-circle' },
                 { key: 'archive', label: '기록함', icon: 'archive' },
                 { key: 'profile', label: '내 정보', icon: 'user' },
             ].map((tab) => (
                 <TouchableOpacity key={tab.key} style={styles.tabButton} onPress={() => {
                     if (tab.key === 'record') {
                         setViewingReport('list');
                     }
                     setActiveTab(tab.key as any);
                 }}>
                     <Feather name={tab.icon as any} size={24} color={activeTab === tab.key ? COLORS.primary : COLORS.subtleText} />
                     <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
                 </TouchableOpacity>
             ))}
         </View>
     );


    // --- 앱 로딩 중 (자동 로그인 확인) ---
    if (isLoading && !currentUser) {
       return <LoadingScreen message="로그인 정보를 확인 중입니다..." />;
    }

    // --- 비로그인 상태 ---
    if (!currentUser) {
        return <LoginScreen onLoginSuccess={handleLoginSuccess} setIsLoading={setIsLoading} />;
    }

    // --- 로그인 후 로딩 상태 (예: 리포트 로딩) ---
    if (isLoading) {
       return <LoadingScreen />; 
    }

    // --- 로그인 상태 ---
    return (
        <SafeAreaView style={styles.container}>
            {renderTabContent()}
            <BottomTabBar />
        </SafeAreaView>
    );
}

// =================================================================
// 스타일시트 (수정됨)
// =================================================================
const COLORS = {
  primary: '#2563EB',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1F2937',
  subtleText: '#6B7280',
  lightGray: '#F3F4F6',
  border: '#E5E7EB',
  green: '#10B981',
  red: '#F87171',
  blue: '#60A5FA',
  yellow: '#FBBF24',
};

const FONTS = {
    h1: { fontSize: 28, fontWeight: 'bold' as 'bold', color: COLORS.text },
    h2: { fontSize: 22, fontWeight: 'bold' as 'bold', color: COLORS.text },
    h3: { fontSize: 18, fontWeight: 'bold' as 'bold', color: COLORS.text },
    body: { fontSize: 16, color: COLORS.text, lineHeight: 24 },
    caption: { fontSize: 12, color: COLORS.subtleText },
};


const SHADOW = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5, // for Android shadow
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  chatScrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  fixedScreen: { flex: 1, padding: 16, justifyContent: 'space-between' as 'space-between', backgroundColor: COLORS.background },
  centerScreen: { flex: 1, alignItems: 'center' as 'center', justifyContent: 'center' as 'center', padding: 20, backgroundColor: COLORS.background },

  title: { ...FONTS.h1, textAlign: 'center' as 'center', marginBottom: 8 },
  screenTitle: { ...FONTS.h2, textAlign: 'center' as 'center', paddingVertical: 16, color: COLORS.text },
  subtitle: { ...FONTS.body, color: COLORS.subtleText, textAlign: 'center' as 'center', marginBottom: 24, paddingHorizontal: 10 },
  description: { fontSize: 14, color: COLORS.subtleText, textAlign: 'center' as 'center', marginBottom: 32 },
  cardTitle: { ...FONTS.h3 },
  cardSubtitle: { fontSize: 14, fontWeight: '600' as '600', marginTop: 16, marginBottom: 6, color: COLORS.text },
  bodyText: { ...FONTS.body, color: COLORS.subtleText },
  charCount: { ...FONTS.caption },

  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' as 'center', ...SHADOW },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold' as 'bold', fontSize: 16 },
  disabledButton: { opacity: 0.5 },
  onboardingButton: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 999, ...SHADOW },
  link: { color: COLORS.primary, fontWeight: '500' as '500' },
  squareButton: { width: '48%', aspectRatio: 1, borderRadius: 16, backgroundColor: COLORS.card, alignItems: 'center' as 'center', justifyContent: 'center' as 'center', ...SHADOW, marginBottom: 16 },
  squareButtonLabel: { fontWeight: '600' as '600', marginTop: 12, color: COLORS.subtleText, fontSize: 14 },

  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, ...SHADOW },
  textArea: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 16, minHeight: 100, textAlignVertical: 'top' as 'top', marginTop: 12, backgroundColor: '#FFF', fontSize: 16, color: COLORS.text },

  chatBubble: { padding: 12, paddingHorizontal: 16, borderRadius: 20, marginVertical: 4, maxWidth: '85%' },
  aiBubble: { backgroundColor: COLORS.lightGray, alignSelf: 'flex-start' as 'flex-start' },
  userBubble: { backgroundColor: COLORS.primary, alignSelf: 'flex-end' as 'flex-end' },
  chatText: { ...FONTS.body, color: COLORS.text },
  userChatText: { ...FONTS.body, color: '#FFFFFF' },
  chatInputContainer: { flexDirection: 'row' as 'row', padding: 10, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: '#FFF', alignItems: 'center' as 'center' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 99, paddingLeft: 20, paddingRight: 50, paddingVertical: Platform.OS === 'ios' ? 12 : 8, backgroundColor: COLORS.background, fontSize: 16, color: COLORS.text },
  sendButton: { backgroundColor: COLORS.text, borderRadius: 999, width: 44, height: 44, justifyContent: 'center' as 'center', alignItems: 'center' as 'center', marginLeft: 8 },
  reportButtonContainer: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: COLORS.border },
  reportButton: { backgroundColor: COLORS.green, borderRadius: 12, paddingVertical: 16, alignItems: 'center' as 'center', ...SHADOW },

  tabBar: { flexDirection: 'row' as 'row', height: Platform.OS === 'ios' ? 90 : 70, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: COLORS.border },
  tabButton: { alignItems: 'center' as 'center', flex: 1, justifyContent: 'center' as 'center'},
  tabLabel: { fontSize: 12, color: COLORS.subtleText, marginTop: 4 },
  tabLabelActive: { color: COLORS.primary, fontWeight: '600' as '600' },

  cameraButtonContainer: { position: 'absolute' as 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent', flexDirection: 'column' as 'column', alignItems: 'center' as 'center', paddingBottom: 40 },
  snapButton: { backgroundColor: '#7cbf55ff', borderRadius: 999, paddingVertical: 18, paddingHorizontal: 50, marginBottom: 16, ...SHADOW },
  snapButtonText: { fontSize: 17, color: 'white', fontWeight: 'bold' as 'bold' },
  closeButton: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, width: 48, height: 48, justifyContent: 'center' as 'center', alignItems: 'center' as 'center' },
  closeButtonText: { fontSize: 20, color: 'white', fontWeight: 'bold' as 'bold' },

  reportHeader: { flexDirection: 'row' as 'row', alignItems: 'center' as 'center', justifyContent: 'space-between' as 'space-between', marginBottom: 0, paddingBottom: 16 },
  backButton: { width: 40, height: 40, justifyContent: 'center' as 'center', alignItems: 'center' as 'center' },
  reportCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, ...SHADOW },
  reportCardTitle: { ...FONTS.h3, marginBottom: 16, color: COLORS.text },
  solutionCard: { backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  chartContainer: { flexDirection: 'row' as 'row', alignItems: 'center' as 'center', justifyContent: 'space-around' as 'space-around', paddingVertical: 10 },
  legendContainer: { justifyContent: 'center' as 'center', gap: 16 },
  legendContainerHorizontal: { flexDirection: 'row' as 'row', justifyContent: 'center' as 'center', gap: 20, marginBottom: 12 },
  legendItem: { flexDirection: 'row' as 'row', alignItems: 'center' as 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 14, color: COLORS.subtleText },
  legendPercentage: { fontSize: 14, fontWeight: '600' as '600', color: COLORS.text, marginLeft: 4 },
  // DonutChart 스타일 수정 (변수 접근 가능하도록)
  donutCenter: { position: 'absolute' as 'absolute', top: 20, left: 20, width: 120 - 40, height: 120 - 40, borderRadius: (120 - 40) / 2, backgroundColor: 'white' },
  barChartContainer: { flexDirection: 'row' as 'row', justifyContent: 'space-between' as 'space-between', alignItems: 'flex-end' as 'flex-end', height: 150, paddingHorizontal: 10 },
  barWrapper: { flex: 1, alignItems: 'center' as 'center', marginHorizontal: 4, height: '100%' },
  barLabel: { ...FONTS.caption, marginTop: 8 },
  statsContainer: { flexDirection: 'row' as 'row', justifyContent: 'space-around' as 'space-around', paddingVertical: 10 },
  statBox: { alignItems: 'center' as 'center' },
  statValue: { ...FONTS.h2 },
  statLabel: { ...FONTS.caption, marginTop: 4 },
  row: { flexDirection: 'row' as 'row', alignItems: 'center' as 'center' },
  rowBetween: { flexDirection: 'row' as 'row', justifyContent: 'space-between' as 'space-between', alignItems: 'center' as 'center' },
});


// =================================================================
// JWT 디코딩 함수 및 Polyfill (내용 동일)
// =================================================================
const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload;
    if (typeof atob === 'function') { // 웹 환경
       jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } else if (typeof Buffer === 'function') { // Node.js/React Native
       jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    } else {
        console.error("Cannot decode JWT: No atob or Buffer available.");
        return {};
    }
    const parsed = JSON.parse(jsonPayload);
    // 백엔드 app/schemas/user.py UserClaims에 맞게 sub, email, name, picture 추출
    //
    // (decode_token -> UserClaims)
    // 백엔드 auth.py에서는 claims를 그대로 sub로 사용하지만,
    // security.py 에서는 { "sub": sub, "type": "access", ... } 구조로 만듭니다.
    // auth.py의 login_with_google을 보면 UserClaims를 sub로 넣습니다.
    // [Correction] auth.py 33행: access = create_access_token(claims)
    // [Correction] security.py 20행: payload = { "sub": sub, ... }
    // -> create_access_token의 sub 파라미터가 UserClaims 객체(dict)로 통째로 들어갑니다.
    // -> security.py의 decode_token은 "sub" 키를 반환합니다.
    // -> *** 백엔드 security.py 수정이 필요해 보입니다. ***
    
    // [임시 조치] 백엔드가 security.py 20행을 payload = {"sub": sub["sub"], "user_claims": sub, ...}
    // 또는 auth.py 33행을 access = create_access_token(claims["sub"]) 로 보냈다고 가정합니다.
    // -> 가장 가능성 높은 시나리오: auth.py 33행에서 claims 객체(UserClaims)가 통째로 'sub' 키에 저장됨.
    // -> decodeJwt(token).sub === UserClaims 객체
    if (parsed.sub && typeof parsed.sub === 'object') {
       console.log("Decoding JWT 'sub' as object:", parsed.sub);
       return parsed.sub; // sub 키 안에 UserClaims 객체가 통째로 들어있는 경우
    }
    // 표준 JWT 'sub' (string) 및 기타 클레임이 루트에 있는 경우
    console.log("Decoding JWT 'sub' as string:", parsed.sub);
    return parsed; 

  } catch (e) {
    console.error("Failed to decode JWT:", e);
    return {};
  }
};
if (typeof atob === 'undefined' && typeof Buffer === 'function') {
  global.atob = (b64Encoded: string) => Buffer.from(b64Encoded, 'base64').toString('binary');
}


// =================================================================
// 토큰 저장/로드/삭제 함수 (API.ts에서 이동/구현)
// =================================================================
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
    const token = await SecureStore.getItemAsync(tokenKey);
    // console.log(`Token (${tokenType}) retrieved:`, token ? 'Exists' : 'Not found');
    return token;
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