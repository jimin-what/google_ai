import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Camera, CameraView } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// =================================================================
// 컴포넌트 분리
// =================================================================

// Onboarding 화면
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

// 1. 감정 기록 탭 컴포넌트
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
                    <Text style={styles.title}>감정 기록하기</Text>
                    <Text style={styles.subtitle}>오늘의 감정을 다양한 방법으로 기록해보세요.</Text>
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
                        <TouchableOpacity style={styles.squareButton} onPress={() => photoURI ? handleTakePhoto(null) : setShowCamera(true)}>
                            <Text style={{ fontSize: 40 }}>{photoURI ? '✔️' : '📷'}</Text>
                            <Text style={styles.squareButtonLabel}>{photoURI ? '촬영 완료!' : '사진으로 기록하기'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.squareButton} onPress={handleRecordVoice}>
                            <Text style={{ fontSize: 40 }}>{soundURI ? '✔️' : (isRecording ? '⏹️' : '🎤')}</Text>
                            <Text style={styles.squareButtonLabel}>{soundURI ? '녹음 완료!' : (isRecording ? '녹음 중지' : '음성으로 기록하기')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <TouchableOpacity style={[styles.primaryButton, { opacity: !photoURI && !soundURI && !textInput ? 0.5 : 1 }]} disabled={!photoURI && !soundURI && !textInput} onPress={handleAnalyze}>
                    <Text style={styles.primaryButtonText}>분석하기</Text>
                </TouchableOpacity>
            </View>
        </TouchableWithoutFeedback>
    );
};

