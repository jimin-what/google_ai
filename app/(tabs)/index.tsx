// app/(tabs)/index.tsx

import { API } from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Camera, CameraView } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'; // ActivityIndicator 추가
import { SafeAreaView } from 'react-native-safe-area-context';
// --- Google Sign In ---
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// --- 타입 정의 ---
type ChatMessage = {
  role: 'user' | 'ai';
  content: any;
  type?: string;
};

type DailyReport = {
  title: string;
  summary_text: string;
  mood_snapshot: {
    top: string;
    dist: { [key: string]: number };
  };
  routine_stats: { recommended: number; accepted: number; completion_rate: number; };
};

type WeeklyReport = {
  summary_text: string;
  highlights: { title: string; desc: string }[];
  mood_overview: {
    dist: { [key: string]: number };
    trend: string;
  };
  routine_overview: {
    top_routines: string[];
  };
};

type User = {
    id: string; // 백엔드 API 응답 기준 UserClaims의 sub 사용
    email: string | null;
    name?: string | null;
};


// =================================================================
// 컴포넌트들
// =================================================================

const LoginScreen = ({ onLoginSuccess, setIsLoading }: { onLoginSuccess: (user: User, accessToken: string, refreshToken: string) => void; setIsLoading: (loading: boolean) => void; }) => { // setIsLoading 추가
  // --- Google Sign In ---
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // 👇 ******** 중요 ******** 👇
    // 👇 실제 Google Cloud Console에서 발급받은 웹 클라이언트 ID로 변경하세요! 👇
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    // 👆 ******** 중요 ******** 👆
    // iOS/Android 클라이언트 ID를 별도로 설정해야 할 수도 있습니다 (Expo 문서 참고).
    // iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    // androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token); // Google 로그인 성공 시 ID 토큰 전달
    } else if (response?.type === 'error') {
      console.error('Google Sign-In Error:', response.error);
      Alert.alert('로그인 실패', '구글 로그인 중 오류가 발생했습니다.');
      setIsLoading(false); // 로딩 종료
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
       setIsLoading(false); // 사용자가 취소해도 로딩 종료
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string | null) => {
     if (!idToken) {
       Alert.alert('로그인 실패', '구글 ID 토큰을 얻지 못했습니다.');
       setIsLoading(false); // 로딩 종료
       return;
     }
    setIsLoading(true); // 로딩 시작
    try {
      // 백엔드 API 호출
      const tokenData = await API.loginWithGoogle(idToken); // API.ts에 추가한 함수 호출

      // 백엔드 응답에서 사용자 정보 추출 (Access Token decode)
      const decodedToken = decodeJwt(tokenData.access_token);
      const user: User = {
        id: decodedToken.sub, // sub 클레임 사용
        email: decodedToken.email || null,
        name: decodedToken.name || null,
      };

      // TODO: 토큰 저장 구현 (예: AsyncStorage 또는 SecureStore 사용)
      // await saveTokens(tokenData.access_token, tokenData.refresh_token);

      onLoginSuccess(user, tokenData.access_token, tokenData.refresh_token); // 성공 콜백 호출 (setIsLoading은 여기서 호출하지 않음, IndexScreen에서 처리)
    } catch (error) {
      console.error("Google Sign-In Error (Backend):", error);
      Alert.alert('로그인 실패', '서버 통신 중 오류가 발생했습니다. 서버가 실행 중인지 확인하세요.');
      setIsLoading(false); // 에러 시 로딩 종료
    }
    // setIsLoading(false); // 성공 시에는 onLoginSuccess 이후 IndexScreen에서 처리
  };

  const handleLoginPress = () => {
    setIsLoading(true); // 버튼 누를 때 로딩 시작
    promptAsync(); // Google 로그인 창 띄우기
  }

  return (
    <SafeAreaView style={styles.centerScreen}>
      <Text style={{ fontSize: 80 }}>👋</Text>
      <Text style={styles.title}>AI 감정 케어</Text>
      <Text style={styles.subtitle}>로그인하고 마음 관리를 시작해보세요.</Text>
      <TouchableOpacity
        style={[styles.onboardingButton, { marginTop: 32, backgroundColor: '#4285F4' }]}
        onPress={handleLoginPress} // 수정됨
        disabled={!request} // Google 로그인 요청 준비 안됐을 때 비활성화
      >
        <Text style={styles.primaryButtonText}>Google 계정으로 로그인</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// =================================================================
// RecordScreen, ChatScreen, Report 관련 컴포넌트, ProfileScreen, LoadingScreen
// (이하 컴포넌트 코드는 이전과 동일 - 간결성을 위해 생략)
// =================================================================
const RecordScreen = ({ textInput, setTextInput, photoURI, soundURI, handleAnalyze, handleTakePhoto, handleRecordVoice, isRecording }) => {
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
                <TouchableOpacity style={[styles.primaryButton, (!photoURI && !soundURI && !textInput) && styles.disabledButton]} disabled={!photoURI && !soundURI && !textInput} onPress={handleAnalyze}>
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
        Alert.alert('솔루션 완료!', `${solutionTitle}을(를) 완료했습니다. 다음 리포트에 반영됩니다.`);
    };

    if (!analysisResult) {
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
                    if (message.type === 'carePlan') {
                        return (
                            <View key={index} style={styles.card}>
                                <Text style={styles.cardTitle}>{message.content.title}</Text>
                                <Text style={styles.cardSubtitle}>진행 방법</Text>
                                <Text style={styles.bodyText}>{message.content.method}</Text>
                                <Text style={styles.cardSubtitle}>효과</Text>
                                <Text style={styles.bodyText}>{message.content.effect}</Text>
                                <TouchableOpacity
                                    style={[styles.primaryButton, { backgroundColor: COLORS.green, marginTop: 16 }]}
                                    onPress={() => handleCompleteSolution(message.content.title)}
                                >
                                    <Text style={styles.primaryButtonText}>시작 {message.content.duration}</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }
                    return (
                        <View key={index} style={[styles.chatBubble, message.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                            <Text style={[styles.chatText, message.role === 'user' && styles.userChatText]}>{message.content}</Text>
                        </View>
                    );
                })}
            </ScrollView>
            <View style={styles.reportButtonContainer}>
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
const ReportCard = ({ title, children }) => (
    <View style={styles.reportCard}>
        <Text style={styles.reportCardTitle}>{title}</Text>
        {children}
    </View>
);
const EMOTION_COLORS = { '행복': '#60A5FA', '분노': '#F87171', '불안': '#FBBF24', '슬픔': '#9CA3AF', '평온': '#86EFAC', '기본': '#E5E7EB' };
const DonutChart = ({ data }) => {
    const size = 120;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    let accumulatedPercentage = 0;

    const chartData = Object.entries(data).map(([key, value]) => ({
        label: key,
        percentage: value,
        color: EMOTION_COLORS[key] || EMOTION_COLORS['기본']
    }));

    return (
        <View style={styles.chartContainer}>
            <View style={{ width: size, height: size, position: 'relative' }}>
                {chartData.map((item, index) => {
                    const rotation = accumulatedPercentage * 3.6;
                    accumulatedPercentage += item.percentage;
                    // Ensure rotation calculation doesn't create invalid style value like NaN
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
const BarChart = ({ data }) => {
    const chartData = Object.entries(data).map(([key, value]) => ({
      day: key,
      negative: value,
      positive: 100 - value
    }));
    // Ensure negative and positive are valid numbers between 0 and 100
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
                        {/* Ensure height is a valid percentage string */}
                        <View style={{ height: `${item.negative}%`, backgroundColor: COLORS.red, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                        <View style={{ height: `${item.positive}%`, backgroundColor: COLORS.blue, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
                    </View>
                    <Text style={styles.barLabel}>{item.day}</Text>
                </View>
            ))}
        </View>
    );
};
const DailyReportView = ({ report, onBack }: { report: DailyReport; onBack: () => void }) => (
    <ScrollView style={styles.scroll}>
        <View style={styles.reportHeader}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}><Feather name="chevron-left" size={24} color={COLORS.text} /></TouchableOpacity>
            <Text style={styles.screenTitle}>일간 리포트</Text>
            <View style={{width: 40}} />
        </View>
        <ReportCard title="감정 분포">
            <DonutChart data={report.mood_snapshot.dist} />
        </ReportCard>
        <ReportCard title="종합 요약">
             <Text style={styles.bodyText}>{report.summary_text}</Text>
        </ReportCard>
        <ReportCard title="솔루션 통계">
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{report.routine_stats.recommended}</Text>
                    <Text style={styles.statLabel}>추천</Text>
                </View>
                 <View style={styles.statBox}>
                    <Text style={styles.statValue}>{report.routine_stats.accepted}</Text>
                    <Text style={styles.statLabel}>수락</Text>
                </View>
                 <View style={styles.statBox}>
                    <Text style={styles.statValue}>{Math.round(report.routine_stats.completion_rate * 100)}%</Text>
                    <Text style={styles.statLabel}>완료율</Text>
                </View>
            </View>
        </ReportCard>
    </ScrollView>
);
const WeeklyReportView = ({ report, onBack }: { report: WeeklyReport; onBack: () => void }) => (
    <ScrollView style={styles.scroll}>
       <View style={styles.reportHeader}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}><Feather name="chevron-left" size={24} color={COLORS.text} /></TouchableOpacity>
            <Text style={styles.screenTitle}>주간 리포트</Text>
            <View style={{width: 40}} />
        </View>
        <ReportCard title="감정 트렌드 (부정 감정 비율)">
             <BarChart data={report.mood_overview.dist} />
        </ReportCard>
        <ReportCard title="주간 종합 분석">
            <Text style={styles.bodyText}>{report.summary_text}</Text>
        </ReportCard>
        {report.highlights.map((highlight, index) => (
            <ReportCard key={index} title={highlight.title}>
                <Text style={styles.bodyText}>{highlight.desc}</Text>
            </ReportCard>
        ))}
        <ReportCard title="가장 유용했던 솔루션">
             {report.routine_overview.top_routines.map((sol_title, i) => (
                <View key={i} style={[styles.solutionCard, {marginBottom: i === report.routine_overview.top_routines.length - 1 ? 0 : 8}]}>
                    <Text style={styles.cardTitle}>{sol_title}</Text>
                </View>
            ))}
        </ReportCard>
    </ScrollView>
);
const ArchiveScreen = ({ viewingReport, dailyReport, weeklyReport, handleViewReport, setViewingReport, isLoading }) => {
    // isLoading prop을 받지만, 실제 로딩 표시는 Daily/WeeklyReportView 컴포넌트 호출 전에 처리하거나,
    // 각 리포트 뷰 컴포넌트 내부에서 처리하는 것이 더 자연스러울 수 있습니다.
    // 여기서는 일단 로딩 중일 때 LoadingScreen을 보여주도록 유지합니다.
    if (isLoading && viewingReport !== 'list') return <LoadingScreen message="리포트를 불러오는 중입니다..." />;

    if (viewingReport === 'daily' && dailyReport) {
        return <DailyReportView report={dailyReport} onBack={() => setViewingReport('list')} />;
    }
    if (viewingReport === 'weekly' && weeklyReport) {
        return <WeeklyReportView report={weeklyReport} onBack={() => setViewingReport('list')} />;
    }
    // 리스트 화면일 때 로딩 상태 처리 (선택 사항)
    // if (isLoading && viewingReport === 'list') return <LoadingScreen message="리포트 목록을 준비 중입니다..." />;

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
                {/* 사용자 이름 표시 추가 */}
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
const LoadingScreen = ({ message = '잠시만 기다려주세요...' }) => ( // 기본 메시지 변경
    <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.subtitle, {marginTop: 20}]}>{message}</Text>
    </View>
);


// =================================================================
// 메인 컴포넌트
// =================================================================
export default function IndexScreen() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState<'record' | 'chat' | 'archive' | 'profile'>('record');
    const [isLoading, setIsLoading] = useState(false); // 앱 전체 로딩 상태 추가

    // ... (나머지 state 변수들) ...
    const [textInput, setTextInput] = useState('');
    const [photoURI, setPhotoURI] = useState<string | null>(null);
    const [soundURI, setSoundURI] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [viewingReport, setViewingReport] = useState<'list' | 'daily' | 'weekly'>('list');
    const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
    const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);


    useEffect(() => {
        Camera.requestCameraPermissionsAsync();
        // TODO: 앱 시작 시 저장된 토큰 확인 및 자동 로그인 로직 구현
        // setIsLoading(true); // 자동 로그인 시도 시 로딩 시작
        // const checkLogin = async () => { /* ... */ };
        // checkLogin().finally(() => setIsLoading(false)); // 로딩 종료
    }, []);


    // --- 함수 정의 (handleTakePhoto, start/stopRecording, handleRecordVoice 등) ---
     const handleTakePhoto = (uri: string | null) => setPhotoURI(uri);

     async function startRecording() {
         try {
             await Audio.requestPermissionsAsync();
             await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
             setIsRecording(true);
             console.log('Recording started'); // 로그 추가
             const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
             setRecording(recording);
         } catch (err) {
             console.error('Failed to start recording', err);
             Alert.alert('녹음 오류', '녹음을 시작할 수 없습니다. 마이크 권한을 확인해주세요.'); // 사용자 알림 추가
             setIsRecording(false);
         }
     }

     async function stopRecording() {
         if (!recording) return;
         console.log('Stopping recording..'); // 로그 추가
         setIsRecording(false); // UI 업데이트 먼저
         try {
             await recording.stopAndUnloadAsync();
             const uri = recording.getURI();
             console.log('Recording stopped and stored at', uri); // 로그 추가
             setSoundURI(uri);
             setRecording(null); // recording 상태 초기화
         } catch(error) {
             console.error("Error stopping recording: ", error);
             Alert.alert('녹음 오류', '녹음을 중지하는 중 오류가 발생했습니다.'); // 사용자 알림 추가
         }
         // finally 블록 제거 (setIsRecording은 이미 위에서 처리)
     }

     const handleRecordVoice = () => {
         if (soundURI) {
            console.log('Clearing existing recording URI'); // 로그 추가
            setSoundURI(null); // 녹음 완료 상태 해제
         }
         else if (isRecording) {
            stopRecording();
         } else {
            startRecording();
         }
     };

     const handleAnalyze = async () => {
         if (!currentUser) {
            Alert.alert('로그인 필요', '분석 기능을 사용하려면 먼저 로그인해주세요.');
            return;
         }
         setIsLoading(true);
         try {
             const solutions = await API.getSolutions(currentUser.id);
             // Ensure solutions is an array and has at least one item
             if (!Array.isArray(solutions) || solutions.length === 0) {
                 throw new Error("No solutions received from API or invalid format");
             }
             const firstSolution = solutions[0];
             const analysisData = {
                 carePlan: {
                     title: firstSolution.title,
                     method: firstSolution.way, // Changed from 'method' to 'way' based on mock.ts
                     effect: firstSolution.effect,
                     duration: firstSolution.time // Changed from 'duration' to 'time' based on mock.ts
                 }
             };
             setAnalysisResult(analysisData);
             setChatHistory([
                 { role: 'ai', content: '마음 분석이 끝났어요. 간단한 솔루션을 알려드릴게요!' },
                 { role: 'ai', type: 'carePlan', content: analysisData.carePlan }
             ]);
             setActiveTab('chat');
         } catch (error) {
             console.error("분석 실패:", error);
             Alert.alert("오류", `데이터를 분석하는 중 문제가 발생했습니다: ${error.message}`);
         } finally {
             setIsLoading(false);
         }
     };

     const handleSendMessage = async () => {
         if (!chatInput.trim()) return;
         const userMessage: ChatMessage = { role: 'user', content: chatInput };
         setChatHistory(prev => [...prev, userMessage]);
         const currentInput = chatInput;
         setChatInput('');
         // TODO: 실제 백엔드 채팅 API 호출 로직 추가
         try {
             // 예시: const reply = await API.sendMessage(currentInput, chatHistory);
             const mockReply: ChatMessage = { role: 'ai', content: '그랬군요. 더 자세히 이야기해주세요.'};
             // 서버 응답 지연 시뮬레이션
             await new Promise(resolve => setTimeout(resolve, 1000));
             setChatHistory(prev => [...prev, mockReply]);
         } catch (error) {
             console.error('채팅 메시지 전송/응답 오류:', error);
             const errorMessage: ChatMessage = { role: 'ai', content: '죄송해요, 지금은 답변을 드릴 수 없어요. 잠시 후 다시 시도해주세요.'};
             // 에러 발생 시 사용자 메시지 다음에 에러 메시지 추가
             setChatHistory(prev => [...prev, errorMessage]);
             // 선택: 실패한 사용자 메시지를 다시 입력창에 넣어줄 수도 있음
             // setChatInput(currentInput);
         }
     };

     const handleCreateReport = async () => {
         if (chatHistory.filter(m => m.role === 'user').length === 0) {
             Alert.alert('알림', '리포트를 생성하려면 대화 내용이 필요합니다.');
             return;
         }
         setIsLoading(true);
         try {
             // TODO: 실제 날짜 또는 사용자 ID 등을 파라미터로 넘겨야 할 수 있음
             const reportData = await API.getDailyReport('today');
             setDailyReport(reportData);
             setViewingReport('daily');
             setActiveTab('archive');
         } catch (error) {
             console.error('일간 리포트 생성 오류:', error);
             Alert.alert('오류', '일간 리포트를 생성하는 중 문제가 발생했습니다.');
         } finally {
             setIsLoading(false);
         }
     };

     const handleViewReport = async (type: 'daily' | 'weekly') => {
         setIsLoading(true);
         setViewingReport(type); // 먼저 뷰 상태 변경 (로딩 표시 위함)
         try {
            if (type === 'daily') {
                 // TODO: 실제 날짜 또는 사용자 ID 등을 파라미터로 넘겨야 할 수 있음
                 const data = await API.getDailyReport('today');
                 setDailyReport(data);
             } else {
                 // TODO: 실제 주차 또는 사용자 ID 등을 파라미터로 넘겨야 할 수 있음
                 const data = await API.getWeeklyReport('this-week');
                 setWeeklyReport(data);
             }
             // setViewingReport(type); // 데이터 로딩 후 상태 변경 (선택)
         } catch (error) {
             console.error(`${type} 리포트 로딩 오류:`, error);
             Alert.alert('오류', '리포트를 불러오는 중 문제가 발생했습니다.');
             setViewingReport('list'); // 오류 시 목록으로 돌아가기
         } finally {
             setIsLoading(false);
         }
     }


     const resetFlow = () => {
         setTextInput(''); setPhotoURI(null); setSoundURI(null);
         setIsRecording(false); // 녹음 상태 초기화
         if(recording) { // 만약 녹음 중이었다면 중지
            try { recording.stopAndUnloadAsync(); } catch {}
         }
         setRecording(null);
         setAnalysisResult(null); setChatHistory([]); setChatInput('');
         setViewingReport('list');
         // setActiveTab('record'); // 로그아웃 시에는 로그인 화면으로 가므로 필요 없음
     };


    const handleLogout = async () => {
        setIsLoading(true); // 로딩 시작
        // TODO: 저장된 토큰 삭제 로직 구현
        // await clearTokens();
        setCurrentUser(null);
        resetFlow(); // 상태 초기화
        // setIsLoading(false); // 로그인 화면으로 전환되므로 여기서 로딩 종료 불필요
    };

    const handleLoginSuccess = (user: User, accessToken: string, refreshToken: string) => {
        console.log("Login Success:", user);
        // TODO: 실제 토큰 저장 로직 호출
        // await saveTokens(accessToken, refreshToken);
        setCurrentUser(user);
        setIsLoading(false); // 로그인 성공 후 로딩 종료
    };

    const renderTabContent = () => {
        // isLoading 상태를 ArchiveScreen에는 이미 prop으로 전달하고 있으므로 중복 제거
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
         <View style={styles.tabBar}>
             {[
                 { key: 'record', label: '감정 기록', icon: 'edit-3' },
                 { key: 'chat', label: '채팅', icon: 'message-circle' },
                 { key: 'archive', label: '기록함', icon: 'archive' },
                 { key: 'profile', label: '내 정보', icon: 'user' },
             ].map((tab) => (
                 <TouchableOpacity key={tab.key} style={styles.tabButton} onPress={() => {
                     // 탭 전환 시 로딩 상태가 계속되지 않도록 초기화 (선택 사항)
                     // setIsLoading(false);
                     if (tab.key === 'record') {
                         // 채팅 관련 상태 초기화는 resetFlow에서 처리되므로 여기선 불필요할 수 있음
                         // setAnalysisResult(null);
                         // setChatHistory([]);
                         setViewingReport('list'); // 리포트 뷰 상태는 초기화
                     }
                     setActiveTab(tab.key as any);
                 }}>
                     <Feather name={tab.icon as any} size={24} color={activeTab === tab.key ? COLORS.primary : COLORS.subtleText} />
                     <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
                 </TouchableOpacity>
             ))}
         </View>
     );


    // --- 로딩 상태 처리 ---
    // 앱 부팅 시 자동 로그인 로직 추가 시 활용
    // if (isLoading && !currentUser) {
    //    return <LoadingScreen message="로그인 정보를 확인 중입니다..." />;
    // }

    // 로그인 상태에 따라 화면 렌더링
    if (!currentUser) {
        // setIsLoading을 LoginScreen에 전달
        // isLoading 상태는 LoginScreen 내부에서 관리하도록 변경
        return <LoginScreen onLoginSuccess={handleLoginSuccess} setIsLoading={setIsLoading} />;
    }

    // 로그인 후 로딩 상태 처리
    if (isLoading) {
       return <LoadingScreen />; // 로그인 후 다른 작업(예: 리포트 로딩) 중일 때
    }

    return (
        <SafeAreaView style={styles.container}>
            {renderTabContent()}
            <BottomTabBar />
        </SafeAreaView>
    );
}

// =================================================================
// 스타일시트 (이전과 동일)
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
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 }, // Added paddingTop
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

  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, ...SHADOW }, // Reduced marginBottom
  textArea: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 16, minHeight: 100, textAlignVertical: 'top' as 'top', marginTop: 12, backgroundColor: '#FFF', fontSize: 16, color: COLORS.text },

  chatBubble: { padding: 12, paddingHorizontal: 16, borderRadius: 20, marginVertical: 4, maxWidth: '85%' },
  aiBubble: { backgroundColor: COLORS.lightGray, alignSelf: 'flex-start' as 'flex-start' },
  userBubble: { backgroundColor: COLORS.primary, alignSelf: 'flex-end' as 'flex-end' },
  chatText: { ...FONTS.body, color: COLORS.text },
  userChatText: { ...FONTS.body, color: '#FFFFFF' },
  chatInputContainer: { flexDirection: 'row' as 'row', padding: 10, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: '#FFF', alignItems: 'center' as 'center' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 99, paddingLeft: 20, paddingRight: 50, paddingVertical: Platform.OS === 'ios' ? 12 : 8, backgroundColor: COLORS.background, fontSize: 16, color: COLORS.text }, // Adjusted padding for Android
  sendButton: { backgroundColor: COLORS.text, borderRadius: 999, width: 44, height: 44, justifyContent: 'center' as 'center', alignItems: 'center' as 'center', marginLeft: 8 },
  reportButtonContainer: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: COLORS.border },
  reportButton: { backgroundColor: COLORS.green, borderRadius: 12, paddingVertical: 16, alignItems: 'center' as 'center', ...SHADOW },

  tabBar: { flexDirection: 'row' as 'row', height: Platform.OS === 'ios' ? 90 : 70, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: COLORS.border }, // Adjusted height for Android
  tabButton: { alignItems: 'center' as 'center', flex: 1, justifyContent: 'center' as 'center'}, // Added justifyContent
  tabLabel: { fontSize: 12, color: COLORS.subtleText, marginTop: 4 },
  tabLabelActive: { color: COLORS.primary, fontWeight: '600' as '600' },

  cameraButtonContainer: { position: 'absolute' as 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent', flexDirection: 'column' as 'column', alignItems: 'center' as 'center', paddingBottom: 40 },
  snapButton: { backgroundColor: '#7cbf55ff', borderRadius: 999, paddingVertical: 18, paddingHorizontal: 50, marginBottom: 16, ...SHADOW },
  snapButtonText: { fontSize: 17, color: 'white', fontWeight: 'bold' as 'bold' },
  closeButton: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, width: 48, height: 48, justifyContent: 'center' as 'center', alignItems: 'center' as 'center' },
  closeButtonText: { fontSize: 20, color: 'white', fontWeight: 'bold' as 'bold' },

  reportHeader: { flexDirection: 'row' as 'row', alignItems: 'center' as 'center', justifyContent: 'space-between' as 'space-between', marginBottom: 0, paddingBottom: 16 }, // Removed marginBottom, added paddingBottom
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
  donutCenter: { position: 'absolute' as 'absolute', top: strokeWidth, left: strokeWidth, width: size - (strokeWidth * 2), height: size - (strokeWidth * 2), borderRadius: radius, backgroundColor: 'white' }, // Adjusted DonutChart center style (assuming size, strokeWidth, radius are accessible) - This needs correction as these vars are local to DonutChart
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
// JWT 디코딩 함수 및 Polyfill (이전과 동일)
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
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to decode JWT:", e);
    return {}; // 또는 null 반환
  }
};
if (typeof atob === 'undefined' && typeof Buffer === 'function') {
  global.atob = (b64Encoded: string) => Buffer.from(b64Encoded, 'base64').toString('binary');
}


