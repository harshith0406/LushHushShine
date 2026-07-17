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
        // Keep existing stock & metrics, just apply optimal reorder point
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
        { id: 'v1', companyName: 'Nexus Supply Co.', userName: 'Alex', email: 'alex@nexus.com', phone: '9876543210', address: '456 Warehouse Ave' },
        { id: 'v2', companyName: 'Apex Distributions', userName: 'Sarah', email: 'sarah@apex.com', phone: '6752894270', address: 'Hosahalli area' }
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
        <Typography variant="h4" style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}>
          Inventory Management
        </Typography>
        <Typography variant="body2" style={{ color: 'var(--text-secondary)' }}>
          {user.role === 'Selling Place'
            ? 'Monitor stock, configure safety limits, and run AI-based Economic Order Quantity (EOQ) optimizations'
            : 'Track inventory logs of your supplied items at customer retail stores'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" style={{ marginBottom: '24px', borderRadius: 'var(--border-radius-sm)' }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} className="glass-panel" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: '40px' }}>
        <Table className="custom-table">
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Product Name</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>SKU / Item ID</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Batch No</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Total Stocked</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Sold Units</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Available Stock</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Reorder Point</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Daily Sales Rate</TableCell>
              <TableCell style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Stock Status</TableCell>
              {user.role === 'Selling Place' && (
                <TableCell align="right" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={user.role === 'Selling Place' ? 10 : 9} align="center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
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
                    <TableCell style={{ fontWeight: 600 }}>{row.productName}</TableCell>
                    <TableCell>{row.sku || row.itemNbr}</TableCell>
                    <TableCell style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>
                      {row.batchNo || 'B-DEFAULT'}
                    </TableCell>
                    <TableCell>{row.totalQty !== undefined ? row.totalQty : currentStock} units</TableCell>
                    <TableCell>{row.soldQty || 0} units</TableCell>
                    <TableCell style={{ fontWeight: 700 }}>{currentStock} units</TableCell>
                    <TableCell>{reorder} units</TableCell>
                    <TableCell>{row.averageDailySales?.toFixed(1) || '0.0'} units/day</TableCell>
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
                            style={{ color: '#c084fc', marginRight: '8px' }}
                            onClick={() => handleAiOpen(row)}
                          >
                            <AutoAwesomeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Update Metrics">
                          <IconButton color="primary" onClick={() => handleEditOpen(row)}>
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
      <Paper className="glass-panel" style={{ padding: '24px', backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: '40px' }}>
        <Typography variant="h6" style={{ fontWeight: 700, marginBottom: '8px' }}>
          Vendor Contacts & Physical Addresses
        </Typography>
        <Typography variant="body2" color="var(--text-secondary)" style={{ marginBottom: '20px' }}>
          Quickly find supplying vendors and contact details for items requested by consumers.
        </Typography>

        <TextField
          label="Search suppliers by name, address, or manager..."
          variant="outlined"
          size="small"
          fullWidth
          value={vendorSearch}
          onChange={handleVendorSearchChange}
          style={{ marginBottom: '24px' }}
        />

        <Grid container spacing={3}>
          {filteredVendors.length === 0 ? (
            <Grid item xs={12}>
              <Typography variant="body2" color="var(--text-muted)" align="center" style={{ padding: '20px' }}>
                No matching supplying vendors found in catalog database.
              </Typography>
            </Grid>
          ) : (
            filteredVendors.map(vendor => (
              <Grid item xs={12} sm={6} md={4} key={vendor.id}>
                <Card style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                  <CardContent>
                    <Typography variant="subtitle1" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {vendor.companyName}
                    </Typography>
                    <Typography variant="body2" style={{ fontWeight: 550, marginTop: '8px' }}>
                      Contact Manager: {vendor.userName}
                    </Typography>
                    <Typography variant="body2" color="var(--text-secondary)" style={{ marginTop: '4px' }}>
                      Phone: {vendor.phone || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="var(--text-secondary)" style={{ marginTop: '2px' }}>
                      Email: {vendor.email || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="var(--text-muted)" style={{ display: 'block', marginTop: '10px' }}>
                      Warehouse Address: {vendor.address || 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Paper>

      {/* Edit Inventory Dialog */}
      <Dialog open={editOpen} onClose={handleEditClose} maxWidth="xs" fullWidth>
        <DialogTitle style={{ fontWeight: 700, fontFamily: 'var(--font-family)' }}>
          Update Stock & Parameters
        </DialogTitle>
        <form onSubmit={handleSubmit(onEditSubmit)}>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Typography variant="subtitle2" color="var(--text-secondary)">
              Product: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedItem?.productName}</span>
            </Typography>

            <TextField
              label="Stock Level"
              type="number"
              fullWidth
              {...register('stock', { required: 'Stock is required', min: 0 })}
              error={!!errors.stock}
              helperText={errors.stock?.message}
            />

            <TextField
              label="Reorder Threshold"
              type="number"
              fullWidth
              {...register('reorderPoint', { required: 'Reorder point is required', min: 0 })}
              error={!!errors.reorderPoint}
              helperText={errors.reorderPoint?.message}
            />

            <Typography variant="body2" style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>
              Advanced AI Optimization Parameters
            </Typography>

            <TextField
              label="Lead Time (Days)"
              type="number"
              fullWidth
              {...register('leadTimeDays', { required: 'Lead time is required', min: 1 })}
              error={!!errors.leadTimeDays}
              helperText={errors.leadTimeDays?.message}
            />

            <TextField
              label="Average Daily Sales (Units)"
              type="number"
              inputProps={{ step: '0.1' }}
              fullWidth
              {...register('averageDailySales', { required: 'Average sales are required', min: 0 })}
              error={!!errors.averageDailySales}
              helperText={errors.averageDailySales?.message}
            />

            <TextField
              label="Demand Std. Deviation"
              type="number"
              inputProps={{ step: '0.1' }}
              fullWidth
              {...register('standardDeviation', { required: 'Std deviation is required', min: 0 })}
              error={!!errors.standardDeviation}
              helperText={errors.standardDeviation?.message}
            />
          </DialogContent>
          <DialogActions style={{ padding: '16px 24px' }}>
            <Button onClick={handleEditClose} style={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
            <Button type="submit" variant="contained" style={{ textTransform: 'none', fontWeight: 600, backgroundColor: 'var(--primary)' }}>
              Save Changes
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* AI Stock Optimization Dialog */}
      <Dialog open={aiOpen} onClose={handleAiClose} maxWidth="sm" fullWidth>
        <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#c084fc' }}>
          <AutoAwesomeIcon /> AI Inventory Optimization Assistant
        </DialogTitle>
        <DialogContent>
          {aiLoading ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap="16px" padding="30px">
              <CircularProgress color="secondary" />
              <Typography variant="body2" style={{ color: 'var(--text-secondary)' }}>
                Running statistical modeling & EOQ calculations...
              </Typography>
            </Box>
          ) : aiResult ? (
            <Box display="flex" flexDirection="column" gap="20px">
              <Typography variant="body2" style={{ color: 'var(--text-secondary)' }}>
                Calculated metrics for <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedItem?.productName}</span> based on a 95% service level factor.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <CardContent style={{ textAlign: 'center', padding: '16px' }}>
                      <Typography variant="caption" color="var(--text-secondary)" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                        Safety Stock
                      </Typography>
                      <Typography variant="h5" color="primary" style={{ fontWeight: 800, marginTop: '8px' }}>
                        {aiResult.safety_stock} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>units</span>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Card style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <CardContent style={{ textAlign: 'center', padding: '16px' }}>
                      <Typography variant="caption" color="var(--text-secondary)" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                        Reorder Point
                      </Typography>
                      <Typography variant="h5" color="secondary" style={{ fontWeight: 800, marginTop: '8px' }}>
                        {aiResult.reorder_point} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>units</span>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Card style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <CardContent style={{ textAlign: 'center', padding: '16px' }}>
                      <Typography variant="caption" color="var(--text-secondary)" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                        Optimal EOQ
                      </Typography>
                      <Typography variant="h5" style={{ color: '#34d399', fontWeight: 800, marginTop: '8px' }}>
                        {aiResult.economic_order_quantity} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>units</span>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box style={{ backgroundColor: 'var(--primary-glow)', padding: '16px', borderRadius: 'var(--border-radius-sm)', border: '1px dashed var(--primary)' }}>
                <Typography variant="subtitle2" style={{ fontWeight: 700, color: 'var(--primary)' }} gutterBottom>
                  AI Recommendations:
                </Typography>
                <Typography variant="body2" style={{ color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  The model recommends setting your restock reorder threshold to <strong>{aiResult.reorder_point} units</strong>. When stock falls to this level, place a purchase order of <strong>{aiResult.economic_order_quantity} units</strong> (EOQ) from supplier <strong>{selectedItem?.vendorName}</strong>. This balances order setups costs vs holding costs and guarantees a 95% service rate.
                </Typography>
              </Box>
            </Box>
          ) : (
            <Alert severity="error">Failed to calculate recommendations. Verify Python AI service is running.</Alert>
          )}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={handleAiClose} style={{ textTransform: 'none', fontWeight: 600 }}>Close</Button>
          {!aiLoading && aiResult && (
            <Button 
              onClick={handleApplyAi} 
              variant="contained" 
              style={{ textTransform: 'none', fontWeight: 600, backgroundColor: 'var(--primary)' }}
            >
              Apply AI Reorder Threshold
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;
