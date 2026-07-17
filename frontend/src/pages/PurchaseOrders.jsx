import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import API from '../config/api';
import {
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  Chip,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ListAltIcon from '@mui/icons-material/ListAlt';

const PurchaseOrders = () => {
  const { user } = useAuth();
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create PO Modal state
  const [open, setOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState({}); // productId -> quantity

  // View items Modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewPo, setViewPo] = useState(null);

  const fetchPOs = async () => {
    try {
      const response = await API.get('/api/purchase-orders');
      // Sort: newest first
      const sorted = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPos(sorted);
    } catch (err) {
      setError('Failed to load purchase orders');
    }
  };

  const fetchVendorsAndProducts = async () => {
    if (user.role !== 'Selling Place') return;
    try {
      // 1. Fetch products to know what's available
      const prodRes = await API.get('/api/products');
      setProducts(prodRes.data);
      
      // 2. Fetch distinct vendors from products list
      const uniqueVendorsMap = {};
      prodRes.data.forEach(p => {
        if (p.vendorId) {
          uniqueVendorsMap[p.vendorId] = {
            id: p.vendorId,
            companyName: p.vendorName
          };
        }
      });
      setVendors(Object.values(uniqueVendorsMap));
    } catch (err) {
      console.error('Failed to load vendors/products:', err.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchPOs(), fetchVendorsAndProducts()]);
      setLoading(false);
    };
    init();
  }, [user]);

  const handleOpen = () => {
    resetCreateForm();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const resetCreateForm = () => {
    setSelectedVendorId('');
    setSelectedProducts({});
    setError('');
  };

  const handleVendorChange = (vendorId) => {
    setSelectedVendorId(vendorId);
    setSelectedProducts({});
  };

  const handleQtyChange = (productId, qty) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: Math.max(0, parseInt(qty) || 0)
    }));
  };

  const handleCreatePO = async () => {
    setError('');
    const vendor = vendors.find(v => v.id === selectedVendorId);
    if (!vendor) return;

    // Compile items that have quantity > 0
    const items = [];
    Object.keys(selectedProducts).forEach(pId => {
      const qty = selectedProducts[pId];
      if (qty > 0) {
        const prod = products.find(p => p.id === pId);
        if (prod) {
          items.push({
            productId: prod.id,
            productName: prod.name,
            quantity: qty,
            price: parseFloat(prod.price)
          });
        }
      }
    });

    if (items.length === 0) {
      setError('Please select at least one product with quantity greater than 0.');
      return;
    }

    try {
      await API.post('/api/purchase-orders', {
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        items
      });
      fetchPOs();
      handleClose();
    } catch (err) {
      setError('Failed to submit purchase order request.');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    if (status === 'Completed' && !window.confirm('Are you sure you received this order? Delivers will be automatically added to stock.')) return;
    try {
      await API.put(`/api/purchase-orders/${id}/status`, { status });
      fetchPOs();
    } catch (err) {
      setError('Failed to update purchase order status');
    }
  };

  const handleViewItems = (po) => {
    setViewPo(po);
    setViewOpen(true);
  };

  const handleViewClose = () => {
    setViewOpen(false);
    setViewPo(null);
  };

  const getStatusChip = (status) => {
    const styles = {
      'Pending': { color: 'warning', label: 'Pending Approval' },
      'Approved': { color: 'info', label: 'Approved' },
      'Shipped': { color: 'secondary', label: 'In Transit' },
      'Completed': { color: 'success', label: 'Received' },
      'Rejected': { color: 'error', label: 'Rejected' }
    };
    const s = styles[status] || { color: 'default', label: status };
    return <Chip label={s.label} color={s.color} size="small" style={{ fontWeight: 600 }} />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Filter products supplied by currently selected vendor in dropdown
  const filteredProducts = products.filter(p => p.vendorId === selectedVendorId);

  return (
    <Box className="fade-in">
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="24px">
        <Box>
          <Typography variant="h4" style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}>
            Replenishment Purchase Orders (PO)
          </Typography>
          <Typography variant="body2" style={{ color: 'var(--text-secondary)' }}>
            {user.role === 'Selling Place'
              ? 'Request stock replenishments from suppliers, monitor pipeline statuses, and confirm deliveries'
              : 'Review stock replenishment requests from retailers, approve items, and ship orders'}
          </Typography>
        </Box>
        {user.role === 'Selling Place' && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpen}
            style={{
              borderRadius: 'var(--border-radius-sm)',
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: 'var(--primary)'
            }}
          >
            Create PO Request
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" style={{ marginBottom: '24px', borderRadius: 'var(--border-radius-sm)' }}>{error}</Alert>}

      <TableContainer component={Paper} className="glass-panel" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
        <Table className="custom-table">
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Order ID</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                {user.role === 'Selling Place' ? 'Supplier / Vendor' : 'Retail Store'}
              </TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Order Date</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Items Count</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Status</TableCell>
              <TableCell align="right" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
                  No purchase orders found.
                </TableCell>
              </TableRow>
            ) : (
              pos.map((row) => (
                <TableRow key={row.id}>
                  <TableCell style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.id.substring(0, 10)}</TableCell>
                  <TableCell>{user.role === 'Selling Place' ? row.vendorName : row.sellingPlaceName}</TableCell>
                  <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{row.items?.length || 0} product(s)</TableCell>
                  <TableCell>{getStatusChip(row.status)}</TableCell>
                  <TableCell align="right">
                    <Button 
                      size="small" 
                      onClick={() => handleViewItems(row)} 
                      style={{ marginRight: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      View Items
                    </Button>
                    
                    {/* Action buttons based on Role & Status */}
                    {user.role === 'Vendor' && row.status === 'Pending' && (
                      <>
                        <IconButton color="success" size="small" onClick={() => handleUpdateStatus(row.id, 'Approved')}>
                          <CheckCircleIcon />
                        </IconButton>
                        <IconButton color="error" size="small" onClick={() => handleUpdateStatus(row.id, 'Rejected')}>
                          <CancelIcon />
                        </IconButton>
                      </>
                    )}

                    {user.role === 'Vendor' && row.status === 'Approved' && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        startIcon={<LocalShippingIcon />}
                        onClick={() => handleUpdateStatus(row.id, 'Shipped')}
                        style={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        Ship Order
                      </Button>
                    )}

                    {user.role === 'Selling Place' && row.status === 'Shipped' && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleUpdateStatus(row.id, 'Completed')}
                        style={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        Mark as Received
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create PO Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 700, fontFamily: 'var(--font-family)' }}>
          Create Replenishment Purchase Order
        </DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '10px' }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <FormControl fullWidth>
            <InputLabel id="po-vendor-select">Select Vendor / Supplier</InputLabel>
            <Select
              labelId="po-vendor-select"
              label="Select Vendor / Supplier"
              value={selectedVendorId}
              onChange={(e) => handleVendorChange(e.target.value)}
            >
              {vendors.map(v => (
                <MenuItem key={v.id} value={v.id}>{v.companyName}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedVendorId && (
            <Box>
              <Typography variant="subtitle2" style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Select Products & Restock Quantities
              </Typography>
              <Divider style={{ marginBottom: '16px' }} />
              
              <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '250px', overflowY: 'auto' }}>
                {filteredProducts.length === 0 ? (
                  <Typography variant="body2" color="var(--text-muted)">
                    No products registered under this vendor. Register them first in the catalog.
                  </Typography>
                ) : (
                  filteredProducts.map(p => (
                    <Box key={p.id} display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2" style={{ fontWeight: 600 }}>{p.name}</Typography>
                        <Typography variant="caption" style={{ color: 'var(--text-secondary)' }}>SKU: {p.sku}</Typography>
                      </Box>
                      <TextField
                        type="number"
                        label="Qty"
                        size="small"
                        style={{ width: '80px' }}
                        inputProps={{ min: 0 }}
                        value={selectedProducts[p.id] || ''}
                        onChange={(e) => handleQtyChange(p.id, e.target.value)}
                      />
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={handleClose} style={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button 
            onClick={handleCreatePO} 
            variant="contained" 
            disabled={!selectedVendorId}
            style={{ textTransform: 'none', fontWeight: 600, backgroundColor: 'var(--primary)' }}
          >
            Send Purchase Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Items Dialog */}
      <Dialog open={viewOpen} onClose={handleViewClose} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 700, fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListAltIcon color="primary" /> Purchase Order Items ({viewPo?.id?.substring(0, 10)})
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap="16px" marginTop="8px">
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="var(--text-secondary)">
                <strong>From Retail Store:</strong> {viewPo?.sellingPlaceName}
              </Typography>
              <Typography variant="body2" color="var(--text-secondary)">
                <strong>To Supplier:</strong> {viewPo?.vendorName}
              </Typography>
            </Box>
            
            <TableContainer component={Paper} elevation={0} style={{ border: '1px solid var(--border-color)' }}>
              <Table size="small">
                <TableHead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell style={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell style={{ fontWeight: 600 }}>Quantity</TableCell>
                    <TableCell style={{ fontWeight: 600 }}>Unit Price</TableCell>
                    <TableCell style={{ fontWeight: 600 }}>Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewPo?.items?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell style={{ fontWeight: 550 }}>{item.productName}</TableCell>
                      <TableCell>{item.quantity} units</TableCell>
                      <TableCell>${parseFloat(item.price).toFixed(2)}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>
                        ${(item.quantity * item.price).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="flex-end" marginTop="8px">
              <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                Total Order Value: ${viewPo?.items?.reduce((s, i) => s + (i.quantity * i.price), 0).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={handleViewClose} style={{ textTransform: 'none', fontWeight: 600 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseOrders;
