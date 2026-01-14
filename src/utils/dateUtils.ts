export const getStartOfDay = (date: Date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const getEndOfDay = (date: Date) => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

export const getDateRange = (type: 'today' | 'week' | 'month') => {
  const now = new Date();
  const start = getStartOfDay(now);
  const end = getEndOfDay(now);

  if (type === 'today') {
    // 06:00 ~ 익일 06:00 로직이 있지만, 일반적인 날짜 필터는 00:00 ~ 23:59가 직관적임.
    // 다만 PRD 요구사항(06시 기준)을 맞추려면 조정 필요.
    // 여기서는 일단 표준적인 00:00 ~ 23:59로 구현하고, 필요시 06시 오프셋 적용.
    // PRD 84번이 "자정을 넘겨서까지... 06:00부터 다음날 06:00까지를 하루로 본다"이므로,
    // "오늘"을 조회하면 어제 06:00 ~ 오늘 06:00 인지, 오늘 06:00 ~ 내일 06:00 인지 모호함.
    // 통상적으로 업무 일지라면 "오늘 출근해서 퇴근할 때까지"이므로 오늘 06:00 ~ 내일 06:00이 적절함.
    
    start.setHours(6, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(6, 0, 0, 0);
  } else if (type === 'week') {
    // 이번 주 (월요일 시작 ~ 일요일 끝)
    const day = now.getDay(); // 0(일) ~ 6(토)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 이동
    start.setDate(diff);
    start.setHours(6, 0, 0, 0);
    
    end.setDate(start.getDate() + 7);
    end.setHours(6, 0, 0, 0);
  } else if (type === 'month') {
    // 이번 달 1일 ~ 다음 달 1일
    start.setDate(1);
    start.setHours(6, 0, 0, 0);
    
    end.setMonth(end.getMonth() + 1);
    end.setDate(1);
    end.setHours(6, 0, 0, 0);
  }

  return { start, end };
};
