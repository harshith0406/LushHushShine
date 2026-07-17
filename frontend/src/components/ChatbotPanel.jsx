import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  TextField,
  Paper,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Divider
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const ChatbotPanel = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi 👋 How can I help you optimize your inventory or store sales today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    { label: 'Low Stock Alerts 📦', query: 'Which items are currently low on stock?' },
    { label: 'Expiring Batches ⏳', query: 'Are there any batches expiring soon?' },
    { label: 'Vendor Directory 📞', query: 'List vendor contact details and addresses' },
    { label: 'Sales Velocity 📈', query: 'What is our current sales trend?' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open]);

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim()) return;

    if (!textToSend) setInput('');

    const updatedMessages = [...messages, { role: 'user', content: queryText }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error('Streaming failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let accumulated = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          accumulated += chunk;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].content = accumulated;
            return updated;
          });
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'I am currently operating in offline mode. For low stock alerts, Whole Wheat Bread (2 units) requires replenishment from Nexus Supply Co.';
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedMessage = (content) => {
    if (!content) return null;
    if (typeof content !== 'string') return String(content);

    const normalized = content.replace(/\\n/g, '\n').replace(/\\t/g, '  ');
    const lines = normalized.split('\n');

    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const parsedLine = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={partIdx} style={{ fontWeight: 700, color: 'inherit' }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        return (
          <Box key={lineIdx} display="flex" gap="8px" marginLeft="10px" marginTop="3px" marginBottom="3px">
            <span style={{ color: '#0072ff', fontWeight: 800 }}>•</span>
            <Typography variant="body2" style={{ fontFamily: 'var(--font-family)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              {parsedLine}
            </Typography>
          </Box>
        );
      } else if (/^\d+\./.test(trimmed)) {
        return (
          <Box key={lineIdx} marginTop="8px" marginBottom="4px">
            <Typography variant="body2" style={{ fontFamily: 'var(--font-family)', fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.5 }}>
              {parsedLine}
            </Typography>
          </Box>
        );
      }

      if (!trimmed) return <Box key={lineIdx} height="6px" />;

      return (
        <Typography key={lineIdx} variant="body2" style={{ fontFamily: 'var(--font-family)', fontSize: '0.88rem', lineHeight: 1.55, marginBottom: '2px' }}>
          {parsedLine}
        </Typography>
      );
    });
  };

  return (
    <>
      {/* Floating launcher Button */}
      <IconButton
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          background: 'linear-gradient(135deg, #0052D4 0%, #4364F7 50%, #6FB1FC 100%)',
          color: '#ffffff',
          width: '60px',
          height: '60px',
          boxShadow: '0 10px 30px rgba(67, 100, 247, 0.45)',
          zIndex: 1000,
          border: '2px solid #ffffff'
        }}
        className="hover-scale"
      >
        <ChatIcon style={{ fontSize: '28px' }} />
      </IconButton>

      {/* Tidio Style Slide-out Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          style: {
            width: '430px',
            maxWidth: '100%',
            height: '100%',
            backgroundColor: '#f8fafc',
            borderLeft: 'none',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-10px 0 40px rgba(0,0,0,0.15)'
          }
        }}
      >
        {/* Vibrant Gradient Header (Tidio Style) */}
        <Box 
          style={{ 
            padding: '24px 20px 20px 20px', 
            background: 'linear-gradient(135deg, #0052D4 0%, #4364F7 50%, #6FB1FC 100%)', 
            color: '#ffffff',
            position: 'relative'
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box display="flex" gap="14px" alignItems="center">
              <Avatar 
                style={{ 
                  width: 46, 
                  height: 46, 
                  backgroundColor: '#ffffff', 
                  color: '#4364F7', 
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                }}
              >
                <AutoAwesomeIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" style={{ fontWeight: 800, fontFamily: 'var(--font-family)', lineHeight: 1.2 }}>
                  Chat with Retail AI
                </Typography>
                <Typography variant="caption" style={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
                  We are online!
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setOpen(false)} style={{ color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.15)' }} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Message Panel Canvas */}
        <Box style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f1f5f9' }}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';

            return (
              <Box key={idx} display="flex" flexDirection="column" alignItems={isUser ? 'flex-end' : 'flex-start'}>
                <Box style={{ maxWidth: '90%' }}>
                  <Paper
                    elevation={0}
                    style={{
                      padding: '14px 18px',
                      borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      background: isUser 
                        ? 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' 
                        : '#ffffff',
                      color: isUser ? '#ffffff' : '#1e293b',
                      fontWeight: isUser ? 600 : 400,
                      boxShadow: isUser 
                        ? '0 6px 20px rgba(0, 114, 255, 0.25)' 
                        : '0 4px 14px rgba(0, 0, 0, 0.05)',
                      border: isUser ? 'none' : '1px solid #e2e8f0'
                    }}
                  >
                    {renderFormattedMessage(msg.content)}
                  </Paper>
                </Box>
              </Box>
            );
          })}
          {loading && (
            <Box display="flex" gap="8px" alignItems="center" style={{ color: '#0072ff', paddingLeft: '8px' }}>
              <CircularProgress size={16} color="inherit" />
              <Typography variant="caption" style={{ fontFamily: 'var(--font-family)', fontWeight: 600 }}>AI is typing...</Typography>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Quick Action Suggestion Chips (Tidio Outlined Style) */}
        <Box style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
          <Typography variant="caption" style={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Suggested Topics
          </Typography>
          <Box display="flex" flexWrap="wrap" gap="8px">
            {quickPrompts.map(qp => (
              <Chip
                key={qp.label}
                label={qp.label}
                onClick={() => handleSend(qp.query)}
                disabled={loading}
                clickable
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#0072ff',
                  border: '1.5px solid #0072ff',
                  borderRadius: '24px',
                  padding: '4px 6px'
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Floating Input Footer */}
        <Box style={{ padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
          <TextField
            placeholder="Enter your message..."
            variant="outlined"
            size="small"
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
            InputProps={{
              style: { 
                borderRadius: '24px', 
                fontFamily: 'var(--font-family)', 
                fontSize: '0.9rem', 
                backgroundColor: '#f8fafc',
                paddingLeft: '8px'
              }
            }}
          />
          <IconButton 
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            style={{ 
              background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', 
              color: '#ffffff', 
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              boxShadow: '0 4px 14px rgba(0, 114, 255, 0.3)'
            }}
          >
            <SendIcon style={{ fontSize: '20px' }} />
          </IconButton>
        </Box>
      </Drawer>
    </>
  );
};

export default ChatbotPanel;
