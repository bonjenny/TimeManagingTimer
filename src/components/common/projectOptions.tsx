import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';

// 프로젝트 자동완성 드롭다운 한 줄.
// 위: 고른 값 (검은 굵은 글씨), 아래: 짝이 되는 값 (회색).
// 코드 칸이면 위=코드/아래=이름, 이름 칸이면 위=이름/아래=코드.
// onDelete 를 주면 오른쪽에 ✕ (프로젝트 목록에서 삭제).
export const renderProjectOption = (
  props: React.HTMLAttributes<HTMLLIElement> & { key?: React.Key },
  primary: string,
  secondary?: string,
  onDelete?: () => void
) => {
  const { key, ...rest } = props;
  const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
  return (
    <Box
      key={key}
      component="li"
      {...rest}
      sx={{ minWidth: 0, '&.MuiAutocomplete-option': { display: 'flex', alignItems: 'center', gap: 0.5, py: 0.75, px: 1.5 } }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary', ...ellipsis }}>
          {primary}
        </Typography>
        {secondary && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', ...ellipsis }}>{secondary}</Typography>
        )}
      </Box>
      {onDelete && (
        <IconButton
          size="small"
          aria-label={`${primary} 프로젝트 삭제`}
          onClick={(e) => {
            // 옵션 선택으로 이어지지 않게 막는다
            e.stopPropagation();
            e.preventDefault();
            onDelete();
          }}
          sx={{ p: 0.25, flexShrink: 0, opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      )}
    </Box>
  );
};

// 목록에 없는 코드를 쳤을 때 드롭다운 맨 위에 붙이는 "새 프로젝트로 등록" 줄.
// 옵션 문자열이 이 표시로 시작하면 실제 프로젝트가 아니라 등록 줄이다.
export const NEW_PROJECT_OPTION = '\u0000new:';

export const renderNewProjectOption = (
  props: React.HTMLAttributes<HTMLLIElement> & { key?: React.Key },
  code: string
) => {
  const { key, ...rest } = props;
  return (
    <Box
      key={key}
      component="li"
      {...rest}
      sx={{ '&.MuiAutocomplete-option': { display: 'flex', alignItems: 'center', gap: 0.75, py: 0.75, px: 1.5 } }}
    >
      <AddIcon sx={{ fontSize: 16, color: 'primary.main' }} />
      <Typography
        sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'primary.main', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        「{code}」 새 프로젝트로 등록
      </Typography>
    </Box>
  );
};

// 프로젝트 코드 자동완성용 목록 필터: 코드·이름 어느 쪽으로도 찾고, 없는 코드면 등록 줄을 맨 위에.
export const filterProjectCodeOptions = (
  options: string[],
  input_value: string,
  projects: { code: string; name: string }[]
): string[] => {
  const input = input_value.trim();
  const keyword = input.toLowerCase();
  const filtered = options.filter((code) => {
    const name = projects.find((p) => p.code === code)?.name ?? '';
    return `${code} ${name}`.toLowerCase().includes(keyword);
  });
  if (input && !options.includes(input)) filtered.unshift(NEW_PROJECT_OPTION + input);
  return filtered;
};