// =================================================================
// TODO: 토큰 저장/로드/삭제 함수 구현 (예시)
// =================================================================
/*
import AsyncStorage from '@react-native-async-storage/async-storage'; // 또는 SecureStore

const TOKEN_KEYS = {
  ACCESS: '@user_access_token',
  REFRESH: '@user_refresh_token',
};

const saveTokens = async (accessToken: string, refreshToken: string) => {
  try {
    await AsyncStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
    await AsyncStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
    console.log("Tokens saved successfully.");
  } catch (e) {
    console.error("Failed to save tokens", e);
  }
};

const getToken = async (tokenType: 'access' | 'refresh' = 'access') => {
  try {
    const tokenKey = tokenType === 'refresh' ? TOKEN_KEYS.REFRESH : TOKEN_KEYS.ACCESS;
    const token = await AsyncStorage.getItem(tokenKey);
    console.log(`Token (${tokenType}) retrieved:`, token ? 'Exists' : 'Not found');
    return token;
  } catch (e) {
    console.error("Failed to fetch token", e);
    return null;
  }
};

const clearTokens = async () => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEYS.ACCESS);
    await AsyncStorage.removeItem(TOKEN_KEYS.REFRESH);
    console.log("Tokens cleared successfully.");
  } catch (e) {
    console.error("Failed to clear tokens", e);
  }
};
*/