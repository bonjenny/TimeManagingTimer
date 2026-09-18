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
  ToggleButton,
  ToggleButtonGroup,
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
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
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
  getMonthWeekMondays,
  getWeekOfMonth,
  generateCalendarHtml,
  copyHtmlToClipboard,
} from '../../utils/calendar_export';
import DeployEventModal from '../calendar/DeployEventModal';
import JobColorManager from '../calendar/JobColorManager';
import { getHolidayName } from '../../constants/krHolidays';

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
  is_today: boolean;
  week_idx: number;
  day_idx: number;
  total_weeks: number;
  onCellClick: (date: Date) => void;
  children: React.ReactNode;
}

const DroppableCell: React.FC<DroppableCellProps> = ({
  date,
  is_today,
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
        bgcolor: isOver
          ? 'var(--bg-selected)'
          : is_today
            ? 'color-mix(in srgb, var(--primary-color) 6%, transparent)'
            : undefined,
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

// 주 단위 보기 시작 주: 이번 주 앞에 몇 주를 둘지 (1주: 이번 주 / 2주: 저번~이번 / 3주: 저번~다음 / 4주: 저저번~다음)
const getWeekViewStart = (weeks: number) => addDays(getMonday(new Date()), -7 * Math.floor(weeks / 2));

const DeployCalendar: React.FC = () => {
  const { events, job_colors, weeks_to_show, view_mode, show_today, setViewMode, getJobColor, updateEvent, deleteEvent } =
    useDeployCalendarStore();
  const is_month_view = view_mode === 'month';
  const today_str = formatDateToString(new Date());

  // 월 보기 기준 달 (1일) — 오늘이 든 달
  const [month_anchor, setMonthAnchor] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // 현재 표시 시작일
  const [start_date, setStartDate] = useState<Date>(() =>
    getWeekViewStart(weeks_to_show)
  );

  const prev_weeks_to_show = React.useRef(weeks_to_show);
  useEffect(() => {
    if (prev_weeks_to_show.current !== weeks_to_show) {
      prev_weeks_to_show.current = weeks_to_show;
      setStartDate(getWeekViewStart(weeks_to_show));
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
    const mondays = is_month_view
      ? getMonthWeekMondays(month_anchor.getFullYear(), month_anchor.getMonth())
      : Array.from({ length: weeks_to_show }, (_, week) => addDays(start_date, week * 7));
    // 월~금
    return mondays.map((monday) => [0, 1, 2, 3, 4].map((day) => addDays(monday, day)));
  }, [is_month_view, month_anchor, start_date, weeks_to_show]);
  const total_weeks = date_range.length;

  // 월 보기에서 앞뒤 달 날짜(첫 주·마지막 주에 섞인 날)는 흐리게
  const isOtherMonth = (date: Date) => is_month_view && date.getMonth() !== month_anchor.getMonth();
  
  // 주차: 그 주의 금요일이 있는 달의 몇 번째 금요일인지 (예: 금요일 9/18 → 9월 3주차)
  const getWeekInfo = (week_start: Date) => getWeekOfMonth(week_start);

  // 현재 표시 주차 정보 (첫 주 ~ 마지막 주)
  const display_month = useMemo(() => {
    if (is_month_view) return `${month_anchor.getFullYear()}년 ${month_anchor.getMonth() + 1}월`;
    if (date_range.length === 0) return '';
    const first_week = getWeekInfo(date_range[0][0]);
    const last_week = getWeekInfo(date_range[date_range.length - 1][0]);

    // 1주만 볼 때는 "~" 없이 한 주만
    if (date_range.length === 1) return `${first_week.year}년 ${first_week.month}월 ${first_week.week}주차`;
    if (first_week.year === last_week.year && first_week.month === last_week.month) {
      return `${first_week.year}년 ${first_week.month}월 ${first_week.week}주차 ~ ${last_week.week}주차`;
    } else if (first_week.year === last_week.year) {
      return `${first_week.month}월 ${first_week.week}주차 ~ ${last_week.month}월 ${last_week.week}주차`;
    } else {
      return `${first_week.year}년 ${first_week.month}월 ${first_week.week}주차 ~ ${last_week.year}년 ${last_week.month}월 ${last_week.week}주차`;
    }
  }, [date_range, is_month_view, month_anchor]);

  // 모바일 헤더용 짧은 제목 (예: "9월 1~2주차", "9월 5주차 ~ 10월 1주차")
  const display_month_short = useMemo(() => {
    if (is_month_view) return `${month_anchor.getFullYear()}년 ${month_anchor.getMonth() + 1}월`;
    if (date_range.length === 0) return '';
    const first_week = getWeekInfo(date_range[0][0]);
    const last_week = getWeekInfo(date_range[date_range.length - 1][0]);
    if (first_week.year === last_week.year && first_week.month === last_week.month) {
      return date_range.length === 1 || first_week.week === last_week.week
        ? `${first_week.month}월 ${first_week.week}주차`
        : `${first_week.month}월 ${first_week.week}~${last_week.week}주차`;
    }
    return `${first_week.month}월 ${first_week.week}주차 ~ ${last_week.month}월 ${last_week.week}주차`;
  }, [date_range, is_month_view, month_anchor]);

  // 네비게이션
  // 주 보기는 한 주씩, 월 보기는 한 달씩
  const moveBy = (step: number) => {
    if (is_month_view) {
      setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + step, 1));
    } else {
      setStartDate((prev) => addDays(prev, 7 * step));
    }
  };
  const handlePrevWeek = () => moveBy(-1);
  const handleNextWeek = () => moveBy(1);

  const handleToday = () => {
    setStartDate(getWeekViewStart(weeks_to_show));
    setMonthAnchor(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  };
  const unit_label = is_month_view ? '달' : '주';
  
  // 셀 클릭 - 이벤트 추가/수정
  const handleCellClick = (date: Date, event?: DeployEvent) => {
    setSelectedDate(formatDateToString(date));
    setSelectedEvent(event || null);
    setEventModalKey((k) => k + 1);
    setEventModalOpen(true);
  };
  
  // HTML 복사
  const handleCopyHtml = async () => {
    // 화면에 보이는 범위 그대로 (월 보기면 4~5주). 오늘 강조는 넣지 않는다 — 붙여넣은 뒤엔 날짜가 지나므로
    const first_monday = date_range[0][0];
    const end_date = addDays(first_monday, total_weeks * 7 - 1);
    const start_str = formatDateToString(first_monday);
    const end_str = formatDateToString(end_date);

    const range_events = events.filter(e => e.date >= start_str && e.date <= end_str);
    const holiday_events: DeployEvent[] = date_range.flat().flatMap((date) => {
      const name = getPublicHoliday(date);
      return name
        ? [{ id: `kr-holiday-${formatDateToString(date)}`, date: formatDateToString(date), job_code: '', job_name: name, status: '', is_holiday: true }]
        : [];
    });

    const html = generateCalendarHtml({
      // 공휴일을 그날 맨 위에
      events: [...holiday_events, ...range_events],
      job_colors,
      start_date: first_monday,
      weeks: total_weeks,
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

  // 공휴일 이름. 그날 직접 넣은 휴일 이벤트(연차 등)가 있으면 중복 표시하지 않는다
  const getPublicHoliday = (date: Date): string | undefined => {
    const date_str = formatDateToString(date);
    const name = getHolidayName(date_str);
    if (!name) return undefined;
    return events.some((e) => e.date === date_str && e.is_holiday && e.job_name === name) ? undefined : name;
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
          <IconButton aria-label={`이전 ${unit_label}`} onClick={handlePrevWeek} sx={{ width: 40, height: 40 }}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton aria-label={`다음 ${unit_label}`} onClick={handleNextWeek} sx={{ width: 40, height: 40 }}>
            <ChevronRightIcon />
          </IconButton>
          <IconButton aria-label={is_month_view ? '이번 달로 이동' : '이번 주로 이동'} onClick={handleToday} sx={{ width: 40, height: 40 }}>
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
                setViewMode(is_month_view ? 'week' : 'month');
              }}
              sx={{ minHeight: 44 }}
            >
              <ListItemIcon>
                {is_month_view ? <ViewWeekIcon fontSize="small" /> : <CalendarViewMonthIcon fontSize="small" />}
              </ListItemIcon>
              {is_month_view ? '주 단위로 보기' : '월 단위로 보기'}
            </MenuItem>
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
                {total_weeks > 1 && (
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                    {week_info.month}월 {week_info.week}주차
                  </Typography>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {week.map((date) => {
                    const date_str = formatDateToString(date);
                    const day_events = getEventsForDate(date);
                    const is_today = show_today && date_str === today_str;
                    const public_holiday = getPublicHoliday(date);
                    const has_holiday = !!public_holiday || day_events.some((e) => e.is_holiday);
                    const date_color = has_holiday
                      ? HOLIDAY_COLOR
                      : is_today
                        ? 'primary.main'
                        : isOtherMonth(date)
                          ? 'text.disabled'
                          : 'text.primary';
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
                            {public_holiday && (
                              <Box
                                component="span"
                                sx={{ minHeight: 32, display: 'inline-flex', alignItems: 'center', px: 0.5, fontSize: 13, fontWeight: 600, color: HOLIDAY_COLOR }}
                              >
                                {public_holiday}
                              </Box>
                            )}
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
          <Tooltip title={`이전 ${unit_label}`}>
            <IconButton onClick={handlePrevWeek}>
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
          
          <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
            {display_month}
          </Typography>
          
          <Tooltip title={`다음 ${unit_label}`}>
            <IconButton onClick={handleNextWeek}>
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={is_month_view ? '이번 달로 이동' : '이번 주로 이동'}>
            <IconButton onClick={handleToday}>
              <TodayIcon />
            </IconButton>
          </Tooltip>

          {/* 보기 방식: 주 단위(설정한 주 수) / 월 단위(한 달 고정). 선택은 저장된다 */}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view_mode}
            onChange={(_, mode) => mode && setViewMode(mode)}
            aria-label="보기 방식"
            sx={{ ml: 1, '& .MuiToggleButton-root': { px: 1.5, py: 0.5, gap: 0.5 } }}
          >
            <ToggleButton value="week" aria-label="주 단위">
              <ViewWeekIcon fontSize="small" />주
            </ToggleButton>
            <ToggleButton value="month" aria-label="월 단위">
              <CalendarViewMonthIcon fontSize="small" />월
            </ToggleButton>
          </ToggleButtonGroup>
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
              {week.map((date, day_idx) => {
                const is_today = show_today && formatDateToString(date) === today_str;
                const public_holiday = getPublicHoliday(date);
                const is_holiday = !!public_holiday || getEventsForDate(date).some((e) => e.is_holiday);
                return (
                  <Box
                    key={`h-${day_idx}`}
                    sx={{
                      p: 1,
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.75,
                      bgcolor: is_today
                        ? 'color-mix(in srgb, var(--primary-color) 14%, var(--bg-tertiary))'
                        : 'var(--bg-tertiary)',
                      borderRight: day_idx < 4 ? '1px solid' : 'none',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      // 오늘 칸 위쪽에 브랜드색 막대
                      boxShadow: is_today ? 'inset 0 3px 0 var(--primary-color)' : undefined,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      noWrap
                      sx={{
                        color: is_holiday
                          ? HOLIDAY_COLOR
                          : is_today
                            ? 'primary.main'
                            : isOtherMonth(date)
                              ? 'text.disabled'
                              : undefined,
                        opacity: is_holiday && isOtherMonth(date) ? 0.5 : 1,
                      }}
                    >
                      {formatDateToDisplay(date)}
                    </Typography>
                    {public_holiday && (
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{ color: HOLIDAY_COLOR, fontWeight: 600, minWidth: 0, opacity: isOtherMonth(date) ? 0.5 : 1 }}
                        title={public_holiday}
                      >
                        {public_holiday}
                      </Typography>
                    )}
                    {is_today && (
                      <Box
                        component="span"
                        sx={{
                          px: 0.75,
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: '18px',
                          color: '#fff',
                          bgcolor: 'var(--primary-color)',
                          flexShrink: 0,
                        }}
                      >
                        오늘
                      </Box>
                    )}
                  </Box>
                );
              })}
              
              {/* 데이터 행 (이벤트) - Droppable 셀 */}
              {week.map((date, day_idx) => {
                const day_events = getEventsForDate(date);
                return (
                  <DroppableCell
                    key={`b-${day_idx}`}
                    date={date}
                    is_today={show_today && formatDateToString(date) === today_str}
                    week_idx={week_idx}
                    day_idx={day_idx}
                    total_weeks={total_weeks}
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
