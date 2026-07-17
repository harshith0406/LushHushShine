import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import API from '../config/api';
import {
  Typography,
  Box,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const Sales = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // POS Cart State
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const fetchProducts = async () => {
    if (user.role !== 'Selling Place') return;
    try {
      const response = await API.get('/api/products');
      setProducts(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSalesHistory = async () => {
    try {
      const response = await API.get('/api/sales');
      const sorted = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSalesHistory(sorted);
    } catch (err) {
      setError('Failed to load sales transactions');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchSalesHistory()]);
      setLoading(false);
    };
    init();
  }, [user]);

  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingIndex = cart.findIndex(item => item.productId === selectedProductId);
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += parseInt(quantity);
      newCart[existingIndex].subtotal = newCart[existingIndex].quantity * product.price;
      setCart(newCart);
    } else {
      setCart([...cart, {
        productId: selectedProductId,
        productName: product.name,
        sku: product.sku,
        price: product.price,
        quantity: parseInt(quantity),
        subtotal: parseInt(quantity) * product.price
      }]);
    }
    
    setSelectedProductId('');
    setQuantity(1);
  };

  const handleRemoveFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    setError('');
    setSuccess('');
    if (cart.length === 0) return;

    const payload = {
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }))
    };

    try {
      await API.post('/api/sales', payload);
      setSuccess('Transaction check out completed successfully! Stock deducted.');
      setCart([]);
      fetchSalesHistory();
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Checkout transaction failed. Check stock levels.');
    }
  };

  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="fade-in">
      <Box marginBottom="24px">
        <Typography variant="h4" className="gradient-text" style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}>
          Sales & Checkout Registers
        </Typography>
        <Typography variant="body2" style={{ color: '#94a3b8', marginTop: '4px' }}>
          {user.role === 'Selling Place'
            ? 'Ring up checkout sales, record customer invoices, and update inventory rates'
            : 'Track item transaction volume and revenues supplied by your warehouse'}
        </Typography>
      </Box>

      {error && <Alert severity="error" style={{ marginBottom: '24px', borderRadius: '10px' }}>{error}</Alert>}
      {success && <Alert severity="success" style={{ marginBottom: '24px', borderRadius: '10px' }}>{success}</Alert>}

      <Grid container spacing={4}>
        {user.role === 'Selling Place' && (
          <Grid item xs={12} md={5}>
            <Card className="glass-panel" style={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.2)', height: '100%' }}>
              <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" style={{ fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#00f2fe' }}>
                  <AddShoppingCartIcon /> POS Register Cart
                </Typography>
                
                <Box display="flex" gap="12px" marginBottom="20px">
                  <FormControl fullWidth size="small">
                    <InputLabel id="pos-product-label" style={{ color: '#94a3b8' }}>Select Item</InputLabel>
                    <Select
                      labelId="pos-product-label"
                      label="Select Item"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      style={{ backgroundColor: '#162032', color: '#ffffff', borderRadius: '10px' }}
                    >
                      {products.map(p => (
                        <MenuItem key={p.id} value={p.id}>{p.name} (${parseFloat(p.price).toFixed(2)})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Qty"
                    type="number"
                    size="small"
                    inputProps={{ min: 1, style: { color: '#ffffff' } }}
                    style={{ width: '80px', backgroundColor: '#162032', borderRadius: '10px' }}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))}
                    InputLabelProps={{ style: { color: '#94a3b8' } }}
                  />

                  <Button 
                    variant="contained" 
                    onClick={handleAddToCart}
                    style={{ textTransform: 'none', backgroundColor: '#00f2fe', color: '#090d16', fontWeight: 700, borderRadius: '10px' }}
                  >
                    Add
                  </Button>
                </Box>

                <Divider style={{ margin: '12px 0', backgroundColor: 'rgba(255,255,255,0.08)' }} />

                <Box style={{ flexGrow: 1, minHeight: '200px', overflowY: 'auto' }}>
                  {cart.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                      <Typography variant="body2" style={{ color: '#94a3b8' }}>Cart is empty</Typography>
                    </Box>
                  ) : (
                    cart.map((item, index) => (
                      <Box 
                        key={index} 
                        display="flex" 
                        justifyContent="space-between" 
                        alignItems="center" 
                        padding="10px 0"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <Box>
                          <Typography variant="subtitle2" style={{ fontWeight: 700, color: '#f8fafc' }}>{item.productName}</Typography>
                          <Typography variant="caption" style={{ color: '#94a3b8' }}>
                            {item.quantity} x ${parseFloat(item.price).toFixed(2)}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap="8px">
                          <Typography variant="subtitle2" style={{ fontWeight: 700, color: '#00f2fe' }}>
                            ${parseFloat(item.subtotal).toFixed(2)}
                          </Typography>
                          <IconButton size="small" style={{ color: '#ff4b72' }} onClick={() => handleRemoveFromCart(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>

                <Divider style={{ margin: '16px 0', backgroundColor: 'rgba(255,255,255,0.08)' }} />

                <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="20px">
                  <Typography variant="subtitle1" style={{ fontWeight: 700, color: '#f8fafc' }}>Cart Total</Typography>
                  <Typography variant="h5" style={{ fontWeight: 800, color: '#00f2fe' }}>
                    ${parseFloat(calculateCartTotal()).toFixed(2)}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  disabled={cart.length === 0}
                  onClick={handleCheckout}
                  startIcon={<CheckCircleIcon />}
                  style={{
                    padding: '12px',
                    textTransform: 'none',
                    fontWeight: 800,
                    borderRadius: '12px',
                    backgroundColor: '#00f2fe',
                    color: '#090d16',
                    boxShadow: '0 4px 15px rgba(0, 242, 254, 0.3)'
                  }}
                >
                  Checkout Checkout Invoice
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} md={user.role === 'Selling Place' ? 7 : 12}>
          <TableContainer component={Paper} className="glass-panel" style={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.2)', height: '100%' }}>
            <Box style={{ padding: '24px 24px 8px 24px' }}>
              <Typography variant="h6" style={{ fontWeight: 800, color: '#f8fafc' }}>
                Transaction History
              </Typography>
              <Typography variant="caption" style={{ color: '#94a3b8' }}>
                {user.role === 'Selling Place' 
                  ? 'Historical invoice checkouts and total values' 
                  : 'Sold inventory units across registered selling stores'}
              </Typography>
            </Box>
            <Table className="custom-table" style={{ marginTop: '12px' }}>
              <TableHead>
                {user.role === 'Selling Place' ? (
                  <TableRow>
                    <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Invoice ID</TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Date</TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Items Count</TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Total Amount</TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Product Name</TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Store Name</TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Sold Units</TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Unit Price</TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Subtotal Revenue</TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Sale Date</TableCell>
                  </TableRow>
                )}
              </TableHead>
              <TableBody>
                {salesHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user.role === 'Selling Place' ? 4 : 6} align="center" style={{ padding: '40px', color: '#94a3b8' }}>
                      No transactions recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  salesHistory
                    .filter(row => user.role === 'Selling Place' 
                      ? row.transactionType === 'master_invoice'
                      : row.transactionType === 'item_sale'
                    )
                    .map((row) => (
                      user.role === 'Selling Place' ? (
                        <TableRow key={row.id}>
                          <TableCell style={{ fontFamily: 'monospace', fontWeight: 600, color: '#00f2fe' }}>{row.id.substring(0, 10)}</TableCell>
                          <TableCell style={{ color: '#94a3b8' }}>{new Date(row.createdAt).toLocaleDateString()} {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                          <TableCell style={{ color: '#f8fafc' }}>{row.items?.length || 0} types</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#10b981' }}>
                            ${parseFloat(row.totalAmount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={row.id}>
                          <TableCell style={{ fontWeight: 600, color: '#f8fafc' }}>{row.productName}</TableCell>
                          <TableCell style={{ color: '#cbd5e1' }}>{row.sellingPlaceName}</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>{row.quantity} units</TableCell>
                          <TableCell style={{ color: '#cbd5e1' }}>${parseFloat(row.price).toFixed(2)}</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#10b981' }}>
                            ${parseFloat(row.subtotal).toFixed(2)}
                          </TableCell>
                          <TableCell style={{ color: '#94a3b8' }}>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      )
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Sales;
