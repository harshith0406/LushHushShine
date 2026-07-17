import React from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Divider,
  Grid,
  Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';

const Profile = () => {
  const { user } = useAuth();

  return (
    <Box className="fade-in">
      <Box marginBottom="24px">
        <Typography variant="h4" className="gradient-text" style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}>
          Company Profile
        </Typography>
        <Typography variant="body2" style={{ color: '#94a3b8', marginTop: '4px' }}>
          Review your registration metadata, contact roles, and API access configurations
        </Typography>
      </Box>

      <Card className="glass-panel" style={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.2)', maxWidth: '800px', borderRadius: '20px' }}>
        <CardContent style={{ padding: '32px' }}>
          <Box display="flex" alignItems="center" gap="24px" marginBottom="32px" flexWrap="wrap">
            <Avatar 
              style={{ 
                width: 84, 
                height: 84, 
                background: 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)', 
                color: '#090d16', 
                fontSize: '2.2rem', 
                fontWeight: 800,
                boxShadow: '0 8px 25px rgba(0, 242, 254, 0.3)'
              }}
            >
              {user?.userName ? user.userName[0].toUpperCase() : 'U'}
            </Avatar>
            <Box>
              <Typography variant="h5" style={{ fontWeight: 800, color: '#f8fafc' }}>
                {user?.userName}
              </Typography>
              <Box display="flex" alignItems="center" gap="10px" marginTop="6px">
                <Chip 
                  label={`${user?.role} Profile`} 
                  style={{ 
                    backgroundColor: 'rgba(0, 242, 254, 0.1)', 
                    color: '#00f2fe', 
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    fontWeight: 700,
                    fontSize: '0.82rem'
                  }} 
                />
              </Box>
            </Box>
          </Box>

          <Divider style={{ marginBottom: '28px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap="14px" padding="16px" style={{ backgroundColor: '#162032', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <BusinessIcon style={{ color: '#00f2fe', fontSize: '28px' }} />
                <Box>
                  <Typography variant="caption" style={{ color: '#94a3b8', fontWeight: 600 }}>
                    Company Name
                  </Typography>
                  <Typography variant="body1" style={{ fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                    {user?.companyName || 'Google'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap="14px" padding="16px" style={{ backgroundColor: '#162032', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <EmailIcon style={{ color: '#38bdf8', fontSize: '28px' }} />
                <Box>
                  <Typography variant="caption" style={{ color: '#94a3b8', fontWeight: 600 }}>
                    Email Address
                  </Typography>
                  <Typography variant="body1" style={{ fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                    {user?.email || 'test@gmail.com'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap="14px" padding="16px" style={{ backgroundColor: '#162032', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <PhoneIcon style={{ color: '#4ade80', fontSize: '28px' }} />
                <Box>
                  <Typography variant="caption" style={{ color: '#94a3b8', fontWeight: 600 }}>
                    Phone Number
                  </Typography>
                  <Typography variant="body1" style={{ fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                    {user?.phone || '123123123'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap="14px" padding="16px" style={{ backgroundColor: '#162032', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <SettingsIcon style={{ color: '#c084fc', fontSize: '28px' }} />
                <Box>
                  <Typography variant="caption" style={{ color: '#94a3b8', fontWeight: 600 }}>
                    API Access Mode
                  </Typography>
                  <Typography variant="body1" style={{ fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
                    Local Persisted Emulator (Active)
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap="14px" padding="16px" style={{ backgroundColor: '#162032', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <HomeIcon style={{ color: '#f59e0b', fontSize: '28px' }} />
                <Box>
                  <Typography variant="caption" style={{ color: '#94a3b8', fontWeight: 600 }}>
                    Registered Office Address
                  </Typography>
                  <Typography variant="body1" style={{ fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                    {user?.address || 'Earth'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
