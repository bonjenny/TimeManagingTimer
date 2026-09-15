import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Snackbar,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PaletteIcon from '@mui/icons-material/Palette';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
  useDroppable,
  useDndContext,
} from '@dnd-kit/core';
import { useDeployCalendarStore, DeployEvent } from '../../store/useDeployCalendarStore';
import {
  formatDateToString,
  formatDateToDisplay,
  getMonday,
  addDays,
  generateCalendarHtml,
  copyHtmlToClipboard,
} from '../../utils/calendar_export';
import DeployEventModal from '../calendar/DeployEventModal';
import JobColorManager from '../calendar/JobColorManager';

// 드래그 시 활성화 거리(px) - 클릭과 구분
const DRAG_ACTIVATION_DISTANCE = 8;
const DROPPABLE_PREFIX = 'cell-';
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const HOLIDAY_COLOR = '#ca3626';

// ----------------------------------------------------------------------
// Draggable event chip (날짜 이동용)
// ----------------------------------------------------------------------

interface DraggableEventChipProps {
  event: DeployEvent;
  date: Date;
  getJobColor: (job_code: string) => string | undefined;
  onEdit: (date: Date, event: DeployEvent) => void;
  onContextMenu: (e: React.MouseEvent, event: DeployEvent) => void;
}

const DraggableEventChip: React.FC<DraggableEventChipProps> = ({
  event,
  date,
  getJobColor,
  onEdit,
  onContextMenu,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: { type: 'deploy-event', event },
  });
  const display_text = event.status ? `${event.job_name} ${event.status}` : event.job_name;
  const bg_color = getJobColor(event.job_code) || '#e0e0e0';
  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(date, event);
      }}
      onContextMenu={(e) => onContextMenu(e, event)}
      sx={{
        bgcolor: bg_color,
        color: '#000000',
        px: 1,
        py: 0.5,
        borderRadius: '4px',
        fontSize: '0.85rem',
        cursor: 'grab',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        opacity: isDragging ? 0.5 : 1,
        '&:hover': isDragging ? undefined : { filter: 'brightness(0.95)' },
        '&:active': { cursor: 'grabbing' },
      }}
      title={`${display_text} (드래그하여 날짜 이동, 우클릭 삭제)`}
    >
      {display_text}
    </Box>
  );
};

// ----------------------------------------------------------------------
// Droppable cell (날짜 셀 - 드롭 대상)
// ----------------------------------------------------------------------

interface DroppableCellProps {
  date: Date;
  week_idx: number;
  day_idx: number;
  total_weeks: number;
  onCellClick: (date: Date) => void;
  children: React.ReactNode;
}

const DroppableCell: React.FC<DroppableCellProps> = ({
  date,
  week_idx,
  day_idx,
  total_weeks,
  onCellClick,
  children,
}) => {
  const date_str = formatDateToString(date);
  const { setNodeRef, isOver } = useDroppable({
    id: `${DROPPABLE_PREFIX}${date_str}`,
    data: { date_str },
  });
  const { active } = useDndContext();
  const is_dragging = active !== null;
  return (
    <Box
      ref={setNodeRef}
      onClick={() => onCellClick(date)}
      sx={{
        p: 1,
        minWidth: 0,
        borderRight: day_idx < 4 ? '1px solid' : 'none',
        borderBottom: week_idx < total_weeks - 1 ? '1px solid' : 'none',
        borderColor: 'divider',
        cursor: 'pointer',
        minHeight: 80,
        bgcolor: isOver ? 'var(--bg-selected)' : undefined,
        ...(is_dragging ? {} : { '&:hover': { bgcolor: 'var(--bg-hover)' } }),
        position: 'relative',
      }}
    >
      {children}
    </Box>
  );
};

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

