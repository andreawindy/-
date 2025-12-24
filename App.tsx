import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, WordPair, WordStats } from './types';
import { DEFAULT_DATA, PRAISE_PHRASES } from './constants';
import { playText, initializeAudio } from './services/ttsService';
import { playCorrectSound, playCelebrationSound } from './services/soundService';
import { LucideSettings, LucidePlay, LucideVolume2, LucideTrophy, LucideAlertCircle, LucideFlame, LucideStar, LucideX, LucideGraduationCap, LucideCheckCircle, LucideDownload, LucideUpload, LucideSave } from 'lucide-react';

// Storage Keys
const STORAGE_KEY_GOAL = 'wordWizard_dailyGoal';
const STORAGE_KEY_PROGRESS = 'wordWizard_progress';
const STORAGE_KEY_STREAK = 'wordWizard_streak';
const STORAGE_KEY_LAST_DATE = 'wordWizard_lastDate';
const STORAGE_KEY_GOAL_MET = 'wordWizard_goalMet';
const STORAGE_KEY_STATS = 'wordWizard_stats';
const STORAGE_KEY_INPUT = 'wordWizard_input';
const STORAGE_KEY_LEARNED = 'wordWizard_learned';
const STORAGE_KEY_TOTAL_SCORE = 'wordWizard_totalScore';

const MASTERY_THRESHOLD = 20;

// Helper to parse text input into WordPair objects
const parseInputData = (text: string): WordPair[] => {
  if (!text) return [];
  return text.split('\n')
    .map((line, index) => {
      const parts = line.split(/[:：]/); // Handle both English and Chinese colons
      if (parts.length >= 2) {
        return {
          id: `word-${parts[0].trim()}-${index}`, // Include char in ID for stability
          char: parts[0].trim(),
          word: parts[1].trim()
        };
      }
      return null;
    })
    .filter((item): item is WordPair => item !== null && item.char.length > 0);
};

