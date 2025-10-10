import { API } from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Camera, CameraView } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    id: string;
    email: string;
};

// =================================================================
// 컴포넌트들
// =================================================================
const OnboardingScreen = ({ onStart }) => (
    <SafeAreaView style={styles.centerScreen}>
        <Text style={{ fontSize: 80 }}>😞</Text>
        <Text style={styles.title}>AI 감정 케어 앱</Text>
        <Text style={styles.subtitle}>당신의 오늘 하루는 어땠나요?</Text>
        <Text style={styles.description}>
            이 앱은 사용자의 표정, 목소리 등을 기반으로 감정을 분석하고 맞춤형 케어 솔루션을 제공합니다. 모든 데이터는 안전하게 보호됩니다.
        </Text>
        <TouchableOpacity style={styles.onboardingButton} onPress={onStart}>
            <Text style={styles.primaryButtonText}>시작하기 →</Text>
        </TouchableOpacity>
    </SafeAreaView>
);

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
                    return (
                        <View key={index} style={{ width: size, height: size, position: 'absolute', transform: [{ rotate: `${rotation}deg` }] }}>
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

    return (
        <View style={styles.barChartContainer}>
            {chartData.map((item, index) => (
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
    if (isLoading) return <LoadingScreen message="리포트를 불러오는 중입니다..." />;
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
                <Text style={styles.cardSubtitle}>이메일</Text>
                <Text style={styles.bodyText}>{user?.email || '로그인 정보 없음'}</Text>
            </View>
        </View>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: COLORS.subtleText }]} onPress={onLogout}>
            <Text style={styles.primaryButtonText}>로그아웃</Text>
        </TouchableOpacity>
    </View>
);

const LoadingScreen = ({ message = '가장 따뜻한 위로의 말을 찾고 있습니다.' }) => (
    <View style={styles.centerScreen}>
        <Text style={{ fontSize: 80 }}>❤️</Text>
        <Text style={styles.title}>마음을 들여다보는 중이에요</Text>
        <Text style={styles.subtitle}>{message}</Text>
    </View>
);

// =================================================================
// 메인 컴포넌트
// =================================================================
export default function IndexScreen() {
    const [screen, setScreen] = useState<'onboarding' | 'main'>('onboarding');
    const [activeTab, setActiveTab] = useState<'record' | 'chat' | 'archive' | 'profile'>('record');
    const [isLoading, setIsLoading] = useState(false);
    
    const [currentUser, setCurrentUser] = useState<User | null>(null);

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

    useEffect(() => { Camera.requestCameraPermissionsAsync(); }, []);

    const handleTakePhoto = (uri: string | null) => setPhotoURI(uri);
    
    async function startRecording() {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            setIsRecording(true);
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
        } catch (err) {
            console.error('Failed to start recording', err);
            setIsRecording(false);
        }
    }

    async function stopRecording() {
        if (!recording) return;
        try {
            await recording.stopAndUnloadAsync();
            setSoundURI(recording.getURI());
        } catch(error) {
            console.error("Error stopping recording: ", error);
        } finally {
            setIsRecording(false);
            setRecording(null);
        }
    }
    
    const handleRecordVoice = () => {
        if (soundURI) setSoundURI(null);
        else if (isRecording) stopRecording();
        else startRecording();
    };

    const handleAnalyze = async () => {
        setIsLoading(true);
        try {
            const solutions = await API.getSolutions(currentUser?.id || 'user1');
            const analysisData = {
                carePlan: {
                    title: solutions[0].title,
                    method: solutions[0].way,
                    effect: solutions[0].effect,
                    duration: solutions[0].time
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
            Alert.alert("오류", "데이터를 분석하는 중 문제가 발생했습니다.");
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
        try {
            const mockReply: ChatMessage = { role: 'ai', content: '그랬군요. 더 자세히 이야기해주세요.'};
            setTimeout(() => {
              setChatHistory(prev => [...prev, mockReply]);
            }, 1000);
        } catch (error) {
            console.error('채팅 메시지 전송 오류:', error);
            const errorMessage: ChatMessage = { role: 'ai', content: '죄송해요, 지금은 답변을 드릴 수 없어요. 잠시 후 다시 시도해주세요.'};
            setChatHistory(prev => [...prev, errorMessage]);
        }
    };

    const handleCreateReport = async () => {
        if (chatHistory.filter(m => m.role === 'user').length === 0) {
            Alert.alert('알림', '리포트를 생성하려면 대화 내용이 필요합니다.');
            return;
        }
        setIsLoading(true);
        try {
            const reportData = await API.getDailyReport('today');
            setDailyReport(reportData);
            setViewingReport('daily');
            setActiveTab('archive');
        } catch (error) {
            console.error('리포트 생성 오류:', error);
            Alert.alert('오류', '리포트를 생성하는 중 문제가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewReport = async (type: 'daily' | 'weekly') => {
        setIsLoading(true);
        if (type === 'daily') {
            const data = await API.getDailyReport('today');
            setDailyReport(data);
        } else {
            const data = await API.getWeeklyReport('this-week');
            setWeeklyReport(data);
        }
        setViewingReport(type);
        setIsLoading(false);
    }

    const resetFlow = () => {
        setTextInput(''); setPhotoURI(null); setSoundURI(null);
        setAnalysisResult(null); setChatHistory([]); setChatInput('');
        setViewingReport('list');
        setActiveTab('record');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        resetFlow();
        setScreen('onboarding');
    };

    const handleLogin = () => {
        setCurrentUser({ id: 'user1', email: 'jimin@example.com' });
        setScreen('main');
    }

    const renderTabContent = () => {
        if (isLoading) return <LoadingScreen />;
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
                    if (tab.key === 'record') {
                        setAnalysisResult(null); 
                        setChatHistory([]);
                        setViewingReport('list');
                    }
                    setActiveTab(tab.key as any);
                }}>
                    <Feather name={tab.icon} size={24} color={activeTab === tab.key ? COLORS.primary : COLORS.subtleText} />
                    <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    if (screen === 'onboarding') return <OnboardingScreen onStart={handleLogin} />;

    return (
        <SafeAreaView style={styles.container}>
            {renderTabContent()}
            <BottomTabBar />
        </SafeAreaView>
    );
}

// =================================================================
// 스타일시트
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
    h1: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
    h2: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
    h3: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    body: { fontSize: 16, color: COLORS.text, lineHeight: 24 },
    caption: { fontSize: 12, color: COLORS.subtleText },
};

const SHADOW = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1, paddingHorizontal: 16 },
  chatScrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  fixedScreen: { flex: 1, padding: 16, justifyContent: 'space-between', backgroundColor: COLORS.background },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: COLORS.background },
  
  title: { ...FONTS.h1, textAlign: 'center', marginBottom: 8 },
  screenTitle: { ...FONTS.h2, textAlign: 'center', paddingVertical: 16, color: COLORS.text },
  subtitle: { ...FONTS.body, color: COLORS.subtleText, textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 },
  description: { fontSize: 14, color: COLORS.subtleText, textAlign: 'center', marginBottom: 32 },
  cardTitle: { ...FONTS.h3 },
  cardSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6, color: COLORS.text },
  bodyText: { ...FONTS.body, color: COLORS.subtleText },
  charCount: { ...FONTS.caption },
  
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...SHADOW },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  disabledButton: { opacity: 0.5 },
  onboardingButton: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 999, ...SHADOW },
  link: { color: COLORS.primary, fontWeight: '500' },
  squareButton: { width: '48%', aspectRatio: 1, borderRadius: 16, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', ...SHADOW, marginBottom: 16 },
  squareButtonLabel: { fontWeight: '600', marginTop: 12, color: COLORS.subtleText, fontSize: 14 },
  
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 20, ...SHADOW },
  textArea: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 16, minHeight: 100, textAlignVertical: 'top', marginTop: 12, backgroundColor: '#FFF', fontSize: 16, color: COLORS.text },
  
  chatBubble: { padding: 12, paddingHorizontal: 16, borderRadius: 20, marginVertical: 4, maxWidth: '85%' },
  aiBubble: { backgroundColor: COLORS.lightGray, alignSelf: 'flex-start' },
  userBubble: { backgroundColor: COLORS.primary, alignSelf: 'flex-end' },
  chatText: { ...FONTS.body, color: COLORS.text },
  userChatText: { ...FONTS.body, color: '#FFFFFF' },
  chatInputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: '#FFF', alignItems: 'center' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 99, paddingLeft: 20, paddingRight: 50, paddingVertical: 12, backgroundColor: COLORS.background, fontSize: 16, color: COLORS.text },
  sendButton: { backgroundColor: COLORS.text, borderRadius: 999, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  reportButtonContainer: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: COLORS.border },
  reportButton: { backgroundColor: COLORS.green, borderRadius: 12, paddingVertical: 16, alignItems: 'center', ...SHADOW },
  
  tabBar: { flexDirection: 'row', height: 90, paddingTop: 12, paddingBottom: 30, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: COLORS.border },
  tabButton: { alignItems: 'center', flex: 1 },
  tabLabel: { fontSize: 12, color: COLORS.subtleText, marginTop: 4 },
  tabLabelActive: { color: COLORS.primary, fontWeight: '600' },
  
  cameraButtonContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent', flexDirection: 'column', alignItems: 'center', paddingBottom: 40 },
  snapButton: { backgroundColor: '#7cbf55ff', borderRadius: 999, paddingVertical: 18, paddingHorizontal: 50, marginBottom: 16, ...SHADOW },
  snapButtonText: { fontSize: 17, color: 'white', fontWeight: 'bold' },
  closeButton: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 20, color: 'white', fontWeight: 'bold' },
  
  reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  reportCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, ...SHADOW },
  reportCardTitle: { ...FONTS.h3, marginBottom: 16, color: COLORS.text },
  solutionCard: { backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  chartContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 10 },
  legendContainer: { justifyContent: 'center', gap: 16 },
  legendContainerHorizontal: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 14, color: COLORS.subtleText },
  legendPercentage: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginLeft: 4 },
  donutCenter: { position: 'absolute', top: 20, left: 20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'white' },
  barChartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 150, paddingHorizontal: 10 },
  barWrapper: { flex: 1, alignItems: 'center', marginHorizontal: 4, height: '100%' },
  barLabel: { ...FONTS.caption, marginTop: 8 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  statBox: { alignItems: 'center' },
  statValue: { ...FONTS.h2 },
  statLabel: { ...FONTS.caption, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});