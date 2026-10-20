import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Popover, TextField, TextFieldProps } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { TimeClock } from '@mui/x-date-pickers/TimeClock';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useTimeInputStore } from '../../store/useTimeInputStore';

// 시간(HH:mm) 입력 칸. 설정 > 시간 입력 방식에 따라
//  - native: 브라우저 기본 <input type="time">
//  - clock : 칸을 누르면 시계 위젯이 뜬다. 위쪽 시 : 분 칸은 직접 타이핑도 된다

type TimeFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: string;
  onChange: (value: string) => void;
  /** 시계 위젯에서 확인을 눌렀을 때 (인라인 편집처럼 바로 저장해야 할 때) */
  onCommit?: (value: string) => void;
  /** 시계 위젯을 취소로 닫았을 때 */
  onCancel?: () => void;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (hhmm: string) => {
  const d = new Date();
  const [h, m] = hhmm ? hhmm.split(':').map(Number) : [d.getHours(), d.getMinutes()];
  d.setHours(h, m, 0, 0);
  return d;
};

// 키보드로 갈 수 있는 칸들 (Tab 순서)
const FOCUSABLE = 'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** el 다음(또는 이전) 칸에 포커스. 시계 위젯 칸이면 바로 연다 */
const focusSibling = (el: HTMLElement, dir: 1 | -1) => {
  if (!el.isConnected) return; // 인라인 편집처럼 확정과 함께 칸이 사라진 경우
  const all = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null);
  const next = all[all.indexOf(el) + dir];
  if (!next) return;
  next.focus();
  if (next.dataset.timefield) next.click();
};

const DIGIT_SX = {
  width: 72,
  height: 64,
  border: 'none',
  borderRadius: 2,
  textAlign: 'center' as const,
  fontSize: 40,
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
  color: 'text.primary',
};

