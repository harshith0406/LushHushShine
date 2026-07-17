import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          minHeight="60vh"
          padding="32px"
          className="glass-panel"
          style={{ margin: '32px', borderRadius: '16px', textAlignment: 'center' }}
        >
          <WarningAmberIcon style={{ fontSize: 64, color: 'var(--accent)', marginBottom: 16 }} />
          <Typography variant="h5" style={{ fontWeight: 800, fontFamily: 'var(--font-family)', marginBottom: 8 }}>
            Component Exception Prevented
          </Typography>
          <Typography variant="body2" color="var(--text-secondary)" style={{ marginBottom: 24, maxWidth: 480, textAlign: 'center' }}>
            A temporary view state issue occurred. Click below to reload the platform session.
          </Typography>
          <Button 
            variant="contained" 
            onClick={this.handleReset}
            style={{ 
              backgroundColor: 'var(--primary)', 
              borderRadius: '8px', 
              textTransform: 'none', 
              fontWeight: 600 
            }}
          >
            Reload Interface
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
