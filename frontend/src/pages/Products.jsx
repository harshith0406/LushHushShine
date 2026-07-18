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
  CircularProgress,
  FormHelperText,
  Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AiAgentModal from '../components/AiAgentModal';

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  
  // Modal states
  const [open, setOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  
  // AI Agent Modal State
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [agentType, setAgentType] = useState('');
  const [agentPayload, setAgentPayload] = useState({});
  const [agentTitle, setAgentTitle] = useState('');

  const openAgent = (type, payload, title) => {
    setAgentType(type);
    setAgentPayload(payload);
    setAgentTitle(title);
    setAgentModalOpen(true);
  };
  
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
        // Fallback
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

  const handleOcrFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await API.post('/api/ocr/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data;
      handleOpen();
      // Wait for dialog state initialization before setting values
      setTimeout(() => {
        setValue('name', data.name || '');
        setValue('sku', data.sku || '');
        setValue('price', data.price || 0.0);
        setValue('category', data.category || '');
        setValue('description', data.description || '');
      }, 200);
    } catch (err) {
      setError(err.response?.data?.error || 'OCR vision model scanner failed to analyze image.');
    } finally {
      setOcrLoading(false);
    }
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
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="24px" flexWrap="wrap" gap="16px">
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
          <Box display="flex" gap="12px" alignItems="center">
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="ocr-scan-input"
              type="file"
              onChange={handleOcrFileChange}
              disabled={ocrLoading}
            />
            <label htmlFor="ocr-scan-input">
              <Button
                variant="outlined"
                color="secondary"
                component="span"
                disabled={ocrLoading}
                startIcon={ocrLoading ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon />}
                style={{
                  borderRadius: 'var(--border-radius-sm)',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)'
                }}
              >
                {ocrLoading ? 'Scanning...' : 'OCR Scan Tag'}
              </Button>
            </label>
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
          </Box>
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
              InputLabelProps={{ shrink: true }}
              {...register('name', { required: 'Product name is required' })}
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <Box display="flex" gap="16px">
              <TextField
                label="SKU"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register('sku', { required: 'SKU code is required' })}
                error={!!errors.sku}
                helperText={errors.sku?.message}
              />
              <TextField
                label="Retail Price ($)"
                type="number"
                inputProps={{ step: '0.01', min: '0.01' }}
                InputLabelProps={{ shrink: true }}
                fullWidth
                {...register('price', { required: 'Price is required' })}
                error={!!errors.price}
                helperText={errors.price?.message}
              />
            </Box>

            <TextField
              label="Category"
              fullWidth
              InputLabelProps={{ shrink: true }}
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

            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
                <Typography variant="body2" style={{ color: '#94a3b8' }}>Description</Typography>
                <Button 
                  size="small" 
                  startIcon={<AutoAwesomeIcon />}
                  onClick={() => {
                    const currentName = document.querySelector('input[name="name"]')?.value || 'New Product';
                    const currentDesc = document.querySelector('textarea[name="description"]')?.value || '';
                    openAgent('generate-marketing', { ocr_text: `${currentName}. ${currentDesc}` }, `Generate Marketing Copy`);
                  }}
                  style={{ backgroundColor: 'rgba(217, 70, 239, 0.1)', color: '#d946ef', textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  AI Writer
                </Button>
              </Box>
              <TextField
                multiline
                rows={3}
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register('description')}
              />
            </Box>
          </DialogContent>
          <DialogActions style={{ padding: '16px 24px' }}>
            <Button onClick={handleClose} style={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
            <Button type="submit" variant="contained" style={{ textTransform: 'none', fontWeight: 600, backgroundColor: 'var(--primary)' }}>
              {editProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* AI Agent Modal */}
      <AiAgentModal 
        open={agentModalOpen} 
        onClose={() => setAgentModalOpen(false)}
        onApply={(result) => {
          if (agentType === 'generate-marketing') {
            setValue('description', result);
          }
        }}
        agentType={agentType}
        payload={agentPayload}
        title={agentTitle}
      />
    </Box>
  );
};

export default Products;
