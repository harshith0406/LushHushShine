import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import API from '../config/api';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Tooltip
} from '@mui/material';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/ExitToApp';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SecurityIcon from '@mui/icons-material/Security';

import ChatbotPanel from './ChatbotPanel';

const sidebarWidth = 260;

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeMode, setThemeMode] = useState('dark'); // Default to dark mode for premium look
  
  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorElNotif, setAnchorElNotif] = useState(null);
  const [anchorElProfile, setAnchorElProfile] = useState(null);

  // Set theme on startup
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  // Fetch notifications periodically
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await API.get('/api/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Pool every 15s
    return () => clearInterval(interval);
  }, [user]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleThemeToggle = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Notification click handlers
  const handleNotifOpen = (event) => {
    setAnchorElNotif(event.currentTarget);
  };

  const handleNotifClose = () => {
    setAnchorElNotif(null);
  };

  const handleDismissNotif = async (id) => {
    try {
      await API.put(`/api/notifications/${id}/read`);
      // Update count locally
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to dismiss notification:', err.message);
    }
  };

  const handleProfileOpen = (event) => {
    setAnchorElProfile(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorElProfile(null);
  };

  // Define sidebar menu options based on role
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Products', icon: <ShoppingCartIcon />, path: '/products' },
    { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
    { text: 'Sales', icon: <ReceiptIcon />, path: '/sales' },
    { text: 'Purchase Orders', icon: <AssignmentIcon />, path: '/purchase-orders' },
    { text: 'Risk Analysis', icon: <SecurityIcon />, path: '/risk-analysis' },
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' }
  ];

  const drawerContent = (
    <Box 
      style={{ 
        height: '100%', 
        backgroundColor: 'var(--bg-sidebar)', 
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Toolbar style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '10px' }}>
        <Box style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px' }}>
          <img 
            src="/logo.png" 
            alt="Shoply.ai Logo" 
            style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} 
          />
        </Box>
        <Typography 
          variant="h6" 
          noWrap 
          style={{ 
            fontWeight: 800, 
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-family)'
          }}
        >
          Shoply<span style={{ color: 'var(--primary, #00f2fe)' }}>.ai</span>
        </Typography>
      </Toolbar>
      
      <Divider style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
      


      <List style={{ padding: '8px 12px', flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.text} disablePadding style={{ marginBottom: '4px' }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                style={{
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  color: isSelected ? '#38bdf8' : '#cbd5e1'
                }}
              >
                <ListItemIcon style={{ color: isSelected ? '#38bdf8' : '#94a3b8', minWidth: '40px' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    style: { 
                      fontFamily: 'var(--font-family)', 
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '0.95rem'
                    } 
                  }} 
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

      {/* Logout Action */}
      <List style={{ padding: '8px 12px' }}>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={handleLogout}
            style={{ 
              borderRadius: 'var(--border-radius-sm)',
              color: '#f87171' 
            }}
          >
            <ListItemIcon style={{ color: '#f87171', minWidth: '40px' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Logout" 
              primaryTypographyProps={{ 
                style: { fontFamily: 'var(--font-family)', fontWeight: 500, fontSize: '0.95rem' } 
              }} 
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'var(--bg-primary)' }}>
      {/* Top Header App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        style={{
          width: { sm: `calc(100% - ${sidebarWidth}px)` },
          marginLeft: { sm: `${sidebarWidth}px` },
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--glass-border)',
          color: 'var(--text-primary)',
          left: 0,
          paddingLeft: { sm: `${sidebarWidth}px` }
        }}
      >
        <Toolbar style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center">
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              style={{ fontWeight: 700, fontFamily: 'var(--font-family)' }}
            >
              {user?.companyName}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap="8px">
            {/* Theme Toggle */}
            <Tooltip title="Toggle light/dark theme">
              <IconButton color="inherit" onClick={handleThemeToggle} className="theme-toggle-btn">
                {themeMode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
              </IconButton>
            </Tooltip>

            {/* Notifications Bell */}
            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={handleNotifOpen}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User Profile Avatar */}
            <IconButton color="inherit" onClick={handleProfileOpen} style={{ padding: '4px' }}>
              <Avatar style={{ width: 32, height: 32, backgroundColor: 'var(--primary)', fontSize: '0.95rem' }}>
                {user?.userName ? user.userName[0].toUpperCase() : 'U'}
              </Avatar>
            </IconButton>

            {/* Profile Menu */}
            <Menu
              anchorEl={anchorElProfile}
              open={Boolean(anchorElProfile)}
              onClose={handleProfileClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { handleProfileClose(); navigate('/profile'); }}>My Profile</MenuItem>
              <MenuItem onClick={handleLogout} style={{ color: 'var(--danger)' }}>Logout</MenuItem>
            </Menu>

            {/* Notifications Dropdown Menu */}
            <Menu
              anchorEl={anchorElNotif}
              open={Boolean(anchorElNotif)}
              onClose={handleNotifClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                style: { width: '360px', maxHeight: '400px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }
              }}
            >
              <Box style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" style={{ fontWeight: 700 }}>Notifications</Typography>
                {unreadCount > 0 && (
                  <Typography variant="caption" style={{ color: 'var(--text-muted)' }}>
                    {unreadCount} unread
                  </Typography>
                )}
              </Box>
              <Divider />
              {notifications.length === 0 ? (
                <MenuItem disabled style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                  <Typography variant="body2" style={{ color: 'var(--text-muted)' }}>No alerts found</Typography>
                </MenuItem>
              ) : (
                notifications.map((notif) => (
                  <Box 
                    key={notif.id} 
                    style={{ 
                      padding: '12px 16px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '4px',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: notif.read ? 'transparent' : 'var(--primary-glow)'
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="start">
                      <Typography variant="subtitle2" style={{ fontWeight: notif.read ? 600 : 700, fontSize: '0.85rem' }}>
                        {notif.title}
                      </Typography>
                      {!notif.read && (
                        <Typography 
                          variant="caption" 
                          style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => handleDismissNotif(notif.id)}
                        >
                          Dismiss
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                      {notif.message}
                    </Typography>
                    <Typography variant="caption" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                ))
              )}
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawers - Responsive */}
      <Box
        component="nav"
        sx={{ width: { sm: sidebarWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Mobile Sidebar */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: sidebarWidth, borderRight: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Desktop Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: sidebarWidth, borderRight: '1px solid var(--glass-border)' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Page Content Wrapper */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${sidebarWidth}px)` },
          mt: 8,
          minHeight: 'calc(100vh - 64px)',
          overflowY: 'auto'
        }}
      >
        <Outlet />
        <ChatbotPanel />
      </Box>
    </Box>
  );
};

export default DashboardLayout;
