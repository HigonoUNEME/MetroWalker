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

// ... (MetroLogo, LineLogo 等のコンポーネントは今のままでOKなので省略)

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
    return s1 && s2 ? calculateDistance(s1.lat, s1.lng, s2.lat, s2.lng) : 0;
  })() : 0;

  // 1. 初期読み込み（リロード・招待・PWA対策）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('r');
    const savedRoomId = localStorage.getItem('metro-walker-room-id');

    if (r) {
      // 招待URLから来た
      const l = params.get('l'), s = params.get('s'), e = params.get('e'), d = params.get('d');
      const line = METRO_LINES.find(x => x.id === l);
      if (line) {
        setSelectedLine(line); setStartStationIndex(Number(s)); setEndStationIndex(Number(e));
        setDifficulty(d as Difficulty); setRoomId(r);
        
        // もし以前にこのルームで遊んでいたら状態を復元
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
      // パラメータはないがスマホに記憶がある（PWA対策）
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
  }, [state, currentIndex, history, teamName, startTime, questAttempt]);

  // 💡 【重要】サーバーへのプッシュ関数
  const pushRoomState = (overrides: any = {}) => {
    if (!roomId) return;
    const payload = { 
      currentIndex, history, startTime, capturedPhoto, questAttempt, state,
      ...overrides 
    };
    fetch(`/api/room/${roomId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).catch(e => console.error("Sync Error", e));
  };

  // 💡 【重要】3秒おきの同期チェック（タイマー・写真・ミッション・駅すべて！）
  useEffect(() => {
    if (state !== 'WALKING' || !roomId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/${roomId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.startTime) {
          // 時間の同期
          if (!startTime || Math.abs(startTime - data.startTime) > 2000) setStartTime(data.startTime);
          // 駅の進捗同期
          if (data.history && data.history.length > history.length) {
            setHistory(data.history); setCurrentIndex(data.currentIndex);
            setCapturedPhoto(data.capturedPhoto || null); setQuestAttempt(data.questAttempt || 0);
            setCurrentQuest(null);
          }
          // 写真だけの同期
          if (data.capturedPhoto !== capturedPhoto) setCapturedPhoto(data.capturedPhoto || null);
          // チェンジの同期
          if (data.questAttempt !== undefined && data.questAttempt !== questAttempt) {
            setQuestAttempt(data.questAttempt);
            setCurrentQuest(null);
          }
          // 全体ゴールの同期
          if (data.state === 'SUMMARY') setState('SUMMARY');
        }
      } catch(e) {}
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [state, roomId, history.length, capturedPhoto, startTime, questAttempt]);

  // オフラインでお題生成
  useEffect(() => {
    if (state === 'WALKING' && selectedLine && currentIndex !== endStationIndex && !currentQuest) {
      const current = selectedLine.stations[currentIndex]?.name || "";
      setCurrentQuest(generateQuestLocal(roomId || "SOLO", current, difficulty, false, questAttempt));
    }
  }, [currentIndex, state, selectedLine, currentQuest, questAttempt]);

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
        targetTime = data.startTime; targetIdx = data.currentIndex; targetHist = data.history || [];
        targetAttempt = data.questAttempt || 0;
      }
    } catch (e) {}

    setStartTime(targetTime); setCurrentIndex(targetIdx); setHistory(targetHist); 
    setQuestAttempt(targetAttempt); setState('WALKING');
    pushRoomState({ startTime: targetTime, currentIndex: targetIdx, history: targetHist, questAttempt: targetAttempt });
  };

  const handleNextStation = () => {
    if (!selectedLine || !currentQuest) return;
    const nextIdx = currentIndex + step;
    const now = Date.now();
    const newHistoryItem = { 
      from: selectedLine.stations[currentIndex], to: selectedLine.stations[nextIdx],
      quest: currentQuest, photo: capturedPhoto || undefined, timestamp: now 
    };
    const updatedHistory = [...history, newHistoryItem];
    
    setHistory(updatedHistory); setCapturedPhoto(null); setQuestAttempt(0);
    const isGoal = nextIdx === endStationIndex;
    const nextState = isGoal ? 'SUMMARY' : 'WALKING';
    
    if (isGoal) setState('SUMMARY'); else setCurrentIndex(nextIdx);
    setCurrentQuest(null);
    pushRoomState({ state: nextState, currentIndex: nextIdx, history: updatedHistory, capturedPhoto: null, questAttempt: 0 });
  };

  const handleChangeQuest = () => {
    const nextAttempt = questAttempt + 1;
    setQuestAttempt(nextAttempt);
    setCurrentQuest(null); // useEffectで再生成される
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
          if (result.url) {
            setCapturedPhoto(result.url);
            pushRoomState({ capturedPhoto: result.url });
          }
        } catch (err) { alert('写真の保存に失敗しました。'); }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectLine = (line: MetroLine) => {
    setSelectedLine(line); setStartStationIndex(0); setEndStationIndex(line.stations.length - 1);
    setCurrentIndex(0); setState('SETUP');
  };

  const handleCreateRoom = () => {
    if (!selectedLine) return;
    if (startStationIndex === endStationIndex) {
      setSetupError('スタート駅とゴール駅は別の駅にしてください。'); return;
    }
    const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newUrl = `${window.location.pathname}?r=${newRoomId}&l=${selectedLine.id}&s=${startStationIndex}&e=${endStationIndex}&d=${difficulty}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    setRoomId(newRoomId); setSetupError(null); setState('SHARE');
  };

  const handleStartWalk = async () => {
    if (roomId) {
      try {
        const res = await fetch(`/api/room/${roomId}`);
        const data = await res.json();
        if (data && data.startTime) {
          setCurrentIndex(data.currentIndex);
          setHistory(data.history || []);
          setStartTime(data.startTime);
          setLastStationTime(data.lastStationTime);
          setCapturedPhoto(data.capturedPhoto || null);
          setQuestAttempt(data.questAttempt || 0);
          setState('WALKING');
          return;
        }
      } catch (e) {}
    }
    const now = Date.now();
    setCurrentIndex(startStationIndex); setHistory([]); setCurrentQuest(null); setQuestAttempt(0);
    setStartTime(now); setLastStationTime(now); setState('WALKING');
    pushRoomState({ currentIndex: startStationIndex, history: [], startTime: now, lastStationTime: now, capturedPhoto: null, questAttempt: 0 });
  };

  // 💡 共通：サーバーに今の状況を「強制上書き」する関数
  // 引数に「最新のデータ」を渡せるようにして、タイムラグを防ぎます
  const pushRoomState = (overrides: any) => {
    if (!roomId) return;
    const payload = {
      currentIndex,
      history,
      startTime,
      lastStationTime,
      capturedPhoto,
      questAttempt,
      state,
      ...overrides
    };
    fetch(`/api/room/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.error("Sync error", e));
  };

  // 💡 3秒に1回の同期チェック（ここを大幅に強化！）
  useEffect(() => {
    if (state === 'START' || state === 'SETUP' || !roomId) return;
    
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.startTime) {
            // 1. 開始時間を同期（これが抜けていました！）
            if (!startTime || Math.abs(startTime - data.startTime) > 1000) {
              setStartTime(data.startTime);
            }
            // 2. 履歴（駅の進み具合）を同期
            if (data.history && data.history.length > history.length) {
              setHistory(data.history);
              setCurrentIndex(data.currentIndex);
              setLastStationTime(data.lastStationTime);
              setQuestAttempt(data.questAttempt || 0);
              setCapturedPhoto(data.capturedPhoto || null);
              setCurrentQuest(null); // お題を再生成させる
            }
            // 3. 今の駅での写真を同期
            if (data.capturedPhoto !== capturedPhoto) {
              setCapturedPhoto(data.capturedPhoto || null);
            }
            // 4. 誰かがゴールしてたら自分もゴールへ
            if (data.state === 'SUMMARY' && state !== 'SUMMARY') {
              setState('SUMMARY');
            }
          }
        }
      } catch(e) {}
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [state, roomId, history.length, capturedPhoto, startTime]);

  // 💡 出発するボタンの処理
  const handleStartWalk = async () => {
    if (!roomId) return;

    let targetStartTime = Date.now();
    let targetIndex = startStationIndex;
    let targetHistory = [];

    // まずサーバーを見に行って、誰かが出発済みならそのデータをもらう
    try {
      const res = await fetch(`/api/room/${roomId}`);
      const data = await res.json();
      if (data && data.startTime) {
        targetStartTime = data.startTime;
        targetIndex = data.currentIndex;
        targetHistory = data.history || [];
      }
    } catch (e) {}

    // 自分の画面に反映
    setStartTime(targetStartTime);
    setCurrentIndex(targetIndex);
    setHistory(targetHistory);
    setState('WALKING');

    // サーバーに「参加したよ（または開始したよ）」と保存
    pushRoomState({
      state: 'WALKING',
      startTime: targetStartTime,
      currentIndex: targetIndex,
      history: targetHistory
    });
  };

  // 💡 次の駅ボタン
  const handleNextStation = () => {
    if (!selectedLine || !currentQuest) return;

    const nextIdx = currentIndex + step;
    const now = Date.now();
    const timeTakenMs = lastStationTime ? now - lastStationTime : 0;
    
    const newHistoryItem: WalkHistory = {
      from: selectedLine.stations[currentIndex],
      to: selectedLine.stations[nextIdx],
      quest: currentQuest,
      photo: capturedPhoto || undefined,
      timeTakenMs,
      timestamp: now
    };
    const updatedHistory = [...history, newHistoryItem];

    setHistory(updatedHistory);
    setCapturedPhoto(null);
    setQuestAttempt(0);
    setLastStationTime(now);

    const isGoal = (nextIdx === endStationIndex);
    const nextState = isGoal ? 'SUMMARY' : 'WALKING';
    
    if (isGoal) {
      setState('SUMMARY');
    } else {
      setCurrentIndex(nextIdx);
    }
    setCurrentQuest(null);

    // 💡 確定した最新の値をサーバーに送る
    pushRoomState({
      state: nextState,
      currentIndex: nextIdx,
      history: updatedHistory,
      capturedPhoto: null,
      questAttempt: 0,
      lastStationTime: now
    });
  };

  // 💡 写真アップロード
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // (画像リサイズ処理は今のままでOK...)
    // canvas.toDataURL のあとの処理：
    try {
      const response = await fetch(compressedDataUrl);
      const blobData = await response.blob();
      // ファイル名は重複しないようにURLパラメータで工夫
      const uploadResponse = await fetch(`/api/upload?filename=${roomId}-${Date.now()}.jpg`, {
        method: 'POST',
        body: blobData
      });
      const result = await uploadResponse.json();
      
      if (result.url) {
        setCapturedPhoto(result.url);
        // 💡 写真が上がったら即座に全員に知らせる！
        pushRoomState({ capturedPhoto: result.url });
      }
    } catch (err) {
      alert('写真が保存できませんでした。Vercel Blobの設定を確認してください。');
    }
  };
  
  const handleNextStation = () => {
    if (!selectedLine || !currentQuest) return;

    const nextIdx = currentIndex + step;
    const fromStation = selectedLine.stations[currentIndex], toStation = selectedLine.stations[nextIdx];
    if (!fromStation || !toStation) return;

    const now = Date.now();
    const timeTakenMs = lastStationTime ? now - lastStationTime : 0;
    setLastStationTime(now);

    const newHistoryItem: WalkHistory = { from: fromStation, to: toStation, quest: currentQuest, photo: capturedPhoto || undefined, timeTakenMs, timestamp: now };
    const updatedHistory = [...history, newHistoryItem];

    setHistory(updatedHistory);
    setCapturedPhoto(null);
    setCurrentQuest(null);
    setQuestAttempt(0); // 💡 次の駅に行ったらチェンジ回数を0にリセット！

    if (nextIdx === endStationIndex) {
      setState('SUMMARY');
      pushRoomState({ currentIndex: nextIdx, history: updatedHistory, capturedPhoto: null, questAttempt: 0 });
    } else {
      setCurrentIndex(nextIdx);
      pushRoomState({ currentIndex: nextIdx, history: updatedHistory, capturedPhoto: null, lastStationTime: now, questAttempt: 0 });
      const relativeIdx = Math.abs(nextIdx - startStationIndex);
      if (relativeIdx > 0 && relativeIdx % 5 === 0) setShowFoodDialog(true);
    }
  };

  const handleFoodChallengeResponse = (accept: boolean) => {
    setShowFoodDialog(false);
    if (accept && selectedLine && roomId) {
      const current = selectedLine.stations[currentIndex]?.name || "";
      setCurrentQuest(generateQuestLocal(roomId, current, difficulty, true, questAttempt));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const MAX_WIDTH = 800;
        let width = img.width, height = img.height;
        if (width > MAX_WIDTH) { height = Math.round((height *= MAX_WIDTH / width)); width = MAX_WIDTH; }

        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          try {
            const response = await fetch(compressedDataUrl);
            const blobData = await response.blob();
            const uploadResponse = await fetch(`/api/upload?filename=${Date.now()}.jpg`, { method: 'POST', body: blobData });
            const result = await uploadResponse.json();
            
            setCapturedPhoto(result.url);
            pushRoomState({ capturedPhoto: result.url }); 
          } catch (err) {
            console.error('Upload failed', err);
            alert('写真のアップロードに失敗しました。');
          }
        }
      };
      if (event.target?.result) img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleShare = async () => {
    if (!selectedLine) return;
    setIsGeneratingShare(true);
    try {
      const timeStr = startTime ? formatTimeMs(Date.now() - startTime) : '--:--';
      const photoUrls = history.filter(item => item.photo).map(item => item.photo).slice(0, 4);
      const params = new URLSearchParams({
        line: selectedLine.name, dist: totalDistance.toFixed(2), time: timeStr, team: teamName || 'ゲスト',
        start: selectedLine.stations[startStationIndex]?.name || '', end: selectedLine.stations[endStationIndex]?.name || '', stations: (totalSteps + 1).toString()
      });
      photoUrls.forEach((url, i) => { if (url) params.append(`p${i + 1}`, url); });

      const ogUrl = `/api/og?${params.toString()}`;
      const response = await fetch(ogUrl);
      if (!response.ok) throw new Error('サーバーでの画像生成に失敗しました');
      
      const blob = await response.blob();
      const file = new File([blob], 'metrowalker-result.png', { type: 'image/png' });
      const shareText = `MetroWalkerで${selectedLine.name}を歩き切りました！🚶‍♂️✨\n#MetroWalker #東京散歩\n`;
      const shareUrl = window.location.href;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'MetroWalker', text: shareText + shareUrl, files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'metrowalker-result.png'; a.click(); URL.revokeObjectURL(url);
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        alert('画像をダウンロードしました！SNSに添付してシェアしてください。');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') { console.error('Share API Error:', error); alert('シェア画像の準備中にエラーが発生しました。'); }
    } finally { setIsGeneratingShare(false); }
  };

  const resetApp = () => {
    localStorage.clear();
    setState('START'); setSelectedLine(null); setCurrentIndex(0); setCurrentQuest(null); setQuestAttempt(0);
    setHistory([]); setCapturedPhoto(null); setTeamName(''); setDifficulty('NORMAL');
    setStartTime(null); setLastStationTime(null); setRoomId(null); setShowResetConfirm(false);
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-neutral-200">
      <Analytics />
      <div className="max-w-md mx-auto min-h-screen flex flex-col shadow-xl bg-white relative overflow-hidden">
        
        {/* Header */}
        <header className="p-4 border-b border-neutral-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {state !== 'START' && (
                selectedLine ? (
                  <motion.button 
                    key="line-logo" initial={{ opacity: 0, filter: 'blur(4px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(4px)' }}
                    onClick={() => setShowRouteMap(true)} className="flex items-center gap-2 hover:opacity-70 transition-opacity active:scale-95" title="路線図を見る"
                  >
                    <LineLogo line={selectedLine} />
                    <div className="text-left">
                      <h1 className="font-bold text-lg tracking-tight leading-none">{selectedLine.name}</h1>
                      <div className="text-[9px] font-bold text-neutral-400 mt-1 uppercase tracking-widest flex items-center gap-1"><Map className="w-3 h-3" /> View Map</div>
                    </div>
                  </motion.button>
                ) : (
                  <motion.div key="default-logo" className="flex items-center gap-3">
                    <MetroLogo className="w-8" />
                    <h1 className="font-black text-xl tracking-tighter">MetroWalker</h1>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
          {state !== 'START' && (
            <button onClick={() => setShowResetConfirm(true)} className="text-xs font-semibold text-neutral-400 hover:text-neutral-600 transition-colors uppercase tracking-widest">Reset</button>
          )}
        </header>

        {/* Route Map Modal */}
        <AnimatePresence>
          {showRouteMap && selectedLine && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={() => setShowRouteMap(false)}>
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="bg-white sm:rounded-3xl rounded-t-3xl w-full max-w-md h-[85vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
                  <div className="flex items-center gap-3"><LineLogo line={selectedLine} /><div><h3 className="font-bold text-lg leading-tight">{selectedLine.name}</h3><div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Route Map</div></div></div>
                  <button onClick={() => setShowRouteMap(false)} className="p-2 bg-neutral-100 rounded-full text-neutral-500 hover:bg-neutral-900 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
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
                          <div className={`absolute -left-[14px] w-6 h-6 rounded-full border-4 border-white flex items-center justify-center transition-all duration-300 ${isCurrent ? 'scale-150 shadow-lg z-10' : 'z-0'}`} style={{ backgroundColor: isCurrent ? '#171717' : isPassed ? selectedLine.color : '#e5e5e5' }} />
                          <div className="flex-1"><div className={`font-bold transition-colors ${isCurrent ? 'text-xl text-neutral-900' : isPassed ? 'text-neutral-700' : 'text-neutral-400'}`}>{station.name}</div><div className="text-[10px] font-mono text-neutral-400">{station.reading}</div></div>
                          {isCurrent && <div className="px-3 py-1 bg-neutral-900 text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-md">Current</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Confirmation Dialog */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl p-8 w-full max-w-sm space-y-6 shadow-2xl">
                <div className="text-center space-y-2"><h3 className="text-2xl font-bold">リセットしますか？</h3><p className="text-neutral-500 text-sm">これまでの記録がすべて消去されます。よろしいですか？</p></div>
                <div className="grid gap-3">
                  <button onClick={resetApp} className="w-full bg-red-500 text-white p-4 rounded-2xl font-bold hover:bg-red-600 transition-all">リセットする</button>
                  <button onClick={() => setShowResetConfirm(false)} className="w-full bg-neutral-100 text-neutral-500 p-4 rounded-2xl font-bold hover:bg-neutral-200 transition-all">キャンセル</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto pb-24">
          <AnimatePresence mode="wait">
            
            {/* START STATE */}
            {state === 'START' && (
              <motion.div key="start" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-6 space-y-8">
                <div className="flex items-center gap-4 mb-8">
                  <MetroLogo className="w-32 flex-shrink-0" />
                  <div className="space-y-0">
                    <h2 className="text-3xl font-black leading-tight tracking-tighter">MetroWalker</h2>
                    <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-[0.3em]">Adventure Setup</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Team Name</label><input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full p-4 rounded-2xl border border-neutral-100 bg-neutral-50 focus:border-neutral-900 outline-none transition-all font-bold" placeholder="チーム名を入力" /></div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Difficulty</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((d) => (
                        <button key={d} onClick={() => setDifficulty(d)} className={`p-3 rounded-xl text-xs font-bold border-2 transition-all ${difficulty === d ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200'}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Line</label>
                  <div className="grid gap-3">
                    {METRO_LINES.map((line) => (
                      <button key={line.id} onClick={() => handleSelectLine(line)} className="group relative flex items-center justify-between p-4 rounded-2xl border border-neutral-100 bg-white hover:border-neutral-300 hover:shadow-md transition-all text-left">
                        <div className="flex items-center gap-4"><LineLogo line={line} size="w-10 h-10" fontSize="text-lg" /><div><div className="font-bold text-neutral-800">{line.name}</div><div className="text-xs text-neutral-400">{line.stations.length} 駅</div></div></div><ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SETUP STATE */}
            {state === 'SETUP' && selectedLine && (
              <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-8">
                <button onClick={() => setState('START')} className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors"><ArrowLeft className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-widest">Back</span></button>
                <div className="space-y-2"><h2 className="text-3xl font-bold leading-tight">区間を設定</h2><p className="text-neutral-500 text-sm">{selectedLine.name} のどこからどこまで歩きますか？</p></div>

                <div className="space-y-6">
                  {setupError && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{setupError}</div>}
                  {selectedLine && (
                    <div className="p-4 bg-neutral-900 text-white rounded-2xl flex justify-between items-center">
                      <div><div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Distance</div><div className="text-xl font-bold">{totalDistance.toFixed(2)} km</div></div>
                      <div className="text-right"><div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Stations</div><div className="text-xl font-bold">{totalSteps + 1}</div></div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Start Station</label>
                    <select value={startStationIndex} onChange={(e) => setStartStationIndex(parseInt(e.target.value, 10))} className="w-full p-4 rounded-2xl border border-neutral-100 bg-neutral-50 font-bold outline-none appearance-none">
                      {selectedLine.stations.map((s, i) => (<option key={i} value={i}>{s.name}</option>))}
                    </select>
                  </div>
                  <div className="flex justify-center"><ChevronRight className="w-6 h-6 text-neutral-300 rotate-90" /></div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Goal Station</label>
                    <select value={endStationIndex} onChange={(e) => setEndStationIndex(parseInt(e.target.value, 10))} className="w-full p-4 rounded-2xl border border-neutral-100 bg-neutral-50 font-bold outline-none appearance-none">
                      {selectedLine.stations.map((s, i) => (<option key={i} value={i}>{s.name}</option>))}
                    </select>
                  </div>
                </div>

                <button onClick={handleCreateRoom} className="w-full bg-neutral-900 text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-95 transition-all">
                  <span>ルームを作成する</span><ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* SHARE STATE */}
            {state === 'SHARE' && selectedLine && (
              <motion.div key="share" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-8">
                <button onClick={() => setState('SETUP')} className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors"><ArrowLeft className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-widest">Back</span></button>

                <div className="text-center space-y-4 py-8">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"><Share2 className="w-10 h-10 text-emerald-600" /></div>
                  <h2 className="text-2xl font-bold">ルームの準備ができました！</h2>
                  <p className="text-neutral-500 text-sm">このURLを一緒に歩くメンバーに送って、同じお題に挑戦しましょう。</p>
                </div>

                <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4">
                  <div className="text-xs font-mono text-neutral-500 truncate flex-1">{window.location.href}</div>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('URLをコピーしました！'); }} className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl whitespace-nowrap active:scale-95 transition-transform">
                    コピー
                  </button>
                </div>

                <button onClick={handleStartWalk} className="w-full bg-neutral-900 text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-95 transition-all mt-8">
                  <span>出発する！</span><ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* WALKING STATE */}
            {state === 'WALKING' && selectedLine && (
              <motion.div key="walking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6">
                
                <AnimatePresence>
                  {showFoodDialog && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl p-8 w-full max-w-sm space-y-6 shadow-2xl">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto"><UtensilsCrossed className="w-8 h-8 text-amber-600" /></div>
                        <div className="text-center space-y-2"><h3 className="text-2xl font-bold">食のミッション！</h3><p className="text-neutral-500 text-sm">5駅歩きましたね。この街ならではの「食ミッション」にチャレンジしますか？</p></div>
                        <div className="grid gap-3">
                          <button onClick={() => handleFoodChallengeResponse(true)} className="w-full bg-neutral-900 text-white p-4 rounded-2xl font-bold hover:bg-neutral-800 transition-all">チャレンジする！</button>
                          <button onClick={() => handleFoodChallengeResponse(false)} className="w-full bg-neutral-100 text-neutral-500 p-4 rounded-2xl font-bold hover:bg-neutral-200 transition-all">今回はパス</button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Timer & Progress Bar */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div><div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Elapsed Time</div>{startTime ? <TimerDisplay startTime={startTime} /> : <div className="font-mono font-bold text-xl tracking-wider">00:00</div>}</div>
                    <div className="text-right"><div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Progress</div><div className="text-lg font-bold">{currentStep + 1} <span className="text-sm text-neutral-400">/ {totalSteps + 1}</span></div></div>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden"><motion.div className="h-full" style={{ backgroundColor: selectedLine.color }} initial={{ width: 0 }} animate={{ width: `${((currentStep + 1) / (totalSteps + 1)) * 100}%` }} /></div>
                </div>

                {/* Current Segment */}
                <div className="flex items-center justify-between bg-neutral-50 p-4 rounded-2xl border border-neutral-100 relative overflow-hidden">
                  <div className="text-center flex-1 z-10 flex flex-col items-center">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter mb-2">Current</div>
                    <StationLogo line={selectedLine} stationNumber={(currentIndex + 1).toString().padStart(2, '0')} size="w-10 h-10" fontSize="text-xl" numberFontSize="text-xs" />
                    <div className="font-bold text-sm mt-1">{selectedLine.stations[currentIndex]?.name}</div>
                  </div>
                  <div className="px-2 z-10 flex flex-col items-center gap-1"><ChevronRight className="w-6 h-6 text-neutral-300" /><div className="text-[10px] font-bold text-neutral-400">{distanceToNext.toFixed(2)}km</div></div>
                  <div className="text-center flex-1 z-10 flex flex-col items-center">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter mb-2">Next</div>
                    <StationLogo line={selectedLine} stationNumber={(currentIndex + step + 1).toString().padStart(2, '0')} size="w-10 h-10" fontSize="text-xl" numberFontSize="text-xs" />
                    <div className="font-bold text-sm mt-1">{selectedLine.stations[currentIndex + step]?.name}</div>
                  </div>
                </div>

                {/* 💡 Quest Card: チェンジボタンを復活！ */}
                <div className="relative">
                  <div className="absolute -top-3 left-6 px-3 py-1 bg-neutral-900 text-white text-[10px] font-bold rounded-full uppercase tracking-widest z-10">Sanpo Mission</div>
                  <div className="bg-white border-2 border-neutral-900 rounded-3xl p-6 pt-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
                    {currentQuest ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div><div className="text-xs font-bold text-neutral-400 mb-1 italic">Theme:</div><h3 className="text-xl font-bold text-neutral-900 leading-tight">{currentQuest.theme}</h3></div>
                          <button onClick={handleChangeQuest} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-50 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-all border border-neutral-100 active:scale-95">
                            <RefreshCw className="w-3 h-3 text-neutral-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Change</span>
                          </button>
                        </div>
                        <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100"><div className="text-xs font-bold text-neutral-400 mb-2 uppercase tracking-widest">Mission</div><p className="text-neutral-800 font-medium leading-relaxed">{currentQuest.mission}</p></div>
                        <div className="flex gap-3 items-start text-neutral-500"><Info className="w-5 h-5 mt-0.5 flex-shrink-0" /><p className="text-xs leading-relaxed italic">{currentQuest.hint}</p></div>
                      </div>
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center gap-4"><RefreshCw className="w-8 h-8 text-neutral-300 animate-spin" /><p className="text-sm text-neutral-400 font-medium">ミッションを準備中...</p></div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4">
                  <div className="flex gap-3">
                    <button onClick={() => fileInputRef.current?.click()} className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-bold ${capturedPhoto ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-neutral-100 text-neutral-600 hover:border-neutral-300'}`}>
                      {capturedPhoto ? <CheckCircle2 className="w-5 h-5" /> : <Camera className="w-5 h-5" />}{capturedPhoto ? 'Photo Added' : 'Add Photo'}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                  </div>
                  <button onClick={handleNextStation} className="w-full bg-neutral-900 text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-95 transition-all">
                    <span>Next Station</span><ChevronRight className="w-5 h-5" />
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
                            {item.photo ? <img src={item.photo} alt="Check-in" className="w-full h-full object-cover" /> : <MapPin className="w-5 h-5 text-neutral-300" />}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                              <StationLogo line={selectedLine} stationNumber={(selectedLine.stations.findIndex(s => s.name === item.from.name) + 1).toString().padStart(2, '0')} size="w-4 h-4" fontSize="text-[8px]" numberFontSize="text-[6px]" />
                              {item.from.name} <ChevronRight className="w-2 h-2" /> 
                              <StationLogo line={selectedLine} stationNumber={(selectedLine.stations.findIndex(s => s.name === item.to.name) + 1).toString().padStart(2, '0')} size="w-4 h-4" fontSize="text-[8px]" numberFontSize="text-[6px]" />
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
              <motion.div key="summary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 space-y-8 text-center">
                <div className="py-8 space-y-4">
                  <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto shadow-lg"><Trophy className="w-10 h-10 text-white" /></div>
                  <div className="space-y-1"><h2 className="text-3xl font-bold">制覇完了！</h2><p className="text-neutral-500">東京メトロ {selectedLine.name} を歩き切りました。</p></div>
                </div>
                <div className="bg-neutral-900 text-white p-6 rounded-3xl space-y-6 text-left">
                  <div className="flex justify-between items-end border-b border-white/10 pb-4">
                    <div><div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Walk</div><div className="text-2xl font-bold">{totalDistance.toFixed(2)} km</div></div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Journey Highlights</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {history.filter(h => h.photo).slice(0, 6).map((item, i) => (
                        <div key={i} className="aspect-square rounded-lg bg-white/5 overflow-hidden border border-white/10"><img src={item.photo} alt="Memory" className="w-full h-full object-cover" /></div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <button onClick={handleShare} disabled={isGeneratingShare} className="w-full flex items-center justify-center gap-2 bg-neutral-800 text-white p-4 rounded-2xl font-bold hover:bg-neutral-700 transition-all mt-6 disabled:opacity-50">
                  {isGeneratingShare ? <><Loader2 className="w-5 h-5 animate-spin" /> 画像を生成中...</> : <><Share2 className="w-5 h-5" /> 結果を画像でシェア</>}
                </button>

                <div className="space-y-3">
                  <button onClick={resetApp} className="w-full text-neutral-400 p-4 rounded-2xl font-bold hover:text-neutral-600 transition-all">Back to Home</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
