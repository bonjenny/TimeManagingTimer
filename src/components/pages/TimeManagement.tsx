import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
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

const DAY_START_HOUR = 0;
const WORK_TYPE_OPTIONS = ['작업', '개발'];

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
    addRow,
    addRows,
    updateRow,
    deleteRows,
    getRowsByDate,
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

  const [settings_open, setSettingsOpen] = useState(false);
  const [new_category, setNewCategory] = useState<string | null>(null);
  const [new_work_type, setNewWorkType] = useState<string>('작업');

  const [project_settings_open, setProjectSettingsOpen] = useState(false);
  const [new_project_code, setNewProjectCode] = useState<string | null>(null);
  const [new_project_work_type, setNewProjectWorkType] = useState<string>('작업');

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
      project_work_type_map
    );
    const merged = mergeTimeManagementRows(current_rows, converted);

    const new_rows = merged.filter(
      (row) => !current_rows.some((existing) => existing.id === row.id)
    );
    if (new_rows.length > 0) {
      addRows(new_rows);
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
    };
    addRow(new_row);
  };

  const handleDeleteChecked = () => {
    const checked_ids = current_rows.filter((row) => row.checked).map((row) => row.id);
    if (checked_ids.length > 0) {
      deleteRows(checked_ids);
    }
  };

  const handleCellClick = (row: TimeManagementRow, field: keyof TimeManagementRow) => {
    if (field === 'checked' || field === 'id' || field === 'date' || field === 'original_log_id') {
      return;
    }
    setEditingCell({ row_id: row.id, field });
    setEditValue(String(row[field]));
  };

  const handleSaveEdit = () => {
    if (!editing_cell) return;

    const { row_id, field } = editing_cell;

    if (field === 'category_code') {
      const new_code = edit_value;
      const new_name = getCategoryName(new_code);
      updateRow(row_id, { category_code: new_code, category_name: new_name });
    } else if (field === 'category_name') {
      const new_name = edit_value;
      const new_code = getCategoryCode(new_name);
      updateRow(row_id, { category_code: new_code, category_name: new_name });
    } else if (field === 'time_minutes') {
      const value = parseInt(edit_value) || 0;
      updateRow(row_id, { [field]: value });
    } else {
      updateRow(row_id, { [field]: edit_value });
    }

    setEditingCell(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">없음</MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.code} value={project.code}>
                {project.name}
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

      return (
        <TextField
          value={edit_value}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          size="small"
          autoFocus
          fullWidth
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
        {String(row[field])}
      </Box>
    );
  };

  return (
    <Box>
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
            일간 타이머에서 불러오기
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
              <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>작업</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>업무형</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>거래형(일정명)</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>카테고리 코드</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>카테고리명</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>시간(분)</TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>비고</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {current_rows.map((row) => (
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
                <TableCell>{renderCell(row, 'note')}</TableCell>
              </TableRow>
            ))}
            {current_rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
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

      {/* 카테고리별 업무형 설정 다이얼로그 */}
      <Dialog open={settings_open} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
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

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Autocomplete
              size="small"
              options={getAllCategoryNames()}
              value={new_category}
              onChange={(_, newValue) => setNewCategory(newValue)}
              renderInput={(params) => <TextField {...params} label="카테고리" />}
              sx={{ flex: 1 }}
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
      <Dialog open={project_settings_open} onClose={() => setProjectSettingsOpen(false)} maxWidth="sm" fullWidth>
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

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
              sx={{ flex: 1 }}
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
    </Box>
  );
};

export default TimeManagement;
