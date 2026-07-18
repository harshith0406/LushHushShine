import React, { useState, useEffect, useMemo } from 'react';
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
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
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

  // New analytics states
  const [abcData, setAbcData] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [marginData, setMarginData] = useState([]);
  const [filterTab, setFilterTab] = useState('All');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  const fetchInventory = async () => {
    try {
      const response = await API.get('/api/inventory');
      setInventory(response.data || []);
    } catch (err) {
      setError('Failed to load inventory levels');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [abcRes, riskRes, marginRes] = await Promise.all([
        API.get('/api/analytics/abc-xyz').catch(() => ({ data: [] })),
        API.get('/api/analytics/stockout-risk').catch(() => ({ data: [] })),
        API.get('/api/analytics/margin-health').catch(() => ({ data: [] }))
      ]);
      const getArr = (d, k1, k2) => Array.isArray(d?.[k1]) ? d[k1] : (Array.isArray(d?.[k2]) ? d[k2] : (Array.isArray(d) ? d : []));
      setAbcData(getArr(abcRes.data, 'classifications'));
      setRiskData(getArr(riskRes.data, 'stockout_risks', 'risk_breakdown'));
      setMarginData(getArr(marginRes.data, 'margin_health', 'products'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchInventory();
      await fetchAnalytics();
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

  const abcMap = useMemo(() => {
    const map = {};
    abcData.forEach(d => {
      map[d.productId] = { class: d.abc_class || d.classification, revenue: d.revenue_contribution || d.revenueContribution || 0 };
    });
    return map;
  }, [abcData]);

  const riskMap = useMemo(() => {
    const map = {};
    riskData.forEach(d => {
      map[d.productId] = d.riskLevel || d.risk_level;
    });
    return map;
  }, [riskData]);

  const enhancedInventory = useMemo(() => {
    return inventory.map(row => {
      const currentStock = row.availableQty !== undefined ? row.availableQty : row.stock;
      const reorder = row.reorderPoint !== undefined ? row.reorderPoint : 10;
      
      const daysRemaining = row.averageDailySales > 0 ? currentStock / row.averageDailySales : 999;
      const isGhost = (row.soldQty === 0 && currentStock > 0);
      
      return {
        ...row,
        currentStock,
        reorder,
        daysRemaining,
        isGhost,
        isLowStock: currentStock <= reorder,
        isOutOfStock: currentStock === 0,
        abcClass: abcMap[row.productId]?.class || 'C',
        riskLevel: riskMap[row.productId] || 'SAFE'
      };
    });
  }, [inventory, abcMap, riskMap]);

  const filteredInventory = useMemo(() => {
    if (filterTab === 'All') return enhancedInventory;
    if (filterTab === 'Ghost SKUs') return enhancedInventory.filter(i => i.isGhost);
    if (filterTab === 'Critical Risk') return enhancedInventory.filter(i => i.riskLevel === 'CRITICAL');
    if (filterTab === 'Low Stock') return enhancedInventory.filter(i => i.isLowStock || i.isOutOfStock);
    if (filterTab === 'Healthy') return enhancedInventory.filter(i => !i.isLowStock && !i.isOutOfStock && !i.isGhost && i.riskLevel !== 'CRITICAL');
    return enhancedInventory;
  }, [enhancedInventory, filterTab]);

  const stats = useMemo(() => {
    const critical = enhancedInventory.filter(i => i.riskLevel === 'CRITICAL').length;
    const ghost = enhancedInventory.filter(i => i.isGhost).length;
    let avgMargin = 0;
    if (marginData.length > 0) {
      avgMargin = marginData.reduce((sum, item) => sum + (item.margin_pct || item.marginPercent || 0), 0) / marginData.length;
    }
    return { critical, ghost, avgMargin };
  }, [enhancedInventory, marginData]);

  // ABC Groups
  const abcGroups = useMemo(() => {
    const groups = { A: [], B: [], C: [] };
    let totalRev = 0;
    abcData.forEach(d => {
      const cls = (d.abc_class || d.classification || 'C').charAt(0);
      if (groups[cls]) {
        groups[cls].push(d);
        totalRev += (d.revenue_contribution || d.revenueContribution || 0);
      }
    });
    return { groups, totalRev };
  }, [abcData]);

  const getAbcColor = (cls) => {
    if (cls.startsWith('A')) return '#f59e0b';
    if (cls.startsWith('B')) return '#00f2fe';
    return '#64748b';
  };

  const getRiskColor = (risk) => {
    if (risk === 'CRITICAL') return 'error';
    if (risk === 'WARNING') return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress style={{ color: '#00f2fe' }} />
      </Box>
    );
  }

  return (
    <Box className="fade-in" sx={{ paddingBottom: '40px' }}>
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

      {/* AI Summary Strip */}
      <Paper className="glass-panel" style={{ padding: '16px 24px', backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.2)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <AutoAwesomeIcon style={{ color: '#00f2fe' }} />
        <Typography variant="body1" style={{ color: '#f8fafc', fontWeight: 600 }}>
          AI Insights: <span style={{ color: '#ff4b72' }}>{stats.critical} items critical risk</span> | <span style={{ color: '#f59e0b' }}>{stats.ghost} ghost SKUs</span> | <span style={{ color: '#10b981' }}>Avg margin {stats.avgMargin.toFixed(1)}%</span>
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" style={{ marginBottom: '24px', borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(0, 242, 254, 0.2)', marginBottom: '20px' }}>
        <Tabs value={filterTab} onChange={(e, val) => setFilterTab(val)} textColor="inherit" TabIndicatorProps={{ style: { backgroundColor: '#00f2fe' } }}>
          {['All', 'Ghost SKUs', 'Critical Risk', 'Low Stock', 'Healthy'].map(t => (
            <Tab key={t} label={t} value={t} style={{ color: filterTab === t ? '#00f2fe' : '#94a3b8', fontWeight: 600, textTransform: 'none' }} />
          ))}
        </Tabs>
      </Box>

      <TableContainer component={Paper} className="glass-panel" style={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.2)', marginBottom: '40px' }}>
        <Table className="custom-table" size="small">
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Product</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Class</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Batch No</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Stock</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Days Rem</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Risk</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Status</TableCell>
              {user.role === 'Selling Place' && (
                <TableCell align="right" style={{ fontWeight: 700, color: '#94a3b8' }}>Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" style={{ padding: '40px', color: '#94a3b8' }}>
                  No items match this filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredInventory.map((row) => {
                let daysColor = '#10b981';
                if (row.daysRemaining < 5) daysColor = '#ff4b72';
                else if (row.daysRemaining < 14) daysColor = '#f59e0b';

                return (
                  <TableRow key={row.id}>
                    <TableCell style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {row.productName} 
                      {row.isGhost && (
                        <Tooltip title="Dead Stock Detected">
                          <span style={{ marginLeft: '8px', cursor: 'help' }}>👻</span>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={row.abcClass} size="small" style={{ backgroundColor: getAbcColor(row.abcClass), color: '#090d16', fontWeight: 800 }} />
                    </TableCell>
                    <TableCell style={{ fontFamily: 'monospace', fontWeight: 600, color: '#d946ef' }}>
                      {row.batchNo || 'B-GEN-888'}
                    </TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>
                      {row.currentStock} / {row.reorder}
                    </TableCell>
                    <TableCell style={{ color: daysColor, fontWeight: 700 }}>
                      {row.daysRemaining === 999 ? '∞' : row.daysRemaining.toFixed(1)} d
                    </TableCell>
                    <TableCell>
                      <Chip label={row.riskLevel} color={getRiskColor(row.riskLevel)} size="small" style={{ fontWeight: 600, fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell>
                      {row.isOutOfStock ? (
                        <Chip label="Out of Stock" color="error" size="small" variant="outlined" style={{ fontWeight: 600 }} />
                      ) : row.isLowStock ? (
                        <Chip label="Low Stock" color="warning" size="small" variant="outlined" style={{ fontWeight: 600 }} />
                      ) : (
                        <Chip label="Optimal" color="success" size="small" variant="outlined" style={{ fontWeight: 600 }} />
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

      {/* ABC Intelligence Panel */}
      <Typography variant="h5" style={{ color: '#f8fafc', fontWeight: 700, marginBottom: '16px' }}>ABC Intelligence</Typography>
      <Grid container spacing={3} style={{ marginBottom: '40px' }}>
        {['A', 'B', 'C'].map(cls => {
          const group = abcGroups.groups[cls];
          const groupRev = group.reduce((sum, item) => sum + (item.revenue_contribution || item.revenueContribution || 0), 0);
          const pct = abcGroups.totalRev > 0 ? ((groupRev / abcGroups.totalRev) * 100).toFixed(1) : 0;
          
          let cardStyle = { backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.2)', height: '100%' };
          let titleColor = getAbcColor(cls);
          if (cls === 'A') {
            cardStyle.background = 'linear-gradient(145deg, rgba(245, 158, 11, 0.1) 0%, #101726 100%)';
            cardStyle.borderColor = 'rgba(245, 158, 11, 0.3)';
          } else if (cls === 'B') {
            cardStyle.background = 'linear-gradient(145deg, rgba(0, 242, 254, 0.1) 0%, #101726 100%)';
          } else {
            cardStyle.background = 'linear-gradient(145deg, rgba(100, 116, 139, 0.1) 0%, #101726 100%)';
            cardStyle.borderColor = 'rgba(100, 116, 139, 0.3)';
          }

          return (
            <Grid item xs={12} md={4} key={cls}>
              <Card style={cardStyle} className="glass-panel">
                <CardContent>
                  <Typography variant="h6" style={{ color: titleColor, fontWeight: 800, marginBottom: '8px' }}>
                    Class {cls}
                  </Typography>
                  <Typography variant="body2" style={{ color: '#94a3b8', marginBottom: '16px' }}>
                    {pct}% of Total Revenue
                  </Typography>
                  <Box style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {group.map((item, idx) => (
                      <Box key={idx} display="flex" justifyContent="space-between" marginBottom="8px">
                        <Typography variant="body2" style={{ color: '#f8fafc' }}>{item.productName || item.name || `Product ${item.productId}`}</Typography>
                        <Typography variant="body2" style={{ color: '#cbd5e1', fontWeight: 600 }}>${(item.revenue_contribution || item.revenueContribution || 0).toLocaleString()}</Typography>
                      </Box>
                    ))}
                    {group.length === 0 && <Typography variant="body2" style={{ color: '#64748b' }}>No items</Typography>}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
      
      <Paper className="glass-panel" style={{ padding: '24px', backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.2)', marginBottom: '40px' }}>
        <Typography variant="h6" style={{ fontWeight: 800, marginBottom: '20px', color: '#f8fafc' }}>
          Revenue Contribution Breakdown
        </Typography>
        <Box height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Class A', value: abcGroups.groups['A'].reduce((s, i) => s + (i.revenue_contribution || i.revenueContribution || 0), 0) + 0.0001 },
                  { name: 'Class B', value: abcGroups.groups['B'].reduce((s, i) => s + (i.revenue_contribution || i.revenueContribution || 0), 0) + 0.0001 },
                  { name: 'Class C', value: abcGroups.groups['C'].reduce((s, i) => s + (i.revenue_contribution || i.revenueContribution || 0), 0) + 0.0001 }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell fill="#f59e0b" />
                <Cell fill="#00f2fe" />
                <Cell fill="#64748b" />
              </Pie>
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#162032', border: '1px solid rgba(0, 242, 254, 0.2)' }}
                itemStyle={{ color: '#f8fafc' }}
                formatter={(val) => `$${val.toLocaleString()}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

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
            <Typography variant="subtitle2" style={{ color: '#94a3b8', marginTop: '10px' }}>
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
              InputLabelProps={{ style: { color: '#94a3b8' } }}
            />

            <TextField
              label="Reorder Threshold"
              type="number"
              fullWidth
              {...register('reorderPoint', { required: 'Reorder point is required', min: 0 })}
              error={!!errors.reorderPoint}
              helperText={errors.reorderPoint?.message}
              InputProps={{ style: { backgroundColor: '#162032', color: '#fff' } }}
              InputLabelProps={{ style: { color: '#94a3b8' } }}
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
      
      {/* AI Optimize Dialog */}
      <Dialog open={aiOpen} onClose={handleAiClose} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800, backgroundColor: '#101726', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AutoAwesomeIcon style={{ color: '#d946ef' }} /> AI Optimization
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#101726', padding: '24px' }}>
          {aiLoading ? (
            <Box display="flex" flexDirection="column" alignItems="center" padding="40px">
              <CircularProgress style={{ color: '#d946ef', marginBottom: '16px' }} />
              <Typography variant="body2" style={{ color: '#94a3b8' }}>Analyzing sales patterns and lead times...</Typography>
            </Box>
          ) : aiResult ? (
            <Box>
              <Typography variant="subtitle1" style={{ color: '#00f2fe', fontWeight: 700, marginBottom: '16px' }}>
                Optimization Results for {selectedItem?.productName}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card style={{ backgroundColor: '#162032', border: '1px solid rgba(217, 70, 239, 0.3)' }}>
                    <CardContent>
                      <Typography variant="caption" style={{ color: '#94a3b8' }}>Recommended Reorder Point</Typography>
                      <Typography variant="h5" style={{ color: '#d946ef', fontWeight: 800 }}>{aiResult.reorder_point}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card style={{ backgroundColor: '#162032', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                    <CardContent>
                      <Typography variant="caption" style={{ color: '#94a3b8' }}>Economic Order Qty (EOQ)</Typography>
                      <Typography variant="h5" style={{ color: '#00f2fe', fontWeight: 800 }}>{aiResult.economic_order_quantity}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              <Box marginTop="16px" padding="12px" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid #10b981', borderRadius: '4px' }}>
                <Typography variant="body2" style={{ color: '#cbd5e1' }}>
                  Safety Stock: <span style={{ color: '#10b981', fontWeight: 700 }}>{aiResult.safety_stock} units</span>
                </Typography>
                <Typography variant="caption" style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                  Confidence Score: {((aiResult.confidence_score || 0.85) * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          ) : (
            <Typography style={{ color: '#f8fafc' }}>Failed to get results.</Typography>
          )}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px', backgroundColor: '#101726' }}>
          <Button onClick={handleAiClose} style={{ textTransform: 'none', color: '#94a3b8' }}>Cancel</Button>
          <Button onClick={handleApplyAi} disabled={!aiResult || aiLoading} variant="contained" style={{ textTransform: 'none', backgroundColor: '#d946ef', color: '#fff', fontWeight: 700 }}>
            Apply Recommendations
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;
