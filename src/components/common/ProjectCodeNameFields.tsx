import React, { useMemo } from 'react';
import { Autocomplete, Box, SxProps, TextField, Theme } from '@mui/material';
import { useProjectStore } from '../../store/useProjectStore';
import { renderProjectOption } from './projectOptions';

interface ProjectCodeNameFieldsProps {
  code: string;
  name: string;
  onCodeChange: (code: string) => void;
  onNameChange: (name: string) => void;
  autoFocus?: boolean;
  codePlaceholder?: string;
  sx?: SxProps<Theme>;
}

/**
 * 창 안의 「프로젝트 코드」·「프로젝트 명」 두 칸.
 * 새 업무 기록 · 업무 기록 수정(간트 · 최근 업무 기록) · 작업 프리셋 창이 같이 쓴다.
 * - 코드를 고르면 이름이, 이름을 고르면 코드가 채워진다. 한쪽을 지워도 다른 쪽은 남는다
 * - 드롭다운은 두 줄(고른 값 굵게 / 짝 회색), 항목 ✕ 로 프로젝트 목록에서 지운다
 * - 목록에 없는 코드+이름 등록(addProject)은 저장할 때 각 창이 한다
 */
const ProjectCodeNameFields: React.FC<ProjectCodeNameFieldsProps> = ({
  code,
  name,
  onCodeChange,
  onNameChange,
  autoFocus,
  codePlaceholder,
  sx,
}) => {
  const { projects, deleteProject } = useProjectStore();
  const code_options = useMemo(() => projects.map((p) => p.code), [projects]);
  const name_options = useMemo(() => projects.map((p) => p.name), [projects]);

  const changeCode = (value: string) => {
    onCodeChange(value);
    const matched = projects.find((p) => p.code === value);
    if (matched) onNameChange(matched.name);
  };
  const changeName = (value: string) => {
    onNameChange(value);
    const matched = value ? projects.find((p) => p.name === value) : undefined;
    if (matched) onCodeChange(matched.code);
  };

  return (
    <Box sx={[{ display: 'flex', gap: 2, flexWrap: 'wrap' }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Autocomplete
        freeSolo
        options={code_options}
        // value 대신 inputValue 만 제어한다 — value 가 입력값과 같으면 MUI 가 목록을 거르지 않는다
        value={null}
        inputValue={code}
        onInputChange={(_e, value) => changeCode(value)}
        renderOption={(props, option) =>
          renderProjectOption(props, option, projects.find((p) => p.code === option)?.name, () => deleteProject(option))
        }
        renderInput={(params) => (
          <TextField {...params} label="프로젝트 코드" placeholder={codePlaceholder} autoFocus={autoFocus} />
        )}
        sx={{ flex: 1, minWidth: 180 }}
      />
      <Autocomplete
        freeSolo
        options={name_options}
        value={null}
        inputValue={name}
        onInputChange={(_e, value) => changeName(value || '')}
        renderOption={(props, option) =>
          renderProjectOption(props, option, projects.find((p) => p.name === option)?.code, () => {
            const target = projects.find((p) => p.name === option);
            if (target) deleteProject(target.code);
          })
        }
        renderInput={(params) => <TextField {...params} label="프로젝트 명" placeholder="새 프로젝트면 이름 입력" />}
        sx={{ flex: 1, minWidth: 180 }}
      />
    </Box>
  );
};

export default ProjectCodeNameFields;
