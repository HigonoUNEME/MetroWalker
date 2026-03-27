/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Train, MapPin, Camera, ChevronRight, RefreshCw, CheckCircle2, Trophy,
  Info, ArrowLeft, Share2, UtensilsCrossed, Clock, Map, Loader2, X
} from 'lucide-react';

import { METRO_LINES, MetroLine, Station } from './constants';
import { SanpoQuest } from './data/missionBank';
import { generateQuestLocal } from './data/stationData';
import StationLogo from './components/StationLogo';
import LineLogo from './components/LineLogo';

type AppState = 'START' | 'SETUP' | 'SHARE' | 'WALKING' | 'SUMMARY';
type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

interface WalkHistory {
  from: Station;
  to: Station;
  quest: SanpoQuest;
  photo?: string;
  timeTakenMs?: number;
  timestamp?: number;
}

// 共通ユーティリティ
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDMS = (coordinate: number, isLat: boolean): string => {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutes = Math.floor((absolute - degrees) * 60);
  const seconds = (((absolute - degrees) * 60 - minutes) * 60).toFixed(1);
  const direction = coordinate >= 0 ? (isLat ? 'N' : 'E') : (isLat ? 'S' : 'W');
  return `${degrees}°${minutes}'${seconds}"${direction}`;
};

const formatTimeMs = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}時間${minutes}分${seconds}秒`;
  return `${minutes}分${seconds}秒`;
};

const TimerDisplay = ({ startTime }: { startTime: number }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const elapsed = Math.max(0, now - startTime);
  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return <div className="font-mono font-bold text-xl tracking-wider text-neutral-800">{hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`}</div>;
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
      <path d="M10 80 L30 30 L50 80 L70 30 L90 80" stroke="url(#blueGradient)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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

