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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';

const Register = () => {
  const { register: signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      await signup(data);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check the fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container fade-in" style={{ padding: '40px 24px' }}>
      <Box className="auth-card glass-panel" style={{ maxWidth: '600px' }}>
        <Typography 
          variant="h4" 
          align="center" 
          gutterBottom 
          style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}
        >
          Create Account
        </Typography>
        <Typography 
          variant="body2" 
          align="center" 
          style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}
        >
          Register your retail store or vendor profile to start analyzing performance
        </Typography>

        {error && (
          <Alert severity="error" style={{ marginBottom: '24px', borderRadius: 'var(--border-radius-sm)' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box display="flex" flexDirection="column" gap="20px">
            <Box display="flex" gap="16px" flexWrap="wrap">
              <Box flex={1} minWidth="240px">
                <TextField
                  label="Company Name"
                  variant="outlined"
                  fullWidth
                  {...register('companyName', { required: 'Company name is required' })}
                  error={!!errors.companyName}
                  helperText={errors.companyName?.message}
                  InputLabelProps={{ style: { fontFamily: 'var(--font-family)' } }}
                  InputProps={{ style: { borderRadius: 'var(--border-radius-sm)' } }}
                />
              </Box>

              <Box flex={1} minWidth="240px">
                <TextField
                  label="User Name"
                  variant="outlined"
                  fullWidth
                  {...register('userName', { required: 'User name is required' })}
                  error={!!errors.userName}
                  helperText={errors.userName?.message}
                  InputLabelProps={{ style: { fontFamily: 'var(--font-family)' } }}
                  InputProps={{ style: { borderRadius: 'var(--border-radius-sm)' } }}
                />
              </Box>
            </Box>

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

            <Box display="flex" gap="16px" flexWrap="wrap">
              <Box flex={1} minWidth="240px">
                <TextField
                  label="Password"
                  type="password"
                  variant="outlined"
                  fullWidth
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  InputLabelProps={{ style: { fontFamily: 'var(--font-family)' } }}
                  InputProps={{ style: { borderRadius: 'var(--border-radius-sm)' } }}
                />
              </Box>

              <Box flex={1} minWidth="240px">
                <TextField
                  label="Phone Number"
                  variant="outlined"
                  fullWidth
                  {...register('phone', { required: 'Phone number is required' })}
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                  InputLabelProps={{ style: { fontFamily: 'var(--font-family)' } }}
                  InputProps={{ style: { borderRadius: 'var(--border-radius-sm)' } }}
                />
              </Box>
            </Box>

            <TextField
              label="Address"
              variant="outlined"
              fullWidth
              {...register('address', { required: 'Address is required' })}
              error={!!errors.address}
              helperText={errors.address?.message}
              InputLabelProps={{ style: { fontFamily: 'var(--font-family)' } }}
              InputProps={{ style: { borderRadius: 'var(--border-radius-sm)' } }}
            />

            <FormControl fullWidth error={!!errors.role}>
              <InputLabel id="role-select-label" style={{ fontFamily: 'var(--font-family)' }}>Select User Role</InputLabel>
              <Select
                labelId="role-select-label"
                label="Select User Role"
                defaultValue=""
                {...register('role', { required: 'Role is required' })}
                style={{ borderRadius: 'var(--border-radius-sm)' }}
              >
                <MenuItem value="Selling Place">Selling Place (Supermarket / Retail Store)</MenuItem>
                <MenuItem value="Vendor">Vendor (Product Supplier)</MenuItem>
              </Select>
              {errors.role && <FormHelperText>{errors.role.message}</FormHelperText>}
            </FormControl>

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
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
            </Button>
          </Box>
        </form>

        <Box display="flex" justifyContent="center" marginTop="24px">
          <Typography variant="body2" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link 
              to="/login" 
              style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
            >
              Sign In
            </Link>
          </Typography>
        </Box>
      </Box>
    </div>
  );
};

export default Register;