// 2. 채팅 탭 컴포넌트
const ChatScreen = ({ analysisResult, chatHistory, chatInput, setChatInput, handleSendMessage, handleCreateReport }) => {
    const scrollViewRef = useRef(null);

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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
            <Text style={[styles.title, { paddingTop: 16 }]}>AI와의 대화</Text>
            <ScrollView style={styles.scroll} ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}>
                {chatHistory.map((message, index) => {
                    if (message.type === 'carePlan') {
                        return (
                            <View key={index} style={styles.card}>
                                <Text style={styles.cardTitle}>{message.content.title}</Text>
                                <Text style={styles.cardSubtitle}>진행 방법</Text>
                                <Text>{message.content.method}</Text>
                                <Text style={styles.cardSubtitle}>효과</Text>
                                <Text>{message.content.effect}</Text>
                                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#10B981', marginTop: 10 }]}>
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

// 3. 기록함 탭 컴포넌트
const ArchiveScreen = () => (
    <ScrollView style={styles.scroll}>
        <Text style={styles.title}>기록함</Text>
        <Text style={styles.subtitle}>생성된 리포트를 확인하세요.</Text>
        <TouchableOpacity style={styles.card} onPress={() => Alert.alert('알림', '일간 리포트 목록을 표시합니다.')}>
            <Text style={styles.cardTitle}>📅 일간 리포트</Text>
            <Text>AI와의 대화를 기반으로 생성된 일일 분석 리포트입니다.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => Alert.alert('알림', '주간 리포트 목록을 표시합니다.')}>
            <Text style={styles.cardTitle}>📈 주간 리포트</Text>
            <Text>일주일간의 감정 변화 추이를 시각적으로 보여주는 리포트입니다.</Text>
        </TouchableOpacity>
    </ScrollView>
);

// 4. 내 정보 탭 컴포넌트
const ProfileScreen = () => (
    <SafeAreaView style={styles.centerScreen}>
        <Text style={{ fontSize: 80 }}>👤</Text>
        <Text style={styles.title}>내 정보</Text>
        <Text style={styles.subtitle}>프로필 화면입니다.</Text>
    </SafeAreaView>
);

// 로딩 컴포넌트
const LoadingScreen = () => (
    <View style={styles.centerScreen}>
        <Text style={{ fontSize: 80 }}>❤️</Text>
        <Text style={styles.title}>마음을 들여다보는 중이에요</Text>
        <Text style={styles.subtitle}>가장 따뜻한 위로의 말을 찾고 있습니다.</Text>
    </View>
)

// =================================================================
// 메인 컴포넌트 (상태 및 로직 관리)
// =================================================================
export default function IndexScreen() {
    const [screen, setScreen] = useState<'onboarding' | 'main'>('onboarding');
    const [activeTab, setActiveTab] = useState<'record' | 'chat' | 'archive' | 'profile'>('record');
    const [isLoading, setIsLoading] = useState(false);
    
    const [textInput, setTextInput] = useState('');
    const [photoURI, setPhotoURI] = useState<string | null>(null);
    const [soundURI, setSoundURI] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);

    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [chatInput, setChatInput] = useState('');
    
    useEffect(() => { Camera.requestCameraPermissionsAsync(); }, []);

    const handleTakePhoto = (uri: string | null) => setPhotoURI(uri);
    
    async function startRecording() {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('권한 필요', '마이크 녹음 권한이 필요합니다.');
                return;
            }
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
            const uri = recording.getURI();
            setSoundURI(uri);
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
        setTimeout(() => {
            const mockResult = { carePlan: { title: "4-6 호흡법", method: "편안한 자세로 앉아 코로 4초간 숨을 들이마시고, 6초간 입으로 천천히 내뱉으세요.", effect: "심박수를 안정시키고 스트레스 반응을 줄여줍니다.", duration: "3분" } };
            setAnalysisResult(mockResult);
            setChatHistory([
                { role: 'ai', content: '마음 분석이 끝났어요. 간단한 솔루션을 알려드릴게요!' },
                // ▼▼▼ [수정] role:'ai'가 아닌 role:ai'로 되어있던 오타를 수정합니다. ▼▼▼
                { role: 'ai', type: 'carePlan', content: mockResult.carePlan }
                // ▲▲▲ [수정] 여기까지 수정 ▲▲▲
            ]);
            setIsLoading(false);
            setActiveTab('chat');
        }, 2000);
    };
    
    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        const userMessage = { role: 'user', content: chatInput };
        setChatHistory(prev => [...prev, userMessage]);
        const currentInput = chatInput;
        setChatInput('');
        try {
            const response = await fetch('https://your-backend-api.com/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: currentInput }),
            });
            if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
            const result = await response.json();
            const aiMessage = { role: 'ai', content: result.reply };
            setChatHistory(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('채팅 메시지 전송 오류:', error);
            const errorMessage = { role: 'ai', content: '죄송해요, 지금은 답변을 드릴 수 없어요. 잠시 후 다시 시도해주세요.'};
            setChatHistory(prev => [...prev, errorMessage]);
        }
    };

    const handleCreateReport = async () => {
        if (chatHistory.filter(m => m.role === 'user').length === 0) {
            Alert.alert('알림', '리포트를 생성하려면 대화 내용이 필요합니다.');
            return;
        }
        try {
            const response = await fetch('https://your-backend-api.com/reports/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation: chatHistory }),
            });
            if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
            Alert.alert('성공', '일간 리포트가 생성되었습니다! 기록함 탭에서 확인하세요.', [
                { text: 'OK', onPress: () => setActiveTab('archive') }
            ]);
        } catch (error) {
            console.error('리포트 생성 오류:', error);
            Alert.alert('오류', '리포트를 생성하는 중 문제가 발생했습니다.');
        }
    };

    const resetFlow = () => {
        setTextInput(''); setPhotoURI(null); setSoundURI(null);
        setAnalysisResult(null); setChatHistory([]); setChatInput('');
    };

    const renderTabContent = () => {
        if (isLoading) return <LoadingScreen />;
        switch (activeTab) {
            case 'record':
                return <RecordScreen textInput={textInput} setTextInput={setTextInput} photoURI={photoURI} soundURI={soundURI} handleAnalyze={handleAnalyze} handleTakePhoto={handleTakePhoto} handleRecordVoice={handleRecordVoice} isRecording={isRecording} />;
            case 'chat':
                return <ChatScreen analysisResult={analysisResult} chatHistory={chatHistory} chatInput={chatInput} setChatInput={setChatInput} handleSendMessage={handleSendMessage} handleCreateReport={handleCreateReport} />;
            case 'archive':
                return <ArchiveScreen />;
            case 'profile':
                return <ProfileScreen />;
            default:
                return null;
        }
    };

    const BottomTabBar = () => (
        <View style={styles.tabBar}>
            {[
                { key: 'record', label: '감정 기록', icon: '😊' },
                { key: 'chat', label: '채팅', icon: '💬' },
                { key: 'archive', label: '기록함', icon: '📂' },
                { key: 'profile', label: '내 정보', icon: '👤' },
            ].map((tab) => (
                <TouchableOpacity key={tab.key} style={styles.tabButton} onPress={() => {
                    if (tab.key === 'record') resetFlow();
                    setActiveTab(tab.key as any);
                }}>
                    <Text style={{ fontSize: 24 }}>{tab.icon}</Text>
                    <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    if (screen === 'onboarding') return <OnboardingScreen onStart={() => setScreen('main')} />;

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
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  fixedScreen: { flex: 1, padding: 16, justifyContent: 'space-between', backgroundColor: '#F8FAFC' },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#F8FAFC' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textArea: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top', marginTop: 10, backgroundColor: '#FFF' },
  primaryButton: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  onboardingButton: { backgroundColor: '#2563EB', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 999 },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#2563EB', fontWeight: '500' },
  squareButton: { width: '48%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  squareButtonLabel: { fontWeight: '600', marginTop: 8, color: '#374151' },
  chatBubble: { padding: 12, borderRadius: 16, marginVertical: 4, maxWidth: '85%' },
  aiBubble: { backgroundColor: '#E5E7EB', alignSelf: 'flex-start' },
  userBubble: { backgroundColor: '#3B82F6', alignSelf: 'flex-end' },
  chatText: { color: '#111827', fontSize: 15 },
  userChatText: { color: '#FFFFFF' },
  chatInputContainer: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 10, paddingBottom: 15, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFF', alignItems: 'center' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 25, paddingLeft: 20, paddingRight: 50, paddingVertical: 12, backgroundColor: '#F8FAFC', marginRight: 10, fontSize: 16 },
  sendButton: {
    backgroundColor: '#111827',
    borderRadius: 999,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButtonContainer: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  reportButton: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  charCount: { fontSize: 12, color: '#6B7280' },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  tabButton: { alignItems: 'center', flex: 1 },
  tabLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  tabLabelActive: { color: '#2563EB', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 12, paddingHorizontal: 10 },
  description: { fontSize: 14, color: '#4B5563', textAlign: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 4, color: '#374151' },
  cameraButtonContainer: { flex: 1, backgroundColor: 'transparent', flexDirection: 'column', justifyContent: 'flex-end', margin: 20, alignItems: 'center' },
  snapButton: {
    backgroundColor: '#9fce48ff', 
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 50,
    marginBottom: 16,
    elevation: 2,
  },
  snapButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.85)',
    borderRadius: 999,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  }
});