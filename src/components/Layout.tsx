import React from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Container } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssessmentIcon from '@mui/icons-material/Assessment';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: number;
  onTabChange: (newValue: number) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentTab, onTabChange }) => {
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    onTabChange(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            업무 일정 기록 타이머
          </Typography>
        </Toolbar>
        <Box sx={{ bgcolor: 'primary.dark' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleChange} 
            textColor="inherit" 
            indicatorColor="secondary"
            centered
          >
            <Tab icon={<AccessTimeIcon />} label="타이머 & 간트" />
            <Tab icon={<AssessmentIcon />} label="리포트" />
          </Tabs>
        </Box>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
