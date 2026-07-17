import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useForm } from 'react-hook-form';
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container fade-in">
      <Box className="auth-card glass-panel" style={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.25)', borderRadius: '24px' }}>
        <Box display="flex" justifyContent="center" alignItems="center" gap="10px" marginBottom="12px">
          <AutoAwesomeIcon style={{ color: '#00f2fe', fontSize: '32px' }} />
          <Typography 
            variant="h4" 
            align="center" 
            className="gradient-text"
            style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}
          >
            RETAIL INTEL
          </Typography>
        </Box>
        
        <Typography 
          variant="body2" 
          align="center" 
          style={{ color: '#94a3b8', marginBottom: '32px' }}
        >
          Sign in to access your retail AI & supply chain dashboard
        </Typography>

        {error && (
          <Alert severity="error" style={{ marginBottom: '24px', borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box display="flex" flexDirection="column" gap="20px">
            <TextField
              label="Email Address"
              variant="outlined"
              fullWidth
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
              InputLabelProps={{ style: { color: '#94a3b8' } }}
              InputProps={{ 
                style: { backgroundColor: '#162032', color: '#ffffff', borderRadius: '12px' },
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon style={{ color: '#00f2fe' }} />
                  </InputAdornment>
                )
              }}
            />

            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              {...register('password', { required: 'Password is required' })}
              error={!!errors.password}
              helperText={errors.password?.message}
              InputLabelProps={{ style: { color: '#94a3b8' } }}
              InputProps={{ 
                style: { backgroundColor: '#162032', color: '#ffffff', borderRadius: '12px' },
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon style={{ color: '#00f2fe' }} />
                  </InputAdornment>
                )
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              style={{
                borderRadius: '12px',
                padding: '14px',
                fontWeight: 800,
                textTransform: 'none',
                fontFamily: 'var(--font-family)',
                backgroundColor: '#00f2fe',
                color: '#090d16',
                boxShadow: '0 4px 20px rgba(0, 242, 254, 0.35)',
                marginTop: '8px'
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In to Platform'}
            </Button>
          </Box>
        </form>

        <Box display="flex" justifyContent="center" marginTop="28px">
          <Typography variant="body2" style={{ color: '#94a3b8' }}>
            Don't have an account?{' '}
            <Link 
              to="/register" 
              style={{ color: '#00f2fe', fontWeight: 700, textDecoration: 'none' }}
            >
              Sign Up
            </Link>
          </Typography>
        </Box>
      </Box>
    </div>
  );
};

export default Login;
