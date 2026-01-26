import { createTheme } from '@mui/material/styles';

// CSS 변수를 사용하는 동적 테마 생성 함수
export const createAppTheme = (primaryColor?: string, accentColor?: string, isDark: boolean = false) => {
  
  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: primaryColor || (isDark ? '#e0e0e0' : '#000000'),
      },
      secondary: {
        main: accentColor || (isDark ? '#a0a0a0' : '#666666'),
      },
      // 배경색은 CSS 변수로 제어하므로 MUI Palette에서 최소한으로 설정
      background: {
        default: isDark ? '#121212' : '#fafafa', // fallback
        paper: isDark ? '#1e1e1e' : '#ffffff',   // fallback
      },
      text: {
        primary: isDark ? '#f3f4f6' : '#000000',
        secondary: isDark ? '#9ca3af' : '#666666',
      },
      divider: isDark ? '#333333' : '#eaeaea',
    },
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
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: 6,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            transition: 'background-color 0.3s ease, color 0.3s ease',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: 'var(--header-bg)',
            color: 'var(--text-primary)',
            boxShadow: 'none',
            borderBottom: '1px solid var(--border-color)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: 'var(--card-bg) !important',
            color: 'var(--text-primary)',
            backgroundImage: 'none',
            transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
          },
          outlined: {
            borderColor: 'var(--border-color)',
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
            backgroundColor: 'var(--primary-color)',
            color: isDark ? '#000000' : '#ffffff', // 대비를 위해 반전
            '&:hover': {
              backgroundColor: 'var(--accent-color)',
            },
          },
          outlined: {
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            '&:hover': {
              backgroundColor: 'var(--bg-hover)',
              borderColor: 'var(--text-primary)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          },
          head: {
            color: 'var(--text-primary)',
            fontWeight: 600,
            backgroundColor: 'var(--bg-secondary)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: 'var(--bg-hover)',
            color: 'var(--text-primary)',
          },
          outlined: {
            borderColor: 'var(--border-color)',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            color: 'var(--text-secondary)',
            '&.Mui-selected': {
              color: 'var(--text-primary)',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: 'var(--text-secondary)',
            '&:hover': {
              backgroundColor: 'var(--bg-hover)',
              color: 'var(--text-primary)',
            },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            color: 'var(--text-primary)',
          },
          caption: {
            color: 'var(--text-secondary)',
          },
          body2: {
            color: 'var(--text-primary)',
          },
          subtitle1: {
            color: 'var(--text-primary)',
          },
          subtitle2: {
            color: 'var(--text-primary)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: 'var(--card-bg)',
          }
        }
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            color: 'var(--text-primary)',
          }
        }
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            color: 'var(--text-primary)',
          }
        }
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            color: 'var(--text-primary)',
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: {
            borderColor: 'var(--border-color)',
          },
          root: {
            backgroundColor: 'var(--bg-hover)',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--text-secondary)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--primary-color)',
            }
          }
        }
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }
        }
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: 'var(--text-primary)',
            '&:hover': {
              backgroundColor: 'var(--bg-hover)',
            },
          }
        }
      }
    },
  });
};

export const theme = createAppTheme();