const App: React.FC = () => {
  // Application State
  const [gameState, setGameState] = useState<GameState>(GameState.PLAYING);
  
  // Content State
  const [inputText, setInputText] = useState<string>(DEFAULT_DATA);
  const [learnedText, setLearnedText] = useState<string>("");
  const [wordList, setWordList] = useState<WordPair[]>([]);
  
  const [wordStats, setWordStats] = useState<WordStats>({});
  
  // Game Session State
  const [score, setScore] = useState(0);
  const [currentOptions, setCurrentOptions] = useState<WordPair[]>([]);
  const [targetWord, setTargetWord] = useState<WordPair | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [masteryNotification, setMasteryNotification] = useState<string | null>(null);

  // Animation States
  const [scoreBump, setScoreBump] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Daily Goal & Streak State
  const [dailyGoal, setDailyGoal] = useState<number>(10);
  const [dailyProgress, setDailyProgress] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [goalMetToday, setGoalMetToday] = useState<boolean>(false);
  
  // Refs
  const isMounted = useRef(true);
  const wordListRef = useRef<WordPair[]>([]); // Ref to keep track of wordList for stale closures
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file upload

  useEffect(() => {
    wordListRef.current = wordList;
  }, [wordList]);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Initialize Audio & Load Persistence
  useEffect(() => {
    initializeAudio();
    loadProgress();
    loadStats();
    loadContent();
  }, []);

  const loadContent = () => {
    const savedInput = localStorage.getItem(STORAGE_KEY_INPUT);
    const savedLearned = localStorage.getItem(STORAGE_KEY_LEARNED);

    let currentInput = DEFAULT_DATA;
    if (savedInput !== null) {
        currentInput = savedInput;
    }
    
    setInputText(currentInput);
    setWordList(parseInputData(currentInput));
    
    if (savedLearned) {
        setLearnedText(savedLearned);
    }
  };

  // Load stats
  const loadStats = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_STATS);
        if (saved) setWordStats(JSON.parse(saved));
    } catch (e) {
        console.error("Failed to parse word stats", e);
    }
  };

  // Load progress from LocalStorage
  const loadProgress = () => {
    const savedGoal = localStorage.getItem(STORAGE_KEY_GOAL);
    if (savedGoal) setDailyGoal(parseInt(savedGoal, 10));

    const savedScore = parseInt(localStorage.getItem(STORAGE_KEY_TOTAL_SCORE) || '0', 10);
    setScore(savedScore);

    const lastDate = localStorage.getItem(STORAGE_KEY_LAST_DATE);
    const today = new Date().toDateString();
    
    const savedStreak = parseInt(localStorage.getItem(STORAGE_KEY_STREAK) || '0', 10);
    const savedProgress = parseInt(localStorage.getItem(STORAGE_KEY_PROGRESS) || '0', 10);
    const savedGoalMet = localStorage.getItem(STORAGE_KEY_GOAL_MET) === 'true';

    if (lastDate === today) {
      setDailyProgress(savedProgress);
      setStreak(savedStreak);
      setGoalMetToday(savedGoalMet);
    } else {
      setDailyProgress(0);
      setGoalMetToday(false);
      localStorage.setItem(STORAGE_KEY_PROGRESS, '0');
      localStorage.setItem(STORAGE_KEY_GOAL_MET, 'false');
      localStorage.setItem(STORAGE_KEY_LAST_DATE, today);

      if (lastDate) {
        const lastDateObj = new Date(lastDate);
        const diffTime = Math.abs(new Date().getTime() - lastDateObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays > 1 && !savedGoalMet) {
             setStreak(0);
             localStorage.setItem(STORAGE_KEY_STREAK, '0');
        } else {
             setStreak(savedStreak);
        }
      } else {
        setStreak(0);
      }
    }
  };

  const updateProgress = () => {
    const newProgress = dailyProgress + 1;
    setDailyProgress(newProgress);
    localStorage.setItem(STORAGE_KEY_PROGRESS, newProgress.toString());
    localStorage.setItem(STORAGE_KEY_LAST_DATE, new Date().toDateString());

    if (newProgress >= dailyGoal && !goalMetToday) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setGoalMetToday(true);
      
      localStorage.setItem(STORAGE_KEY_STREAK, newStreak.toString());
      localStorage.setItem(STORAGE_KEY_GOAL_MET, 'true');
      triggerCelebration();
    }
  };

  const triggerCelebration = () => {
      setShowCelebration(true);
      playCelebrationSound();
      setTimeout(() => {
          if (isMounted.current) setShowCelebration(false);
      }, 5000);
  };

  const saveGoalSetting = (val: number) => {
    setDailyGoal(val);
    localStorage.setItem(STORAGE_KEY_GOAL, val.toString());
  };

  // Save content settings
  const saveContentSettings = (newInput: string, newLearned: string) => {
      setInputText(newInput);
      setLearnedText(newLearned);
      localStorage.setItem(STORAGE_KEY_INPUT, newInput);
      localStorage.setItem(STORAGE_KEY_LEARNED, newLearned);
  };

  // --- DATA MANAGEMENT (EXPORT/IMPORT) ---

  const handleExportData = () => {
      const dataToExport = {
          version: 1,
          timestamp: new Date().toISOString(),
          data: {
              input: localStorage.getItem(STORAGE_KEY_INPUT) || DEFAULT_DATA,
              learned: localStorage.getItem(STORAGE_KEY_LEARNED) || "",
              stats: JSON.parse(localStorage.getItem(STORAGE_KEY_STATS) || '{}'),
              totalScore: parseInt(localStorage.getItem(STORAGE_KEY_TOTAL_SCORE) || '0', 10),
              streak: parseInt(localStorage.getItem(STORAGE_KEY_STREAK) || '0', 10),
              dailyGoal: parseInt(localStorage.getItem(STORAGE_KEY_GOAL) || '10', 10),
              dailyProgress: parseInt(localStorage.getItem(STORAGE_KEY_PROGRESS) || '0', 10),
              lastDate: localStorage.getItem(STORAGE_KEY_LAST_DATE),
              goalMet: localStorage.getItem(STORAGE_KEY_GOAL_MET),
          }
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `renzi-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const parsed = JSON.parse(content);

              if (!parsed.data) {
                  throw new Error("Invalid format");
              }
              
              const d = parsed.data;

              // Restore to LocalStorage
              if (d.input !== undefined) localStorage.setItem(STORAGE_KEY_INPUT, d.input);
              if (d.learned !== undefined) localStorage.setItem(STORAGE_KEY_LEARNED, d.learned);
              if (d.stats !== undefined) localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(d.stats));
              if (d.totalScore !== undefined) localStorage.setItem(STORAGE_KEY_TOTAL_SCORE, d.totalScore.toString());
              if (d.streak !== undefined) localStorage.setItem(STORAGE_KEY_STREAK, d.streak.toString());
              if (d.dailyGoal !== undefined) localStorage.setItem(STORAGE_KEY_GOAL, d.dailyGoal.toString());
              if (d.dailyProgress !== undefined) localStorage.setItem(STORAGE_KEY_PROGRESS, d.dailyProgress.toString());
              if (d.lastDate !== undefined) localStorage.setItem(STORAGE_KEY_LAST_DATE, d.lastDate);
              if (d.goalMet !== undefined) localStorage.setItem(STORAGE_KEY_GOAL_MET, d.goalMet);

              // Reload State
              loadContent();
              loadProgress();
              loadStats();

              alert("数据恢复成功！(Data restored successfully!)");
          } catch (err) {
              console.error(err);
              alert("数据恢复失败，文件格式可能不正确。(Failed to restore data. Invalid file format.)");
          }
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  // Initialize game (used when returning from Setup)
  const startGame = async () => {
    await initializeAudio();

    const parsed = parseInputData(inputText);
    if (parsed.length < 3) {
      alert("请至少在学习素材中输入3行文字 (Please enter at least 3 lines of text in Learning Content)");
      return;
    }
    setWordList(parsed);
    // Score is no longer reset here, it persists
    setTargetWord(null); 
    setErrorMessage(null);
    setGameState(GameState.PLAYING);
  };

  // Setup a new round with weighted probability
  const setupRound = useCallback(async () => {
    // Always use the latest wordList from ref to avoid stale closures in timeouts
    const currentList = wordListRef.current;
    
    if (currentList.length === 0) {
        setTargetWord(null);
        return;
    }

    // Weighted Random Selection Logic
    // Formula: Weight = Base * (1 + Incorrect * 3) / (1 + Correct * 0.5)
    // This increases probability for incorrect words and decreases for correct ones.
    const itemsWithWeights = currentList.map(item => {
        const s = wordStats[item.char] || { correct: 0, incorrect: 0, consecutiveCorrect: 0 };
        // Increase weight heavily for incorrect answers (3x multiplier)
        // Decrease weight for correct answers (0.5x divisor impact)
        // Adding 1 to avoid division by zero
        const weight = 10 * (1 + s.incorrect * 3) / (1 + s.correct * 0.5);
        return { item, weight };
    });

    const totalWeight = itemsWithWeights.reduce((sum, x) => sum + x.weight, 0);
    let randomVal = Math.random() * totalWeight;
    let target = currentList[0];

    for (const entry of itemsWithWeights) {
        randomVal -= entry.weight;
        if (randomVal <= 0) {
            target = entry.item;
            break;
        }
    }
    
    // Fallback
    if (!target) target = currentList[Math.floor(Math.random() * currentList.length)];
    
    setTargetWord(target);

    // Pick distractors
    const potentialDistractors = currentList.filter(w => w.char !== target.char);
    const shuffledDistractors = [...potentialDistractors].sort(() => 0.5 - Math.random());
    
    const selectedDistractors: WordPair[] = [];
    const usedChars = new Set<string>();
    
    for (const d of shuffledDistractors) {
      if (!usedChars.has(d.char)) {
        selectedDistractors.push(d);
        usedChars.add(d.char);
      }
      if (selectedDistractors.length >= 2) break;
    }

    // Fill with randoms if not enough distractors (rare edge case with < 3 items)
    while (selectedDistractors.length < 2 && currentList.length >= 3) {
        const r = currentList[Math.floor(Math.random() * currentList.length)];
        if (r.char !== target.char && !usedChars.has(r.char)) {
            selectedDistractors.push(r);
            usedChars.add(r.char);
        }
        if (selectedDistractors.length >= 2) break; // Safety break
    }

    const options = [target, ...selectedDistractors].sort(() => 0.5 - Math.random());
    setCurrentOptions(options);
    setFeedback('none');

    setTimeout(() => {
      playTargetAudio(target);
    }, 500);

  }, [wordList, wordStats]);

  // Initial setup trigger
  useEffect(() => {
    if (gameState === GameState.PLAYING && wordList.length > 0 && !targetWord) {
      setupRound();
    }
  }, [gameState, wordList, setupRound, targetWord]);

  const playTargetAudio = async (word: WordPair) => {
    if (!word || isPlayingAudio) return;
    try {
      setErrorMessage(null);
      const textToRead = `${word.char}，${word.word}`;
      setIsPlayingAudio(true);
      await playText(textToRead);
      if (isMounted.current) setIsPlayingAudio(false);
    } catch (err: any) {
      console.error("Audio playback failed", err);
      if (isMounted.current) {
        setIsPlayingAudio(false);
        setErrorMessage("语音播放失败 (Audio playback failed)");
      }
    }
  };

  const playPraiseAudio = async () => {
    try {
      const phrase = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
      await playText(phrase);
    } catch (err) {
      console.error("Praise audio failed", err);
    }
  };

  const handleMastery = (word: WordPair) => {
    if (!word) return;

    // Show Notification
    setMasteryNotification(`太棒了！"${word.char}" 已经学会，移入已学会列表！`);
    // Clear notification after 4 seconds
    setTimeout(() => {
        if (isMounted.current) setMasteryNotification(null);
    }, 4000);
    
    // Move from Input to Learned
    // We use functional updates to ensure we have the latest state
    let moved = false;
    let newInput = "";
    let newLearned = "";

    // Calculate new values synchronously to update state and storage together
    // Use current state values
    const lines = inputText.split('\n');
    const lineIndex = lines.findIndex(l => {
        const parts = l.split(/[:：]/);
        return parts[0]?.trim() === word.char;
    });

    if (lineIndex !== -1) {
        const line = lines[lineIndex];
        const newLines = [...lines];
        newLines.splice(lineIndex, 1);
        newInput = newLines.join('\n');
        newLearned = (learnedText ? learnedText + '\n' : '') + line;
        moved = true;
    }

    if (moved) {
        saveContentSettings(newInput, newLearned);
        // Update word list for game loop
        setWordList(parseInputData(newInput));
        // Reset consecutive correct for this word since it's "done" (though it's removed anyway)
        // We keep the stats for history though.
    }
  };

  // Handle option click
  const handleOptionClick = async (selected: WordPair) => {
    if (!targetWord || isPlayingAudio || feedback === 'correct') return;

    const char = targetWord.char;

    if (selected.id === targetWord.id) {
      // Correct!
      setFeedback('correct');
      playCorrectSound();
      
      setScoreBump(true);
      setTimeout(() => setScoreBump(false), 400);

      // Cumulative Score Persistence
      setScore(prev => {
        const newScore = prev + 1;
        localStorage.setItem(STORAGE_KEY_TOTAL_SCORE, newScore.toString());
        return newScore;
      });
      
      updateProgress();
      
      let isMastered = false;

      // Update Stats
      setWordStats(prev => {
        const currentStat = prev[char] || { correct: 0, incorrect: 0, consecutiveCorrect: 0 };
        const newConsecutive = (currentStat.consecutiveCorrect || 0) + 1;
        
        if (newConsecutive >= MASTERY_THRESHOLD) {
            isMastered = true;
        }

        const newStats = {
            ...prev,
            [char]: { ...currentStat, correct: currentStat.correct + 1, consecutiveCorrect: newConsecutive }
        };
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newStats));
        return newStats;
      });

      if (isMastered) {
          // If mastered, handle the move. 
          // We do this *after* a slight delay or immediately? 
          // Doing it immediately might remove the word while it's still displayed as "Correct".
          // But since feedback is "correct", the user is just waiting.
          // We should let the "Praise" play first.
          
          setTimeout(() => {
             handleMastery(targetWord);
          }, 1000);
      }

      setTimeout(async () => {
          await playPraiseAudio();
          setTimeout(() => {
            if (isMounted.current) setupRound();
          }, 500);
      }, 300);

    } else {
      // Incorrect
      setFeedback('incorrect');

      setWordStats(prev => {
        const currentStat = prev[char] || { correct: 0, incorrect: 0, consecutiveCorrect: 0 };
        // Reset consecutive correct on error
        const newStats = {
            ...prev,
            [char]: { ...currentStat, incorrect: currentStat.incorrect + 1, consecutiveCorrect: 0 }
        };
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newStats));
        return newStats;
      });

      setTimeout(() => {
        if (isMounted.current) {
            setFeedback('none');
            playTargetAudio(targetWord);
        }
      }, 800);
    }
  };

  // --- RENDER HELPERS ---

  const renderCelebrationModal = () => {
    if (!showCelebration) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowCelebration(false)}>
            <div className="relative w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                {/* Background Rays */}
                <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-30">
                     <div className="w-96 h-96 bg-gradient-to-r from-orange-400 to-yellow-300 rounded-full blur-3xl animate-pulse"></div>
                     <LucideStar size={300} className="text-yellow-400 absolute animate-slow-spin opacity-50" />
                </div>
                
                {/* Card */}
                <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-pop-in border-4 border-yellow-300 transform">
                    <button 
                        onClick={() => setShowCelebration(false)} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                        <LucideX />
                    </button>
                    
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <LucideFlame size={80} className="text-orange-500 animate-bounce" fill="currentColor" />
                            <LucideStar size={30} className="text-yellow-400 absolute -top-2 -right-4 animate-spin" fill="currentColor" />
                            <LucideStar size={20} className="text-yellow-400 absolute bottom-0 -left-4 animate-pulse" fill="currentColor" />
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-black text-orange-600 mb-2">挑战成功！</h2>
                    <p className="text-gray-600 text-lg mb-6">今日目标已达成</p>
                    
                    <div className="bg-orange-50 rounded-xl p-4 mb-6">
                        <p className="text-orange-800 font-bold text-xl">连击 +1 🔥</p>
                        <p className="text-sm text-orange-600 mt-1">坚持就是胜利</p>
                    </div>

                    <button 
                        onClick={() => setShowCelebration(false)}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-xl shadow-lg hover:scale-105 transition-transform"
                    >
                        继续加油
                    </button>
                </div>
            </div>
        </div>
    );
  };

  const renderSetup = () => (
    <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8 animate-fade-in">
      <div className="flex items-center justify-center mb-6 text-indigo-600">
        <LucideSettings size={48} />
      </div>
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">设置内容</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Left Column: Settings */}
        <div className="flex flex-col gap-6">
             <div>
                <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center gap-2">
                    <LucideFlame className="text-orange-500" size={18} />
                    每日学习目标
                </label>
                <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <input 
                        type="number" 
                        min="1" 
                        max="100"
                        value={dailyGoal}
                        onChange={(e) => saveGoalSetting(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 p-2 text-center text-xl font-bold text-indigo-700 bg-white rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                    <span className="text-gray-600">个字 / 天</span>
                </div>
            </div>

            <div>
                 <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center gap-2">
                    <LucideSave className="text-blue-500" size={18} />
                    数据管理 (备份/恢复)
                </label>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-4">
                    <button 
                        onClick={handleExportData}
                        className="flex-1 bg-white border border-blue-200 text-blue-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors shadow-sm"
                    >
                        <LucideDownload size={18} />
                        下载备份
                    </button>
                    <button 
                        onClick={handleImportClick}
                        className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-md"
                    >
                        <LucideUpload size={18} />
                        恢复数据
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".json" 
                        className="hidden" 
                    />
                </div>
                <p className="text-xs text-gray-400 mt-2 px-1">
                    * 下载备份可保存您的积分、进度和词库。在其他设备上点击恢复即可同步。
                </p>
            </div>
        </div>

        {/* Right Column: Text Editors */}
        {/* Fixed layout overlap: Removed fixed div height and used simple spacing/sizing */}
        <div className="flex flex-col gap-6">
             <div className="flex flex-col gap-2">
                <label className="block text-gray-700 text-sm font-bold flex items-center gap-2">
                    <LucidePlay size={16} className="text-indigo-500" />
                    学习素材 (Learning Content)
                </label>
                <textarea 
                    className="w-full h-48 p-4 border-2 border-indigo-100 rounded-xl focus:border-indigo-400 focus:ring-0 transition-colors text-base resize-none font-mono text-gray-700 bg-indigo-50"
                    value={inputText}
                    onChange={(e) => {
                        const val = e.target.value;
                        saveContentSettings(val, learnedText);
                    }}
                    placeholder="例如：&#10;天: 天空&#10;地: 土地"
                />
             </div>
             <div className="flex flex-col gap-2">
                <label className="block text-gray-700 text-sm font-bold flex items-center gap-2">
                    <LucideGraduationCap size={16} className="text-green-600" />
                    已学会 (Mastered)
                </label>
                <textarea 
                    className="w-full h-48 p-4 border-2 border-green-100 rounded-xl focus:border-green-400 focus:ring-0 transition-colors text-base resize-none font-mono text-gray-700 bg-green-50"
                    value={learnedText}
                    onChange={(e) => {
                        const val = e.target.value;
                        saveContentSettings(inputText, val);
                    }}
                    placeholder="已学会的字会出现在这里&#10;您也可以手动粘贴"
                />
             </div>
        </div>
      </div>

      <button 
        onClick={startGame}
        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 px-6 rounded-xl text-xl transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
      >
        <LucidePlay size={24} />
        开始学习 (Start Learning)
      </button>
    </div>
  );

  const renderGame = () => {
    if (wordList.length === 0) {
        return (
             <div className="max-w-lg w-full flex flex-col items-center p-8 bg-white rounded-3xl shadow-xl text-center">
                 <LucideTrophy size={80} className="text-yellow-500 mb-6" />
                 <h2 className="text-2xl font-bold text-gray-800 mb-4">恭喜你！</h2>
                 <p className="text-gray-600 mb-8">
                    你已经学会了列表中的所有字！<br/>
                    请在设置中添加更多素材。
                 </p>
                 <button 
                    onClick={() => setGameState(GameState.SETUP)}
                    className="bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-600 transition-colors"
                >
                    去添加素材
                </button>
             </div>
        );
    }

    const progressPercent = Math.min(100, (dailyProgress / dailyGoal) * 100);

    return (
      <div className="max-w-lg w-full flex flex-col items-center">
        {/* Top Header: Streak & Score */}
        <div className="w-full flex flex-col gap-4 mb-6 px-4">
            {/* Top Row: Settings, Streak, Score */}
            <div className="flex justify-between items-center">
                <button 
                    onClick={() => setGameState(GameState.SETUP)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full shadow-sm"
                >
                    <LucideSettings size={20} />
                </button>

                {/* Streak Display */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm border-2 transition-all duration-500 ${goalMetToday ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className={`transition-all duration-500 ${goalMetToday ? 'text-orange-500 scale-110 drop-shadow-md' : 'text-gray-300'}`}>
                        <LucideFlame size={24} fill={goalMetToday ? "currentColor" : "none"} />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                        <span className={`text-lg font-black ${goalMetToday ? 'text-orange-600' : 'text-gray-400'}`}>{streak}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">天连击</span>
                    </div>
                </div>

                {/* Score Display */}
                <div className={`flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full shadow-sm border-2 border-yellow-200 transition-all ${scoreBump ? 'animate-score-bump' : ''}`}>
                    <LucideTrophy className="text-yellow-500" size={20} fill="currentColor" />
                    <span className="text-xl font-bold text-yellow-700">{score}</span>
                </div>
            </div>

            {/* Daily Goal Progress Bar */}
            <div className="w-full bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between text-xs text-gray-500 font-bold mb-1 px-1">
                    <span>今日挑战</span>
                    <span>{dailyProgress} / {dailyGoal}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ease-out rounded-full ${goalMetToday ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-indigo-400'}`}
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            </div>
        </div>

        {/* Main Interaction Area */}
        {/* INCREASED SIZE: Added min-h-[500px] and adjusted layout for large buttons */}
        <div className="w-full bg-white rounded-3xl shadow-2xl p-6 mb-8 relative overflow-hidden min-h-[500px] flex flex-col justify-start border-b-8 border-indigo-100">
            {/* Error Message */}
            {errorMessage && (
                <div className="absolute inset-x-0 top-0 bg-red-100 p-2 text-red-600 text-xs text-center flex items-center justify-center gap-1 z-10">
                    <LucideAlertCircle size={14} />
                    {errorMessage}
                </div>
            )}

            {/* Mastery Notification */}
            {masteryNotification && (
                <div className="absolute inset-x-0 top-0 bg-green-100 p-3 text-green-700 text-sm font-bold text-center flex items-center justify-center gap-2 z-20 animate-pop-in shadow-md">
                    <LucideCheckCircle size={18} />
                    {masteryNotification}
                </div>
            )}

            {/* Speaker - Top Center */}
            <div className="text-center mb-6 mt-2 shrink-0">
                <button 
                    onClick={() => targetWord && playTargetAudio(targetWord)}
                    disabled={isPlayingAudio}
                    className={`
                        w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all transform hover:scale-105 active:scale-95
                        ${isPlayingAudio ? 'bg-indigo-100 text-indigo-500 ring-4 ring-indigo-200' : 'bg-indigo-500 text-white shadow-lg hover:bg-indigo-600'}
                    `}
                >
                    {isPlayingAudio ? (
                        <div className="flex gap-1 items-end h-8 pb-2">
                            <span className="w-1.5 h-3 bg-current rounded-full animate-[bounce_1s_infinite]"></span>
                            <span className="w-1.5 h-5 bg-current rounded-full animate-[bounce_1s_infinite_0.2s]"></span>
                            <span className="w-1.5 h-3 bg-current rounded-full animate-[bounce_1s_infinite_0.4s]"></span>
                        </div>
                    ) : (
                        <LucideVolume2 size={36} />
                    )}
                </button>
                {/* REMOVED HINT TEXT */}
            </div>

            {/* Feedback Message Area (Kept minimal to maximize button space) */}
            <div className="h-8 text-center mb-4 shrink-0">
                {feedback === 'correct' && (
                    <span className="text-green-500 font-bold text-2xl animate-bounce block">你真棒！🎉</span>
                )}
            </div>

            {/* Options Grid - INCREASED SIZE */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 flex-grow content-center">
                {currentOptions.map((opt) => {
                    const isTarget = targetWord?.id === opt.id;
                    
                    return (
                        <button
                            key={opt.id}
                            onClick={() => handleOptionClick(opt)}
                            disabled={isPlayingAudio || feedback === 'correct'}
                            className={`
                                w-full aspect-[4/5] md:aspect-square rounded-2xl text-7xl md:text-8xl font-bold transition-all transform shadow-md
                                flex items-center justify-center relative overflow-hidden
                                ${feedback === 'correct' && isTarget 
                                    ? 'bg-green-500 text-white scale-105 ring-4 ring-green-200 z-10' 
                                    : 'bg-white hover:bg-indigo-50 border-2 border-gray-100 text-gray-800 hover:border-indigo-200 hover:-translate-y-1'
                                }
                            `}
                        >
                            {opt.char}
                        </button>
                    );
                })}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 font-sans relative">
      {gameState === GameState.SETUP && renderSetup()}
      {gameState === GameState.PLAYING && renderGame()}
      {renderCelebrationModal()}
    </div>
  );
};

export default App;