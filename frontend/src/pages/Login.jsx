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
      {/* Left Column - Expanded Login Form */}
      <Box 
        style={{ 
          flex: '1.2', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '48px 32px'
        }}
      >
        <Box style={{ width: '100%', maxWidth: '480px' }}>
          {/* Brand Logo Header */}
          <Box display="flex" alignItems="center" gap="14px" marginBottom="36px">
            <Box 
              style={{ 
                width: '46px', 
                height: '46px', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}
            >
              <img 
                src="/logo.png" 
                alt="VendSell.ai Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} 
              />
            </Box>
            <Typography variant="h4" style={{ fontWeight: 800, fontFamily: 'var(--font-family)', color: '#0f172a', letterSpacing: '-0.02em' }}>
              VendSell<span style={{ color: 'var(--primary, #00f2fe)' }}>.ai</span>
            </Typography>
          </Box>

          <Typography variant="h3" style={{ fontWeight: 800, fontFamily: 'var(--font-family)', color: '#0f172a', marginBottom: '8px', fontSize: '2.2rem' }}>
            Login
          </Typography>


          {error && (
            <Alert severity="error" style={{ marginBottom: '24px', borderRadius: '12px' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap="20px">
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
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    backgroundColor: '#f5f7fa', 
                    borderRadius: '12px', 
                    padding: '4px 8px',
                    fontFamily: 'var(--font-family)',
                  },
                  '& .MuiInputBase-input': {
                    color: '#0f172a',
                    fontSize: '0.95rem'
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
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff style={{ color: '#94a3b8' }} /> : <Visibility style={{ color: '#94a3b8' }} />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    backgroundColor: '#f5f7fa', 
                    borderRadius: '12px', 
                    padding: '4px 8px',
                    fontFamily: 'var(--font-family)',
                  },
                  '& .MuiInputBase-input': {
                    color: '#0f172a',
                    fontSize: '0.95rem'
                  }
                }}
              />

              <Box display="flex" justifyContent="space-between" alignItems="center" marginTop="4px">
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={keepLoggedIn} 
                      onChange={(e) => setKeepLoggedIn(e.target.checked)} 
                      style={{ color: '#7c4dff' }}
                    />
                  }
                  label={
                    <Typography variant="body2" style={{ color: '#64748b', fontSize: '0.88rem', fontFamily: 'var(--font-family)' }}>
                      Keep me logged in
                    </Typography>
                  }
                />
                <Link to="#" style={{ color: '#7c4dff', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none', fontFamily: 'var(--font-family)' }}>
                  Forgot password?
                </Link>
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                style={{
                  borderRadius: '12px',
                  padding: '14px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textTransform: 'none',
                  fontFamily: 'var(--font-family)',
                  backgroundColor: '#7c4dff',
                  color: '#ffffff',
                  boxShadow: '0 6px 20px rgba(124, 77, 255, 0.35)',
                  marginTop: '12px'
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
              </Button>
            </Box>
          </form>

          <Box display="flex" justifyContent="center" marginTop="32px">
            <Typography variant="body2" style={{ color: '#64748b', fontFamily: 'var(--font-family)', fontSize: '0.92rem' }}>
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

      {/* Right Column - Artistic Banner with Floating Shapes */}
      <Box 
        style={{ 
          flex: '1.4', 
          backgroundColor: '#f8fafc', 
          display: { xs: 'none', md: 'flex' }, 
          position: 'relative',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px'
        }}
      >
        <Box style={{ position: 'absolute', top: '-60px', right: '100px', width: '220px', height: '220px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', opacity: 0.8 }} />
        <Box style={{ position: 'absolute', top: '0px', right: '0px', width: '280px', height: '280px', borderRadius: '0 0 0 100%', background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', opacity: 0.8 }} />
        
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

        <Box style={{ position: 'absolute', bottom: '150px', left: '120px', width: '120px', height: '180px', borderRadius: '90px 90px 0 0', background: 'linear-gradient(180deg, #ff6b6b 0%, #ff8e8e 100%)', boxShadow: '0 20px 40px rgba(255,107,107,0.2)' }} />
        <Box style={{ position: 'absolute', bottom: '80px', left: '260px', width: '160px', height: '80px', borderRadius: '80px 80px 0 0', transform: 'rotate(180deg)', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }} />
        <Box style={{ position: 'absolute', bottom: '100px', right: '80px', width: '140px', height: '140px', borderRadius: '30px', transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #b8c6db 0%, #f5f7fa 100%)', boxShadow: '0 15px 35px rgba(0,0,0,0.06)' }} />

        <Box style={{ position: 'relative', zIndex: 2, maxWidth: '480px', textAlign: 'left', marginTop: '60px', marginLeft: '60px' }}>
          <Typography 
            variant="h2" 
            style={{ 
              fontWeight: 800, 
              fontFamily: 'var(--font-family)', 
              color: '#0f172a', 
              lineHeight: 1.15,
              fontSize: '2.8rem',
              letterSpacing: '-0.03em'
            }}
          >
            Changing the way retail AI runs
          </Typography>
          <Typography variant="h6" style={{ marginTop: '20px', color: '#64748b', fontWeight: 500, fontFamily: 'var(--font-family)', lineHeight: 1.5, fontSize: '1.05rem' }}>
            Real-time supply chain forecasting, multimodal OCR scanning, and Hugging Face inventory optimization.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