export default function App() {
  const [state, setState] = useState<AppState>('START');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<MetroLine | null>(null);
  const [teamName, setTeamName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [startStationIndex, setStartStationIndex] = useState(0);
  const [endStationIndex, setEndStationIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuest, setCurrentQuest] = useState<SanpoQuest | null>(null);
  const [questAttempt, setQuestAttempt] = useState(0);
  const [history, setHistory] = useState<WalkHistory[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showFoodDialog, setShowFoodDialog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [lastStationTime, setLastStationTime] = useState<number | null>(null);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isReverse = selectedLine ? startStationIndex > endStationIndex : false;
  const step = isReverse ? -1 : 1;
  const totalSteps = selectedLine ? Math.abs(endStationIndex - startStationIndex) : 0;
  const currentStep = selectedLine ? Math.abs(currentIndex - startStationIndex) : 0;

  const totalDistance = selectedLine ? (() => {
    let dist = 0;
    const start = Math.min(startStationIndex, endStationIndex);
    const end = Math.max(startStationIndex, endStationIndex);
    for (let i = start; i < end; i++) {
      const s1 = selectedLine.stations[i], s2 = selectedLine.stations[i + 1];
      if (s1 && s2) dist += calculateDistance(s1.lat, s1.lng, s2.lat, s2.lng);
    }
    return dist;
  })() : 0;

  const distanceToNext = (selectedLine && currentIndex !== endStationIndex) ? (() => {
    const s1 = selectedLine.stations[currentIndex], s2 = selectedLine.stations[currentIndex + step];
    if (!s1 || !s2) return 0;
    return calculateDistance(s1.lat, s1.lng, s2.lat, s2.lng);
  })() : 0;

  // 1. 初期読み込み ＆ 招待URL解析
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('r');
    const savedRoomId = localStorage.getItem('metro-walker-room-id');

    if (r) {
      const l = params.get('l'), s = params.get('s'), e = params.get('e'), d = params.get('d');
      const line = METRO_LINES.find(x => x.id === l);
      if (line) {
        setSelectedLine(line); setStartStationIndex(Number(s)); setEndStationIndex(Number(e));
        setDifficulty(d as Difficulty); setRoomId(r);
        if (savedRoomId === r) {
          const savedState = localStorage.getItem('metro-walker-state');
          if (savedState === 'WALKING' || savedState === 'SUMMARY') {
            setState(savedState as AppState);
            setTeamName(localStorage.getItem('metro-walker-team-name') || '');
            setCurrentIndex(Number(localStorage.getItem('metro-walker-index') || 0));
            setHistory(JSON.parse(localStorage.getItem('metro-walker-history') || '[]'));
            setStartTime(Number(localStorage.getItem('metro-walker-start-time') || 0));
            setQuestAttempt(Number(localStorage.getItem('metro-walker-attempt') || 0));
            return;
          }
        }
        setState('SHARE');
      }
    } else if (savedRoomId) {
      setRoomId(savedRoomId);
      setState(localStorage.getItem('metro-walker-state') as AppState || 'START');
      setTeamName(localStorage.getItem('metro-walker-team-name') || '');
      setDifficulty(localStorage.getItem('metro-walker-difficulty') as Difficulty || 'NORMAL');
      const savedLineId = localStorage.getItem('metro-walker-line-id');
      if (savedLineId) setSelectedLine(METRO_LINES.find(l => l.id === savedLineId) || null);
      setStartStationIndex(Number(localStorage.getItem('metro-walker-start-index') || 0));
      setEndStationIndex(Number(localStorage.getItem('metro-walker-end-index') || 0));
      setCurrentIndex(Number(localStorage.getItem('metro-walker-index') || 0));
      setHistory(JSON.parse(localStorage.getItem('metro-walker-history') || '[]'));
      setStartTime(Number(localStorage.getItem('metro-walker-start-time') || 0));
      setQuestAttempt(Number(localStorage.getItem('metro-walker-attempt') || 0));
    }
  }, []);

  // 2. スマホへの保存
  useEffect(() => {
    if (!roomId) return;
    localStorage.setItem('metro-walker-room-id', roomId);
    localStorage.setItem('metro-walker-state', state);
    localStorage.setItem('metro-walker-team-name', teamName);
    localStorage.setItem('metro-walker-difficulty', difficulty);
    localStorage.setItem('metro-walker-start-index', startStationIndex.toString());
    localStorage.setItem('metro-walker-end-index', endStationIndex.toString());
    if (selectedLine) localStorage.setItem('metro-walker-line-id', selectedLine.id);
    localStorage.setItem('metro-walker-index', currentIndex.toString());
    localStorage.setItem('metro-walker-history', JSON.stringify(history));
    if (startTime) localStorage.setItem('metro-walker-start-time', startTime.toString());
    localStorage.setItem('metro-walker-attempt', questAttempt.toString());
  }, [state, currentIndex, history, teamName, startTime, questAttempt, roomId, difficulty, selectedLine, startStationIndex, endStationIndex]);

  // 同期関数
  const pushRoomState = (overrides: any = {}) => {
    if (!roomId) return;
    const payload = { currentIndex, history, startTime, capturedPhoto, questAttempt, state, ...overrides };
    fetch(`/api/room/${roomId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).catch(e => console.error("Sync Error", e));
  };

  // 3秒おきの同期
  useEffect(() => {
    if (state === 'START' || state === 'SETUP' || !roomId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/${roomId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.startTime) {
          if (!startTime || Math.abs(startTime - data.startTime) > 1000) setStartTime(data.startTime);
          if (data.history && data.history.length > history.length) {
            setHistory(data.history); setCurrentIndex(data.currentIndex);
            setCapturedPhoto(data.capturedPhoto || null); setQuestAttempt(data.questAttempt || 0);
            setCurrentQuest(null);
          }
          if (data.capturedPhoto !== capturedPhoto) setCapturedPhoto(data.capturedPhoto || null);
          if (data.questAttempt !== undefined && data.questAttempt !== questAttempt) {
            setQuestAttempt(data.questAttempt); setCurrentQuest(null);
          }
          if (data.state === 'SUMMARY' && state !== 'SUMMARY') setState('SUMMARY');
        }
      } catch(e) {}
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [state, roomId, history.length, capturedPhoto, startTime, questAttempt]);

  // お題生成
  useEffect(() => {
    if (state === 'WALKING' && selectedLine && currentIndex !== endStationIndex && !currentQuest) {
      const current = selectedLine.stations[currentIndex]?.name || "";
      setCurrentQuest(generateQuestLocal(roomId || "SOLO", current, difficulty, false, questAttempt));
    }
  }, [currentIndex, state, selectedLine, currentQuest, questAttempt, roomId, difficulty, endStationIndex]);

  const handleStartWalk = async () => {
    if (!roomId) return;
    let targetTime = Date.now();
    let targetIdx = startStationIndex;
    let targetHist = [];
    let targetAttempt = 0;
    try {
      const res = await fetch(`/api/room/${roomId}`);
      const data = await res.json();
      if (data && data.startTime) {
        targetTime = data.startTime; targetIdx = data.currentIndex; 
        targetHist = data.history || []; targetAttempt = data.questAttempt || 0;
      }
    } catch (e) {}
    setStartTime(targetTime); setCurrentIndex(targetIdx); setHistory(targetHist); 
    setQuestAttempt(targetAttempt); setState('WALKING');
    pushRoomState({ startTime: targetTime, currentIndex: targetIdx, history: targetHist, questAttempt: targetAttempt, state: 'WALKING' });
  };

  const handleNextStation = () => {
    if (!selectedLine || !currentQuest) return;
    const nextIdx = currentIndex + step;
    const now = Date.now();
    const newHistoryItem = { from: selectedLine.stations[currentIndex], to: selectedLine.stations[nextIdx], quest: currentQuest, photo: capturedPhoto || undefined, timestamp: now };
    const updatedHistory = [...history, newHistoryItem];
    setHistory(updatedHistory); setCapturedPhoto(null); setQuestAttempt(0);
    const isGoal = nextIdx === endStationIndex;
    if (isGoal) setState('SUMMARY'); else setCurrentIndex(nextIdx);
    setCurrentQuest(null);
    pushRoomState({ state: isGoal ? 'SUMMARY' : 'WALKING', currentIndex: nextIdx, history: updatedHistory, capturedPhoto: null, questAttempt: 0 });
  };

  const handleChangeQuest = () => {
    if (!selectedLine) return;
    const nextAttempt = questAttempt + 1;
    const current = selectedLine.stations[currentIndex]?.name || "";
    const newQuest = generateQuestLocal(roomId || "SOLO", current, difficulty, false, nextAttempt);
    setQuestAttempt(nextAttempt);
    setCurrentQuest(newQuest);
    pushRoomState({ questAttempt: nextAttempt });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = Math.min(1, 800 / img.width);
        canvas.width = img.width * scale; canvas.height = img.height * scale;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const blobData = await (await fetch(canvas.toDataURL('image/jpeg', 0.7))).blob();
          const res = await fetch(`/api/upload?filename=${roomId}-${Date.now()}.jpg`, { method: 'POST', body: blobData });
          const result = await res.json();
          if (result.url) { setCapturedPhoto(result.url); pushRoomState({ capturedPhoto: result.url }); }
        } catch (err) { alert('写真の保存に失敗しました。'); }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectLine = (line: MetroLine) => { setSelectedLine(line); setStartStationIndex(0); setEndStationIndex(line.stations.length - 1); setCurrentIndex(0); setState('SETUP'); };

  const handleCreateRoom = () => {
    if (!selectedLine) return;
    if (startStationIndex === endStationIndex) { setSetupError('スタート駅とゴール駅は別の駅にしてください。'); return; }
    const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newUrl = `${window.location.pathname}?r=${newRoomId}&l=${selectedLine.id}&s=${startStationIndex}&e=${endStationIndex}&d=${difficulty}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setRoomId(newRoomId); setSetupError(null); setState('SHARE');
  };

  const handleShare = async () => {
    if (!selectedLine) return;
    setIsGeneratingShare(true);
    try {
      const timeStr = startTime ? formatTimeMs(Date.now() - startTime) : '--:--';
      const startStation = selectedLine.stations[startStationIndex]?.name || '';
      const endStation = selectedLine.stations[endStationIndex]?.name || '';
      
      const photoUrls = history.filter(item => item.photo).map(item => item.photo).slice(0, 4);
      const params = new URLSearchParams({ 
        line: selectedLine.name, 
        dist: totalDistance.toFixed(2), 
        time: timeStr, 
        team: teamName || 'ゲスト', 
        start: startStation, 
        end: endStation, 
        stations: (totalSteps + 1).toString() 
      });
      photoUrls.forEach((url, i) => { if (url) params.append(`p${i + 1}`, url); });
      
      // 画像生成APIを叩く
      const response = await fetch(`/api/og?${params.toString()}`);
      if (!response.ok) throw new Error('画像生成エラー');
      const blob = await response.blob();
      const file = new File([blob], 'metrowalker-result.png', { type: 'image/png' });

      // 💡 ここが新しいX（Twitter）用のシェアテキスト！
      const shareText = `MetroWalkerで${selectedLine.name}を完走！🚶‍♂️✨\n📍 区間: ${startStation}駅 → ${endStation}駅\n⏱️ タイム: ${timeStr}\n🥾 距離: ${totalDistance.toFixed(2)}km\n\n#MetroWalker #東京散歩 #${selectedLine.name}\n`;
      const shareUrl = window.location.origin; // アプリのトップページのURL

      if (navigator.canShare && navigator.canShare({ files: [file] })) { 
        await navigator.share({ title: 'MetroWalker', text: shareText, url: shareUrl, files: [file] }); 
      } else { 
        // PCなどの場合は画像をダウンロードさせつつ、テキストをクリップボードにコピー
        const url = URL.createObjectURL(blob); 
        const a = document.createElement('a'); a.href = url; a.download = 'metrowalker-result.png'; a.click(); 
        await navigator.clipboard.writeText(shareText + "\n" + shareUrl);
        alert('画像を保存し、テキストをコピーしました！X（Twitter）に貼り付けて投稿してください。'); 
      }
    } catch (e) { 
      console.error(e);
      alert('シェア準備に失敗しました。'); 
    } finally { 
      setIsGeneratingShare(false); 
    }
  };

  const resetApp = () => { localStorage.clear(); window.location.href = window.location.pathname; };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <Analytics />
      <div className="max-w-md mx-auto min-h-screen flex flex-col shadow-xl bg-white relative overflow-hidden">
        
        {/* Header: 公式風ロゴを適用 */}
        <header className="p-4 border-b border-neutral-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {state !== 'START' && selectedLine ? (
                <motion.button key="line-logo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowRouteMap(true)} className="flex items-center gap-3">
                  <LineLogo line={selectedLine} size="w-10 h-10" />
                  <div className="text-left">
                    <h1 className="font-black text-lg leading-none">{selectedLine.name}</h1>
                    <div className="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-widest flex items-center gap-1"><Map className="w-3 h-3" /> View Map</div>
                  </div>
                </motion.button>
              ) : (
                <div className="flex items-center gap-3"><MetroLogo className="w-8" /><h1 className="font-black text-xl tracking-tighter">MetroWalker</h1></div>
              )}
            </AnimatePresence>
          </div>
          {state !== 'START' && <button onClick={() => setShowResetConfirm(true)} className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Reset</button>}
        </header>

        {/* Route Map Modal */}
        <AnimatePresence>
          {showRouteMap && selectedLine && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={() => setShowRouteMap(false)}>
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white sm:rounded-3xl rounded-t-3xl w-full max-w-md h-[85vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3"><LineLogo line={selectedLine} size="w-10 h-10" /><div><h3 className="font-bold text-lg">{selectedLine.name}</h3><div className="text-[10px] text-neutral-400">Route Map</div></div></div>
                  <button onClick={() => setShowRouteMap(false)} className="p-2 bg-neutral-100 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <div className="overflow-y-auto p-8 flex-1">
                  <div className="relative border-l-4 ml-4" style={{ borderColor: selectedLine.color }}>
                    {selectedLine.stations.map((station, index) => {
                      const isCurrent = index === currentIndex && (state === 'WALKING' || state === 'SUMMARY');
                      const start = Math.min(startStationIndex, endStationIndex), end = Math.max(startStationIndex, endStationIndex);
                      const isPassed = state !== 'START' && state !== 'SETUP' && (isReverse ? (index >= currentIndex && index <= startStationIndex) : (index <= currentIndex && index >= startStationIndex));
                      const isTarget = index >= start && index <= end;
                      return (
                        <div key={index} className={`mb-8 last:mb-0 relative flex items-center pl-8 ${isTarget ? 'opacity-100' : 'opacity-40'}`}>
                          <div className={`absolute -left-[14px] w-6 h-6 rounded-full border-4 border-white transition-all ${isCurrent ? 'scale-150 shadow-lg' : ''}`} style={{ backgroundColor: isCurrent ? '#171717' : isPassed ? selectedLine.color : '#e5e5e5' }} />
                          <div className="flex-1"><div className={`font-bold ${isCurrent ? 'text-xl' : ''}`}>{station.name}</div><div className="text-[10px] font-mono text-neutral-400">{station.reading}</div></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>{showResetConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div className="bg-white rounded-3xl p-8 w-full max-w-sm space-y-6 shadow-2xl"><div className="text-center space-y-2"><h3 className="text-2xl font-bold">リセットしますか？</h3><p className="text-neutral-500 text-sm">これまでの記録がすべて消去されます。</p></div><div className="grid gap-3"><button onClick={resetApp} className="w-full bg-red-500 text-white p-4 rounded-2xl font-bold">リセットする</button><button onClick={() => setShowResetConfirm(false)} className="w-full bg-neutral-100 p-4 rounded-2xl font-bold">キャンセル</button></div></motion.div>
          </motion.div>
        )}</AnimatePresence>

        <main className="flex-1 overflow-y-auto pb-24">
          <AnimatePresence mode="wait">
            {state === 'START' && (
              <motion.div key="start" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-8">
                <div className="flex items-center gap-4 mb-8"><MetroLogo className="w-32" /><div className="space-y-0"><h2 className="text-3xl font-black tracking-tighter">MetroWalker</h2><p className="text-neutral-400 text-[10px] font-bold uppercase tracking-[0.3em]">Adventure Setup</p></div></div>
                <div className="space-y-4">
                  <div className="space-y-2"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Team Name</label><input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full p-4 rounded-2xl border bg-neutral-50 font-bold outline-none" placeholder="チーム名を入力" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Difficulty</label><div className="grid grid-cols-3 gap-2">{(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((d) => (<button key={d} onClick={() => setDifficulty(d)} className={`p-3 rounded-xl text-xs font-bold border-2 transition-all ${difficulty === d ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white text-neutral-400'}`}>{d}</button>))}</div></div>
                </div>
                <div className="space-y-4"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Line</label><div className="grid gap-3">{METRO_LINES.map((line) => (<button key={line.id} onClick={() => handleSelectLine(line)} className="group flex items-center justify-between p-4 rounded-2xl border bg-white hover:shadow-md transition-all"><div className="flex items-center gap-4"><LineLogo line={line} size="w-10 h-10" /><div><div className="font-bold text-neutral-800">{line.name}</div><div className="text-xs text-neutral-400">{line.stations.length} 駅</div></div></div><ChevronRight className="w-5 h-5 text-neutral-300" /></button>))}</div></div>
              </motion.div>
            )}

            {state === 'SETUP' && selectedLine && (
              <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 space-y-8">
                <button onClick={() => setState('START')} className="flex items-center gap-2 text-neutral-400 uppercase tracking-widest font-bold text-xs"><ArrowLeft className="w-4 h-4" /> Back</button>
                <div className="space-y-2"><h2 className="text-3xl font-bold">区間を設定</h2><p className="text-neutral-500 text-sm">{selectedLine.name} のどこまで歩きますか？</p></div>
                <div className="space-y-6">
                  {setupError && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl">{setupError}</div>}
                  <div className="p-4 bg-neutral-900 text-white rounded-2xl flex justify-between items-center"><div><div className="text-[10px] text-white/40 uppercase tracking-widest">Distance</div><div className="text-xl font-bold">{totalDistance.toFixed(2)} km</div></div><div className="text-right"><div className="text-[10px] text-white/40 uppercase tracking-widest">Stations</div><div className="text-xl font-bold">{totalSteps + 1}</div></div></div>
                  <div className="space-y-2"><label className="text-[10px] text-neutral-400 uppercase tracking-widest">Start Station</label><select value={startStationIndex} onChange={(e) => setStartStationIndex(parseInt(e.target.value, 10))} className="w-full p-4 rounded-2xl border bg-neutral-50 font-bold appearance-none">{selectedLine.stations.map((s, i) => (<option key={i} value={i}>{s.name}</option>))}</select></div>
                  <div className="flex justify-center"><ChevronRight className="w-6 h-6 text-neutral-300 rotate-90" /></div>
                  <div className="space-y-2"><label className="text-[10px] text-neutral-400 uppercase tracking-widest">Goal Station</label><select value={endStationIndex} onChange={(e) => setEndStationIndex(parseInt(e.target.value, 10))} className="w-full p-4 rounded-2xl border bg-neutral-50 font-bold appearance-none">{selectedLine.stations.map((s, i) => (<option key={i} value={i}>{s.name}</option>))}</select></div>
                </div>
                <button onClick={handleCreateRoom} className="w-full bg-neutral-900 text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-2">ルームを作成する <ChevronRight className="w-5 h-5" /></button>
              </motion.div>
            )}

            {state === 'SHARE' && selectedLine && (
              <motion.div key="share" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 space-y-8">
                <button onClick={() => setState('SETUP')} className="flex items-center gap-2 text-neutral-400 font-bold text-xs uppercase"><ArrowLeft className="w-4 h-4" /> Back</button>
                <div className="text-center py-8"><div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"><Share2 className="w-10 h-10 text-emerald-600" /></div><h2 className="text-2xl font-bold">ルーム完成！</h2><p className="text-neutral-500 text-sm">URLをメンバーに送って同期しましょう。</p></div>
                <div className="p-4 bg-neutral-50 border rounded-2xl flex items-center justify-between gap-4"><div className="text-xs font-mono text-neutral-500 truncate flex-1">{window.location.href}</div><button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('コピーしました！'); }} className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl">コピー</button></div>
                <button onClick={handleStartWalk} className="w-full bg-neutral-900 text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-2 mt-8">出発する！ <ChevronRight className="w-5 h-5" /></button>
              </motion.div>
            )}

            {state === 'WALKING' && selectedLine && (
              <motion.div key="walking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
                
                {/* Food Dialog */}
                <AnimatePresence>{showFoodDialog && (<motion.div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"><motion.div className="bg-white rounded-3xl p-8 w-full max-w-sm space-y-6 shadow-2xl text-center"><UtensilsCrossed className="w-12 h-12 text-amber-600 mx-auto" /><h3 className="text-2xl font-bold">食のミッション！</h3><p className="text-neutral-500 text-sm">特別な食チャレンジに挑戦しますか？</p><div className="grid gap-3"><button onClick={() => { setShowFoodDialog(false); const cur = selectedLine.stations[currentIndex]?.name || ""; setCurrentQuest(generateQuestLocal(roomId!, cur, difficulty, true, 0)); }} className="w-full bg-neutral-900 text-white p-4 rounded-2xl font-bold">チャレンジ！</button><button onClick={() => setShowFoodDialog(false)} className="w-full bg-neutral-100 p-4 rounded-2xl font-bold">パス</button></div></motion.div></motion.div>)}</AnimatePresence>

                <div className="space-y-3">
                  <div className="flex justify-between items-end"><div><div className="text-[10px] text-neutral-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Elapsed</div>{startTime ? <TimerDisplay startTime={startTime} /> : '00:00'}</div><div className="text-right"><div className="text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Progress</div><div className="text-lg font-bold">{currentStep + 1} / {totalSteps + 1}</div></div></div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden"><motion.div className="h-full" style={{ backgroundColor: selectedLine.color }} initial={{ width: 0 }} animate={{ width: `${((currentStep + 1) / (totalSteps + 1)) * 100}%` }} /></div>
                </div>

                {/* 座標を復活させた駅表示セクション */}
                <div className="flex items-center justify-between bg-neutral-50 p-4 rounded-3xl border border-neutral-100 relative overflow-hidden shadow-sm">
                  {/* Current Station */}
                  <div className="text-center flex-1 z-10 flex flex-col items-center">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase mb-2">Current</div>
                    <StationLogo line={selectedLine} stationNumber={(currentIndex + 1).toString().padStart(2, '0')} size="w-12 h-12" />
                    <div className="font-bold text-sm mt-2">{selectedLine.stations[currentIndex]?.name}</div>
                    <div className="text-[9px] font-mono text-neutral-400 mt-1 bg-white px-2 py-0.5 rounded-full border border-neutral-100">
                      {selectedLine.stations[currentIndex] ? `${formatDMS(selectedLine.stations[currentIndex].lat, true)}, ${formatDMS(selectedLine.stations[currentIndex].lng, false)}` : ''}
                    </div>
                  </div>

                  <div className="px-2 z-10 flex flex-col items-center gap-1">
                    <ChevronRight className="w-6 h-6 text-neutral-300" />
                    <div className="text-[10px] font-bold text-neutral-400">{distanceToNext.toFixed(2)}km</div>
                  </div>

                  {/* Next Station */}
                  <div className="text-center flex-1 z-10 flex flex-col items-center">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase mb-2">Next</div>
                    <StationLogo line={selectedLine} stationNumber={(currentIndex + step + 1).toString().padStart(2, '0')} size="w-12 h-12" />
                    <div className="font-bold text-sm mt-2">{selectedLine.stations[currentIndex + step]?.name}</div>
                    <div className="text-[9px] font-mono text-neutral-400 mt-1 bg-white px-2 py-0.5 rounded-full border border-neutral-100">
                      {selectedLine.stations[currentIndex + step] ? `${formatDMS(selectedLine.stations[currentIndex + step].lat, true)}, ${formatDMS(selectedLine.stations[currentIndex + step].lng, false)}` : ''}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -top-3 left-6 px-3 py-1 bg-neutral-900 text-white text-[10px] font-bold rounded-full uppercase tracking-widest z-10">Sanpo Mission</div>
                  <div className="bg-white border-2 border-neutral-900 rounded-3xl p-6 pt-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
                    {currentQuest ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-start"><div><div className="text-xs font-bold text-neutral-400 mb-1 italic">Theme:</div><h3 className="text-xl font-bold leading-tight">{currentQuest.theme}</h3></div><button onClick={handleChangeQuest} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-50 border text-neutral-500 hover:text-neutral-900 transition-all active:scale-95"><RefreshCw className="w-3 h-3" /><span className="text-[10px] font-bold uppercase tracking-wider">Change</span></button></div>
                        <div className="p-4 bg-neutral-50 rounded-xl border font-medium text-neutral-800 leading-relaxed">{currentQuest.mission}</div>
                        <div className="flex gap-3 items-start text-neutral-500"><Info className="w-5 h-5 mt-0.5" /><p className="text-xs italic">{currentQuest.hint}</p></div>
                      </div>
                    ) : (<div className="py-12 flex flex-col items-center justify-center gap-4 text-neutral-300"><RefreshCw className="w-8 h-8 animate-spin" /><p>ミッション準備中...</p></div>)}
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <button onClick={() => fileInputRef.current?.click()} className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-bold ${capturedPhoto ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-neutral-100 text-neutral-600'}`}>
                    {capturedPhoto ? <><CheckCircle2 className="w-5 h-5" /> Photo Attached</> : <><Camera className="w-5 h-5" /> Add Photo</>}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                  <button onClick={handleNextStation} className="w-full bg-neutral-900 text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">Next Station <ChevronRight className="w-5 h-5" /></button>
                </div>

                {history.length > 0 && (<div className="pt-8 space-y-4"><h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Journey</h4><div className="space-y-3">{history.slice().reverse().map((item, i) => (<div key={i} className="flex gap-4 items-start p-3 bg-white rounded-xl border"><div className="w-10 h-10 rounded-lg bg-neutral-50 flex-shrink-0 overflow-hidden">{item.photo ? <img src={item.photo} className="w-full h-full object-cover" /> : <MapPin className="w-5 h-5 text-neutral-300 m-auto" />}</div><div><div className="text-[10px] font-bold text-neutral-400 uppercase">{item.from.name} → {item.to.name}</div><div className="text-sm font-bold text-neutral-700">{item.quest.theme}</div></div></div>))}</div></div>)}
              </motion.div>
            )}

            {state === 'SUMMARY' && selectedLine && (
              <motion.div key="summary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 space-y-8 text-center">
                <div className="py-8 space-y-4"><Trophy className="w-20 h-20 text-yellow-400 mx-auto" /><h2 className="text-3xl font-bold">制覇完了！</h2><p className="text-neutral-500">{selectedLine.name} を完走しました。</p></div>
                <div className="bg-neutral-900 text-white p-6 rounded-3xl text-left space-y-6"><div><div className="text-[10px] text-white/40 uppercase tracking-widest">Total Walk</div><div className="text-2xl font-bold">{totalDistance.toFixed(2)} km</div></div><div className="grid grid-cols-3 gap-2">{history.filter(h => h.photo).slice(0, 6).map((item, i) => (<div key={i} className="aspect-square rounded-lg bg-white/10 overflow-hidden border border-white/10"><img src={item.photo} className="w-full h-full object-cover" /></div>))}</div></div>
                <button onClick={handleShare} disabled={isGeneratingShare} className="w-full bg-neutral-800 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2">{isGeneratingShare ? <Loader2 className="animate-spin" /> : <Share2 />} Share Result</button>
                <button onClick={resetApp} className="w-full text-neutral-400 p-4 font-bold">Back to Home</button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
