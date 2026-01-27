import { createTheme } from '@mui/material/styles';

// CSS 변수를 사용하는 동적 테마 생성 함수
// 다크모드 색상 기준: 배경 #121212/#1E1E1E, 텍스트 #E0E0E0/#9E9E9E
export const createAppTheme = (primaryColor?: string, accentColor?: string, isDark: boolean = false) => {
  
  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: primaryColor || (isDark ? '#E0E0E0' : '#000000'),
      },
      secondary: {
        main: accentColor || (isDark ? '#9E9E9E' : '#666666'),
      },
      // 배경색 - 사용자 정의 색상 기준
      background: {
        default: isDark ? '#121212' : '#fafafa',
        paper: isDark ? '#1E1E1E' : '#ffffff',
      },
      // 텍스트 색상 - 사용자 정의 색상 기준
      text: {
        primary: isDark ? '#E0E0E0' : '#000000',
        secondary: isDark ? '#9E9E9E' : '#666666',
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
            color: 'var(--text-inverse)', // CSS 변수 사용
            '&:hover': {
              backgroundColor: 'var(--accent-color)',
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-disabled)',
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
            backgroundColor: 'transparent',
          },
          head: {
            color: 'var(--text-primary)',
            fontWeight: 600,
            backgroundColor: 'var(--bg-tertiary)',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: 'var(--bg-hover)',
            },
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
            backgroundColor: 'var(--bg-secondary)',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--border-hover)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--highlight-color)',
            }
          }
        }
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: 'var(--text-secondary)',
            '&.Mui-focused': {
              color: 'var(--highlight-color)',
            }
          }
        }
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: 'var(--text-secondary)',
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
