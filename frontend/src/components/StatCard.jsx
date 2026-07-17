import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const StatCard = ({ title, value, icon, trend, trendText }) => {
  return (
    <Card 
      className="glass-panel fade-in card-tilt"
      style={{
        height: '100%',
        backgroundColor: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 8px 32px 0 var(--glass-shadow)',
        borderRadius: 'var(--border-radius-md)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <CardContent style={{ padding: '24px' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography 
            variant="subtitle2" 
            style={{ 
              color: 'var(--text-secondary)', 
              fontWeight: 700,
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: 'var(--font-family)'
            }}
          >
            {title}
          </Typography>
          <Box 
            style={{ 
              color: '#00f2fe',
              backgroundColor: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              borderRadius: '12px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(0, 242, 254, 0.15)'
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography 
          className="stat-value" 
          style={{ 
            marginTop: '10px',
            fontFamily: 'var(--font-family)'
          }}
        >
          {value}
        </Typography>

        {trend && (
          <Box display="flex" alignItems="center" marginTop="12px">
            <span className={`stat-trend ${trend}`}>
              {trend === 'up' ? (
                <ArrowUpwardIcon style={{ fontSize: '0.85rem' }} />
              ) : (
                <ArrowDownwardIcon style={{ fontSize: '0.85rem' }} />
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