const DeployCalendar: React.FC = () => {
  const { events, job_colors, weeks_to_show, getJobColor, updateEvent, deleteEvent } = useDeployCalendarStore();

  // 현재 표시 시작일: (weeks_to_show에 따라) 이번 주가 마지막에 오도록
  const [start_date, setStartDate] = useState<Date>(() =>
    addDays(getMonday(new Date()), -7 * (weeks_to_show - 1))
  );

  const prev_weeks_to_show = React.useRef(weeks_to_show);
  useEffect(() => {
    if (prev_weeks_to_show.current !== weeks_to_show) {
      prev_weeks_to_show.current = weeks_to_show;
      setStartDate(addDays(getMonday(new Date()), -7 * (weeks_to_show - 1)));
    }
  }, [weeks_to_show]);

  // 모달 상태
  const [event_modal_open, setEventModalOpen] = useState(false);
  const [selected_date, setSelectedDate] = useState<string>('');
  const [selected_event, setSelectedEvent] = useState<DeployEvent | null>(null);
  const [event_modal_key, setEventModalKey] = useState(0);
  const [color_manager_open, setColorManagerOpen] = useState(false);

  // 모바일(< md): 아젠다 뷰 + 더보기 메뉴
  const theme = useTheme();
  const is_mobile = useMediaQuery(theme.breakpoints.down('md'));
  const [more_anchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  // 우클릭 컨텍스트 메뉴 (삭제)
  const [context_menu, setContextMenu] = useState<{
    x: number;
    y: number;
    event: DeployEvent;
  } | null>(null);
  
  // 토스트 상태
  const [toast_open, setToastOpen] = useState(false);
  const [toast_message, setToastMessage] = useState('');
  
  // 드래그 앤 드롭: 포인터만 사용, 8px 이상 이동 시 드래그
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE },
    })
  );
  
  // 표시할 날짜 범위 계산
  const date_range = useMemo(() => {
    const dates: Date[][] = [];
    for (let week = 0; week < weeks_to_show; week++) {
      const week_dates: Date[] = [];
      for (let day = 0; day < 5; day++) { // 월~금
        week_dates.push(addDays(start_date, week * 7 + day));
      }
      dates.push(week_dates);
    }
    return dates;
  }, [start_date, weeks_to_show]);
  
  // 주차 계산 함수 (해당 주의 금요일 기준 월의 주차)
  const getWeekInfo = (week_start: Date): { year: number; month: number; week: number } => {
    // 금요일 기준으로 월 결정 (주의 대부분이 속한 월)
    const friday = addDays(week_start, 4);
    const year = friday.getFullYear();
    const month = friday.getMonth();
    
    // 해당 월의 첫 번째 날
    const first_day_of_month = new Date(year, month, 1);
    
    // 해당 월의 첫 번째 월요일 찾기
    let first_monday = new Date(first_day_of_month);
    const day_of_week = first_day_of_month.getDay();
    if (day_of_week === 0) {
      // 일요일이면 다음날이 월요일
      first_monday.setDate(first_monday.getDate() + 1);
    } else if (day_of_week !== 1) {
      // 월요일이 아니면 다음 월요일로
      first_monday.setDate(first_monday.getDate() + (8 - day_of_week));
    }
    
    // 주차 계산: 현재 주의 월요일이 첫 번째 월요일로부터 몇 주 후인지
    const diff_time = week_start.getTime() - first_monday.getTime();
    const diff_weeks = Math.floor(diff_time / (7 * 24 * 60 * 60 * 1000));
    
    // 첫 번째 월요일 이전이면 1주차, 아니면 주차 계산
    const week_num = diff_weeks < 0 ? 1 : diff_weeks + 1;
    
    return { year, month: month + 1, week: week_num };
  };
  
  // 현재 표시 주차 정보 (첫 주 ~ 마지막 주)
  const display_month = useMemo(() => {
    if (date_range.length === 0) return '';
    const first_week = getWeekInfo(date_range[0][0]);
    const last_week = getWeekInfo(date_range[date_range.length - 1][0]);

    if (first_week.year === last_week.year && first_week.month === last_week.month) {
      return `${first_week.year}년 ${first_week.month}월 ${first_week.week}주차 ~ ${last_week.week}주차`;
    } else if (first_week.year === last_week.year) {
      return `${first_week.month}월 ${first_week.week}주차 ~ ${last_week.month}월 ${last_week.week}주차`;
    } else {
      return `${first_week.year}년 ${first_week.month}월 ${first_week.week}주차 ~ ${last_week.year}년 ${last_week.month}월 ${last_week.week}주차`;
    }
  }, [date_range]);

  // 모바일 헤더용 짧은 제목 (예: "9월 1~2주차", "9월 5주차 ~ 10월 1주차")
  const display_month_short = useMemo(() => {
    if (date_range.length === 0) return '';
    const first_week = getWeekInfo(date_range[0][0]);
    const last_week = getWeekInfo(date_range[date_range.length - 1][0]);
    if (first_week.year === last_week.year && first_week.month === last_week.month) {
      return first_week.week === last_week.week
        ? `${first_week.month}월 ${first_week.week}주차`
        : `${first_week.month}월 ${first_week.week}~${last_week.week}주차`;
    }
    return `${first_week.month}월 ${first_week.week}주차 ~ ${last_week.month}월 ${last_week.week}주차`;
  }, [date_range]);

  // 네비게이션
  const handlePrevWeek = () => {
    setStartDate(prev => addDays(prev, -7));
  };
  
  const handleNextWeek = () => {
    setStartDate(prev => addDays(prev, 7));
  };
  
  const handleToday = () => {
    setStartDate(addDays(getMonday(new Date()), -7 * (weeks_to_show - 1)));
  };
  
  // 셀 클릭 - 이벤트 추가/수정
  const handleCellClick = (date: Date, event?: DeployEvent) => {
    setSelectedDate(formatDateToString(date));
    setSelectedEvent(event || null);
    setEventModalKey((k) => k + 1);
    setEventModalOpen(true);
  };
  
  // HTML 복사
  const handleCopyHtml = async () => {
    const end_date = addDays(start_date, weeks_to_show * 7 - 1);
    const start_str = formatDateToString(start_date);
    const end_str = formatDateToString(end_date);

    const range_events = events.filter(e => e.date >= start_str && e.date <= end_str);

    const html = generateCalendarHtml({
      events: range_events,
      job_colors,
      start_date,
      weeks: weeks_to_show,
    });
    
    const success = await copyHtmlToClipboard(html);
    
    if (success) {
      setToastMessage('HTML 테이블이 클립보드에 복사되었습니다');
    } else {
      setToastMessage('복사에 실패했습니다');
    }
    setToastOpen(true);
  };
  
  // 날짜별 이벤트 조회
  const getEventsForDate = (date: Date): DeployEvent[] => {
    const date_str = formatDateToString(date);
    return events.filter(e => e.date === date_str);
  };
  
  // 우클릭 삭제
  const handleContextMenu = (e: React.MouseEvent, event: DeployEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, event });
  };
  
  const handleDeleteEvent = () => {
    if (context_menu) {
      deleteEvent(context_menu.event.id);
      setToastMessage('이벤트가 삭제되었습니다');
      setToastOpen(true);
      setContextMenu(null);
    }
  };
  
  // 드래그 종료 시 날짜 이동
  const handleDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const over_id = String(over.id);
    if (!over_id.startsWith(DROPPABLE_PREFIX)) return;
    const new_date_str = over_id.slice(DROPPABLE_PREFIX.length);
    updateEvent(String(active.id), { date: new_date_str });
    setToastMessage('날짜로 이동했습니다');
    setToastOpen(true);
  };

  const shared_overlays = (
    <>
      {/* 우클릭 삭제 메뉴 */}
      <Menu
        open={context_menu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          context_menu ? { top: context_menu.y, left: context_menu.x } : undefined
        }
        MenuListProps={{ dense: true }}
      >
        <MenuItem
          onClick={handleDeleteEvent}
          sx={{ color: 'error.main' }}
          startIcon={<DeleteIcon />}
        >
          삭제
        </MenuItem>
      </Menu>

      {/* 이벤트 추가/수정 모달 */}
      <DeployEventModal
        key={event_modal_key} // 열 때마다 새로 마운트: 진행상태·프로젝트 입력칸의 이전 값이 남지 않게
        open={event_modal_open}
        onClose={() => setEventModalOpen(false)}
        date={selected_date}
        event={selected_event}
      />

      {/* 잡 색상 설정 모달 */}
      <JobColorManager
        open={color_manager_open}
        onClose={() => setColorManagerOpen(false)}
      />

      {/* 토스트 - 다크모드에서도 글자 가독성 확보 */}
      <Snackbar
        open={toast_open}
        autoHideDuration={2000}
        onClose={() => setToastOpen(false)}
        message={toast_message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        ContentProps={{
          sx: {
            color: 'var(--text-primary)',
            bgcolor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
          },
        }}
      />
    </>
  );

  // ------------------------------------------------------------------
  // 모바일 레이아웃 (< md): 5열 그리드 대신 요일별 아젠다 카드 리스트
  // (터치에서 드래그 대신 이벤트 모달의 날짜 입력으로 이동)
  // ------------------------------------------------------------------
  if (is_mobile) {
    const today_str = formatDateToString(new Date());

    return (
      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        {/* 헤더: 제목 + 주 이동 + 더보기 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: 17,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: 0,
            }}
          >
            {display_month_short}
          </Typography>
          <IconButton aria-label="이전 주" onClick={handlePrevWeek} sx={{ width: 40, height: 40 }}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton aria-label="다음 주" onClick={handleNextWeek} sx={{ width: 40, height: 40 }}>
            <ChevronRightIcon />
          </IconButton>
          <IconButton aria-label="이번 주로 이동" onClick={handleToday} sx={{ width: 40, height: 40 }}>
            <TodayIcon />
          </IconButton>
          <IconButton aria-label="더보기" onClick={(e) => setMoreAnchor(e.currentTarget)} sx={{ width: 40, height: 40 }}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={more_anchor}
            open={Boolean(more_anchor)}
            onClose={() => setMoreAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem
              onClick={() => {
                setMoreAnchor(null);
                setColorManagerOpen(true);
              }}
              sx={{ minHeight: 44 }}
            >
              <ListItemIcon><PaletteIcon fontSize="small" /></ListItemIcon>
              잡 색상 설정
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMoreAnchor(null);
                handleCopyHtml();
              }}
              sx={{ minHeight: 44 }}
            >
              <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
              HTML 복사
            </MenuItem>
          </Menu>
        </Box>

        {/* 주차별 아젠다 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {date_range.map((week, week_idx) => {
            const week_info = getWeekInfo(week[0]);
            return (
              <Box key={week_idx}>
                {date_range.length > 1 && (
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                    {week_info.month}월 {week_info.week}주차
                  </Typography>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {week.map((date) => {
                    const date_str = formatDateToString(date);
                    const day_events = getEventsForDate(date);
                    const is_today = date_str === today_str;
                    const has_holiday = day_events.some((e) => e.is_holiday);
                    const date_color = has_holiday ? HOLIDAY_COLOR : is_today ? 'primary.main' : 'text.primary';
                    return (
                      <Paper
                        key={date_str}
                        variant="outlined"
                        onClick={() => handleCellClick(date)}
                        sx={{
                          display: 'flex',
                          alignItems: 'stretch',
                          minHeight: 56,
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          borderColor: is_today ? 'primary.main' : 'divider',
                        }}
                      >
                        {/* 날짜 열 */}
                        <Box
                          sx={{
                            width: 56,
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: date_color,
                            bgcolor: 'var(--bg-tertiary)',
                            borderRight: '1px solid',
                            borderRightColor: 'divider',
                          }}
                        >
                          <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1, color: 'inherit', fontVariantNumeric: 'tabular-nums' }}>
                            {date.getDate()}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: 'inherit' }}>
                            {DAY_NAMES[date.getDay()]}
                          </Typography>
                        </Box>

                        {/* 이벤트 칩 + 추가 */}
                        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.5, py: 0.75, pl: 1, pr: 0.5 }}>
                          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {day_events.map((event) => {
                              const display_text = event.status ? `${event.job_name} ${event.status}` : event.job_name;
                              return (
                                <Box
                                  key={event.id}
                                  role="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCellClick(date, event);
                                  }}
                                  sx={{
                                    maxWidth: '100%',
                                    minHeight: 32,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    px: 1.25,
                                    borderRadius: '6px',
                                    fontSize: 13,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    ...(event.is_holiday
                                      ? { color: HOLIDAY_COLOR, fontWeight: 600 }
                                      : { bgcolor: getJobColor(event.job_code) || '#e0e0e0', color: '#000000' }),
                                  }}
                                >
                                  <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {event.is_holiday ? event.job_name : display_text}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                          <IconButton
                            aria-label={`${formatDateToDisplay(date)} 이벤트 추가`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCellClick(date);
                            }}
                            sx={{ width: 40, height: 40, flexShrink: 0, color: 'text.secondary' }}
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>

        {shared_overlays}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* 상단 컨트롤 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {/* 네비게이션 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="이전 주">
            <IconButton onClick={handlePrevWeek}>
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
          
          <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
            {display_month}
          </Typography>
          
          <Tooltip title="다음 주">
            <IconButton onClick={handleNextWeek}>
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="이번 주로 이동">
            <IconButton onClick={handleToday}>
              <TodayIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* 버튼들 */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PaletteIcon />}
            onClick={() => setColorManagerOpen(true)}
            size="small"
          >
            잡 색상 설정
          </Button>
          
          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyHtml}
            size="small"
          >
            HTML 복사
          </Button>
        </Box>
      </Box>
      
      {/* 캘린더 그리드 - 열 너비 고정, 드래그앤드롭 */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {date_range.map((week, week_idx) => (
            <Box
              key={week_idx}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(140px, 1fr))',
              }}
            >
              {/* 헤더 행 (날짜) */}
              {week.map((date, day_idx) => (
                <Box
                  key={`h-${day_idx}`}
                  sx={{
                    p: 1,
                    minWidth: 0,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    bgcolor: 'var(--bg-tertiary)',
                    borderRight: day_idx < 4 ? '1px solid' : 'none',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {formatDateToDisplay(date)}
                  </Typography>
                </Box>
              ))}
              
              {/* 데이터 행 (이벤트) - Droppable 셀 */}
              {week.map((date, day_idx) => {
                const day_events = getEventsForDate(date);
                return (
                  <DroppableCell
                    key={`b-${day_idx}`}
                    date={date}
                    week_idx={week_idx}
                    day_idx={day_idx}
                    total_weeks={weeks_to_show}
                    onCellClick={handleCellClick}
                  >
                    {day_events.length === 0 ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          opacity: 0,
                          '&:hover': { opacity: 0.5 },
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
                        {day_events.map((event) => {
                          if (event.is_holiday) {
                            return (
                              <Box
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCellClick(date, event);
                                }}
                                onContextMenu={(e) => handleContextMenu(e, event)}
                                sx={{
                                  textAlign: 'center',
                                  color: '#ca3626',
                                  fontWeight: 500,
                                  py: 0.5,
                                  cursor: 'pointer',
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                                title="우클릭: 삭제"
                              >
                                {event.job_name}
                              </Box>
                            );
                          }
                          return (
                            <DraggableEventChip
                              key={event.id}
                              event={event}
                              date={date}
                              getJobColor={getJobColor}
                              onEdit={(d, ev) => handleCellClick(d, ev)} // key 갱신으로 모달 폼(날짜 포함)을 이 이벤트 값으로 초기화
                              onContextMenu={handleContextMenu}
                            />
                          );
                        })}
                      </Box>
                    )}
                  </DroppableCell>
                );
              })}
            </Box>
          ))}
        </Paper>
      </DndContext>

      {shared_overlays}
    </Box>
  );
};

export default DeployCalendar;