export const TimeField: React.FC<TimeFieldProps> = ({ value, onChange, onCommit, onCancel, autoFocus, onBlur, onKeyDown, InputProps, inputProps, ...rest }) => {
  const style = useTimeInputStore((s) => s.time_input_style);
  const field_ref = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [view, setView] = useState<'hours' | 'minutes'>('hours');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const hour_ref = useRef<HTMLInputElement>(null);
  const minute_ref = useRef<HTMLInputElement>(null);
  // 프로그램으로 칸에 포커스를 줄 때 true: 전체 선택 대신 커서를 끝에 둬서 이어 치게 한다
  const keep_caret = useRef(false);

  // first_digit: 닫힌 칸에서 숫자를 치며 열었을 때 그 숫자부터 시작
  const open = (first_digit?: string) => {
    const d = toDate(value);
    setHour(first_digit ?? pad(d.getHours()));
    setMinute(pad(d.getMinutes()));
    setView('hours');
    keep_caret.current = !!first_digit;
    setAnchor(field_ref.current);
  };

  const focusDigit = (which: 'hours' | 'minutes', caret_at_end: boolean) => {
    const el = which === 'hours' ? hour_ref.current : minute_ref.current;
    if (!el) return;
    keep_caret.current = caret_at_end;
    el.focus();
  };

  // 인라인 편집(autoFocus)이면 칸이 뜨자마자 시계를 연다
  useEffect(() => {
    if (style === 'clock' && autoFocus) open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  if (style === 'native') {
    return (
      <TextField
        {...rest}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        InputProps={InputProps}
        inputProps={inputProps}
      />
    );
  }

  const h = Math.min(23, Number(hour) || 0);
  const m = Math.min(59, Number(minute) || 0);
  const clock_value = toDate(`${pad(h)}:${pad(m)}`);

  // picked: 시계판에서 막 고른 값 (state 반영 전이라 직접 받는다)
  // move: 닫은 뒤 포커스 — 0 이면 이 칸, 1/-1 이면 다음/이전 칸 (Tab)
  const close = (commit: boolean, picked?: Date, move: 0 | 1 | -1 = 0) => {
    setAnchor(null);
    const input = field_ref.current?.querySelector('input');
    if (input) setTimeout(() => (move ? focusSibling(input, move) : input.focus()));
    if (commit) {
      const next = picked ? `${pad(picked.getHours())}:${pad(picked.getMinutes())}` : `${pad(h)}:${pad(m)}`;
      onChange(next);
      onCommit?.(next);
    } else {
      onCancel?.();
    }
  };

  // 두 자리를 다 치면 시 → 분으로 넘어간다
  const typeDigits = (raw: string, which: 'hours' | 'minutes') => {
    const all = raw.replace(/\D/g, '');
    // 시 칸에 "0930" 처럼 한꺼번에 들어오면(붙여넣기 등) 앞 두 자리는 시, 나머지는 분
    if (which === 'hours' && all.length > 2) {
      setHour(all.slice(0, 2));
      setMinute(all.slice(2, 4));
      setView('minutes');
      focusDigit('minutes', true);
      return;
    }
    const digits = all.slice(-2);
    if (which === 'hours') {
      setHour(digits);
      if (digits.length === 2) {
        setView('minutes');
        focusDigit('minutes', false);
      }
    } else {
      setMinute(digits);
    }
  };

  const digit = (which: 'hours' | 'minutes') => {
    const active = view === which;
    return (
      <Box
        component="input"
        ref={which === 'hours' ? hour_ref : minute_ref}
        inputMode="numeric"
        aria-label={which === 'hours' ? '시' : '분'}
        value={which === 'hours' ? hour : minute}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => typeDigits(e.target.value, which)}
        onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
          setView(which);
          const el = e.target;
          if (keep_caret.current) {
            keep_caret.current = false;
            requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
          } else {
            el.select();
          }
        }}
        // 두 번째 숫자를 치자마자 분으로 넘어가며 blur 되므로, 지난 렌더의 값이 아니라 지금 칸의 값으로 맞춘다
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
          const n = Number(e.target.value.replace(/\D/g, '')) || 0;
          if (which === 'hours') setHour(pad(Math.min(23, n)));
          else setMinute(pad(Math.min(59, n)));
        }}
        sx={{ ...DIGIT_SX, bgcolor: active ? 'primary.light' : 'action.hover', color: active ? 'primary.contrastText' : 'text.primary' }}
      />
    );
  };

  return (
    <>
      <TextField
        {...rest}
        ref={field_ref}
        value={value}
        placeholder="--:--"
        onClick={() => open()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            open();
          } else if (/^\d$/.test(e.key)) {
            // 칸에 포커스만 있으면 숫자를 치는 순간 열리며 시부터 입력된다
            e.preventDefault();
            e.stopPropagation();
            open(e.key);
          }
        }}
        InputProps={{ ...InputProps, readOnly: true }}
        inputProps={{ ...inputProps, 'data-timefield': '1', style: { cursor: 'pointer', ...inputProps?.style } }}
      />
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        // 바깥을 누르면 고른 시간으로 확정, Esc 만 취소
        onClose={(_e, reason) => close(reason === 'backdropClick')}
        // 닫을 때 포커스는 close() 가 정한다 (Tab 이면 다음 칸으로)
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        // 바깥 다이얼로그의 Enter(저장) 단축키로 새지 않게 막는다
        // 열리면 시 칸에 바로 커서를 둔다 (클릭 없이 숫자 입력)
        TransitionProps={{ onEntered: () => focusDigit('hours', keep_caret.current) }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            close(true);
          } else if (e.key === 'Tab') {
            // Tab: 시 → 분 → (확정하고) 다음 칸 / Shift+Tab: 분 → 시 → (확정하고) 이전 칸
            e.preventDefault();
            if (!e.shiftKey && e.target === hour_ref.current) focusDigit('minutes', false);
            else if (e.shiftKey && e.target === minute_ref.current) focusDigit('hours', false);
            else close(true, undefined, e.shiftKey ? -1 : 1);
          } else if (/^\d$/.test(e.key) && e.target !== hour_ref.current && e.target !== minute_ref.current) {
            // 시계판 등 다른 곳에 포커스가 있어도 숫자는 지금 보는 칸(시/분)에 들어간다
            e.preventDefault();
            typeDigits(e.key, view);
            focusDigit(view, true);
          }
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {digit('hours')}
            <Box sx={{ fontSize: 40, lineHeight: 1 }}>:</Box>
            {digit('minutes')}
          </Box>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <TimeClock
              ampm={false}
              value={clock_value}
              view={view}
              views={['hours', 'minutes']}
              onViewChange={(v) => {
                const next = v === 'minutes' ? 'minutes' : 'hours';
                setView(next);
                // 시계판에서 시를 고르면 분 칸으로: 바로 숫자로 분을 칠 수 있게
                setTimeout(() => focusDigit(next, false));
              }}
              onChange={(d, selection_state, selected_view) => {
                if (!d) return;
                setHour(pad(d.getHours()));
                setMinute(pad(d.getMinutes()));
                // 분까지 골라 손을 떼면 확인을 누른 것으로 친다
                if (selection_state === 'finish' && selected_view === 'minutes') close(true, d);
              }}
            />
          </LocalizationProvider>
          <Box sx={{ display: 'flex', gap: 1, alignSelf: 'stretch', justifyContent: 'flex-end' }}>
            <Button onClick={() => close(false)}>취소</Button>
            <Button variant="contained" onClick={() => close(true)}>확인(Enter)</Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default TimeField;
