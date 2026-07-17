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
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

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
    <Box style={{ display: 'flex', minHeight: '100vh', width: '100vw', backgroundColor: '#ffffff', color: '#0f172a' }}>
      {/* Left Column - Login Form */}
      <Box 
        style={{ 
          flex: '1', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '48px',
          maxWidth: '560px',
          margin: '0 auto'
        }}
      >
        <Box style={{ width: '100%', maxWidth: '380px' }}>
          {/* Brand Logo Header */}
          <Box display="flex" alignItems="center" gap="12px" marginBottom="36px">
            <img 
              src="/logo.png" 
              alt="Shoply.ai Logo" 
              style={{ width: '42px', height: '42px', objectFit: 'contain' }} 
            />
            <Typography variant="h5" style={{ fontWeight: 800, fontFamily: 'var(--font-family)', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Shoply<span style={{ color: '#7c4dff' }}>.ai</span>
            </Typography>
          </Box>

          <Typography variant="h4" style={{ fontWeight: 800, fontFamily: 'var(--font-family)', color: '#0f172a', marginBottom: '24px' }}>
            Login
          </Typography>

          {/* Google Login Button */}
          <Button
            variant="outlined"
            fullWidth
            onClick={() => {
              // Quick demo login
              login('demo@shoply.ai', 'password123');
              navigate('/');
            }}
            style={{
              textTransform: 'none',
              borderRadius: '10px',
              padding: '10px',
              borderColor: '#e2e8f0',
              color: '#1e293b',
              fontWeight: 600,
              fontFamily: 'var(--font-family)',
              marginBottom: '24px',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"/>
              <path fill="#FBBC05" d="M3.87 10.78c-.19-.53-.3-1.1-.3-1.78s.11-1.25.3-1.78L.97 4.96C.35 6.18 0 7.55 0 9s.35 2.82.97 4.04l2.9-2.26z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.97 4.96l2.9 2.26C4.59 5.15 6.62 3.58 9 3.58z"/>
            </svg>
            Sign in with Google
          </Button>

          {/* Divider */}
          <Box display="flex" alignItems="center" marginBottom="24px">
            <Box style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
            <Typography variant="caption" style={{ color: '#94a3b8', padding: '0 12px', fontFamily: 'var(--font-family)' }}>
              Or sign in with email
            </Typography>
            <Box style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          </Box>

          {error && (
            <Alert severity="error" style={{ marginBottom: '20px', borderRadius: '10px' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap="16px">
              <TextField
                placeholder="Email"
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
                InputProps={{ 
                  style: { 
                    backgroundColor: '#f5f7fa', 
                    borderRadius: '10px', 
                    fontSize: '0.92rem',
                    fontFamily: 'var(--font-family)',
                    color: '#0f172a'
                  } 
                }}
              />

              <TextField
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                {...register('password', { required: 'Password is required' })}
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{ 
                  style: { 
                    backgroundColor: '#f5f7fa', 
                    borderRadius: '10px', 
                    fontSize: '0.92rem',
                    fontFamily: 'var(--font-family)',
                    color: '#0f172a'
                  },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff style={{ color: '#94a3b8' }} /> : <Visibility style={{ color: '#94a3b8' }} />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={keepLoggedIn} 
                      onChange={(e) => setKeepLoggedIn(e.target.checked)} 
                      style={{ color: '#7c4dff' }}
                    />
                  }
                  label={
                    <Typography variant="body2" style={{ color: '#64748b', fontSize: '0.85rem', fontFamily: 'var(--font-family)' }}>
                      Keep me logged in
                    </Typography>
                  }
                />
                <Link to="#" style={{ color: '#7c4dff', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', fontFamily: 'var(--font-family)' }}>
                  Forgot password?
                </Link>
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                style={{
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  fontFamily: 'var(--font-family)',
                  backgroundColor: '#7c4dff',
                  color: '#ffffff',
                  boxShadow: '0 6px 20px rgba(124, 77, 255, 0.35)',
                  marginTop: '8px'
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
              </Button>
            </Box>
          </form>

          <Box display="flex" justifyContent="center" marginTop="28px">
            <Typography variant="body2" style={{ color: '#64748b', fontFamily: 'var(--font-family)' }}>
              Don't have an account?{' '}
              <Link 
                to="/register" 
                style={{ color: '#7c4dff', fontWeight: 700, textDecoration: 'none' }}
              >
                Sign up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right Column - Artistic Banner with Floating Shapes (Reference Image 2) */}
      <Box 
        style={{ 
          flex: '1.2', 
          backgroundColor: '#f8fafc', 
          display: { xs: 'none', md: 'flex' }, 
          position: 'relative',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px'
        }}
      >
        {/* Floating Pastel Shapes (Matching Image 2) */}
        <Box style={{ position: 'absolute', top: '-60px', right: '100px', width: '220px', height: '220px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', opacity: 0.8 }} />
        <Box style={{ position: 'absolute', top: '0px', right: '0px', width: '280px', height: '280px', borderRadius: '0 0 0 100%', background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', opacity: 0.8 }} />
        
        {/* Dotted Grid Decoration */}
        <Box 
          style={{ 
            position: 'absolute', 
            top: '20%', 
            right: '25%', 
            width: '120px', 
            height: '120px', 
            backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)', 
            backgroundSize: '16px 16px',
            opacity: 0.7 
          }} 
        />

        {/* Floating Coral Arch */}
        <Box style={{ position: 'absolute', bottom: '150px', left: '120px', width: '120px', height: '180px', borderRadius: '90px 90px 0 0', background: 'linear-gradient(180deg, #ff6b6b 0%, #ff8e8e 100%)', boxShadow: '0 20px 40px rgba(255,107,107,0.2)' }} />
        
        {/* Floating Cyan Semi-Circle */}
        <Box style={{ position: 'absolute', bottom: '80px', left: '260px', width: '160px', height: '80px', borderRadius: '80px 80px 0 0', transform: 'rotate(180deg)', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }} />
        
        {/* Floating Purple Rounded Triangle */}
        <Box style={{ position: 'absolute', bottom: '100px', right: '80px', width: '140px', height: '140px', borderRadius: '30px', transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #b8c6db 0%, #f5f7fa 100%)', boxShadow: '0 15px 35px rgba(0,0,0,0.06)' }} />

        {/* Headline Banner Text (Reference Image 2) */}
        <Box style={{ position: 'relative', zIndex: 2, maxWidth: '520px', textAlign: 'left' }}>
          <Typography 
            variant="h2" 
            style={{ 
              fontWeight: 800, 
              fontFamily: 'var(--font-family)', 
              color: '#0f172a', 
              lineHeight: 1.15,
              fontSize: '3rem',
              letterSpacing: '-0.03em'
            }}
          >
            Changing the way retail AI runs
          </Typography>
          <Typography variant="h6" style={{ marginTop: '20px', color: '#64748b', fontWeight: 500, fontFamily: 'var(--font-family)', lineHeight: 1.5 }}>
            Real-time supply chain forecasting, multimodal OCR scanning, and Hugging Face inventory optimization.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
