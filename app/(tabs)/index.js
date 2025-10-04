// app.js

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons'; // 아이콘 라이브러리

// --- Helper Components --- //
const Screen = ({ children }) => <SafeAreaView style={styles.mobileContainer}><View className="flex-1 p-6 pt-12 bg-[#F7F9FC]">{children}</View></SafeAreaView>;
const Card = ({ children, style }) => <View className={`bg-white rounded-2xl p-5 mb-5 shadow-sm ${style}`}>{children}</View>;
const Button = ({ title, onPress, icon, style, textStyle, disabled }) => (
    <TouchableOpacity 
        onPress={onPress} 
        className={`w-full p-4 rounded-xl flex-row items-center justify-center gap-2 shadow-md transition-transform active:scale-95 ${disabled ? 'bg-gray-400' : 'bg-blue-500'} ${style}`} 
        disabled={disabled}
        activeOpacity={0.8}
    >
        {icon}
        <Text className={`text-white text-lg font-bold ${textStyle}`}>{title}</Text>
    </TouchableOpacity>
);

// --- App Main Component --- //
export default function App() {
    const [screen, setScreen] = useState('onboarding');
    const [isRecording, setIsRecording] = useState(false);
    const [soundURI, setSoundURI] = useState(null);
    const [photoURI, setPhotoURI] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [feedback, setFeedback] = useState({ overall: null, helpfulAction: null });

    // 애니메이션 값 초기화
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const breatheAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Pulse 애니메이션
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.quad) })
            ])
        ).start();

        // Breathe 애니메이션
        Animated.loop(
            Animated.sequence([
                Animated.timing(breatheAnim, { toValue: 1.5, duration: 6000, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
                Animated.timing(breatheAnim, { toValue: 1, duration: 6000, useNativeDriver: true, easing: Easing.inOut(Easing.quad) })
            ])
        ).start();
    }, [pulseAnim, breatheAnim]);

    const handleAnalyze = () => {
        setScreen('analyzing');
        setTimeout(() => {
            const mockResult = {
                emotion: '불안 (Anxious)',
                valence: -3,
                arousal: 7,
                summary: '목소리 톤이 다소 빠르고 음량이 낮게 측정되었어요.',
                carePlan: {
                    breathing: { duration: 60, type: '4-7-8 호흡' },
                    actions: ['10분간 가볍게 산책하기', '따뜻한 물 한 잔 마시기', '오늘 감사했던 일 1가지 적기'],
                    music: '잔잔한 피아노 연주곡'
                }
            };
            setAnalysisResult(mockResult);
            setScreen('result');
        }, 3000);
    };

    const resetApp = () => {
        setPhotoURI(null);
        setSoundURI(null);
        setIsRecording(false);
        setAnalysisResult(null);
        setFeedback({ overall: null, helpfulAction: null });
        setScreen('input');
    };

    // --- Screen Rendering Logic --- //
    const renderOnboardingScreen = () => (
        <Screen>
            <View className="flex-1 justify-center items-center text-center p-5">
                <Ionicons name="happy-outline" size={80} color="#3B82F6" />
                <Text className="text-3xl font-bold text-gray-800 mt-4 mb-2">AI 감정 케어 앱</Text>
                <Text className="text-xl text-gray-600 mb-6">당신의 오늘 하루는 어땠나요?</Text>
                <Text className="text-gray-500 leading-relaxed text-center">
                    이 앱은 사용자의 표정, 목소리 등을 기반으로 감정을 분석하고 맞춤형 케어 솔루션을 제공합니다. 모든 데이터는 안전하게 보호됩니다.
                </Text>
            </View>
            <Button title="시작하기" onPress={() => setScreen('input')} icon={<Feather name="arrow-right" size={20} color="white" />} />
        </Screen>
    );

    const renderInputScreen = () => (
        <Screen>
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-3xl font-bold text-gray-800 mb-2 text-center">감정 기록하기</Text>
                <Text className="text-gray-500 mb-6 text-center">오늘의 감정을 다양한 방법으로 기록해보세요.</Text>
                
                <Card>
                    <View className="flex-row items-center mb-2">
                        <Feather name="camera" size={24} color="#3B82F6" />
                        <Text className="text-xl font-bold ml-3 text-gray-700">표정 기록</Text>
                    </View>
                    <Text className="text-gray-500 mb-4">현재 감정을 나타내는 표정을 촬영해주세요.</Text>
                    <View className="h-64 mt-3 rounded-xl overflow-hidden bg-gray-200 justify-center items-center text-center relative">
                        {photoURI ? (
                            <View className="w-full h-full flex-col items-center justify-center bg-gray-100">
                                <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                                <Text className="mt-2 font-bold text-green-600">촬영 완료!</Text>
                                <TouchableOpacity onPress={() => setPhotoURI(null)} className="absolute bottom-4 bg-black/50 py-2 px-4 rounded-full">
                                    <Text className="text-white text-sm">다시 촬영</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="w-full h-full bg-gray-700 flex-col items-center justify-end p-4">
                                <Text className="text-white text-sm mb-4">카메라 미리보기 화면</Text>
                                <TouchableOpacity onPress={() => setPhotoURI('simulated_photo.jpg')} className="w-16 h-16 rounded-full bg-white/50 border-4 border-white"></TouchableOpacity>
                            </View>
                        )}
                    </View>
                </Card>
                
                <Card>
                    <View className="flex-row items-center mb-2">
                        <Feather name="mic" size={24} color="#3B82F6" />
                        <Text className="text-xl font-bold ml-3 text-gray-700">음성 기록</Text>
                    </View>
                    <Text className="text-gray-500 mb-4">"오늘 하루 어땠어요?" 라는 질문에 10~15초간 자유롭게 답해주세요.</Text>
                    {soundURI ? (
                        <View className="text-center py-5 items-center">
                            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                            <Text className="mt-2 font-bold text-green-600">녹음 완료!</Text>
                            <TouchableOpacity onPress={() => { setSoundURI(null); setIsRecording(false); }}>
                                <Text className="text-gray-500 mt-1 text-sm">다시 녹음</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Button
                            title={isRecording ? "녹음 중지" : "녹음 시작"}
                            onPress={() => {
                                if (isRecording) {
                                    setSoundURI('simulated_sound.wav');
                                    setIsRecording(false);
                                } else {
                                    setIsRecording(true);
                                }
                            }}
                            icon={<Feather name={isRecording ? 'stop-circle' : 'mic'} size={20} color="white" />}
                            style={isRecording ? 'bg-red-500' : 'bg-blue-500'}
                        />
                    )}
                </Card>
            </ScrollView>
            
            <View className="pt-4 border-t border-gray-200">
                <Button title="분석하기" onPress={handleAnalyze} disabled={!photoURI || !soundURI} icon={<Feather name="bar-chart-2" size={20} color="white" />} style="bg-green-500" />
                <TouchableOpacity onPress={() => setScreen('report')} className="items-center mt-4">
                     <Text className="text-blue-500">주간 리포트 보기</Text>
                </TouchableOpacity>
            </View>
        </Screen>
    );

    const renderAnalyzingScreen = () => (
        <Screen>
            <View className="flex-1 justify-center items-center text-center">
                <Animated.View style={{ opacity: pulseAnim }}>
                    <Ionicons name="pulse" size={100} color="#3B82F6" />
                </Animated.View>
                <Text className="text-3xl font-bold text-gray-800 mt-6 mb-2">감정을 분석하고 있어요...</Text>
                <Text className="text-gray-500">잠시만 기다려주세요.</Text>
            </View>
        </Screen>
    );

    const renderResultScreen = () => {
        if (!analysisResult) return null;
        const valenceWidth = (analysisResult.valence + 5) * 10;
        const arousalWidth = analysisResult.arousal * 10;

        return (
            <Screen>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text className="text-3xl font-bold text-gray-800 mb-6 text-center">감정 분석 결과</Text>
                    <Card>
                        <Text className="text-3xl font-bold text-blue-500 text-center mb-2">{analysisResult.emotion}</Text>
                        <Text className="text-gray-500 text-center italic">"{analysisResult.summary}"</Text>
                    </Card>
                    <Card>
                        <Text className="text-xl font-bold text-gray-700 mb-4 text-center">감정 지표</Text>
                        <View>
                            <Text className="text-sm text-gray-600">Valence (쾌-불쾌)</Text>
                            <View className="w-full bg-gray-200 rounded-full h-3 my-1">
                                <View className="bg-blue-500 h-3 rounded-full" style={{ width: `${valenceWidth}%` }}></View>
                            </View>
                            <Text className="text-right text-xs text-gray-500">{analysisResult.valence}</Text>
                        </View>
                        <View className="mt-4">
                            <Text className="text-sm text-gray-600">Arousal (각성-이완)</Text>
                            <View className="w-full bg-gray-200 rounded-full h-3 my-1">
                                <View className="bg-orange-400 h-3 rounded-full" style={{ width: `${arousalWidth}%` }}></View>
                            </View>
                            <Text className="text-right text-xs text-gray-500">{analysisResult.arousal}</Text>
                        </View>
                    </Card>
                </ScrollView>
                <View className="pt-4 border-t border-gray-200">
                   <Button title="맞춤 케어 받기" onPress={() => setScreen('care')} icon={<Ionicons name="leaf-outline" size={20} color="white" />} />
                </View>
            </Screen>
        );
    };

    const renderCareScreen = () => {
        if (!analysisResult) return null;
        const { carePlan } = analysisResult;
        return (
            <Screen>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text className="text-3xl font-bold text-gray-800 mb-6 text-center">맞춤 케어 플랜</Text>
                    <Card>
                        <View className="flex-row items-center mb-4 justify-center">
                            <Ionicons name="sparkles-outline" size={24} color="#3B82F6" />
                            <Text className="text-xl font-bold ml-3 text-gray-700">{carePlan.breathing.duration}초 호흡 명상</Text>
                        </View>
                        <View className="h-48 justify-center items-center relative">
                             <Animated.View style={{ transform: [{ scale: breatheAnim }], position: 'absolute', width: 144, height: 144, borderRadius: 72, backgroundColor: '#DBEAFE' }} />
                            <Text className="mt-2 text-blue-600 font-semibold z-10">숨을 깊게 들이쉬고 내쉬세요</Text>
                        </View>
                    </Card>
                    <Card>
                        <View className="flex-row items-center mb-3 justify-center">
                            <Feather name="check-square" size={24} color="#3B82F6" />
                            <Text className="text-xl font-bold ml-3 text-gray-700">3가지 행동 카드</Text>
                        </View>
                        {carePlan.actions.map((action, index) => (
                            <View key={index} className="bg-gray-100 p-3 rounded-lg mt-2 flex-row items-center">
                                <Text className="text-green-500 mr-3 text-lg">✓</Text>
                                <Text className="text-gray-700">{action}</Text>
                            </View>
                        ))}
                    </Card>
                    <Card>
                        <View className="flex-row items-center mb-2 justify-center">
                            <Feather name="music" size={24} color="#3B82F6" />
                            <Text className="text-xl font-bold ml-3 text-gray-700">추천 음악</Text>
                        </View>
                        <Text className="text-gray-600 text-center">{carePlan.music}</Text>
                    </Card>
                </ScrollView>
                 <View className="pt-4 border-t border-gray-200">
                    <Button title="완료" onPress={() => setScreen('feedback')} icon={<Feather name="check" size={20} color="white" />} />
                </View>
            </Screen>
        );
    };
    
    const renderFeedbackScreen = () => {
        if (!analysisResult) return null;
        const { carePlan } = analysisResult;

        return (
            <Screen>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="items-center mb-8">
                        <Ionicons name="happy-outline" size={60} color="#3B82F6" />
                        <Text className="text-3xl font-bold text-gray-800 mt-4 mb-2">피드백 남기기</Text>
                    </View>
                    
                    <Card>
                        <Text className="text-xl font-bold text-gray-700 mb-4 text-center">케어 플랜이 감정 개선에 도움이 되었나요?</Text>
                        <View className="w-full space-y-3">
                             <TouchableOpacity onPress={() => setFeedback({...feedback, overall: 'good'})} className={`w-full p-4 rounded-xl border-2 transition-colors ${feedback.overall === 'good' ? 'bg-green-100 border-green-400' : 'bg-white border-gray-300'}`}>
                                <Text className="text-lg font-semibold text-green-700 text-center">네, 많이 좋아졌어요</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setFeedback({...feedback, overall: 'soso'})} className={`w-full p-4 rounded-xl border-2 transition-colors ${feedback.overall === 'soso' ? 'bg-yellow-100 border-yellow-400' : 'bg-white border-gray-300'}`}>
                                <Text className="text-lg font-semibold text-yellow-700 text-center">조금 나아졌어요</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setFeedback({...feedback, overall: 'bad'})} className={`w-full p-4 rounded-xl border-2 transition-colors ${feedback.overall === 'bad' ? 'bg-red-100 border-red-400' : 'bg-white border-gray-300'}`}>
                                <Text className="text-lg font-semibold text-red-700 text-center">별로 도움이 안됐어요</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>

                     <Card>
                        <Text className="text-xl font-bold text-gray-700 mb-4 text-center">어떤 활동이 가장 도움이 되었나요?</Text>
                        <View className="w-full space-y-3">
                        {carePlan.actions.map((action, index) => (
                                <TouchableOpacity 
                                    key={index}
                                    onPress={() => setFeedback({...feedback, helpfulAction: action})} 
                                    className={`w-full p-4 rounded-xl border-2 transition-colors ${feedback.helpfulAction === action ? 'bg-blue-100 border-blue-400' : 'bg-white border-gray-300'}`}>
                                    <Text className="text-lg font-semibold text-blue-700">{action}</Text>
                                </TouchableOpacity>
                        ))}
                        </View>
                    </Card>
                </ScrollView>
                <View className="pt-4 border-t border-gray-200">
                   <Button title="피드백 제출하기" onPress={resetApp} disabled={!feedback.overall || !feedback.helpfulAction} icon={<Feather name="send" size={20} color="white" />} />
                </View>
            </Screen>
        );
    };

    const renderReportScreen = () => (
        <Screen>
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-3xl font-bold text-gray-800 mb-2 text-center">주간 리포트</Text>
                <Text className="text-gray-500 mb-6 text-center">지난 한 주간의 감정 변화를 확인해보세요.</Text>
                <Card>
                    <Text className="text-xl font-bold text-gray-700 mb-4 text-center">감정 트렌드</Text>
                    <View className="flex-row items-end">
                        <View className="flex-col justify-between h-32 mr-2">
                            <Text className="text-xs text-gray-500">긍정적</Text>
                            <Text className="text-xs text-gray-500">부정적</Text>
                        </View>
                        <View className="flex-1 flex-row justify-around items-end h-32 p-2 border-l border-b border-gray-200">
                            {['월', '화', '수', '목', '금', '토', '일'].map((day, i) => (
                                <View key={day} className="text-center flex-col items-center justify-end h-full">
                                    <View className="bg-blue-400 rounded-t-md" style={{ height: `${[60, 80, 50, 70, 90, 40, 65][i]}%`, width: 20 }}></View>
                                    <Text className="text-xs text-gray-500 mt-1">{day}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                    <Text className="text-gray-500 mt-4 leading-relaxed text-center">이번 주는 '안정'과 '불안' 감정이 주로 나타났어요. 특히 목요일에 긍정적인 감정이 높았네요!</Text>
                </Card>
                <Card>
                    <Text className="text-xl font-bold text-gray-700 mb-2 text-center">가장 효과적인 케어</Text>
                    <Text className="text-gray-500 text-center">'10분 산책하기'가 감정 개선에 가장 큰 도움이 되었어요.</Text>
                </Card>
            </ScrollView>
            <View className="pt-4 border-t border-gray-200">
               <Button title="돌아가기" onPress={() => setScreen('input')} icon={<Feather name="arrow-left" size={20} color="white" />} />
            </View>
        </Screen>
    );

    switch (screen) {
        case 'input': return renderInputScreen();
        case 'analyzing': return renderAnalyzingScreen();
        case 'result': return renderResultScreen();
        case 'care': return renderCareScreen();
        case 'feedback': return renderFeedbackScreen();
        case 'report': return renderReportScreen();
        default: return renderOnboardingScreen();
    }
}

// 화면 전체를 감싸는 컨테이너 스타일 (원본의 mobile-container)
const styles = StyleSheet.create({
    mobileContainer: {
        flex: 1,
    }
});