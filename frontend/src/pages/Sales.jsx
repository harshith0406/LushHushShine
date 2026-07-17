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
  CardContent,
  Chip
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
      // Only display products that are in stock
      setProducts(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSalesHistory = async () => {
    try {
      const response = await API.get('/api/sales');
      // Sort: newest first
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

  // Cart operations
  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    // Check if already in cart
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
    
    // Reset inputs
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
      fetchProducts(); // Refresh stock variables
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
        <Typography variant="h4" style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}>
          Sales & Checkout Registers
        </Typography>
        <Typography variant="body2" style={{ color: 'var(--text-secondary)' }}>
          {user.role === 'Selling Place'
            ? 'Ring up checkout sales, record customer invoices, and update inventory rates'
            : 'Track item transaction volume and revenues supplied by your warehouse'}
        </Typography>
      </Box>

      {error && <Alert severity="error" style={{ marginBottom: '24px', borderRadius: 'var(--border-radius-sm)' }}>{error}</Alert>}
      {success && <Alert severity="success" style={{ marginBottom: '24px', borderRadius: 'var(--border-radius-sm)' }}>{success}</Alert>}

      <Grid container spacing={4}>
        {/* Checkout Cart for Selling Place */}
        {user.role === 'Selling Place' && (
          <Grid item xs={12} md={5}>
            <Card className="glass-panel" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', height: '100%' }}>
              <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" style={{ fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AddShoppingCartIcon color="primary" /> POS Register Cart
                </Typography>
                
                <Box display="flex" gap="12px" marginBottom="20px">
                  <FormControl fullWidth size="small">
                    <InputLabel id="pos-product-label">Select Item</InputLabel>
                    <Select
                      labelId="pos-product-label"
                      label="Select Item"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
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
                    inputProps={{ min: 1 }}
                    style={{ width: '80px' }}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))}
                  />

                  <Button 
                    variant="contained" 
                    onClick={handleAddToCart}
                    style={{ textTransform: 'none', backgroundColor: 'var(--primary)', fontWeight: 600 }}
                  >
                    Add
                  </Button>
                </Box>

                <Divider style={{ margin: '12px 0' }} />

                {/* Cart list */}
                <Box style={{ flexGrow: 1, minHeight: '200px', overflowY: 'auto' }}>
                  {cart.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                      <Typography variant="body2" style={{ color: 'var(--text-muted)' }}>Cart is empty</Typography>
                    </Box>
                  ) : (
                    cart.map((item, index) => (
                      <Box 
                        key={index} 
                        display="flex" 
                        justifyContent="space-between" 
                        alignItems="center" 
                        padding="10px 0"
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                      >
                        <Box>
                          <Typography variant="subtitle2" style={{ fontWeight: 600 }}>{item.productName}</Typography>
                          <Typography variant="caption" style={{ color: 'var(--text-secondary)' }}>
                            {item.quantity} x ${parseFloat(item.price).toFixed(2)}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap="8px">
                          <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
                            ${parseFloat(item.subtotal).toFixed(2)}
                          </Typography>
                          <IconButton size="small" color="error" onClick={() => handleRemoveFromCart(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>

                <Divider style={{ margin: '16px 0' }} />

                <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="20px">
                  <Typography variant="subtitle1" style={{ fontWeight: 700 }}>Cart Total</Typography>
                  <Typography variant="h5" style={{ fontWeight: 800, color: 'var(--primary)' }}>
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
                    fontWeight: 700,
                    borderRadius: 'var(--border-radius-sm)',
                    backgroundColor: 'var(--primary)'
                  }}
                >
                  Checkout Checkout Invoice
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Sales Logs */}
        <Grid item xs={12} md={user.role === 'Selling Place' ? 7 : 12}>
          <TableContainer component={Paper} className="glass-panel" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', height: '100%' }}>
            <Box style={{ padding: '24px 24px 8px 24px' }}>
              <Typography variant="h6" style={{ fontWeight: 700 }}>
                Transaction History
              </Typography>
              <Typography variant="caption" style={{ color: 'var(--text-secondary)' }}>
                {user.role === 'Selling Place' 
                  ? 'Historical invoice checkouts and total values' 
                  : 'Sold inventory units across registered selling stores'}
              </Typography>
            </Box>
            <Table className="custom-table" style={{ marginTop: '12px' }}>
              <TableHead>
                {user.role === 'Selling Place' ? (
                  <TableRow>
                    <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Invoice ID</TableCell>
                    <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Date</TableCell>
                    <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Items Count</TableCell>
                    <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Total Amount</TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Product Name</TableCell>
                    <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Store Name</TableCell>
                    <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Sold Units</TableCell>
                    <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Unit Price</TableCell>
                    <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Subtotal Revenue</TableCell>
                    <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Sale Date</TableCell>
                  </TableRow>
                )}
              </TableHead>
              <TableBody>
                {salesHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user.role === 'Selling Place' ? 4 : 6} align="center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
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
                          <TableCell style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.id.substring(0, 10)}</TableCell>
                          <TableCell>{new Date(row.createdAt).toLocaleDateString()} {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                          <TableCell>{row.items?.length || 0} types</TableCell>
                          <TableCell style={{ fontWeight: 700, color: 'var(--success)' }}>
                            ${parseFloat(row.totalAmount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={row.id}>
                          <TableCell style={{ fontWeight: 600 }}>{row.productName}</TableCell>
                          <TableCell>{row.sellingPlaceName}</TableCell>
                          <TableCell style={{ fontWeight: 700 }}>{row.quantity} units</TableCell>
                          <TableCell>${parseFloat(row.price).toFixed(2)}</TableCell>
                          <TableCell style={{ fontWeight: 700, color: 'var(--success)' }}>
                            ${parseFloat(row.subtotal).toFixed(2)}
                          </TableCell>
                          <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
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
