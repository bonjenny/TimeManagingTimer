import { useState, useEffect, useRef } from 'react';
import { useTimerStore, TimerLog } from '../store/useTimerStore';

// 초반 몇 초 동안 1초 단위로 업데이트할지 결정하는 상수
const SECONDS_DISPLAY_DURATION = 5;

export const useTimerLogic = () => {
  const activeTimer = useTimerStore((state) => state.activeTimer);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSeconds, setShowSeconds] = useState(false); // 초 표시 여부
  
  // interval refs
  const secondIntervalRef = useRef<number | null>(null);
  const minuteIntervalRef = useRef<number | null>(null);
  const secondsDisplayTimeoutRef = useRef<number | null>(null);
  
  // 이전 status를 추적하여 PAUSED → RUNNING 전환 감지
  const prevStatusRef = useRef<string | null>(null);

  const calculateElapsed = (timer: TimerLog) => {
    const now = Date.now();
    
    // 기본: (현재 시간 - 시작 시간) / 1000 - 누적 일시정지 시간
    let totalSeconds = (now - timer.startTime) / 1000 - timer.pausedDuration;

    // 만약 현재 일시정지 상태라면, (마지막 일시정지~현재) 기간은 작업 시간에서 제외해야 함
    if (timer.status === 'PAUSED' && timer.lastPausedAt) {
      const currentPauseDuration = (now - timer.lastPausedAt) / 1000;
      totalSeconds -= currentPauseDuration;
    }

    return Math.max(0, Math.floor(totalSeconds));
  };

  const clearAllIntervals = () => {
    if (secondIntervalRef.current) {
      clearInterval(secondIntervalRef.current);
      secondIntervalRef.current = null;
    }
    if (minuteIntervalRef.current) {
      clearInterval(minuteIntervalRef.current);
      minuteIntervalRef.current = null;
    }
    if (secondsDisplayTimeoutRef.current) {
      clearTimeout(secondsDisplayTimeoutRef.current);
      secondsDisplayTimeoutRef.current = null;
    }
  };

  // 타이머가 활성화될 때마다 초기값 세팅 및 인터벌 시작
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      setShowSeconds(false);
      clearAllIntervals();
      prevStatusRef.current = null;
      return;
    }

    // 1. 초기값 계산 (즉시 반영)
    const initialElapsed = calculateElapsed(activeTimer);
    setElapsedSeconds(initialElapsed);

    // 2. 타이머가 시작되거나 재개될 때 초 표시 활성화
    const isResuming = prevStatusRef.current === 'PAUSED' && activeTimer.status === 'RUNNING';
    const isStarting = prevStatusRef.current === null && activeTimer.status === 'RUNNING';
    const should_show_seconds = isResuming || isStarting || initialElapsed <= SECONDS_DISPLAY_DURATION;
    
    prevStatusRef.current = activeTimer.status;

    // 3. 타이머 상태가 RUNNING 일 때만 인터벌 가동
    if (activeTimer.status === 'RUNNING') {
      // 시작/재개 시 5초 동안 초 표시
      if (should_show_seconds) {
        setShowSeconds(true);
        
        // 5초 후 초 표시 종료
        secondsDisplayTimeoutRef.current = window.setTimeout(() => {
          setShowSeconds(false);
        }, SECONDS_DISPLAY_DURATION * 1000);
        
        // 초 표시 동안 1초마다 갱신
        let seconds_count = 0;
        secondIntervalRef.current = window.setInterval(() => {
          if (!document.hidden) {
            setElapsedSeconds(calculateElapsed(activeTimer));
            seconds_count++;
            
            // 5초 후 1분 인터벌로 전환
            if (seconds_count >= SECONDS_DISPLAY_DURATION) {
              if (secondIntervalRef.current) {
                clearInterval(secondIntervalRef.current);
                secondIntervalRef.current = null;
              }
              // 1분 인터벌 시작
              minuteIntervalRef.current = window.setInterval(() => {
                if (!document.hidden) {
                  setElapsedSeconds(calculateElapsed(activeTimer));
                }
              }, 60000);
            }
          }
        }, 1000);
      } else {
        // 이미 초 표시 기간이 지난 경우 바로 1분 인터벌
        setShowSeconds(false);
        minuteIntervalRef.current = window.setInterval(() => {
          if (!document.hidden) {
            setElapsedSeconds(calculateElapsed(activeTimer));
          }
        }, 60000);
      }
    } else {
      // PAUSED 상태면 인터벌 필요 없음 (시간 안 흐름)
      clearAllIntervals();
    }

    return () => {
      clearAllIntervals();
    };
  }, [activeTimer]);

  // Visibility Change 감지: 다시 활성화되었을 때 시간 즉시 동기화
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeTimer) {
        // 탭이 다시 활성화되면 즉시 시간 재계산 (백그라운드에서 흐른 시간 반영)
        setElapsedSeconds(calculateElapsed(activeTimer));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTimer]);

  return {
    elapsedSeconds,
    activeTimer,
    showSeconds, // 초 표시 여부 (시작/재개 후 5초 동안 true)
  };
};
