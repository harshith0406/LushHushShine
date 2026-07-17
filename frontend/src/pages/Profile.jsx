import React from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Divider,
  Grid
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
        <Typography variant="h4" style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}>
          Company Profile
        </Typography>
        <Typography variant="body2" style={{ color: 'var(--text-secondary)' }}>
          Review your registration metadata and access configurations
        </Typography>
      </Box>

      <Card className="glass-panel" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', maxWidth: '800px' }}>
        <CardContent style={{ padding: '32px' }}>
          <Box display="flex" alignItems="center" gap="24px" marginBottom="32px" flexWrap="wrap">
            <Avatar style={{ width: 80, height: 80, backgroundColor: 'var(--primary)', fontSize: '2rem', fontWeight: 600 }}>
              {user?.userName ? user.userName[0].toUpperCase() : 'U'}
            </Avatar>
            <Box>
              <Typography variant="h5" style={{ fontWeight: 700 }}>
                {user?.userName}
              </Typography>
              <Typography variant="subtitle1" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                {user?.role} Profile
              </Typography>
            </Box>
          </Box>

          <Divider style={{ marginBottom: '24px' }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap="12px" marginBottom="20px">
                <BusinessIcon style={{ color: 'var(--text-secondary)' }} />
                <Box>
                  <Typography variant="caption" color="var(--text-muted)">
                    Company Name
                  </Typography>
                  <Typography variant="body1" style={{ fontWeight: 600 }}>
                    {user?.companyName}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap="12px" marginBottom="20px">
                <EmailIcon style={{ color: 'var(--text-secondary)' }} />
                <Box>
                  <Typography variant="caption" color="var(--text-muted)">
                    Email Address
                  </Typography>
                  <Typography variant="body1" style={{ fontWeight: 600 }}>
                    {user?.email}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap="12px" marginBottom="20px">
                <PhoneIcon style={{ color: 'var(--text-secondary)' }} />
                <Box>
                  <Typography variant="caption" color="var(--text-muted)">
                    Phone Number
                  </Typography>
                  <Typography variant="body1" style={{ fontWeight: 600 }}>
                    {user?.phone || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap="12px" marginBottom="20px">
                <SettingsIcon style={{ color: 'var(--text-secondary)' }} />
                <Box>
                  <Typography variant="caption" color="var(--text-muted)">
                    API Access Integration
                  </Typography>
                  <Typography variant="body1" style={{ fontWeight: 600, color: 'var(--success)' }}>
                    Local Persisted Emulator Mode (Active)
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" alignItems="start" gap="12px" marginBottom="20px">
                <HomeIcon style={{ color: 'var(--text-secondary)', marginTop: '4px' }} />
                <Box>
                  <Typography variant="caption" color="var(--text-muted)">
                    Registered Office Address
                  </Typography>
                  <Typography variant="body1" style={{ fontWeight: 600 }}>
                    {user?.address || 'N/A'}
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
