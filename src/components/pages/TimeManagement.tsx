import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TextField,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Autocomplete,
  Chip,
  Divider,
  ListItemIcon,
  ListSubheader,
  Menu,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SortIcon from '@mui/icons-material/Sort';
import CheckIcon from '@mui/icons-material/Check';
import ChecklistIcon from '@mui/icons-material/Checklist';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { v4 as uuidv4 } from 'uuid';
import { useTimerStore } from '../../store/useTimerStore';
import { useTimeManagementStore, TimeManagementRow } from '../../store/useTimeManagementStore';
import { useProjectStore } from '../../store/useProjectStore';
import {
  convertLogsToTimeManagement,
  mergeTimeManagementRows,
  formatDateToYYYYMMDD,
} from '../../utils/timeManagementConverter';
import {
  CATEGORY_CODE_MAP,
  getCategoryName,
  getCategoryCode,
  getAllCategoryCodes,
  getAllCategoryNames,
} from '../../constants/categoryCodeMap';
import ErpRegisterDialog from './ErpRegisterDialog';

const DAY_START_HOUR = 0;
const WORK_TYPE_OPTIONS = ['작업', '개발'];

// 모바일(< md) 카드 뷰: 정렬 메뉴 항목 · 편집 시트 필드
const MOBILE_SORT_COLUMNS: { column: keyof TimeManagementRow; label: string }[] = [
  { column: 'project_name', label: '작업' },
  { column: 'work_type', label: '업무형' },
  { column: 'schedule_name', label: '거래형(일정명)' },
  { column: 'category_code', label: '카테고리' },
  { column: 'time_minutes', label: '시간(분)' },
  { column: 'end_date', label: '종료예정일' },
  { column: 'note', label: '비고' },
];
type SheetField = 'project_name' | 'work_type' | 'schedule_name' | 'category_code' | 'category_name' | 'time_minutes' | 'end_date' | 'note';
type SheetDraft = Record<SheetField, string>;
const SHEET_FIELDS: SheetField[] = ['project_name', 'work_type', 'schedule_name', 'category_code', 'category_name', 'time_minutes', 'end_date', 'note'];
const toSheetDraft = (row: TimeManagementRow): SheetDraft => ({
  project_name: row.project_name,
  work_type: row.work_type,
  schedule_name: row.schedule_name,
  category_code: row.category_code,
  category_name: row.category_name,
  time_minutes: String(row.time_minutes),
  end_date: row.end_date || row.date,
  note: row.note || '',
});

