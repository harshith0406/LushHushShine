import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  TextField
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import API from '../config/api';

const AiAgentModal = ({ open, onClose, onApply, agentType, payload, title }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const runAgent = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      if (agentType === 'draft-po') endpoint = '/api/python/agent/draft-po';
      else if (agentType === 'optimize-price') endpoint = '/api/python/agent/optimize-price';
      else if (agentType === 'generate-marketing') endpoint = '/api/python/agent/generate-marketing';
      else if (agentType === 'draft-vendor-email') endpoint = '/api/python/agent/draft-vendor-email';

      const response = await API.post(endpoint, payload);
      
      if (agentType === 'optimize-price') {
        setResult(`Recommended Discount: ${response.data.recommended_discount_percent}%\n\nReasoning: ${response.data.reasoning}`);
      } else if (agentType === 'generate-marketing') {
        setResult(response.data.marketing_copy);
      } else {
        setResult(response.data.draft);
      }
    } catch (err) {
      console.error(err);
      setError('AI Agent encountered an error. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ style: { backgroundColor: '#101726', color: '#f8fafc', border: '1px solid #00f2fe' } }}>
      <DialogTitle style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box display="flex" alignItems="center" gap="8px">
          <AutoAwesomeIcon style={{ color: '#d946ef' }} />
          <Typography variant="h6" style={{ fontWeight: 700 }}>{title || 'AI Agent'}</Typography>
        </Box>
        <IconButton onClick={onClose} style={{ color: '#94a3b8' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent style={{ padding: '24px' }}>
        {!result && !loading && !error && (
          <Box display="flex" flexDirection="column" alignItems="center" gap="16px" padding="20px 0">
            <Typography variant="body1" align="center" style={{ color: '#cbd5e1' }}>
              Are you sure you want to invoke the AI agent for this task? 
            </Typography>
            <Button 
              variant="contained" 
              onClick={runAgent}
              startIcon={<AutoAwesomeIcon />}
              style={{ backgroundColor: '#d946ef', color: '#fff', fontWeight: 600, padding: '10px 24px', borderRadius: '8px' }}
            >
              Run AI Agent
            </Button>
          </Box>
        )}

        {loading && (
          <Box display="flex" flexDirection="column" alignItems="center" gap="16px" padding="40px 0">
            <CircularProgress style={{ color: '#d946ef' }} />
            <Typography style={{ color: '#94a3b8' }}>AI is thinking...</Typography>
          </Box>
        )}

        {error && (
          <Typography color="error" style={{ marginTop: '20px' }}>{error}</Typography>
        )}

        {result && (
          <TextField
            fullWidth
            multiline
            rows={10}
            value={result}
            onChange={(e) => setResult(e.target.value)}
            variant="outlined"
            style={{ marginTop: '16px' }}
            sx={{
              backgroundColor: '#090d16',
              borderRadius: '8px',
              '& .MuiInputBase-input': {
                color: '#f8fafc',
                fontFamily: 'monospace'
              }
            }}
          />
        )}
      </DialogContent>
      <DialogActions style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px' }}>
        {result && (
          <Button 
            variant="contained" 
            onClick={() => {
              if (onApply) onApply(result);
              onClose();
            }}
            style={{ backgroundColor: '#10b981', color: '#fff', fontWeight: 600, borderRadius: '8px' }}
          >
            Approve & Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AiAgentModal;
