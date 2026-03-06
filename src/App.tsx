/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Train, 
  MapPin, 
  Camera, 
  ChevronRight, 
  RefreshCw, 
  CheckCircle2, 
  Trophy,
  Info,
  ArrowLeft,
  Share2,
  UtensilsCrossed
} from 'lucide-react';
import { METRO_LINES, MetroLine, Station } from './constants';
import { generateQuest, SanpoQuest } from './services/geminiService';
import StationLogo from './components/StationLogo';

type AppState = 'START' | 'SETUP' | 'WALKING' | 'SUMMARY';
type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

interface WalkHistory {
  from: Station;
  to: Station;
  quest: SanpoQuest;
  photo?: string;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MetroLogo = ({ className = "" }: { className?: string }) => (
  <div className={`aspect-square flex items-center justify-center ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0078D4" stopOpacity="1" />
          <stop offset="100%" stopColor="#005A9E" stopOpacity="1" />
        </linearGradient>
      </defs>

      <path 
        d="M10 80 L30 30 L50 80 L70 30 L90 80" 
        stroke="url(#blueGradient)" 
        strokeWidth="8" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      <circle cx="30" cy="30" r="4" fill="#E8F4F8" stroke="#0078D4" strokeWidth="2" />
      <circle cx="50" cy="80" r="4" fill="#E8F4F8" stroke="#0078D4" strokeWidth="2" />
      <circle cx="70" cy="30" r="4" fill="#E8F4F8" stroke="#0078D4" strokeWidth="2" />

      <path d="M45 45 C40 45, 38 48, 40 52 C42 56, 48 56, 50 52 C52 48, 50 45, 45 45 Z" fill="url(#blueGradient)" />
      <circle cx="43" cy="40" r="3" fill="url(#blueGradient)" />
      <circle cx="50" cy="38" r="3" fill="url(#blueGradient)" />
      <circle cx="57" cy="40" r="3" fill="url(#blueGradient)" />
    </svg>
  </div>
);

const LineLogo = ({ line, size = "w-8 h-8", fontSize = "text-xs" }: { line: MetroLine, size?: string, fontSize?: string }) => (
  <div className="p-1 inline-block">
    <div 
      className={`${size} rounded-full flex items-center justify-center relative`}
      style={{ backgroundColor: line.color }}
    >
      <div className="w-1/2 h-1/2 bg-white rounded-full flex items-center justify-center">
        <span className={`${fontSize} font-bold leading-none text-black`} style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
          {line.id}
        </span>
      </div>
    </div>
  </div>
);

export default function App() {
  const [state, setState] = useState<AppState>('START');
  const [selectedLine, setSelectedLine] = useState<MetroLine | null>(null);
  const [teamName, setTeamName] = useState('同期三人衆');
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [startStationIndex, setStartStationIndex] = useState(0);
  const [endStationIndex, setEndStationIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuest, setCurrentQuest] = useState<SanpoQuest | null>(null);
  const [isLoadingQuest, setIsLoadingQuest] = useState(false);
  const [history, setHistory] = useState<WalkHistory[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showFoodDialog, setShowFoodDialog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isReverse = selectedLine ? startStationIndex > endStationIndex : false;
  const step = isReverse ? -1 : 1;
  const totalSteps = selectedLine ? Math.abs(endStationIndex - startStationIndex) : 0;
  const currentStep = selectedLine ? Math.abs(currentIndex - startStationIndex) : 0;

  const totalDistance = selectedLine ? (() => {
    let dist = 0;
    const start = Math.min(startStationIndex, endStationIndex);
    const end = Math.max(startStationIndex, endStationIndex);
    
    // Bounds check for the loop
    const maxIdx = selectedLine.stations.length - 1;
    const safeStart = Math.max(0, Math.min(start, maxIdx));
    const safeEnd = Math.max(0, Math.min(end, maxIdx));

    for (let i = safeStart; i < safeEnd; i++) {
      const s1 = selectedLine.stations[i];
      const s2 = selectedLine.stations[i + 1];
      if (s1 && s2) {
        dist += calculateDistance(s1.lat, s1.lng, s2.lat, s2.lng);
      }
    }
    return dist;
  })() : 0;

  const distanceToNext = (selectedLine && currentIndex !== endStationIndex) ? (() => {
    const s1 = selectedLine.stations[currentIndex];
    const s2 = selectedLine.stations[currentIndex + step];
    if (!s1 || !s2) return 0;
    return calculateDistance(s1.lat, s1.lng, s2.lat, s2.lng);
  })() : 0;

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('metro-walker-state');
    const savedLineId = localStorage.getItem('metro-walker-line-id');
    const savedTeamName = localStorage.getItem('metro-walker-team-name');
    const savedDifficulty = localStorage.getItem('metro-walker-difficulty');
    const savedStartIndex = localStorage.getItem('metro-walker-start-index');
    const savedEndIndex = localStorage.getItem('metro-walker-end-index');
    const savedIndex = localStorage.getItem('metro-walker-index');
    const savedHistory = localStorage.getItem('metro-walker-history');

    if (savedTeamName) setTeamName(savedTeamName);
    if (savedDifficulty) setDifficulty(savedDifficulty as Difficulty);
    if (savedStartIndex) setStartStationIndex(parseInt(savedStartIndex, 10));
    if (savedEndIndex) setEndStationIndex(parseInt(savedEndIndex, 10));
    if (savedState) setState(savedState as AppState);
    if (savedLineId) {
      const line = METRO_LINES.find(l => l.id === savedLineId);
      if (line) setSelectedLine(line);
    }
    if (savedIndex) setCurrentIndex(parseInt(savedIndex, 10));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('metro-walker-state', state);
    localStorage.setItem('metro-walker-team-name', teamName);
    localStorage.setItem('metro-walker-difficulty', difficulty);
    localStorage.setItem('metro-walker-start-index', startStationIndex.toString());
    localStorage.setItem('metro-walker-end-index', endStationIndex.toString());
    if (selectedLine) localStorage.setItem('metro-walker-line-id', selectedLine.id);
    localStorage.setItem('metro-walker-index', currentIndex.toString());
    localStorage.setItem('metro-walker-history', JSON.stringify(history));
  }, [state, selectedLine, currentIndex, history, teamName, difficulty, startStationIndex, endStationIndex]);

  // Load quest when moving to next station
  useEffect(() => {
    if (state === 'WALKING' && selectedLine && currentIndex !== endStationIndex) {
      fetchNextQuest();
    }
  }, [currentIndex, state, endStationIndex, selectedLine]);

  const fetchNextQuest = async (isFoodChallenge: boolean = false) => {
    if (!selectedLine) return;
    const nextIdx = currentIndex + step;
    if (nextIdx < 0 || nextIdx >= selectedLine.stations.length) return;

    setIsLoadingQuest(true);
    const current = selectedLine.stations[currentIndex]?.name || "";
    const next = selectedLine.stations[nextIdx]?.name || "";
    if (!current || !next) {
      setIsLoadingQuest(false);
      return;
    }
    const quest = await generateQuest(current, next, selectedLine.name, difficulty, isFoodChallenge);
    setCurrentQuest(quest);
    setIsLoadingQuest(false);
  };

  const handleSelectLine = (line: MetroLine) => {
    setSelectedLine(line);
    setStartStationIndex(0);
    setEndStationIndex(line.stations.length - 1);
    setCurrentIndex(0);
    setState('SETUP');
  };

  const handleStartWalk = () => {
    if (!selectedLine) return;
    if (startStationIndex === endStationIndex) {
      setSetupError('スタート駅とゴール駅は別の駅にしてください。');
      return;
    }
    setSetupError(null);
    setCurrentIndex(startStationIndex);
    setHistory([]);
    setState('WALKING');
  };

  const handleNextStation = () => {
    if (!selectedLine || !currentQuest) return;

    const nextIdx = currentIndex + step;
    const fromStation = selectedLine.stations[currentIndex];
    const toStation = selectedLine.stations[nextIdx];
    if (!fromStation || !toStation) return;

    const newHistoryItem: WalkHistory = {
      from: fromStation,
      to: toStation,
      quest: currentQuest,
      photo: capturedPhoto || undefined,
    };

    setHistory([...history, newHistoryItem]);
    setCapturedPhoto(null);

    if (nextIdx === endStationIndex) {
      setState('SUMMARY');
    } else {
      setCurrentIndex(nextIdx);
      // Every 5 stations (relative to start), ask for food mission
      const relativeIdx = Math.abs(nextIdx - startStationIndex);
      if (relativeIdx > 0 && relativeIdx % 5 === 0) {
        setShowFoodDialog(true);
      }
    }
  };

  const handleFoodChallengeResponse = (accept: boolean) => {
    setShowFoodDialog(false);
    fetchNextQuest(accept);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // 1. 読み込んだ画像をImageオブジェクトにする
      const img = new Image();
      img.onload = () => {
        // 2. 最大サイズを決める（ここでは横幅最大800px）
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height *= MAX_WIDTH / width));
          width = MAX_WIDTH;
        }

        // 3. Canvasという仮想の画用紙を作って、縮小した画像を描き込む
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          // 4. 画像をJPEG形式にし、画質を70% (0.7) に落として軽量化！
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          // 5. 軽くなった画像をセットする
          setCapturedPhoto(compressedDataUrl);
        }
      };
      
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const resetApp = () => {
    localStorage.removeItem('metro-walker-state');
    localStorage.removeItem('metro-walker-line-id');
    localStorage.removeItem('metro-walker-index');
    localStorage.removeItem('metro-walker-history');
    localStorage.removeItem('metro-walker-team-name');
    localStorage.removeItem('metro-walker-difficulty');
    localStorage.removeItem('metro-walker-start-index');
    localStorage.removeItem('metro-walker-end-index');
    
    setState('START');
    setSelectedLine(null);
    setCurrentIndex(0);
    setCurrentQuest(null);
    setHistory([]);
    setCapturedPhoto(null);
    setTeamName('同期三人衆');
    setDifficulty('NORMAL');
    setShowResetConfirm(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-neutral-200">
      <div className="max-w-md mx-auto min-h-screen flex flex-col shadow-xl bg-white relative overflow-hidden">
        
        {/* Header */}
        <header className="p-4 border-b border-neutral-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {state !== 'START' && (
                selectedLine ? (
                  <motion.div 
                    key="line-logo"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(4px)' }}
                    transition={{ duration: 1.0, ease: "easeInOut" }}
                    className="flex items-center gap-2"
                  >
                    <LineLogo line={selectedLine} />
                    <h1 className="font-bold text-lg tracking-tight">{selectedLine.name}</h1>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="default-logo"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <MetroLogo className="w-8" />
                    <h1 className="font-black text-xl tracking-tighter">MetroWalker</h1>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
          {state !== 'START' && (
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="text-xs font-semibold text-neutral-400 hover:text-neutral-600 transition-colors uppercase tracking-widest"
            >
              Reset
            </button>
          )}
        </header>

        {/* Reset Confirmation Dialog */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 w-full max-w-sm space-y-6 shadow-2xl"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold">リセットしますか？</h3>
                  <p className="text-neutral-500 text-sm">これまでの記録がすべて消去されます。よろしいですか？</p>
                </div>
                <div className="grid gap-3">
                  <button 
                    onClick={resetApp}
                    className="w-full bg-red-500 text-white p-4 rounded-2xl font-bold hover:bg-red-600 transition-all"
                  >
                    リセットする
                  </button>
                  <button 
                    onClick={() => setShowResetConfirm(false)}
                    className="w-full bg-neutral-100 text-neutral-500 p-4 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                  >
                    キャンセル
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto pb-24">
          <AnimatePresence mode="wait">
            
            {/* START STATE */}
            {state === 'START' && (
              <motion.div 
                key="start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-6 space-y-8"
              >
                <div className="flex items-center gap-4 mb-8">
                  <MetroLogo className="w-32 flex-shrink-0" />
                  <div className="space-y-0">
                    <h2 className="text-3xl font-black leading-tight tracking-tighter">MetroWalker</h2>
                    <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-[0.3em]">Adventure Setup</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Team Name</label>
                    <input 
                      type="text" 
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-neutral-100 bg-neutral-50 focus:border-neutral-900 outline-none transition-all font-bold"
                      placeholder="チーム名を入力"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Difficulty</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`p-3 rounded-xl text-xs font-bold border-2 transition-all ${
                            difficulty === d 
                            ? 'bg-neutral-900 border-neutral-900 text-white' 
                            : 'bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Line</label>
                  <div className="grid gap-3">
                    {METRO_LINES.map((line) => (
                      <button
                        key={line.id}
                        onClick={() => handleSelectLine(line)}
                        className="group relative flex items-center justify-between p-4 rounded-2xl border border-neutral-100 bg-white hover:border-neutral-300 hover:shadow-md transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <LineLogo line={line} size="w-10 h-10" fontSize="text-lg" />
                          <div>
                            <div className="font-bold text-neutral-800">{line.name}</div>
                            <div className="text-xs text-neutral-400">{line.stations.length} 駅</div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SETUP STATE */}
            {state === 'SETUP' && selectedLine && (
              <motion.div 
                key="setup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-8"
              >
                <button 
                  onClick={() => setState('START')}
                  className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                </button>

                <div className="space-y-2">
                  <h2 className="text-3xl font-bold leading-tight">区間を設定</h2>
                  <p className="text-neutral-500 text-sm">{selectedLine.name} のどこからどこまで歩きますか？</p>
                </div>

                <div className="space-y-6">
                  {setupError && (
                    <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">
                      {setupError}
                    </div>
                  )}
                  
                  {selectedLine && (
                    <div className="p-4 bg-neutral-900 text-white rounded-2xl flex justify-between items-center">
                      <div>
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Distance</div>
                        <div className="text-xl font-bold">{totalDistance.toFixed(2)} km</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Stations</div>
                        <div className="text-xl font-bold">{totalSteps + 1}</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Start Station</label>
                    <select 
                      value={startStationIndex}
                      onChange={(e) => setStartStationIndex(parseInt(e.target.value, 10))}
                      className="w-full p-4 rounded-2xl border border-neutral-100 bg-neutral-50 font-bold outline-none appearance-none"
                    >
                      {selectedLine.stations.map((s, i) => (
                        <option key={i} value={i}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-center">
                    <ChevronRight className="w-6 h-6 text-neutral-300 rotate-90" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Goal Station</label>
                    <select 
                      value={endStationIndex}
                      onChange={(e) => setEndStationIndex(parseInt(e.target.value, 10))}
                      className="w-full p-4 rounded-2xl border border-neutral-100 bg-neutral-50 font-bold outline-none appearance-none"
                    >
                      {selectedLine.stations.map((s, i) => (
                        <option key={i} value={i}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleStartWalk}
                  className="w-full bg-neutral-900 text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-95 transition-all"
                >
                  <span>Start Journey</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* WALKING STATE */}
            {state === 'WALKING' && selectedLine && (
              <motion.div 
                key="walking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 space-y-6"
              >
                {/* Food Mission Dialog */}
                <AnimatePresence>
                  {showFoodDialog && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
                    >
                      <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-white rounded-3xl p-8 w-full max-w-sm space-y-6 shadow-2xl"
                      >
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                          <UtensilsCrossed className="w-8 h-8 text-amber-600" />
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="text-2xl font-bold">食のミッション！</h3>
                          <p className="text-neutral-500 text-sm">5駅歩きましたね。この街ならではの「食ミッション」にチャレンジしますか？</p>
                        </div>
                        <div className="grid gap-3">
                          <button 
                            onClick={() => handleFoodChallengeResponse(true)}
                            className="w-full bg-neutral-900 text-white p-4 rounded-2xl font-bold hover:bg-neutral-800 transition-all"
                          >
                            チャレンジする！
                          </button>
                          <button 
                            onClick={() => handleFoodChallengeResponse(false)}
                            className="w-full bg-neutral-100 text-neutral-500 p-4 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                          >
                            今回はパス
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-neutral-400 uppercase tracking-widest">
                    <span>Progress</span>
                    <span>{currentStep + 1} / {totalSteps + 1}</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full"
                      style={{ backgroundColor: selectedLine.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentStep + 1) / (totalSteps + 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Current Segment */}
                <div className="flex items-center justify-between bg-neutral-50 p-4 rounded-2xl border border-neutral-100 relative overflow-hidden">
                  <div className="text-center flex-1 z-10 flex flex-col items-center">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter mb-2">Current</div>
                    <StationLogo 
                      line={selectedLine} 
                      stationNumber={(currentIndex + 1).toString().padStart(2, '0')} 
                      size="w-10 h-10" 
                      fontSize="text-xl"
                      numberFontSize="text-xs"
                    />
                    <div className="font-bold text-sm mt-1">{selectedLine.stations[currentIndex]?.name}</div>
                    <div className="text-[8px] font-mono text-neutral-400 mt-1">
                      {selectedLine.stations[currentIndex]?.lat.toFixed(4)}, {selectedLine.stations[currentIndex]?.lng.toFixed(4)}
                    </div>
                  </div>
                  <div className="px-2 z-10 flex flex-col items-center gap-1">
                    <ChevronRight className="w-6 h-6 text-neutral-300" />
                    <div className="text-[10px] font-bold text-neutral-400">{distanceToNext.toFixed(2)}km</div>
                  </div>
                  <div className="text-center flex-1 z-10 flex flex-col items-center">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter mb-2">Next</div>
                    <StationLogo 
                      line={selectedLine} 
                      stationNumber={(currentIndex + step + 1).toString().padStart(2, '0')} 
                      size="w-10 h-10" 
                      fontSize="text-xl"
                      numberFontSize="text-xs"
                    />
                    <div className="font-bold text-sm mt-1">{selectedLine.stations[currentIndex + step]?.name}</div>
                    <div className="text-[8px] font-mono text-neutral-400 mt-1">
                      {selectedLine.stations[currentIndex + step]?.lat.toFixed(4)}, {selectedLine.stations[currentIndex + step]?.lng.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Quest Card */}
                <div className="relative">
                  <div className="absolute -top-3 left-6 px-3 py-1 bg-neutral-900 text-white text-[10px] font-bold rounded-full uppercase tracking-widest z-10">
                    Sanpo Mission
                  </div>
                  <div className="bg-white border-2 border-neutral-900 rounded-3xl p-6 pt-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
                    {isLoadingQuest ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-4">
                        <RefreshCw className="w-8 h-8 text-neutral-300 animate-spin" />
                        <p className="text-sm text-neutral-400 font-medium">ミッションを考案中...</p>
                      </div>
                    ) : currentQuest ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs font-bold text-neutral-400 mb-1 italic">Theme:</div>
                            <h3 className="text-xl font-bold text-neutral-900 leading-tight">
                              {currentQuest.theme}
                            </h3>
                          </div>
                          <button 
                            onClick={() => fetchNextQuest(currentQuest.isFoodMission)}
                            disabled={isLoadingQuest}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-50 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-all border border-neutral-100"
                            title="ミッションを変更"
                          >
                            <RefreshCw className={`w-3 h-3 ${isLoadingQuest ? 'animate-spin' : ''}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                          </button>
                        </div>
                        <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                          <div className="text-xs font-bold text-neutral-400 mb-2 uppercase tracking-widest">Mission</div>
                          <p className="text-neutral-800 font-medium leading-relaxed">
                            {currentQuest.mission}
                          </p>
                        </div>
                        <div className="flex gap-3 items-start text-neutral-500">
                          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                          <p className="text-xs leading-relaxed italic">
                            {currentQuest.hint}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-neutral-400">
                        ミッションの取得に失敗しました。
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4">
                  <div className="flex gap-3">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-bold ${
                        capturedPhoto 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                        : 'bg-white border-neutral-100 text-neutral-600 hover:border-neutral-300'
                      }`}
                    >
                      {capturedPhoto ? <CheckCircle2 className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                      {capturedPhoto ? 'Photo Added' : 'Add Photo'}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePhotoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>

                  <button 
                    onClick={handleNextStation}
                    disabled={isLoadingQuest}
                    className="w-full bg-neutral-900 text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span>Next Station</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* History Preview */}
                {history.length > 0 && (
                  <div className="pt-8 space-y-4">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Recent Journey</h4>
                    <div className="space-y-3">
                      {history.slice().reverse().map((item, i) => (
                        <div key={i} className="flex gap-4 items-start p-3 bg-white rounded-xl border border-neutral-100">
                          <div className="w-10 h-10 rounded-lg bg-neutral-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {item.photo ? (
                              <img src={item.photo} alt="Check-in" className="w-full h-full object-cover" />
                            ) : (
                              <MapPin className="w-5 h-5 text-neutral-300" />
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                              <StationLogo 
                                line={selectedLine} 
                                stationNumber={(selectedLine.stations.findIndex(s => s.name === item.from.name) + 1).toString().padStart(2, '0')} 
                                size="w-4 h-4" 
                                fontSize="text-[8px]"
                                numberFontSize="text-[6px]"
                              />
                              {item.from.name} 
                              <ChevronRight className="w-2 h-2" /> 
                              <StationLogo 
                                line={selectedLine} 
                                stationNumber={(selectedLine.stations.findIndex(s => s.name === item.to.name) + 1).toString().padStart(2, '0')} 
                                size="w-4 h-4" 
                                fontSize="text-[8px]"
                                numberFontSize="text-[6px]"
                              />
                              {item.to.name}
                            </div>
                            <div className="text-sm font-bold text-neutral-700">{item.quest.theme}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* SUMMARY STATE */}
            {state === 'SUMMARY' && selectedLine && (
              <motion.div 
                key="summary"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 space-y-8 text-center"
              >
                <div className="py-8 space-y-4">
                  <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl font-bold">制覇完了！</h2>
                    <p className="text-neutral-500">東京メトロ {selectedLine.name} を歩き切りました。</p>
                  </div>
                </div>

                <div className="bg-neutral-900 text-white p-6 rounded-3xl space-y-6 text-left">
                  <div className="flex justify-between items-end border-b border-white/10 pb-4">
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Walk</div>
                      <div className="text-2xl font-bold">{totalDistance.toFixed(2)} km</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Team</div>
                      <div className="text-sm font-bold">{teamName}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-b border-white/10 pb-4">
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Stations</div>
                      <div className="text-sm font-bold">{totalSteps + 1}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Difficulty</div>
                      <div className="text-sm font-bold">{difficulty}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Route</div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <StationLogo 
                            line={selectedLine} 
                            stationNumber={(startStationIndex + 1).toString().padStart(2, '0')} 
                            size="w-8 h-8" 
                            fontSize="text-sm"
                            numberFontSize="text-[10px]"
                          />
                          <div className="text-[10px] font-bold mt-1 text-center">{selectedLine.stations[startStationIndex]?.name}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                        <div className="flex flex-col items-center">
                          <StationLogo 
                            line={selectedLine} 
                            stationNumber={(endStationIndex + 1).toString().padStart(2, '0')} 
                            size="w-8 h-8" 
                            fontSize="text-sm"
                            numberFontSize="text-[10px]"
                          />
                          <div className="text-[10px] font-bold mt-1 text-center">{selectedLine.stations[endStationIndex]?.name}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Journey Highlights</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {history.filter(h => h.photo).slice(0, 6).map((item, i) => (
                        <div key={i} className="aspect-square rounded-lg bg-white/5 overflow-hidden border border-white/10">
                          <img src={item.photo} alt="Memory" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => {}} // Placeholder for share
                    className="w-full bg-neutral-100 text-neutral-900 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Share Journey</span>
                  </button>
                  <button 
                    onClick={resetApp}
                    className="w-full text-neutral-400 p-4 rounded-2xl font-bold hover:text-neutral-600 transition-all"
                  >
                    Back to Home
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* Bottom Navigation (Floating) */}
        {state === 'WALKING' && (
          <div className="absolute bottom-6 left-6 right-6 z-30">
            <div className="bg-white/90 backdrop-blur-md border border-neutral-100 p-2 rounded-2xl shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 px-2">
                {selectedLine && <LineLogo line={selectedLine} size="w-8 h-8" fontSize="text-xs" />}
                <div className="text-xs font-bold text-neutral-800 truncate max-w-[100px]">
                  {selectedLine?.stations[currentIndex]?.name || 'Station'}
                </div>
              </div>
              <div className="h-8 w-[1px] bg-neutral-100 mx-2" />
              <div className="flex-1 text-right px-2">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Next</div>
                <div className="text-xs font-bold text-neutral-800 truncate">
                  {selectedLine?.stations[currentIndex + step]?.name || 'Goal'}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
