import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const StatCard = ({ title, value, icon, trend, trendText }) => {
  return (
    <Card 
      className="glass-panel fade-in"
      style={{
        height: '100%',
        backgroundColor: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 8px 32px 0 var(--glass-shadow)',
        borderRadius: 'var(--border-radius-md)',
      }}
    >
      <CardContent style={{ padding: '24px' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography 
            variant="subtitle2" 
            style={{ 
              color: 'var(--text-secondary)', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {title}
          </Typography>
          <Box 
            style={{ 
              color: 'var(--primary)',
              backgroundColor: 'var(--primary-glow)',
              borderRadius: '50%',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography 
          className="stat-value" 
          style={{ 
            color: 'var(--text-primary)', 
            marginTop: '12px',
            fontFamily: 'var(--font-family)',
            fontWeight: 800
          }}
        >
          {value}
        </Typography>

        {trend && (
          <Box display="flex" alignItems="center" marginTop="12px">
            <span className={`stat-trend ${trend}`}>
              {trend === 'up' ? (
                <ArrowUpwardIcon style={{ fontSize: '0.9rem', marginRight: '2px' }} />
              ) : (
                <ArrowDownwardIcon style={{ fontSize: '0.9rem', marginRight: '2px' }} />
              )}
              {trendText}
            </span>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
