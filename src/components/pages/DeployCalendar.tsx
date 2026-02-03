import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
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

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------

const WEEKS_TO_SHOW = 2; // 표시할 주 수

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
  onCellClick: (date: Date) => void;
  children: React.ReactNode;
}

const DroppableCell: React.FC<DroppableCellProps> = ({
  date,
  week_idx,
  day_idx,
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
        borderBottom: week_idx < WEEKS_TO_SHOW - 1 ? '1px solid' : 'none',
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
  const { events, job_colors, getJobColor, updateEvent, deleteEvent } = useDeployCalendarStore();
  
  // 현재 표시 시작일: 저번주 월요일 (저번주~이번주 2주 표시)
  const [start_date, setStartDate] = useState<Date>(() =>
    addDays(getMonday(new Date()), -7)
  );
  
  // 모달 상태
  const [event_modal_open, setEventModalOpen] = useState(false);
  const [selected_date, setSelectedDate] = useState<string>('');
  const [selected_event, setSelectedEvent] = useState<DeployEvent | null>(null);
  const [color_manager_open, setColorManagerOpen] = useState(false);
  
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
    for (let week = 0; week < WEEKS_TO_SHOW; week++) {
      const week_dates: Date[] = [];
      for (let day = 0; day < 5; day++) { // 월~금
        week_dates.push(addDays(start_date, week * 7 + day));
      }
      dates.push(week_dates);
    }
    return dates;
  }, [start_date]);
  
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
  
  // 현재 표시 주차 정보
  const display_month = useMemo(() => {
    const first_week = getWeekInfo(date_range[0][0]);
    const second_week = getWeekInfo(date_range[1][0]);
    
    if (first_week.year === second_week.year && first_week.month === second_week.month) {
      // 같은 년/월
      return `${first_week.year}년 ${first_week.month}월 ${first_week.week}주차 ~ ${second_week.week}주차`;
    } else if (first_week.year === second_week.year) {
      // 같은 년, 다른 월
      return `${first_week.month}월 ${first_week.week}주차 ~ ${second_week.month}월 ${second_week.week}주차`;
    } else {
      // 다른 년
      return `${first_week.year}년 ${first_week.month}월 ${first_week.week}주차 ~ ${second_week.year}년 ${second_week.month}월 ${second_week.week}주차`;
    }
  }, [date_range]);
  
  // 네비게이션
  const handlePrevWeek = () => {
    setStartDate(prev => addDays(prev, -7));
  };
  
  const handleNextWeek = () => {
    setStartDate(prev => addDays(prev, 7));
  };
  
  const handleToday = () => {
    setStartDate(addDays(getMonday(new Date()), -7));
  };
  
  // 셀 클릭 - 이벤트 추가/수정
  const handleCellClick = (date: Date, event?: DeployEvent) => {
    setSelectedDate(formatDateToString(date));
    setSelectedEvent(event || null);
    setEventModalOpen(true);
  };
  
  // HTML 복사
  const handleCopyHtml = async () => {
    const end_date = addDays(start_date, WEEKS_TO_SHOW * 7 - 1);
    const start_str = formatDateToString(start_date);
    const end_str = formatDateToString(end_date);
    
    const range_events = events.filter(e => e.date >= start_str && e.date <= end_str);
    
    const html = generateCalendarHtml({
      events: range_events,
      job_colors,
      start_date,
      weeks: WEEKS_TO_SHOW,
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
                              onEdit={(d, ev) => {
                                setSelectedDate(formatDateToString(d));
                                setSelectedEvent(ev);
                                setEventModalOpen(true);
                              }}
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
    </Box>
  );
};

export default DeployCalendar;
