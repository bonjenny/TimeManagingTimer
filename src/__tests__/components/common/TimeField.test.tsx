import { render, screen, fireEvent, act } from '@testing-library/react';
import TimeField from '../../../components/common/TimeField';
import { useTimeInputStore } from '../../../store/useTimeInputStore';

describe('TimeField', () => {
  afterEach(() => act(() => useTimeInputStore.getState().setTimeInputStyle('native')));

  it('기본 입력이면 브라우저 time 입력을 쓴다', () => {
    const { container } = render(<TimeField label="시작" value="09:51" onChange={() => {}} />);
    expect(container.querySelector('input[type="time"]')).toHaveValue('09:51');
  });

  it('시계 위젯: 위쪽 시·분 칸에 숫자를 쳐서 바꾸고 Enter 로 확정', () => {
    act(() => useTimeInputStore.getState().setTimeInputStyle('clock'));
    const onChange = jest.fn();
    const onCommit = jest.fn();
    render(<TimeField label="시작" value="09:51" onChange={onChange} onCommit={onCommit} />);

    fireEvent.click(screen.getByLabelText('시작'));
    expect(screen.getByLabelText('시')).toHaveValue('09');
    expect(screen.getByLabelText('분')).toHaveValue('51');

    // 한 글자씩: 두 번째 숫자에서 분 칸으로 넘어가며 시 칸이 blur 된다 (이때 '1' → '01' 로 바뀌던 버그)
    fireEvent.change(screen.getByLabelText('시'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('시'), { target: { value: '14' } });
    fireEvent.blur(screen.getByLabelText('시'));
    expect(screen.getByLabelText('시')).toHaveValue('14');
    fireEvent.change(screen.getByLabelText('분'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('분'), { target: { value: '35' } });
    fireEvent.keyDown(screen.getByLabelText('분'), { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('14:35');
    expect(onCommit).toHaveBeenCalledWith('14:35');
  });

  it('시계 위젯: 바깥을 누르면 고른 시간으로 확정, Esc 는 취소', () => {
    act(() => useTimeInputStore.getState().setTimeInputStyle('clock'));
    const onChange = jest.fn();
    const onCancel = jest.fn();
    render(<TimeField label="시작" value="09:51" onChange={onChange} onCancel={onCancel} />);

    fireEvent.click(screen.getByLabelText('시작'));
    fireEvent.change(screen.getByLabelText('시'), { target: { value: '11' } });
    fireEvent.click(document.querySelector('.MuiBackdrop-root')!);
    expect(onChange).toHaveBeenCalledWith('11:51');

    fireEvent.click(screen.getByLabelText('시작'));
    fireEvent.keyDown(screen.getByLabelText('시'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('시계 위젯: 취소하면 값을 안 바꾼다', () => {
    act(() => useTimeInputStore.getState().setTimeInputStyle('clock'));
    const onChange = jest.fn();
    const onCancel = jest.fn();
    render(<TimeField label="시작" value="09:51" onChange={onChange} onCancel={onCancel} />);
    fireEvent.click(screen.getByLabelText('시작'));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});
