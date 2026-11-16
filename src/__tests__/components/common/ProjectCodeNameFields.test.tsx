import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectCodeNameFields from '../../../components/common/ProjectCodeNameFields';
import { useProjectStore } from '../../../store/useProjectStore';

const Harness = () => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  return <ProjectCodeNameFields code={code} name={name} onCodeChange={setCode} onNameChange={setName} />;
};

describe('ProjectCodeNameFields', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [
        { id: '1', code: 'A26_05557', name: 'Static P 제거' },
        { id: '2', code: '6010', name: '팀장업무' },
      ],
    });
  });

  it('코드 칸에 프로젝트명을 쳐도 그 코드가 나오고, 고르면 이름도 채워진다', () => {
    render(<Harness />);
    const code_input = screen.getByLabelText('프로젝트 코드');
    fireEvent.change(code_input, { target: { value: 'static' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('A26_05557');

    fireEvent.click(options[0]);
    expect(code_input).toHaveValue('A26_05557');
    expect(screen.getByLabelText('프로젝트 명')).toHaveValue('Static P 제거');
  });

  it('이름 칸에 코드를 쳐도 그 프로젝트가 나온다', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('프로젝트 명'), { target: { value: '6010' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('팀장업무');
  });
});
