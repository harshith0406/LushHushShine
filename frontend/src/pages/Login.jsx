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
  CircularProgress
} from '@mui/material';

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
      <Box className="auth-card glass-panel">
        <Typography 
          variant="h4" 
          align="center" 
          gutterBottom 
          style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}
        >
          Welcome Back
        </Typography>
        <Typography 
          variant="body2" 
          align="center" 
          style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}
        >
          Sign in to access your retail insights dashboard
        </Typography>

        {error && (
          <Alert severity="error" style={{ marginBottom: '24px', borderRadius: 'var(--border-radius-sm)' }}>
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
              InputLabelProps={{ style: { fontFamily: 'var(--font-family)' } }}
              InputProps={{ style: { borderRadius: 'var(--border-radius-sm)' } }}
            />

            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              {...register('password', { required: 'Password is required' })}
              error={!!errors.password}
              helperText={errors.password?.message}
              InputLabelProps={{ style: { fontFamily: 'var(--font-family)' } }}
              InputProps={{ style: { borderRadius: 'var(--border-radius-sm)' } }}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              style={{
                borderRadius: 'var(--border-radius-sm)',
                padding: '12px',
                fontWeight: 600,
                textTransform: 'none',
                fontFamily: 'var(--font-family)',
                backgroundColor: 'var(--primary)',
                boxShadow: '0 4px 14px 0 var(--primary-glow)'
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
        </form>

        <Box display="flex" justifyContent="center" marginTop="24px">
          <Typography variant="body2" style={{ color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link 
              to="/register" 
              style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
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
