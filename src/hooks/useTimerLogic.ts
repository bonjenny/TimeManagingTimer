import { useState, useEffect, useRef } from 'react';
import { useTimerStore, TimerLog } from '../store/useTimerStore';

export const useTimerLogic = () => {
  const activeTimer = useTimerStore((state) => state.activeTimer);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // 1분(60초) 단위 갱신을 위한 Interval Ref
  const intervalRef = useRef<number | null>(null);

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

  // 타이머가 활성화될 때마다 초기값 세팅 및 인터벌 시작
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 1. 초기값 계산 (즉시 반영)
    setElapsedSeconds(calculateElapsed(activeTimer));

    // 2. 타이머 상태가 RUNNING 일 때만 인터벌 가동
    if (activeTimer.status === 'RUNNING') {
      // 1분(60000ms)마다 갱신 (요구사항: "시간은 중요하지 않음... 굳이 필요하다면 1분 단위")
      intervalRef.current = window.setInterval(() => {
        // document가 hidden 상태이면 갱신하지 않음 (브라우저 리소스 절약 & 요구사항 반영)
        if (!document.hidden) {
            setElapsedSeconds(calculateElapsed(activeTimer));
        }
      }, 60000); // 1분
    } else {
      // PAUSED 상태면 인터벌 필요 없음 (시간 안 흐름)
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
  };
};
