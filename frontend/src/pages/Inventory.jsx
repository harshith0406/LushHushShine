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
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Grid,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const Inventory = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dialog States
  const [editOpen, setEditOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  const fetchInventory = async () => {
    try {
      const response = await API.get('/api/inventory');
      setInventory(response.data);
    } catch (err) {
      setError('Failed to load inventory levels');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchInventory();
      setLoading(false);
    };
    init();
  }, [user]);

  const handleEditOpen = (item) => {
    setSelectedItem(item);
    setValue('stock', item.stock);
    setValue('reorderPoint', item.reorderPoint);
    setValue('averageDailySales', item.averageDailySales);
    setValue('standardDeviation', item.standardDeviation || 1.0);
    setValue('leadTimeDays', item.leadTimeDays || 5);
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setSelectedItem(null);
  };

  const handleAiOpen = async (item) => {
    setSelectedItem(item);
    setAiOpen(true);
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await API.post('/api/analytics/optimize-inventory', {
        productId: item.productId
      });
      setAiResult(response.data);
    } catch (err) {
      setError('AI optimization server failed to respond.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiClose = () => {
    setAiOpen(false);
    setSelectedItem(null);
    setAiResult(null);
  };

  const onEditSubmit = async (data) => {
    try {
      const payload = {
        stock: parseInt(data.stock),
        reorderPoint: parseInt(data.reorderPoint),
        averageDailySales: parseFloat(data.averageDailySales),
        standardDeviation: parseFloat(data.standardDeviation),
        leadTimeDays: parseInt(data.leadTimeDays)
      };
      await API.put(`/api/inventory/${selectedItem.productId}`, payload);
      fetchInventory();
      handleEditClose();
    } catch (err) {
      setError('Failed to update inventory details');
    }
  };

  const handleApplyAi = async () => {
    if (!aiResult || !selectedItem) return;
    try {
      const payload = {
        reorderPoint: aiResult.reorder_point,
      };
      await API.put(`/api/inventory/${selectedItem.productId}`, payload);
      fetchInventory();
      handleAiClose();
    } catch (err) {
      setError('Failed to apply AI recommendations');
    }
  };

  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorsList, setVendorsList] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);

  const fetchVendorsList = async () => {
    try {
      let mockList = [
        { id: 'v1', companyName: 'Nexus Supply Co.', userName: 'Alex Vendor', email: 'vendor_thwn@test.com', phone: '9876543210', address: '500 Logistics Way' },
        { id: 'v2', companyName: 'Apex Distributions', userName: 'Shreya', email: 'Reemagjack@gmail.com', phone: '6752894270', address: 'Hosahalli area' }
      ];
      try {
        const response = await API.get('/api/auth/vendors');
        if (response.data && response.data.length > 0) {
          mockList = response.data;
        }
      } catch (e) {
        // fallback
      }
      setVendorsList(mockList);
      setFilteredVendors(mockList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchVendorsList();
  }, []);

  const handleVendorSearchChange = (e) => {
    const term = e.target.value;
    setVendorSearch(term);
    if (!term.trim()) {
      setFilteredVendors(vendorsList);
    } else {
      const lower = term.toLowerCase();
      const filtered = vendorsList.filter(v => 
        v.companyName?.toLowerCase().includes(lower) || 
        v.userName?.toLowerCase().includes(lower) ||
        v.address?.toLowerCase().includes(lower)
      );
      setFilteredVendors(filtered);
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
      <Box marginBottom="24px">
        <Typography variant="h4" className="gradient-text" style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}>
          Inventory Management
        </Typography>
        <Typography variant="body2" style={{ color: '#94a3b8', marginTop: '4px' }}>
          {user.role === 'Selling Place'
            ? 'Monitor stock buffers, safety points, and run AI Economic Order Quantity (EOQ) optimizations'
            : 'Track inventory logs of your supplied items at customer retail stores'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" style={{ marginBottom: '24px', borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} className="glass-panel" style={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.2)', marginBottom: '40px' }}>
        <Table className="custom-table">
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Product Name</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>SKU / Item ID</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Batch No</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Total Stocked</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Sold Units</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Available Stock</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Reorder Point</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Daily Sales Rate</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Stock Status</TableCell>
              {user.role === 'Selling Place' && (
                <TableCell align="right" style={{ fontWeight: 700, color: '#94a3b8' }}>Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={user.role === 'Selling Place' ? 10 : 9} align="center" style={{ padding: '40px', color: '#94a3b8' }}>
                  No inventory logs found. Create a product first!
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((row) => {
                const isOutOfStock = row.availableQty === 0 || row.stock === 0;
                const reorder = row.reorderPoint !== undefined ? row.reorderPoint : 10;
                const currentStock = row.availableQty !== undefined ? row.availableQty : row.stock;
                const isLowStock = currentStock <= reorder;
                
                return (
                  <TableRow key={row.id}>
                    <TableCell style={{ fontWeight: 600, color: '#f8fafc' }}>{row.productName}</TableCell>
                    <TableCell style={{ color: '#cbd5e1' }}>{row.sku || row.itemNbr}</TableCell>
                    <TableCell style={{ fontFamily: 'monospace', fontWeight: 600, color: '#d946ef' }}>
                      {row.batchNo || 'B-GEN-888'}
                    </TableCell>
                    <TableCell style={{ color: '#f8fafc' }}>{row.totalQty !== undefined ? row.totalQty : currentStock} units</TableCell>
                    <TableCell style={{ color: '#cbd5e1' }}>{row.soldQty || 0} units</TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>{currentStock} units</TableCell>
                    <TableCell style={{ color: '#f8fafc' }}>{reorder} units</TableCell>
                    <TableCell style={{ color: '#cbd5e1' }}>{row.averageDailySales?.toFixed(1) || '0.0'} units/day</TableCell>
                    <TableCell>
                      {isOutOfStock ? (
                        <Chip label="Out of Stock" color="error" size="small" style={{ fontWeight: 600 }} />
                      ) : isLowStock ? (
                        <Chip label="Low Stock" color="warning" size="small" style={{ fontWeight: 600 }} />
                      ) : (
                        <Chip label="Optimal" color="success" size="small" style={{ fontWeight: 600 }} />
                      )}
                    </TableCell>
                    {user.role === 'Selling Place' && (
                      <TableCell align="right">
                        <Tooltip title="Run AI Stock Optimization">
                          <IconButton 
                            style={{ color: '#d946ef', marginRight: '8px' }}
                            onClick={() => handleAiOpen(row)}
                          >
                            <AutoAwesomeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Update Metrics">
                          <IconButton style={{ color: '#00f2fe' }} onClick={() => handleEditOpen(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Vendor Search Utility Panel */}
      <Paper className="glass-panel" style={{ padding: '24px', backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.2)', marginBottom: '40px' }}>
        <Typography variant="h6" style={{ fontWeight: 800, marginBottom: '4px', color: '#f8fafc' }}>
          Vendor Contacts & Physical Addresses
        </Typography>
        <Typography variant="body2" style={{ color: '#94a3b8', marginBottom: '20px' }}>
          Quickly find supplying vendors and contact details for restock orders.
        </Typography>

        <TextField
          placeholder="Search suppliers by name, address, or manager..."
          variant="outlined"
          size="small"
          fullWidth
          value={vendorSearch}
          onChange={handleVendorSearchChange}
          style={{ marginBottom: '24px' }}
          InputProps={{
            style: { backgroundColor: '#162032', color: '#fff', borderRadius: '10px' }
          }}
        />

        <Grid container spacing={3}>
          {filteredVendors.length === 0 ? (
            <Grid item xs={12}>
              <Typography variant="body2" style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
                No matching supplying vendors found in catalog database.
              </Typography>
            </Grid>
          ) : (
            filteredVendors.map(vendor => (
              <Grid item xs={12} sm={6} md={4} key={vendor.id}>
                <Card style={{ backgroundColor: '#162032', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '14px' }}>
                  <CardContent style={{ padding: '20px' }}>
                    <Typography variant="subtitle1" style={{ fontWeight: 800, color: '#00f2fe' }}>
                      {vendor.companyName}
                    </Typography>
                    <Typography variant="body2" style={{ fontWeight: 600, color: '#f8fafc', marginTop: '8px' }}>
                      Contact Manager: {vendor.userName}
                    </Typography>
                    <Typography variant="body2" style={{ color: '#cbd5e1', marginTop: '4px' }}>
                      Phone: <span style={{ color: '#4ade80', fontWeight: 600 }}>{vendor.phone || '9876543210'}</span>
                    </Typography>
                    <Typography variant="body2" style={{ color: '#cbd5e1', marginTop: '2px' }}>
                      Email: <span style={{ color: '#38bdf8' }}>{vendor.email || 'vendor@test.com'}</span>
                    </Typography>
                    <Typography variant="caption" style={{ color: '#94a3b8', display: 'block', marginTop: '10px' }}>
                      Address: {vendor.address || '500 Logistics Way'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={handleEditClose} maxWidth="xs" fullWidth>
        <DialogTitle style={{ fontWeight: 800, backgroundColor: '#101726', color: '#f8fafc' }}>
          Update Stock & Parameters
        </DialogTitle>
        <form onSubmit={handleSubmit(onEditSubmit)}>
          <DialogContent style={{ backgroundColor: '#101726', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Typography variant="subtitle2" style={{ color: '#94a3b8' }}>
              Product: <span style={{ fontWeight: 700, color: '#00f2fe' }}>{selectedItem?.productName}</span>
            </Typography>

            <TextField
              label="Stock Level"
              type="number"
              fullWidth
              {...register('stock', { required: 'Stock is required', min: 0 })}
              error={!!errors.stock}
              helperText={errors.stock?.message}
              InputProps={{ style: { backgroundColor: '#162032', color: '#fff' } }}
            />

            <TextField
              label="Reorder Threshold"
              type="number"
              fullWidth
              {...register('reorderPoint', { required: 'Reorder point is required', min: 0 })}
              error={!!errors.reorderPoint}
              helperText={errors.reorderPoint?.message}
              InputProps={{ style: { backgroundColor: '#162032', color: '#fff' } }}
            />
          </DialogContent>
          <DialogActions style={{ padding: '16px 24px', backgroundColor: '#101726' }}>
            <Button onClick={handleEditClose} style={{ textTransform: 'none', color: '#94a3b8' }}>Cancel</Button>
            <Button type="submit" variant="contained" style={{ textTransform: 'none', backgroundColor: '#00f2fe', color: '#090d16', fontWeight: 700 }}>
              Save Changes
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Inventory;
