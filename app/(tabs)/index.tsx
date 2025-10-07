import { Audio } from 'expo-av';
import { Camera, CameraView } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// =================================================================
// 컴포넌트들을 IndexScreen 바깥으로 분리
// =================================================================

// Onboarding 화면
const OnboardingScreen = ({ onStart }) => (
    <View style={styles.centerScreen}>
        <Text style={{ fontSize: 80 }}>😞</Text>
        <Text style={styles.title}>AI 감정 케어 앱</Text>
        <Text style={styles.subtitle}>당신의 오늘 하루는 어땠나요?</Text>
        <Text style={styles.description}>
            이 앱은 사용자의 표정, 목소리 등을 기반으로 감정을 분석하고 맞춤형 케어 솔루션을 제공합니다. 모든 데이터는 안전하게 보호됩니다.
        </Text>
        <TouchableOpacity style={styles.onboardingButton} onPress={onStart}>
            <Text style={styles.primaryButtonText}>시작하기 →</Text>
        </TouchableOpacity>
    </View>
);

// 감정 기록 탭
const RecordScreen = ({
    flowState, textInput, setTextInput, photoURI,
    soundURI, handleAnalyze, analysisResult,
    handleTakePhoto, handleRecordVoice, isRecording
}) => {
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
        <View style={styles.screen}>
            <Modal visible={showCamera} animationType="slide">
                <View style={{ flex: 1 }}>
                    <CameraView style={StyleSheet.absoluteFillObject} ref={cameraRef} facing="front" />
                    <View style={styles.cameraButtonContainer}>
                        <TouchableOpacity style={styles.snapButton} onPress={onSnap}>
                            <Text style={styles.snapButtonText}>촬영하기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowCamera(false)}>
                            <Text style={styles.closeButtonText}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {flowState === 'input' && (
                <View style={styles.fixedScreen}>
                    <View>
                        <Text style={styles.title}>감정 기록하기</Text>
                        <Text style={styles.subtitle}>오늘의 감정을 다양한 방법으로 기록해보세요.</Text>

                        <View style={styles.card}>
                            <View style={styles.rowBetween}>
                                <Text style={styles.cardTitle}>지금의 기분을 글로 기록하기</Text>
                                <View style={styles.row}>
                                    <Text style={styles.charCount}>{textInput.length} / 500</Text>
                                    {textInput ? (
                                        <TouchableOpacity style={{ marginLeft: 8 }} onPress={() => setTextInput('')}>
                                            <Text style={styles.link}>다시 작성</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>
                            <TextInput
                                value={textInput}
                                onChangeText={setTextInput}
                                placeholder="여기에 오늘의 감정을 적어보세요..."
                                style={styles.textArea}
                                multiline
                                maxLength={500}
                            />
                        </View>

                        <View style={styles.rowBetween}>
                            <TouchableOpacity
                                style={styles.squareButton}
                                onPress={() => photoURI ? handleTakePhoto(null) : setShowCamera(true)}
                            >
                                <Text style={{ fontSize: 40 }}>{photoURI ? '✔️' : '📷'}</Text>
                                <Text style={styles.squareButtonLabel}>
                                    {photoURI ? '촬영 완료!' : '사진으로 기록하기'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.squareButton}
                                onPress={handleRecordVoice}
                            >
                                <Text style={{ fontSize: 40 }}>
                                    {soundURI ? '✔️' : (isRecording ? '⏹️' : '🎤')}
                                </Text>
                                <Text style={styles.squareButtonLabel}>
                                    {soundURI ? '녹음 완료!' : (isRecording ? '녹음 중지' : '음성으로 기록하기')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.primaryButton, { opacity: !photoURI && !soundURI && !textInput ? 0.5 : 1 }]}
                        disabled={!photoURI && !soundURI && !textInput}
                        onPress={handleAnalyze}
                    >
                        <Text style={styles.primaryButtonText}>분석하기</Text>
                    </TouchableOpacity>
                </View>
            )}

            {flowState === 'analyzing' && (
                <View style={styles.centerScreen}>
                    <Text style={{ fontSize: 80 }}>❤️</Text>
                    <Text style={styles.title}>마음을 들여다보는 중이에요</Text>
                    <Text style={styles.subtitle}>가장 따뜻한 위로의 말을 찾고 있습니다.</Text>
                </View>
            )}

            {flowState === 'chat' && analysisResult && (
                <ScrollView style={styles.scroll}>
                    <Text style={styles.title}>AI와의 대화</Text>
                    <View style={styles.chatBubble}>
                        <Text style={styles.chatText}>간단한 솔루션을 알려드릴게요! 지금 바로 해볼까요?</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{analysisResult.carePlan.title}</Text>
                        <Text style={styles.cardSubtitle}>진행 방법</Text>
                        <Text>{analysisResult.carePlan.method}</Text>
                        <Text style={styles.cardSubtitle}>효과</Text>
                        <Text>{analysisResult.carePlan.effect}</Text>
                        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#10B981', marginTop: 10 }]}>
                            <Text style={styles.primaryButtonText}>시작 {analysisResult.carePlan.duration}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </View>
    );
};

const ArchiveScreen = () => (
    <ScrollView style={styles.scroll}>
        <Text style={styles.title}>기록함</Text>
        <View style={styles.card}>
            <Text style={styles.cardTitle}>4-6 호흡법 리포트</Text>
            <Text>오늘의 호흡 세션을 성공적으로 마쳤어요.</Text>
        </View>
    </ScrollView>
);

const ReportScreen = () => (
    <ScrollView style={styles.scroll}>
        <Text style={styles.title}>주간 리포트</Text>
        <View style={styles.card}>
            <Text style={styles.cardTitle}>감정 트렌드</Text>
            <Text style={styles.subtitle}>지난 주 감정 변화를 확인해보세요.</Text>
        </View>
    </ScrollView>
);

const ProfileScreen = () => (
    <View style={styles.centerScreen}>
        <Text style={{ fontSize: 80 }}>👤</Text>
        <Text style={styles.title}>내 정보</Text>
        <Text style={styles.subtitle}>프로필 화면입니다.</Text>
    </View>
);


// =================================================================
// 메인 컴포넌트
// =================================================================

export default function IndexScreen() {
    const [screen, setScreen] = useState<'onboarding' | 'main'>('onboarding');
    const [activeTab, setActiveTab] = useState<'record' | 'archive' | 'report' | 'profile'>('record');
    const [flowState, setFlowState] = useState<'input' | 'analyzing' | 'chat'>('input');
    const [soundURI, setSoundURI] = useState<string | null>(null);
    const [photoURI, setPhotoURI] = useState<string | null>(null);
    const [textInput, setTextInput] = useState('');
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);
    
    useEffect(() => {
        (async () => {
            await Camera.requestCameraPermissionsAsync();
            const microphoneStatus = await Camera.requestMicrophonePermissionsAsync();
            setHasMicrophonePermission(microphoneStatus.status === 'granted');
        })();
    }, []);

    const handleTakePhoto = (uri: string | null) => {
        setPhotoURI(uri);
    };
    
    async function startRecording() {
        try {
            if (!hasMicrophonePermission) {
                alert('마이크 접근 권한이 필요합니다. 앱 설정에서 권한을 허용해주세요.');
                return;
            }
            
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            
            setIsRecording(true);
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);

        } catch (err) {
            console.error('Failed to start recording', err);
            alert('녹음을 시작하는 중 오류가 발생했습니다.');
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
        if (soundURI) {
            setSoundURI(null);
        } else if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleAnalyze = () => {
        setFlowState('analyzing');
        setTimeout(() => {
            const mockResult = {
                emotion: '불안 (Anxious)',
                carePlan: {
                    title: '4-6 호흡법',
                    method: '4초 동안 숨을 마시고, 6초 동안 숨을 내쉽니다. 이 과정을 반복합니다.',
                    effect: '심장 박동수가 안정되고, 즉각적인 진정 효과를 기대할 수 있습니다.',
                    difficulty: 1,
                    duration: '2분',
                },
            };
            setAnalysisResult(mockResult);
            setFlowState('chat');
        }, 3000);
    };

    const resetFlow = () => {
        setPhotoURI(null);
        setSoundURI(null);
        setTextInput('');
        setAnalysisResult(null);
        setFlowState('input');
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'record':
                return (
                    <RecordScreen
                        flowState={flowState}
                        textInput={textInput}
                        setTextInput={setTextInput}
                        photoURI={photoURI}
                        soundURI={soundURI}
                        handleAnalyze={handleAnalyze}
                        analysisResult={analysisResult}
                        handleTakePhoto={handleTakePhoto}
                        handleRecordVoice={handleRecordVoice}
                        isRecording={isRecording}
                    />
                );
            case 'archive':
                return <ArchiveScreen />;
            case 'report':
                return <ReportScreen />;
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
                { key: 'archive', label: '기록함', icon: '📂' },
                { key: 'report', label: '리포트', icon: '📊' },
                { key: 'profile', label: '내 정보', icon: '👤' },
            ].map((tab) => (
                <TouchableOpacity
                    key={tab.key}
                    onPress={() => {
                        resetFlow();
                        setActiveTab(tab.key as any);
                    }}
                    style={styles.tabButton}
                >
                    <Text style={{ fontSize: 24 }}>{tab.icon}</Text>
                    <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    if (screen === 'onboarding') {
        return <OnboardingScreen onStart={() => setScreen('main')} />;
    }

    return (
        <View style={styles.container}>
            {renderTabContent()}
            <BottomTabBar />
        </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1, padding: 16 },
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  fixedScreen: { flex: 1, padding: 16, justifyContent: 'space-between' },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textArea: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top', marginTop: 10 },
  primaryButton: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  onboardingButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#2563EB', fontWeight: '500' },
  squareButton: { width: '48%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  squareButtonLabel: { fontWeight: '600', marginTop: 8, color: '#374151' },
  chatBubble: { backgroundColor: '#E5E7EB', padding: 12, borderRadius: 16, alignSelf: 'flex-start', marginVertical: 8 },
  chatText: { color: '#111827' },
  charCount: { fontSize: 12, color: '#6B7280' },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  tabButton: { alignItems: 'center' },
  tabLabel: { fontSize: 12, color: '#6B7280' },
  tabLabelActive: { color: '#2563EB', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  // 👇 여기에 따옴표를 추가했습니다.
  description: { fontSize: 14, color: '#4B5563', textAlign: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 4, color: '#374151' },
  camera: {
    flex: 1,
  },
  cameraButtonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    margin: 20,
  },
  snapButton: {
    alignSelf: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 999,
    padding: 15,
    paddingHorizontal: 30,
    marginBottom: 10,
  },
  snapButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  closeButton: {
    alignSelf: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 999,
    padding: 10,
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  closeButtonText: {
    fontSize: 16,
    color: 'white',
  }
});