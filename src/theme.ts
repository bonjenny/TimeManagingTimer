import { createTheme } from '@mui/material/styles';

// Vercel-inspired Palette
const palette = {
  mode: 'light' as const,
  primary: {
    main: '#000000', // Black
    light: '#333333',
    dark: '#000000',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#666666', // Gray
    light: '#999999',
    dark: '#333333',
    contrastText: '#ffffff',
  },
  background: {
    default: '#ffffff',
    paper: '#ffffff',
  },
  text: {
    primary: '#000000',
    secondary: '#666666',
  },
  divider: '#eaeaea',
};

export const theme = createTheme({
  palette,
  typography: {
    fontFamily: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    button: {
      fontWeight: 500,
      textTransform: 'none', // 버튼 텍스트 대문자 변환 방지
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#fafafa', // 전체 배경을 아주 연한 회색으로 설정하여 카드(White)와 구분
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          color: '#fff',
          backgroundColor: '#000',
          '&:hover': {
            backgroundColor: '#333',
          },
        },
        outlined: {
          borderColor: '#eaeaea',
          color: '#000',
          '&:hover': {
            backgroundColor: '#fafafa',
            borderColor: '#000',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#000000',
          boxShadow: 'none',
          borderBottom: '1px solid #eaeaea',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 4px rgba(0,0,0,0.05)', // 아주 옅은 그림자
          border: '1px solid #eaeaea',
        },
        elevation0: {
          boxShadow: 'none',
          border: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          color: '#666666',
          '&.Mui-selected': {
            color: '#000000',
          },
        },
      },
    },
  },
});