const TimeManagement: React.FC = () => {
  const [selected_date, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    if (now.getHours() < DAY_START_HOUR) {
      now.setDate(now.getDate() - 1);
    }
    return now;
  });

  const date_input_ref = useRef<HTMLInputElement>(null);

  const { logs } = useTimerStore();
  const { projects, getProjectName } = useProjectStore();
  const {
    rows: all_rows,
    default_work_type,
    category_work_type_map,
    project_work_type_map,
    note_include_title,
    addRow,
    addRows,
    updateRow,
    deleteRows,
    getRowsByDate,
    setRowsByDate,
    toggleCheck,
    toggleAllChecks,
    setDefaultWorkType,
    setCategoryWorkType,
    removeCategoryWorkType,
    setProjectWorkType,
    removeProjectWorkType,
  } = useTimeManagementStore();

  const date_string = formatDateToYYYYMMDD(selected_date);
  const current_rows = getRowsByDate(date_string);

  const [editing_cell, setEditingCell] = useState<{
    row_id: string;
    field: keyof TimeManagementRow;
  } | null>(null);
  const [edit_value, setEditValue] = useState<string>('');

  // 다중 정렬: 먼저 누른 컬럼이 1순위, 나중에 누른 컬럼은 앞 기준이 같은 행끼리의 2·3순위
  const [sort_keys, setSortKeys] = useState<{ column: keyof TimeManagementRow; direction: 'asc' | 'desc' }[]>([]);

  const [settings_open, setSettingsOpen] = useState(false);
  const [new_category, setNewCategory] = useState<string | null>(null);
  const [new_work_type, setNewWorkType] = useState<string>('작업');

  const [project_settings_open, setProjectSettingsOpen] = useState(false);
  const [erp_open, setErpOpen] = useState(false);
  const [new_project_code, setNewProjectCode] = useState<string | null>(null);
  const [new_project_work_type, setNewProjectWorkType] = useState<string>('작업');

  const theme = useTheme();
  const is_mobile = useMediaQuery(theme.breakpoints.down('md'));
  const is_phone = useMediaQuery(theme.breakpoints.down('sm'));
  const [menu_anchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [sort_anchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [select_mode, setSelectMode] = useState(false);
  const [sheet_row, setSheetRow] = useState<TimeManagementRow | null>(null);
  const [sheet_draft, setSheetDraft] = useState<SheetDraft | null>(null);

  const isToday = (() => {
    const now = new Date();
    let today = new Date(now);
    if (now.getHours() < DAY_START_HOUR) {
      today.setDate(today.getDate() - 1);
    }
    return (
      selected_date.getFullYear() === today.getFullYear() &&
      selected_date.getMonth() === today.getMonth() &&
      selected_date.getDate() === today.getDate()
    );
  })();

  const handlePrevDay = () => {
    setSelectedDate((prev) => {
      const new_date = new Date(prev);
      new_date.setDate(new_date.getDate() - 1);
      return new_date;
    });
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => {
      const new_date = new Date(prev);
      new_date.setDate(new_date.getDate() + 1);
      return new_date;
    });
  };

  const handleToday = () => {
    const now = new Date();
    if (now.getHours() < DAY_START_HOUR) {
      now.setDate(now.getDate() - 1);
    }
    setSelectedDate(now);
  };

  const formatSelectedDate = () => {
    const year = selected_date.getFullYear();
    const month = selected_date.getMonth() + 1;
    const day = selected_date.getDate();
    const day_of_week = ['일', '월', '화', '수', '목', '금', '토'][selected_date.getDay()];
    return `${year}. ${month}. ${day}. (${day_of_week})`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [y, m, d] = e.target.value.split('-').map(Number);
      const new_date = new Date();
      new_date.setFullYear(y, m - 1, d);
      setSelectedDate(new_date);
    }
  };

  const getFormattedDateValue = () => {
    const year = selected_date.getFullYear();
    const month = String(selected_date.getMonth() + 1).padStart(2, '0');
    const day = String(selected_date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleLoadFromLogs = () => {
    const filtered_logs = logs.filter((log) => {
      if (!log.endTime || log.deletedAt) return false;
      const log_date = new Date(log.startTime);
      return (
        log_date.getFullYear() === selected_date.getFullYear() &&
        log_date.getMonth() === selected_date.getMonth() &&
        log_date.getDate() === selected_date.getDate()
      );
    });

    const converted = convertLogsToTimeManagement(
      filtered_logs,
      date_string,
      default_work_type,
      category_work_type_map,
      project_work_type_map,
      note_include_title
    );

    const merged = mergeTimeManagementRows(current_rows, converted);

    if (merged.length > 0) {
      setRowsByDate(date_string, merged);
    }
  };

  const handleAddRow = () => {
    const new_row: TimeManagementRow = {
      id: uuidv4(),
      checked: false,
      project_name: '',
      work_type: default_work_type,
      schedule_name: '',
      category_code: '9999',
      category_name: '기타',
      time_minutes: 0,
      note: '',
      date: date_string,
      end_date: formatDateToYYYYMMDD(new Date()),
    };
    addRow(new_row);
  };

  const handleDeleteChecked = () => {
    const checked_ids = current_rows.filter((row) => row.checked).map((row) => row.id);
    if (checked_ids.length > 0) {
      deleteRows(checked_ids);
    }
  };

  const handleExportExcel = async () => {
    // 엑셀 라이브러리(약 400KB)는 내보낼 때만 받는다
    const XLSX = await import('xlsx');
    if (current_rows.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    const export_data = current_rows.map((row) => ({
      '작업': getProjectName(row.project_name) || '-',
      '업무형': row.work_type,
      '거래형(일정명)': row.schedule_name,
      '카테고리 코드': row.category_code,
      '카테고리명': row.category_name,
      '시간(분)': row.time_minutes,
      '종료예정일': row.end_date || row.date,
      '비고': row.note || '',
    }));

    const total_minutes = current_rows.reduce((sum, row) => sum + row.time_minutes, 0);
    export_data.push({
      '작업': '',
      '업무형': '',
      '거래형(일정명)': '',
      '카테고리 코드': '',
      '카테고리명': '합계',
      '시간(분)': total_minutes,
      '종료예정일': '',
      '비고': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(export_data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '시간관리');

    const year = selected_date.getFullYear();
    const month = String(selected_date.getMonth() + 1).padStart(2, '0');
    const day = String(selected_date.getDate()).padStart(2, '0');
    const file_name = `시간관리_${year}-${month}-${day}.xlsx`;

    XLSX.writeFile(workbook, file_name);
  };

  const handleCellClick = (row: TimeManagementRow, field: keyof TimeManagementRow) => {
    if (field === 'checked' || field === 'id' || field === 'date' || field === 'original_log_id') {
      return;
    }
    setEditingCell({ row_id: row.id, field });
    setEditValue(field === 'end_date' ? row.end_date || row.date : String(row[field]));
  };

  // 인라인 셀 편집과 모바일 편집 시트가 같은 변환으로 저장
  const getFieldPatch = (field: keyof TimeManagementRow, value: string): Partial<TimeManagementRow> => {
    if (field === 'category_code') return { category_code: value, category_name: getCategoryName(value) };
    if (field === 'category_name') return { category_code: getCategoryCode(value), category_name: value };
    if (field === 'time_minutes') return { time_minutes: parseInt(value) || 0 };
    return { [field]: value };
  };

  const handleSaveEdit = () => {
    if (!editing_cell) return;

    const { row_id, field } = editing_cell;

    updateRow(row_id, getFieldPatch(field, edit_value));

    setEditingCell(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const total_minutes = current_rows.reduce((sum, row) => sum + row.time_minutes, 0);
  const checked_count = current_rows.filter((row) => row.checked).length;
  const all_checked = current_rows.length > 0 && checked_count === current_rows.length;

  const handleToggleAll = () => {
    toggleAllChecks(date_string, !all_checked);
  };

  const handleHeaderClick = (column: keyof TimeManagementRow) => {
    if (column === 'checked' || column === 'id' || column === 'date' || column === 'original_log_id') {
      return;
    }

    setSortKeys((prev) => {
      const current = prev.find((k) => k.column === column);
      if (!current) return [...prev, { column, direction: 'asc' }]; // 새 기준은 맨 뒤(가장 낮은 순위)
      if (current.direction === 'asc') {
        return prev.map((k) => (k.column === column ? { column, direction: 'desc' } : k)); // 순위 유지, 방향만
      }
      return prev.filter((k) => k.column !== column); // desc 다음 클릭은 해당 컬럼 정렬 해제
    });
  };

  const sorted_rows = useMemo(() => {
    if (sort_keys.length === 0) {
      return current_rows;
    }

    const valueOf = (row: TimeManagementRow, column: keyof TimeManagementRow) =>
      column === 'end_date' ? row.end_date || row.date : row[column];

    return [...current_rows].sort((a, b) => {
      for (const { column, direction } of sort_keys) {
        const a_value = valueOf(a, column);
        const b_value = valueOf(b, column);
        const diff =
          typeof a_value === 'number' && typeof b_value === 'number'
            ? a_value - b_value
            : String(a_value ?? '').localeCompare(String(b_value ?? ''));
        if (diff !== 0) return direction === 'asc' ? diff : -diff;
      }
      return 0;
    });
  }, [current_rows, sort_keys]);

  const renderSortIcon = (column: keyof TimeManagementRow) => {
    const index = sort_keys.findIndex((k) => k.column === column);
    if (index >= 0) {
      return (
        <>
          {sort_keys[index].direction === 'asc' ? (
            <KeyboardArrowUpIcon sx={{ fontSize: 18, ml: 0.5, opacity: 0.7 }} />
          ) : (
            <KeyboardArrowDownIcon sx={{ fontSize: 18, ml: 0.5, opacity: 0.7 }} />
          )}
          {sort_keys.length > 1 && (
            <Typography component="span" variant="caption" sx={{ opacity: 0.6, fontSize: '0.65rem' }}>
              {index + 1}
            </Typography>
          )}
        </>
      );
    }
    return <ExpandMoreIcon sx={{ fontSize: 16, ml: 0.5, opacity: 0.3 }} />;
  };

  useEffect(() => {
    const existing_rows = getRowsByDate(date_string);
    if (existing_rows.length === 0) {
      handleLoadFromLogs();
    }
  }, [date_string]);

  const handleAddCategoryMapping = () => {
    if (new_category) {
      setCategoryWorkType(new_category, new_work_type);
      setNewCategory(null);
      setNewWorkType('작업');
    }
  };

  const handleRemoveCategoryMapping = (category: string) => {
    removeCategoryWorkType(category);
  };

  const handleAddProjectMapping = () => {
    if (new_project_code) {
      setProjectWorkType(new_project_code, new_project_work_type);
      setNewProjectCode(null);
      setNewProjectWorkType('작업');
    }
  };

  const handleRemoveProjectMapping = (project_code: string) => {
    removeProjectWorkType(project_code);
  };

  // ── 모바일 편집 시트 ──
  const openSheet = (row: TimeManagementRow) => {
    setSheetRow(row);
    setSheetDraft(toSheetDraft(row));
  };

  const closeSheet = () => {
    setSheetRow(null);
    setSheetDraft(null);
  };

  const setDraftField = (field: SheetField, value: string) => {
    setSheetDraft((prev) => {
      if (!prev) return prev;
      if (field === 'category_code' || field === 'category_name') {
        const patch = getFieldPatch(field, value);
        return { ...prev, category_code: patch.category_code as string, category_name: patch.category_name as string };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSheetSave = () => {
    if (!sheet_row || !sheet_draft) return;
    const initial = toSheetDraft(sheet_row);
    // 바뀐 필드만 인라인 편집과 같은 patch 로 반영 (카테고리는 코드 우선)
    const patch = SHEET_FIELDS.reduce<Partial<TimeManagementRow>>((acc, field) => {
      if (sheet_draft[field] === initial[field]) return acc;
      if (field === 'category_name' && sheet_draft.category_code !== initial.category_code) return acc;
      return { ...acc, ...getFieldPatch(field, sheet_draft[field]) };
    }, {});
    if (Object.keys(patch).length > 0) updateRow(sheet_row.id, patch);
    closeSheet();
  };

  const handleSheetDelete = () => {
    if (!sheet_row) return;
    deleteRows([sheet_row.id]);
    closeSheet();
  };

  const closeMenu = () => setMenuAnchor(null);

  const exitSelectMode = () => {
    if (checked_count > 0) toggleAllChecks(date_string, false);
    setSelectMode(false);
  };

  const renderCell = (row: TimeManagementRow, field: keyof TimeManagementRow) => {
    const is_editing = editing_cell?.row_id === row.id && editing_cell?.field === field;

    if (is_editing) {
      if (field === 'category_code') {
        return (
          <Select
            value={edit_value}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            size="small"
            autoFocus
            sx={{ minWidth: 80 }}
          >
            {getAllCategoryCodes().map((code) => (
              <MenuItem key={code} value={code}>
                {code} - {getCategoryName(code)}
              </MenuItem>
            ))}
          </Select>
        );
      }

      if (field === 'category_name') {
        return (
          <Select
            value={edit_value}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            size="small"
            autoFocus
            sx={{ minWidth: 100 }}
          >
            {getAllCategoryNames().map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
        );
      }

      if (field === 'project_name') {
        return (
          <Select
            value={edit_value}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            size="small"
            autoFocus
            sx={{ minWidth: 140 }}
            // 목록은 두 줄이지만 고른 뒤에는 표와 같이 프로젝트명 한 줄로 보여준다
            renderValue={(value) => (value ? getProjectName(value as string) : '없음')}
          >
            <MenuItem value="">없음</MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.code} value={project.code} sx={{ display: 'block', py: 0.75 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.3 }}>{project.code}</Typography>
                <Typography sx={{ fontSize: '0.95rem', color: 'text.secondary', lineHeight: 1.35 }}>
                  {project.name}
                </Typography>
              </MenuItem>
            ))}
          </Select>
        );
      }

      if (field === 'work_type') {
        return (
          <Select
            value={edit_value}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            size="small"
            autoFocus
            sx={{ minWidth: 80 }}
          >
            {WORK_TYPE_OPTIONS.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        );
      }

      if (field === 'end_date') {
        return (
          <TextField
            type="date"
            value={edit_value}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            size="small"
            autoFocus
          />
        );
      }

      return (
        <TextField
          value={edit_value}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          size="small"
          autoFocus
          fullWidth
          multiline={field === 'note'}
          type={field === 'time_minutes' ? 'number' : 'text'}
        />
      );
    }

    if (field === 'project_name') {
      const display_value = row.project_name ? getProjectName(row.project_name) : '-';
      return (
        <Box
          onClick={() => handleCellClick(row, field)}
          sx={{
            cursor: 'pointer',
            minHeight: 24,
            '&:hover': { bgcolor: 'action.hover' },
            px: 1,
            py: 0.5,
          }}
        >
          {display_value}
        </Box>
      );
    }

    if (field === 'end_date') {
      return (
        <Box
          onClick={() => handleCellClick(row, field)}
          sx={{ cursor: 'pointer', minHeight: 24, '&:hover': { bgcolor: 'action.hover' }, px: 1, py: 0.5, whiteSpace: 'nowrap' }}
        >
          {row.end_date || row.date}
        </Box>
      );
    }

    return (
      <Box
        onClick={() => handleCellClick(row, field)}
        sx={{
          cursor: 'pointer',
          minHeight: 24,
          '&:hover': { bgcolor: 'action.hover' },
          px: 1,
          py: 0.5,
          whiteSpace: field === 'note' ? 'pre-wrap' : 'normal',
          wordBreak: 'break-word',
        }}
      >
        {field === 'note' && typeof row[field] === 'string' ? (
          (row[field] as string).split('\n').map((line, i, arr) => (
            <React.Fragment key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </React.Fragment>
          ))
        ) : (
          String(row[field])
        )}
      </Box>
    );
  };

  const date_picker_input = (
    <input
      ref={date_input_ref}
      type="date"
      value={getFormattedDateValue()}
      onChange={handleDateChange}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        zIndex: 1,
        cursor: 'pointer',
      }}
    />
  );

  const one_line_sx = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;
  const touch_icon_sx = { width: 44, height: 44, border: 1, borderColor: 'divider', borderRadius: 2, flexShrink: 0 } as const;

  const renderRowCard = (row: TimeManagementRow) => (
    <Box
      key={row.id}
      role="button"
      tabIndex={0}
      onClick={() => (select_mode ? toggleCheck(row.id) : openSheet(row))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (select_mode) toggleCheck(row.id);
          else openSheet(row);
        }
      }}
      sx={{
        display: 'flex',
        gap: 1,
        p: { xs: 1.5, sm: 2 },
        border: '1px solid',
        borderColor: select_mode && row.checked ? 'primary.main' : 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        cursor: 'pointer',
        '&:active': { bgcolor: 'action.hover' },
      }}
    >
      {select_mode && (
        <Checkbox
          checked={row.checked}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleCheck(row.id)}
          sx={{ p: 0.5, ml: -0.5, alignSelf: 'flex-start' }}
        />
      )}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Typography
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.4,
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              color: row.schedule_name ? 'text.primary' : 'text.disabled',
            }}
          >
            {row.schedule_name || '일정명 없음'}
          </Typography>
          <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {row.time_minutes}분
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', minWidth: 0 }}>
          <Chip size="small" label={row.project_name ? getProjectName(row.project_name) : '작업 없음'} sx={{ maxWidth: '100%' }} />
          <Chip size="small" variant="outlined" label={row.work_type} />
          <Chip size="small" variant="outlined" label={`${row.category_code} ${row.category_name}`} sx={{ maxWidth: '100%' }} />
        </Box>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', ...one_line_sx }}>
          종료 {row.end_date || row.date}
          {row.note ? ` · ${row.note.replace(/\n/g, ' ')}` : ''}
        </Typography>
      </Box>
    </Box>
  );

  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
      {/* 날짜 전환 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton aria-label="이전 날짜" onClick={handlePrevDay} sx={{ width: 40, height: 40 }}>
          <ChevronLeftIcon />
        </IconButton>
        <Box
          sx={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
            bgcolor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
          }}
        >
          {date_picker_input}
          <Typography sx={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums', ...one_line_sx }}>
            {formatSelectedDate()}
          </Typography>
        </Box>
        <IconButton aria-label="다음 날짜" onClick={handleNextDay} sx={{ width: 40, height: 40 }}>
          <ChevronRightIcon />
        </IconButton>
        {!isToday && <Chip label="오늘" size="small" onClick={handleToday} sx={{ flexShrink: 0 }} />}
        <IconButton aria-label="날짜 선택" onClick={() => date_input_ref.current?.showPicker?.()} sx={{ width: 40, height: 40 }}>
          <CalendarMonthIcon />
        </IconButton>
      </Box>

      {/* 액션 바 */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          variant="contained"
          onClick={() => setErpOpen(true)}
          startIcon={<CloudUploadIcon />}
          disabled={current_rows.length === 0}
          sx={{ flex: 1, minHeight: 44, whiteSpace: 'nowrap' }}
        >
          시간관리 등록
        </Button>
        <IconButton aria-label="새 행 추가" onClick={handleAddRow} sx={touch_icon_sx}>
          <AddIcon />
        </IconButton>
        <IconButton aria-label="더보기" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={touch_icon_sx}>
          <MoreVertIcon />
        </IconButton>
      </Box>
      <Menu anchorEl={menu_anchor} open={!!menu_anchor} onClose={closeMenu}>
        <MenuItem onClick={() => { closeMenu(); handleLoadFromLogs(); }}>
          <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
          {current_rows.length > 0 ? '일간 타이머에서 다시 불러오기' : '일간 타이머에서 불러오기'}
        </MenuItem>
        <MenuItem disabled={current_rows.length === 0} onClick={() => { closeMenu(); handleExportExcel(); }}>
          <ListItemIcon><FileUploadIcon fontSize="small" /></ListItemIcon>
          엑셀 Export
        </MenuItem>
        <MenuItem disabled={current_rows.length === 0} onClick={() => { closeMenu(); setSelectMode(true); }}>
          <ListItemIcon><ChecklistIcon fontSize="small" /></ListItemIcon>
          선택 삭제 모드
        </MenuItem>
        <Divider />
        <ListSubheader sx={{ lineHeight: '32px' }}>기본 업무형</ListSubheader>
        {WORK_TYPE_OPTIONS.map((type) => (
          <MenuItem key={type} selected={type === default_work_type} onClick={() => setDefaultWorkType(type)}>
            <ListItemIcon>{type === default_work_type && <CheckIcon fontSize="small" />}</ListItemIcon>
            {type}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => { closeMenu(); setSettingsOpen(true); }}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          카테고리별 업무형 설정
        </MenuItem>
        <MenuItem onClick={() => { closeMenu(); setProjectSettingsOpen(true); }}>
          <ListItemIcon><SettingsIcon fontSize="small" color="primary" /></ListItemIcon>
          프로젝트별 업무형 설정
        </MenuItem>
      </Menu>

      {/* 합계 + 정렬 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', fontVariantNumeric: 'tabular-nums', minWidth: 0, ...one_line_sx }}>
          총 <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{total_minutes}분</Box>
          {' '}({(total_minutes / 60).toFixed(1)}시간) · {current_rows.length}건
        </Typography>
        <Button
          size="small"
          startIcon={<SortIcon />}
          onClick={(e) => setSortAnchor(e.currentTarget)}
          sx={{ minHeight: 40, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          정렬{sort_keys.length > 0 ? ` (${sort_keys.length})` : ''}
        </Button>
      </Box>
      <Menu anchorEl={sort_anchor} open={!!sort_anchor} onClose={() => setSortAnchor(null)}>
        {MOBILE_SORT_COLUMNS.map(({ column, label }) => (
          <MenuItem key={column} selected={sort_keys.some((k) => k.column === column)} onClick={() => handleHeaderClick(column)}>
            <ListItemText>{label}</ListItemText>
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, minWidth: 36, justifyContent: 'flex-end' }}>
              {renderSortIcon(column)}
            </Box>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem disabled={sort_keys.length === 0} onClick={() => setSortKeys([])}>
          정렬 초기화
        </MenuItem>
      </Menu>

      {/* 행 카드 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {sorted_rows.map(renderRowCard)}
        {current_rows.length === 0 && (
          <Box sx={{ py: 5, px: 2, textAlign: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
            <Typography sx={{ fontSize: 14 }}>데이터가 없습니다.</Typography>
            <Typography sx={{ fontSize: 13, mt: 0.5 }}>⋮ 메뉴의 「일간 타이머에서 불러오기」나 + 버튼으로 시작하세요.</Typography>
          </Box>
        )}
      </Box>

      {/* 선택 삭제 바 */}
      {select_mode && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 64,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            pl: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: 3,
          }}
        >
          <Checkbox
            checked={all_checked}
            indeterminate={checked_count > 0 && !all_checked}
            onChange={handleToggleAll}
            inputProps={{ 'aria-label': '전체 선택' }}
          />
          <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13, ...one_line_sx }}>{checked_count}개 선택</Typography>
          <Button onClick={exitSelectMode} sx={{ minHeight: 44, whiteSpace: 'nowrap' }}>
            취소
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={checked_count === 0}
            onClick={() => { handleDeleteChecked(); setSelectMode(false); }}
            sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
          >
            삭제 ({checked_count})
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box>
      {is_mobile ? (
        renderMobileView()
      ) : (
        <>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="이전 날짜">
              <IconButton size="small" onClick={handlePrevDay}>
                <ChevronLeftIcon />
              </IconButton>
            </Tooltip>

            <Box
              sx={{
                position: 'relative',
                px: 3,
                py: 0.75,
                borderRadius: 2,
                bgcolor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                minWidth: 180,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'var(--bg-hover)',
                },
              }}
            >
              {date_picker_input}
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {formatSelectedDate()}
              </Typography>
            </Box>

            <Tooltip title="다음 날짜">
              <IconButton size="small" onClick={handleNextDay}>
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="날짜 선택">
              <IconButton
                size="small"
                onClick={() => date_input_ref.current?.showPicker?.()}
                sx={{ ml: 0.5 }}
              >
                <CalendarMonthIcon />
              </IconButton>
            </Tooltip>

            {!isToday && (
              <Tooltip title="오늘로 이동">
                <IconButton size="small" onClick={handleToday}>
                  <TodayIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>기본 업무형</InputLabel>
              <Select
                value={default_work_type}
                label="기본 업무형"
                onChange={(e) => setDefaultWorkType(e.target.value)}
              >
                {WORK_TYPE_OPTIONS.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="카테고리별 업무형 설정">
              <IconButton size="small" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="프로젝트별 업무형 설정">
              <IconButton size="small" onClick={() => setProjectSettingsOpen(true)}>
                <SettingsIcon color="primary" />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              size="small"
              onClick={handleLoadFromLogs}
              startIcon={<DownloadIcon />}
            >
              {current_rows.length > 0 ? '일간 타이머에서 다시 불러오기' : '일간 타이머에서 불러오기'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExportExcel}
              startIcon={<FileUploadIcon />}
              disabled={current_rows.length === 0}
            >
              엑셀 Export
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => setErpOpen(true)}
              startIcon={<CloudUploadIcon />}
              disabled={current_rows.length === 0}
            >
              시간관리 등록
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleAddRow}
              startIcon={<AddIcon />}
            >
              새 행 추가
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleDeleteChecked}
              startIcon={<DeleteIcon />}
              disabled={checked_count === 0}
              color="error"
            >
              삭제 ({checked_count})
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 280px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={all_checked}
                    indeterminate={checked_count > 0 && !all_checked}
                    onChange={handleToggleAll}
                  />
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, minWidth: 150, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderClick('project_name')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    작업
                    {renderSortIcon('project_name')}
                  </Box>
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, minWidth: 100, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderClick('work_type')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    업무형
                    {renderSortIcon('work_type')}
                  </Box>
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, minWidth: 200, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderClick('schedule_name')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    거래형(일정명)
                    {renderSortIcon('schedule_name')}
                  </Box>
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, minWidth: 100, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderClick('category_code')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    카테고리 코드
                    {renderSortIcon('category_code')}
                  </Box>
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, minWidth: 120, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderClick('category_name')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    카테고리명
                    {renderSortIcon('category_name')}
                  </Box>
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, minWidth: 100, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderClick('time_minutes')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    시간(분)
                    {renderSortIcon('time_minutes')}
                  </Box>
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, minWidth: 130, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderClick('end_date')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    종료예정일
                    {renderSortIcon('end_date')}
                  </Box>
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, minWidth: 200, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderClick('note')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    비고
                    {renderSortIcon('note')}
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted_rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={row.checked}
                      onChange={() => toggleCheck(row.id)}
                    />
                  </TableCell>
                  <TableCell>{renderCell(row, 'project_name')}</TableCell>
                  <TableCell>{renderCell(row, 'work_type')}</TableCell>
                  <TableCell>{renderCell(row, 'schedule_name')}</TableCell>
                  <TableCell>{renderCell(row, 'category_code')}</TableCell>
                  <TableCell>{renderCell(row, 'category_name')}</TableCell>
                  <TableCell>{renderCell(row, 'time_minutes')}</TableCell>
                  <TableCell>{renderCell(row, 'end_date')}</TableCell>
                  <TableCell>{renderCell(row, 'note')}</TableCell>
                </TableRow>
              ))}
              {current_rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    데이터가 없습니다. "일간 타이머에서 불러오기" 버튼을 클릭하거나 "새 행 추가"를 눌러 시작하세요.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            mt: 2,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            총 시간: {total_minutes}분 ({(total_minutes / 60).toFixed(1)}시간)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            총 {current_rows.length}건
          </Typography>
        </Box>
        </>
      )}


      {/* 카테고리별 업무형 설정 다이얼로그 */}
      <Dialog open={settings_open} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth fullScreen={is_phone}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          카테고리별 업무형 설정
          <IconButton size="small" onClick={() => setSettingsOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            특정 카테고리에 대한 기본 업무형을 설정할 수 있습니다.
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              현재 설정
            </Typography>
            {Object.keys(category_work_type_map).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                설정된 카테고리가 없습니다.
              </Typography>
            ) : (
              <List dense>
                {Object.entries(category_work_type_map).map(([category, work_type]) => (
                  <ListItem
                    key={category}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveCategoryMapping(category)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={category}
                      secondary={`업무형: ${work_type}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Autocomplete
              size="small"
              options={getAllCategoryNames()}
              value={new_category}
              onChange={(_, newValue) => setNewCategory(newValue)}
              renderInput={(params) => <TextField {...params} label="카테고리" />}
              sx={{ flex: { xs: '1 1 100%', sm: 1 } }}
            />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>업무형</InputLabel>
              <Select
                value={new_work_type}
                label="업무형"
                onChange={(e) => setNewWorkType(e.target.value)}
              >
                {WORK_TYPE_OPTIONS.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              size="small"
              onClick={handleAddCategoryMapping}
              disabled={!new_category}
              startIcon={<AddIcon />}
            >
              추가
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 프로젝트별 업무형 설정 다이얼로그 */}
      <Dialog open={project_settings_open} onClose={() => setProjectSettingsOpen(false)} maxWidth="sm" fullWidth fullScreen={is_phone}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          프로젝트별 업무형 설정
          <IconButton size="small" onClick={() => setProjectSettingsOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            특정 프로젝트에 대한 기본 업무형을 설정할 수 있습니다.
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              현재 설정
            </Typography>
            {Object.keys(project_work_type_map).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                설정된 프로젝트가 없습니다.
              </Typography>
            ) : (
              <List dense>
                {Object.entries(project_work_type_map).map(([project_code, work_type]) => (
                  <ListItem
                    key={project_code}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveProjectMapping(project_code)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={`${getProjectName(project_code)} (${project_code})`}
                      secondary={`업무형: ${work_type}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Autocomplete
              size="small"
              options={projects.map(p => p.code)}
              getOptionLabel={(option) => {
                const project = projects.find(p => p.code === option);
                return project ? `${project.name} (${project.code})` : option;
              }}
              value={new_project_code}
              onChange={(_, newValue) => setNewProjectCode(newValue)}
              renderInput={(params) => <TextField {...params} label="프로젝트" />}
              sx={{ flex: { xs: '1 1 100%', sm: 1 } }}
            />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>업무형</InputLabel>
              <Select
                value={new_project_work_type}
                label="업무형"
                onChange={(e) => setNewProjectWorkType(e.target.value)}
              >
                {WORK_TYPE_OPTIONS.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              size="small"
              onClick={handleAddProjectMapping}
              disabled={!new_project_code}
              startIcon={<AddIcon />}
            >
              추가
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectSettingsOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
      {/* 모바일 행 편집 시트 */}
      <Dialog open={!!sheet_draft} onClose={closeSheet} fullScreen={is_phone} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 1 }}>
          <IconButton aria-label="닫기" onClick={closeSheet} sx={{ width: 44, height: 44 }}>
            <CloseIcon />
          </IconButton>
          <Typography component="span" sx={{ flex: 1, fontSize: 17, fontWeight: 600 }}>
            행 편집
          </Typography>
        </DialogTitle>
        {sheet_draft && (
          <DialogContent
            dividers
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, '& .MuiInputBase-input': { fontSize: 16 } }}
          >
            <TextField select fullWidth label="작업" value={sheet_draft.project_name} onChange={(e) => setDraftField('project_name', e.target.value)}>
              <MenuItem value="">없음</MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.code} value={project.code}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth label="업무형" value={sheet_draft.work_type} onChange={(e) => setDraftField('work_type', e.target.value)}>
              {WORK_TYPE_OPTIONS.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField fullWidth label="거래형(일정명)" value={sheet_draft.schedule_name} onChange={(e) => setDraftField('schedule_name', e.target.value)} />
            <TextField select fullWidth label="카테고리 코드" value={sheet_draft.category_code} onChange={(e) => setDraftField('category_code', e.target.value)}>
              {getAllCategoryCodes().map((code) => (
                <MenuItem key={code} value={code}>
                  {code} - {getCategoryName(code)}
                </MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth label="카테고리명" value={sheet_draft.category_name} onChange={(e) => setDraftField('category_name', e.target.value)}>
              {getAllCategoryNames().map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              type="number"
              label="시간(분)"
              value={sheet_draft.time_minutes}
              onChange={(e) => setDraftField('time_minutes', e.target.value)}
              inputProps={{ inputMode: 'numeric', min: 0 }}
            />
            <TextField
              fullWidth
              type="date"
              label="종료예정일"
              value={sheet_draft.end_date}
              onChange={(e) => setDraftField('end_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField fullWidth multiline minRows={3} label="비고" value={sheet_draft.note} onChange={(e) => setDraftField('note', e.target.value)} />
          </DialogContent>
        )}
        <DialogActions disableSpacing sx={{ gap: 1, px: 2, pt: 1.5, pb: 'calc(12px + env(safe-area-inset-bottom))' }}>
          <Button color="error" startIcon={<DeleteIcon />} onClick={handleSheetDelete} sx={{ minHeight: 44, whiteSpace: 'nowrap' }}>
            삭제
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" onClick={handleSheetSave} sx={{ minHeight: 44, minWidth: 120, whiteSpace: 'nowrap' }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>
      <ErpRegisterDialog open={erp_open} onClose={() => setErpOpen(false)} rows={current_rows} date={date_string} />
    </Box>
  );
};

export default TimeManagement;
