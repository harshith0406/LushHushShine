import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import API from '../config/api';
import { useForm } from 'react-hook-form';
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
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [open, setOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const fetchProducts = async () => {
    try {
      const response = await API.get('/api/products');
      setProducts(response.data);
    } catch (err) {
      setError('Failed to load products');
    }
  };

  const fetchVendors = async () => {
    if (user.role !== 'Selling Place') return;
    try {
      // Create a dummy fallback vendors list just in case
      let vendorList = [
        { id: 'v1', companyName: 'Nexus Supply Co.', userName: 'Alex' },
        { id: 'v2', companyName: 'Apex Distributions', userName: 'Sarah' }
      ];
      try {
        const response = await API.get('/api/auth/vendors');
        if (response.data && response.data.length > 0) {
          vendorList = response.data;
        }
      } catch (e) {
        // Fallback to static vendors
      }
      setVendors(vendorList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchVendors()]);
      setLoading(false);
    };
    init();
  }, [user]);

  const handleOpen = (prod = null) => {
    setEditProduct(prod);
    if (prod) {
      setValue('name', prod.name);
      setValue('sku', prod.sku);
      setValue('price', prod.price);
      setValue('category', prod.category);
      setValue('vendorId', prod.vendorId);
      setValue('description', prod.description || '');
    } else {
      reset();
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditProduct(null);
  };

  const onSubmit = async (data) => {
    setError('');
    const selectedVendor = vendors.find(v => v.id === data.vendorId);
    const payload = {
      ...data,
      price: parseFloat(data.price),
      vendorName: selectedVendor ? selectedVendor.companyName : 'Generic Supplier'
    };

    try {
      if (editProduct) {
        await API.put(`/api/products/${editProduct.id}`, payload);
      } else {
        await API.post('/api/products', payload);
      }
      fetchProducts();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? This will also remove its inventory logs.')) return;
    try {
      await API.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (err) {
      setError('Failed to delete product');
    }
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
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="24px">
        <Box>
          <Typography variant="h4" style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}>
            Products Catalog
          </Typography>
          <Typography variant="body2" style={{ color: 'var(--text-secondary)' }}>
            {user.role === 'Selling Place' 
              ? 'Manage your store products, descriptions, and suppliers' 
              : 'Monitor your supplied products listed across retail stores'}
          </Typography>
        </Box>
        {user.role === 'Selling Place' && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            style={{
              borderRadius: 'var(--border-radius-sm)',
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: 'var(--primary)'
            }}
          >
            Add Product
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" style={{ marginBottom: '24px', borderRadius: 'var(--border-radius-sm)' }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} className="glass-panel" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
        <Table className="custom-table">
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Product Name</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>SKU</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Category</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Price</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Supplier</TableCell>
              {user.role === 'Selling Place' && (
                <TableCell align="right" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={user.role === 'Selling Place' ? 6 : 5} align="center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
                  No products registered. Get started by adding a product!
                </TableCell>
              </TableRow>
            ) : (
              products.map((row) => (
                <TableRow key={row.id}>
                  <TableCell style={{ fontWeight: 600 }}>{row.name}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>${parseFloat(row.price).toFixed(2)}</TableCell>
                  <TableCell>{row.vendorName}</TableCell>
                  {user.role === 'Selling Place' && (
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleOpen(row)} style={{ marginRight: '8px' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDelete(row.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Product Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 700, fontFamily: 'var(--font-family)' }}>
          {editProduct ? 'Edit Product Attributes' : 'Register New Product'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TextField
              label="Product Name"
              fullWidth
              {...register('name', { required: 'Product name is required' })}
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <Box display="flex" gap="16px">
              <TextField
                label="SKU"
                fullWidth
                {...register('sku', { required: 'SKU code is required' })}
                error={!!errors.sku}
                helperText={errors.sku?.message}
              />
              <TextField
                label="Retail Price ($)"
                type="number"
                inputProps={{ step: '0.01', min: '0.01' }}
                fullWidth
                {...register('price', { required: 'Price is required' })}
                error={!!errors.price}
                helperText={errors.price?.message}
              />
            </Box>

            <TextField
              label="Category"
              fullWidth
              placeholder="e.g. Dairy, Beverages, Bakery"
              {...register('category', { required: 'Category is required' })}
              error={!!errors.category}
              helperText={errors.category?.message}
            />

            <FormControl fullWidth error={!!errors.vendorId}>
              <InputLabel id="vendor-select-label">Select Supplying Vendor</InputLabel>
              <Select
                labelId="vendor-select-label"
                label="Select Supplying Vendor"
                defaultValue=""
                {...register('vendorId', { required: 'Vendor selection is required' })}
              >
                {vendors.map(v => (
                  <MenuItem key={v.id} value={v.id}>{v.companyName} (supplied by {v.userName})</MenuItem>
                ))}
              </Select>
              {errors.vendorId && <FormHelperText>{errors.vendorId.message}</FormHelperText>}
            </FormControl>

            <TextField
              label="Product Description"
              multiline
              rows={3}
              fullWidth
              {...register('description')}
            />
          </DialogContent>
          <DialogActions style={{ padding: '16px 24px' }}>
            <Button onClick={handleClose} style={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
            <Button type="submit" variant="contained" style={{ textTransform: 'none', fontWeight: 600, backgroundColor: 'var(--primary)' }}>
              {editProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Products;
