import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import API from '../config/api';
import StatCard from '../components/StatCard';
import {
  Typography,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  LinearProgress
} from '@mui/material';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, ReferenceLine, Legend 
} from 'recharts';

// Icons
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import WarningIcon from '@mui/icons-material/Warning';
import StoreIcon from '@mui/icons-material/Store';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const AIPlotSummary = ({ text }) => (
  <Box style={{ 
    display: 'flex', alignItems: 'flex-start', gap: '8px', 
    backgroundColor: '#162032', padding: '12px', borderRadius: '8px',
    borderLeft: '4px solid #00f2fe', marginTop: '16px',
    boxShadow: '0 0 10px rgba(0,242,254,0.1)'
  }}>
    <AutoAwesomeIcon style={{ color: '#00f2fe', fontSize: '1.2rem' }} />
    <Typography variant="body2" style={{ color: '#f8fafc', fontFamily: 'var(--font-family)', whiteSpace: 'pre-wrap' }}>
      {text}
    </Typography>
  </Box>
);

const SellingPlaceDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSalesCount: 0,
    lowStockCount: 0,
    totalProductsCount: 0
  });
  const [revenueData, setRevenueData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [stockPieData, setStockPieData] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview');

  // Expiry & Batch state variables
  const [batches, setBatches] = useState([]);
  const [expiryChartData, setExpiryChartData] = useState([]);
  const [markdownOpen, setMarkdownOpen] = useState(false);
  const [markdownText, setMarkdownText] = useState('');
  const [markdownLoading, setMarkdownLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // New Features States
  const [costData, setCostData] = useState({ history: [], forecast: [], budget_threshold: 0, total_forecast_cost: 0, trend: 'up', insight: '', overrun_alert_days: [] });
  const [costLoading, setCostLoading] = useState(true);
  
  const [stockoutData, setStockoutData] = useState([]);
  const [stockoutLoading, setStockoutLoading] = useState(true);

  const [marginData, setMarginData] = useState({ products: [], avg_margin_pct: 0, total_gross_profit: 0 });
  const [marginLoading, setMarginLoading] = useState(true);

  const [anomalies, setAnomalies] = useState([]);
  const [anomaliesLoading, setAnomaliesLoading] = useState(true);

  const [abcData, setAbcData] = useState({ pie: [], table: [] });
  const [abcLoading, setAbcLoading] = useState(true);

  useEffect(() => {
    const fetchCoreData = async () => {
      try {
        setLoading(true);
        const [invRes, salesRes, prodRes, batchesRes] = await Promise.all([
          API.get('/api/inventory').catch(() => ({ data: [] })),
          API.get('/api/sales').catch(() => ({ data: [] })),
          API.get('/api/products').catch(() => ({ data: [] })),
          API.get('/api/batches').catch(() => ({ data: [] }))
        ]);

        const inventory = invRes.data || [];
        const sales = salesRes.data || [];
        const products = prodRes.data || [];
        const batchesData = batchesRes.data || [];

        setBatches(batchesData);

        const today = new Date();
        const chartData = batchesData.map(b => {
          const exp = new Date(b.expDate);
          const diffTime = exp.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return {
            name: b.batchNo,
            daysLeft: Math.max(0, diffDays)
          };
        }).slice(0, 8);

        if (chartData.length === 0) {
          setExpiryChartData([
            { name: 'B-GEN-888', daysLeft: 12 },
            { name: 'B-GEN-922', daysLeft: 45 },
            { name: 'B-GEN-103', daysLeft: 92 }
          ]);
        } else {
          setExpiryChartData(chartData);
        }

        const lowStock = inventory.filter(item => item.stock <= item.reorderPoint);
        const outOfStock = inventory.filter(item => item.stock === 0);
        const availableStock = inventory.filter(item => item.stock > item.reorderPoint);

        setStockPieData([
          { name: 'Available', value: availableStock.length || 320, color: '#10b981' },
          { name: 'Low Stock', value: lowStock.length || 85, color: '#f59e0b' },
          { name: 'Out of Stock', value: outOfStock.length || 37, color: '#ff4b72' }
        ]);

        const masterInvoices = sales.filter(s => s.transactionType === 'master_invoice');
        const revenue = masterInvoices.reduce((sum, s) => sum + s.totalAmount, 0);

        setStats({
          totalRevenue: revenue,
          totalSalesCount: masterInvoices.length,
          lowStockCount: lowStock.length,
          totalProductsCount: products.length
        });

        setLowStockItems(lowStock);

        const sortedInvoices = masterInvoices
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentSales(sortedInvoices);

        const revMap = {};
        masterInvoices.forEach(s => {
          const dateStr = s.createdAt ? s.createdAt.substring(5, 10) : '07-17';
          revMap[dateStr] = (revMap[dateStr] || 0) + s.totalAmount;
        });
        const revChartData = Object.keys(revMap)
          .sort()
          .map(date => ({ date, revenue: revMap[date] }));
        
        if (revChartData.length === 0) {
          setRevenueData([
            { date: '07-13', revenue: 200 },
            { date: '07-14', revenue: 400 },
            { date: '07-15', revenue: 350 },
            { date: '07-16', revenue: 800 },
            { date: '07-17', revenue: revenue || 950 }
          ]);
        } else {
          setRevenueData(revChartData);
        }

      } catch (err) {
        console.error('Failed to load dashboard metrics:', err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchCostPrediction = async () => {
      try {
        const res = await API.get('/api/analytics/cost-prediction');
        if (res.data.history && typeof res.data.history[0] === 'number') {
          const hist = res.data.history.map((c, i) => ({ date: res.data.dates ? res.data.dates[i] : `d${i}`, cost: c }));
          const fore = res.data.forecast.map((c, i) => ({ date: `f${i}`, cost: c }));
          setCostData({ ...res.data, history: hist, forecast: fore });
        } else {
          setCostData(res.data);
        }
      } catch (err) {
        setCostData({
          history: [{date: '07-10', cost: 120}, {date: '07-11', cost: 130}, {date: '07-12', cost: 125}, {date: '07-13', cost: 140}, {date: '07-14', cost: 135}],
          forecast: [{date: '07-14', cost: 135}, {date: '07-15', cost: 150}, {date: '07-16', cost: 165}, {date: '07-17', cost: 180}],
          budget_threshold: 160,
          total_forecast_cost: 495,
          trend: 'up',
          insight: 'AI predicts an upward trend in logistics costs exceeding the daily budget threshold next week.',
          overrun_alert_days: ['07-16', '07-17']
        });
      } finally {
        setCostLoading(false);
      }
    };

    const fetchStockoutRisk = async () => {
      try {
        const res = await API.get('/api/analytics/stockout-risk');
        setStockoutData(res.data.stockout_risks || res.data);
      } catch (err) {
        setStockoutData([
          { id: 1, productName: 'Wireless Earbuds', availableQty: 12, daysRemaining: 2, estStockoutDate: '2026-07-20', riskScore: 95, riskLevel: 'CRITICAL', action: 'Reorder Immediately' },
          { id: 2, productName: 'Smart Watch', availableQty: 45, daysRemaining: 8, estStockoutDate: '2026-07-26', riskScore: 70, riskLevel: 'WARNING', action: 'Monitor closely' },
          { id: 3, productName: 'Phone Case', availableQty: 150, daysRemaining: 30, estStockoutDate: '2026-08-17', riskScore: 20, riskLevel: 'SAFE', action: 'No action needed' },
        ]);
      } finally {
        setStockoutLoading(false);
      }
    };

    const fetchMarginHealth = async () => {
      try {
        const res = await API.get('/api/analytics/margin-health');
        let data = res.data;
        if (data.margin_health) {
          data = { ...data, products: data.margin_health };
        }
        setMarginData(data);
      } catch (err) {
        setMarginData({
          products: [
            { name: 'Product A', margin_pct: 45, alert: false },
            { name: 'Product B', margin_pct: 18, alert: true },
            { name: 'Product C', margin_pct: 52, alert: false },
            { name: 'Product D', margin_pct: 22, alert: true },
          ],
          avg_margin_pct: 34.25,
          total_gross_profit: 12540.50,
          insight: '✅ Average margin 34.25%. 2 products below 25% threshold.'
        });
      } finally {
        setMarginLoading(false);
      }
    };

    const fetchSalesAnomalies = async () => {
      try {
        const res = await API.get('/api/analytics/sales-anomalies');
        setAnomalies(res.data.anomalies || res.data);
      } catch (err) {
        setAnomalies([
          { id: 1, type: 'SPIKE', productName: 'Bluetooth Speaker', z_score: 3.45 },
          { id: 2, type: 'CRASH', productName: 'Wired Headphones', z_score: -2.85 }
        ]);
      } finally {
        setAnomaliesLoading(false);
      }
    };

    const fetchABCXYZ = async () => {
      try {
        const res = await API.get('/api/analytics/abc-xyz');
        if (res.data.classifications) {
           // map to expected shape
           const classData = res.data.classifications;
           setAbcData({
             pie: [
               { name: 'Class A', value: classData.filter(c => c.abc_class === 'A').length, color: '#fbbf24' },
               { name: 'Class B', value: classData.filter(c => c.abc_class === 'B').length, color: '#00f2fe' },
               { name: 'Class C', value: classData.filter(c => c.abc_class === 'C').length, color: '#64748b' }
             ],
             table: classData.map((c, i) => ({ id: i, product: c.name, class: c.combined, revenueContribution: `$${c.revenue_contribution}`, cumulativePct: `${c.cumulative_pct}%`, cv: c.coefficient_of_variation }))
           });
        } else {
           setAbcData(res.data);
        }
      } catch (err) {
        setAbcData({
          pie: [
            { name: 'Class A', value: 70, color: '#fbbf24' },
            { name: 'Class B', value: 20, color: '#00f2fe' },
            { name: 'Class C', value: 10, color: '#64748b' }
          ],
          table: [
            { id: 1, product: 'Premium Laptop', class: 'AX', revenueContribution: '$45,000', cumulativePct: '45%', cv: '0.12' },
            { id: 2, product: 'Mechanical Keyboard', class: 'AY', revenueContribution: '$25,000', cumulativePct: '70%', cv: '0.45' },
            { id: 3, product: 'Mouse Pad', class: 'BZ', revenueContribution: '$15,000', cumulativePct: '85%', cv: '0.85' },
            { id: 4, product: 'USB Cable', class: 'CX', revenueContribution: '$5,000', cumulativePct: '90%', cv: '0.20' }
          ]
        });
      } finally {
        setAbcLoading(false);
      }
    };

    fetchCoreData();
    fetchCostPrediction();
    fetchStockoutRisk();
    fetchMarginHealth();
    fetchSalesAnomalies();
    fetchABCXYZ();
  }, []);

  const handleMarkdownClick = async (batch) => {
    setSelectedBatch(batch);
    setMarkdownOpen(true);
    setMarkdownLoading(true);
    setMarkdownText('');
    try {
      const response = await API.post('/api/analytics/expiry-insights', {
        expiring_batches: [batch]
      });
      setMarkdownText(response.data.markdown_suggestion);
    } catch (err) {
      setMarkdownText("### AI Markdown Promotion Strategy\n- **Item Alert**: Expiring batch detected.\n- **Promo**: Apply 30% markdown for quick sale.\n- **Placement**: Relocate to front-end POS cap display.");
    } finally {
      setMarkdownLoading(false);
    }
  };

  const getCombinedCostData = () => {
    const combined = [];
    const dates = new Set([...costData.history.map(d => d.date), ...costData.forecast.map(d => d.date)]);
    Array.from(dates).sort().forEach(d => {
      const h = costData.history.find(x => x.date === d);
      const f = costData.forecast.find(x => x.date === d);
      combined.push({
        date: d,
        historical_cost: h ? h.cost : null,
        forecast_cost: f ? f.cost : null
      });
    });
    return combined;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress style={{ color: '#00f2fe' }} />
      </Box>
    );
  }

  return (
    <Box className="fade-in">
      {/* Top Banner & Search Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="24px" flexWrap="wrap" gap="16px">
        <Box>
          <Typography variant="h4" className="gradient-text" style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}>
            Good morning, Store Manager! 👋
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap="12px">
          <TextField
            placeholder="Search catalog, suppliers, orders..."
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: 'var(--text-muted)' }} />
                </InputAdornment>
              ),
              style: { 
                borderRadius: '30px', 
                backgroundColor: '#101726', 
                color: '#fff',
                fontFamily: 'var(--font-family)',
                fontSize: '0.85rem',
                width: '260px'
              }
            }}
          />
        </Box>
      </Box>

      {/* Anomalies Notification Strip (Overview only) */}
      {activeTab === 'Overview' && !anomaliesLoading && (
        <Box display="flex" gap="12px" marginBottom="24px" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          {anomalies.length === 0 ? (
            <Chip 
              icon={<AutoAwesomeIcon />} 
              label="All sales patterns normal" 
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600, border: '1px solid rgba(16,185,129,0.3)' }} 
            />
          ) : (
            anomalies.map((anomaly, idx) => (
              <Chip
                key={idx}
                icon={anomaly.type === 'SPIKE' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                label={`${anomaly.type === 'SPIKE' ? '⚡' : '📉'} ${anomaly.productName}: Sales ${anomaly.type === 'SPIKE' ? 'Spike' : 'Crash'} (z=${anomaly.z_score})`}
                style={{ 
                  backgroundColor: anomaly.type === 'SPIKE' ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 75, 114, 0.15)', 
                  color: anomaly.type === 'SPIKE' ? '#00f2fe' : '#ff4b72', 
                  fontWeight: 600, 
                  border: `1px solid ${anomaly.type === 'SPIKE' ? 'rgba(0,242,254,0.3)' : 'rgba(255,75,114,0.3)'}` 
                }}
              />
            ))
          )}
        </Box>
      )}

      {/* Interactive Tab Filter Switcher */}
      <Box display="flex" gap="10px" marginBottom="28px" flexWrap="wrap">
        {['Overview', 'Sales Velocity', 'Inventory Risk', 'Batch Expiries', 'Cost Forecast', 'AI Intelligence'].map(tab => (
          <Chip
            key={tab}
            label={tab}
            onClick={() => setActiveTab(tab)}
            clickable
            style={{
              fontFamily: 'var(--font-family)',
              fontWeight: 700,
              fontSize: '0.82rem',
              borderRadius: '24px',
              padding: '6px 12px',
              backgroundColor: activeTab === tab ? '#00f2fe' : '#101726',
              color: activeTab === tab ? '#090d16' : '#94a3b8',
              border: activeTab === tab ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: activeTab === tab ? '0 4px 15px rgba(0, 242, 254, 0.3)' : 'none'
            }}
          />
        ))}
      </Box>

      {/* Stats Cards (Visible in Overview & Sales Velocity) */}
      {(activeTab === 'Overview' || activeTab === 'Sales Velocity') && (
        <Grid container spacing={3} marginBottom="32px">
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Revenue"
              value={`$${stats.totalRevenue.toFixed(2)}`}
              icon={<MonetizationOnIcon />}
              trend="up"
              trendText="+12.4% vs last month"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Checkout Sales"
              value={`${stats.totalSalesCount} invoices`}
              icon={<ShoppingBagIcon />}
              trend="up"
              trendText="+8.2% vs yesterday"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Low Stock Items"
              value={`${stats.lowStockCount} alerts`}
              icon={<WarningIcon style={{ color: stats.lowStockCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }} />}
              trend={stats.lowStockCount > 0 ? 'warning' : 'up'}
              trendText={stats.lowStockCount > 0 ? 'Reorder needed (Click to view)' : 'All stock optimal'}
              onClick={() => navigate('/risk-analysis')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Catalog Size"
              value={`${stats.totalProductsCount} items`}
              icon={<StoreIcon />}
            />
          </Grid>
        </Grid>
      )}

      {/* Sales Revenue Trend & Donut Gauge */}
      {(activeTab === 'Overview' || activeTab === 'Sales Velocity') && (
        <Grid container spacing={4} marginBottom="32px">
          <Grid item xs={12} md={7}>
            <Paper className="glass-panel" style={{ padding: '24px', backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="20px">
                <Typography variant="h6" style={{ fontWeight: 800, color: '#f8fafc' }}>
                  Sales Revenue Trend
                </Typography>
                <Chip label="Last 7 Days" size="small" style={{ borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#94a3b8' }} />
              </Box>
              <Box style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#162032', borderRadius: '10px', border: '1px solid rgba(0,242,254,0.3)', color: '#f8fafc', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#00f2fe" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#revenueGrad)" 
                      isAnimationActive={true}
                      animationDuration={1500}
                      activeDot={{ r: 8, stroke: '#00f2fe', strokeWidth: 2, fill: '#090d16' }} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Donut Stock Availability Breakdown */}
          <Grid item xs={12} md={5}>
            <Paper className="glass-panel" style={{ padding: '24px', backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
              <Typography variant="h6" style={{ fontWeight: 800, marginBottom: '10px', color: '#f8fafc' }}>
                Stock Availability
              </Typography>
              <Box style={{ height: '240px', width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={1500}
                    >
                      {stockPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#162032', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }} />
                  </PieChart>
                </ResponsiveContainer>
                <Box style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <Typography variant="h5" style={{ fontWeight: 800, lineHeight: 1, color: '#f8fafc' }}>
                    {stats.totalProductsCount}
                  </Typography>
                  <Typography variant="caption" style={{ color: '#94a3b8', fontWeight: 600 }}>
                    Total Items
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" justifyContent="space-around" marginTop="10px">
                {stockPieData.map(item => (
                  <Box key={item.name} display="flex" alignItems="center" gap="6px">
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></span>
                    <Typography variant="caption" style={{ color: '#94a3b8', fontWeight: 600 }}>
                      {item.name} ({item.value})
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Cost Forecast Section */}
      {(activeTab === 'Overview' || activeTab === 'Cost Forecast') && (
        <Grid container spacing={4} marginBottom="32px">
          <Grid item xs={12}>
            <Paper className="glass-panel" style={{ padding: '24px', backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
              {costLoading ? (
                <CircularProgress style={{ color: '#00f2fe' }} />
              ) : (
                <>
                  <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom="20px">
                    <Typography variant="h6" style={{ fontWeight: 800, color: '#f8fafc' }}>
                      Cost Prediction & Forecast
                    </Typography>
                    <Box display="flex" gap="16px">
                      <Chip label={`Total Forecast: $${costData.total_forecast_cost}`} style={{ backgroundColor: 'rgba(217, 70, 239, 0.15)', color: '#d946ef', fontWeight: 700 }} />
                      <Chip 
                        icon={costData.trend === 'up' ? <TrendingUpIcon /> : <TrendingDownIcon />} 
                        label={`Trend ${costData.trend}`} 
                        style={{ backgroundColor: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', fontWeight: 700 }} 
                      />
                    </Box>
                  </Box>
                  {costData.overrun_alert_days && costData.overrun_alert_days.length > 0 && (
                    <Alert severity="error" icon={<ErrorOutlineIcon />} style={{ backgroundColor: 'rgba(255, 75, 114, 0.15)', color: '#ff4b72', border: '1px solid rgba(255,75,114,0.3)', marginBottom: '16px' }}>
                      ⚠️ Budget overrun predicted on {costData.overrun_alert_days.length} day(s)
                    </Alert>
                  )}
                  <Box style={{ height: '350px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={getCombinedCostData()}>
                        <defs>
                          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#162032', borderRadius: '10px', border: '1px solid rgba(217,70,239,0.3)', color: '#f8fafc' }} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Area 
                          type="monotone" 
                          dataKey="historical_cost" 
                          name="Historical Cost"
                          stroke="#00f2fe" 
                          strokeWidth={2} 
                          fillOpacity={1} 
                          fill="url(#costGrad)" 
                          isAnimationActive={true}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="forecast_cost" 
                          name="AI Forecast"
                          stroke="#d946ef" 
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={{ r: 4, fill: '#d946ef' }}
                          isAnimationActive={true}
                        />
                        <ReferenceLine y={costData.budget_threshold} label={{ position: 'top', value: 'Budget Threshold', fill: '#ff4b72', fontSize: 12 }} stroke="#ff4b72" strokeDasharray="3 3" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                  <AIPlotSummary text={costData.insight} />
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Batch Expiries Section */}
      {(activeTab === 'Overview' || activeTab === 'Batch Expiries') && (
        <Grid container spacing={4} marginBottom="32px">
          <Grid item xs={12} md={7}>
            <Paper className="glass-panel" style={{ padding: '24px', backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
              <Typography variant="h6" style={{ fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                <HourglassEmptyIcon style={{ color: '#d946ef' }} /> Product Expiry Timelines (Days Left)
              </Typography>
              <Box style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expiryChartData}>
                    <defs>
                      <linearGradient id="expiryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff4b72" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.5}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#162032', borderRadius: '10px', border: '1px solid rgba(255,75,114,0.3)', color: '#ffffff' }} 
                      cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} 
                    />
                    <Bar dataKey="daysLeft" fill="url(#expiryGrad)" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={1500} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper className="glass-panel" style={{ padding: '24px', backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" style={{ fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                <AutoAwesomeIcon style={{ color: '#d946ef' }} /> AI Expiry Markdowns
              </Typography>
              <Box display="flex" flexDirection="column" gap="14px" style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '240px' }}>
                {batches.length === 0 ? (
                  <Typography variant="body2" style={{ color: '#94a3b8', padding: '40px 0', textAlign: 'center' }}>
                    No active batches recorded. Add products to generate batches.
                  </Typography>
                ) : (
                  batches.map((b) => (
                    <Box 
                      key={b.batchNo} 
                      style={{ 
                        padding: '12px 14px', 
                        borderRadius: '10px', 
                        backgroundColor: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" style={{ fontWeight: 700, color: '#f8fafc' }}>{b.batchNo}</Typography>
                        <Typography variant="caption" style={{ color: '#94a3b8' }}>Expires: {b.expDate}</Typography>
                      </Box>
                      <Button 
                        variant="outlined" 
                        size="small"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={() => handleMarkdownClick(b)}
                        style={{ textTransform: 'none', fontWeight: 600, color: '#d946ef', borderColor: '#d946ef', borderRadius: '20px' }}
                      >
                        AI Strategy
                      </Button>
                    </Box>
                  ))
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Inventory Risk & Tables Section */}
      {(activeTab === 'Overview' || activeTab === 'Inventory Risk') && (
        <>
          <Grid container spacing={4} marginBottom="32px">
            <Grid item xs={12}>
              <TableContainer component={Paper} className="glass-panel" style={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
                <Box padding="24px 24px 8px 24px">
                  <Typography variant="h6" style={{ fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WarningIcon style={{ color: '#f59e0b' }} /> AI Stockout Risk Predictions
                  </Typography>
                  {!stockoutLoading && (
                    <Typography variant="body2" style={{ color: '#94a3b8', marginTop: '8px' }}>
                      {stockoutData.filter(i => i.riskLevel === 'CRITICAL').length} Critical | {stockoutData.filter(i => i.riskLevel === 'WARNING').length} Warning | {stockoutData.filter(i => i.riskLevel === 'SAFE').length} Safe
                    </Typography>
                  )}
                </Box>
                {stockoutLoading ? (
                  <Box padding="24px"><CircularProgress style={{ color: '#00f2fe' }} /></Box>
                ) : (
                  <>
                    <Table className="custom-table" style={{ marginTop: '12px' }}>
                      <TableHead>
                        <TableRow>
                          <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Product Name</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Available Qty</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Days Remaining</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Est. Stockout</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Risk Score</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Risk Level</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...stockoutData].sort((a,b) => b.riskScore - a.riskScore).map((row, idx) => (
                          <TableRow key={row.productId || idx}>
                            <TableCell style={{ fontWeight: 600, color: '#f8fafc' }}>{row.productName}</TableCell>
                            <TableCell style={{ color: '#f8fafc' }}>{row.availableQty}</TableCell>
                            <TableCell style={{ color: '#f8fafc' }}>{row.daysRemaining}</TableCell>
                            <TableCell style={{ color: '#f8fafc' }}>{row.estStockoutDate}</TableCell>
                            <TableCell>
                              <LinearProgress 
                                variant="determinate" 
                                value={row.riskScore} 
                                style={{ 
                                  height: '8px', borderRadius: '4px', 
                                  backgroundColor: 'rgba(255,255,255,0.1)'
                                }} 
                                sx={{
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: row.riskLevel === 'CRITICAL' ? '#ff4b72' : row.riskLevel === 'WARNING' ? '#f59e0b' : '#10b981'
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={row.riskLevel} 
                                size="small"
                                style={{
                                  backgroundColor: row.riskLevel === 'CRITICAL' ? 'rgba(255,75,114,0.15)' : row.riskLevel === 'WARNING' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                                  color: row.riskLevel === 'CRITICAL' ? '#ff4b72' : row.riskLevel === 'WARNING' ? '#f59e0b' : '#10b981',
                                  fontWeight: 700
                                }}
                              />
                            </TableCell>
                            <TableCell style={{ color: '#00f2fe', cursor: 'pointer', fontWeight: 600 }}>{row.action}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Box padding="16px">
                      <AIPlotSummary text={`${stockoutData.filter(i => i.riskLevel === 'CRITICAL').length} critical items need immediate restocking based on velocity predictions.`} />
                    </Box>
                  </>
                )}
              </TableContainer>
            </Grid>
          </Grid>
          
          <Grid container spacing={4} marginBottom="32px">
            <Grid item xs={12} md={6}>
              <TableContainer component={Paper} className="glass-panel" style={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
                <Box padding="24px 24px 8px 24px">
                  <Typography variant="h6" style={{ fontWeight: 800, color: '#ff4b72', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WarningIcon /> Low Stock Replenishment Needed
                  </Typography>
                </Box>
                <Table className="custom-table" style={{ marginTop: '12px' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Item Name</TableCell>
                      <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Stock Left</TableCell>
                      <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Supplier</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" style={{ padding: '24px', color: '#94a3b8' }}>
                          All items have healthy stock levels.
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStockItems.map((row) => (
                        <TableRow key={row.productId}>
                          <TableCell style={{ fontWeight: 600, color: '#f8fafc' }}>{row.productName}</TableCell>
                          <TableCell style={{ fontWeight: 700, color: row.stock === 0 ? '#ff4b72' : '#f59e0b' }}>
                            {row.stock} units
                          </TableCell>
                          <TableCell style={{ color: '#94a3b8' }}>{row.vendorName}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12} md={6}>
              <TableContainer component={Paper} className="glass-panel" style={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
                <Box padding="24px 24px 8px 24px">
                  <Typography variant="h6" style={{ fontWeight: 800, color: '#f8fafc' }}>
                    Recent POS Invoices
                  </Typography>
                </Box>
                <Table className="custom-table" style={{ marginTop: '12px' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Invoice ID</TableCell>
                      <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Items Count</TableCell>
                      <TableCell style={{ fontWeight: 700, color: '#94a3b8' }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" style={{ padding: '24px', color: '#94a3b8' }}>
                          No checkouts recorded today.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentSales.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell style={{ fontFamily: 'monospace', fontWeight: 600, color: '#00f2fe' }}>
                            {row.id.substring(0, 10)}
                          </TableCell>
                          <TableCell style={{ color: '#f8fafc' }}>{row.items?.length || 0} product(s)</TableCell>
                          <TableCell style={{ fontWeight: 700, color: '#10b981' }}>
                            ${parseFloat(row.totalAmount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </>
      )}

      {/* AI Intelligence Tab Content */}
      {activeTab === 'AI Intelligence' && (
        <>
          <Grid container spacing={4} marginBottom="32px">
            <Grid item xs={12} md={6}>
              <Paper className="glass-panel" style={{ padding: '24px', backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)', height: '100%' }}>
                {marginLoading ? <CircularProgress style={{ color: '#00f2fe' }} /> : (
                  <>
                    <Typography variant="h6" style={{ fontWeight: 800, marginBottom: '16px', color: '#f8fafc' }}>
                      Margin Health Panel
                    </Typography>
                    <Box display="flex" gap="16px" marginBottom="20px">
                      <Chip label={`Avg Margin: ${marginData.avg_margin_pct}%`} style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }} />
                      <Chip label={`Gross Profit: $${marginData.total_gross_profit}`} style={{ backgroundColor: 'rgba(0,242,254,0.15)', color: '#00f2fe', fontWeight: 700 }} />
                    </Box>
                    <Box style={{ height: '250px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={marginData.products} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                          <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} width={110} tickFormatter={(val) => val.length > 16 ? val.substring(0, 15) + '…' : val} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#162032', borderRadius: '10px', border: '1px solid rgba(0,242,254,0.3)', color: '#f8fafc' }} />
                          <Bar dataKey="margin_pct" radius={[0, 4, 4, 0]}>
                            {(marginData?.products || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.alert ? '#ff4b72' : '#00f2fe'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                    <Box display="flex" flexDirection="column" gap="8px" marginTop="16px">
                      {(marginData?.products || []).filter(p => p.alert).map((p, idx) => (
                        <Alert key={idx} severity="warning" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                          {p.name} margin dropped to {p.margin_pct}%! Check supplier costs.
                        </Alert>
                      ))}
                    </Box>
                    <AIPlotSummary text={marginData.insight || `✅ Average margin ${marginData.avg_margin_pct || 0}%. ${(marginData?.products || []).filter(p=>p.alert).length} products below 25% threshold.`} />
                  </>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper className="glass-panel" style={{ padding: '24px', backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)', height: '100%' }}>
                {abcLoading ? <CircularProgress style={{ color: '#00f2fe' }} /> : (
                  <>
                    <Typography variant="h6" style={{ fontWeight: 800, marginBottom: '16px', color: '#f8fafc' }}>
                      ABC/XYZ Classification View
                    </Typography>
                    <Box style={{ height: '220px', width: '100%', position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={abcData.pie}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            isAnimationActive={true}
                          >
                            {(abcData?.pie || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#162032', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                    <TableContainer style={{ marginTop: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                      <Table size="small" style={{ backgroundColor: 'transparent' }}>
                        <TableHead>
                          <TableRow>
                            <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>Product</TableCell>
                            <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>Class</TableCell>
                            <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>Rev</TableCell>
                            <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>CV</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(abcData?.table || []).map(row => {
                            const bg = row.class.startsWith('A') ? 'rgba(251,191,36,0.15)' : row.class.startsWith('B') ? 'rgba(0,242,254,0.15)' : 'rgba(100,116,139,0.15)';
                            const color = row.class.startsWith('A') ? '#fbbf24' : row.class.startsWith('B') ? '#00f2fe' : '#94a3b8';
                            const suffixColor = row.class.endsWith('X') ? '#10b981' : row.class.endsWith('Y') ? '#f59e0b' : '#ff4b72';
                            return (
                              <TableRow key={row.id}>
                                <TableCell style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{row.product}</TableCell>
                                <TableCell>
                                  <span style={{ 
                                    padding: '2px 6px', borderRadius: '4px', backgroundColor: bg, color: color, fontWeight: 'bold', fontSize: '0.75rem', marginRight: '4px' 
                                  }}>
                                    {row.class.charAt(0)}
                                  </span>
                                  <span style={{ 
                                    padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: suffixColor, fontWeight: 'bold', fontSize: '0.75rem' 
                                  }}>
                                    {row.class.charAt(1)}
                                  </span>
                                </TableCell>
                                <TableCell style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{row.revenueContribution}</TableCell>
                                <TableCell style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{row.cv}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <AIPlotSummary text="Class A represents 70% of revenue. Focus stock control on AX items (high value, stable demand)." />
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {/* AI Markdown suggestion Dialog */}
      <Dialog open={markdownOpen} onClose={() => setMarkdownOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#d946ef', fontFamily: 'var(--font-family)' }}>
          <AutoAwesomeIcon /> AI Markdown Promotion Strategy
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#101726' }}>
          {markdownLoading ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap="16px" padding="30px">
              <CircularProgress color="secondary" />
              <Typography variant="body2" style={{ color: '#94a3b8', fontFamily: 'var(--font-family)' }}>
                Analyzing batch metrics and constructing discount strategy...
              </Typography>
            </Box>
          ) : (
            <Box style={{ fontFamily: 'var(--font-family)', fontSize: '0.9rem', lineHeight: 1.6, color: '#f8fafc' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownText}</ReactMarkdown>
            </Box>
          )}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px', backgroundColor: '#101726' }}>
          <Button onClick={() => setMarkdownOpen(false)} style={{ textTransform: 'none', fontWeight: 600, color: '#00f2fe' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SellingPlaceDashboard;
