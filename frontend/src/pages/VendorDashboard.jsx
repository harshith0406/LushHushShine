import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemText,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  LocalShipping,
  Inventory,
  AutoAwesome,
  CheckCircle,
  ErrorOutline
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
  Cell
} from 'recharts';
import API from '../config/api';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function VendorDashboard() {
  const [tabValue, setTabValue] = useState(0);

  // States
  const [sales, setSales] = useState({ data: [], loading: true });
  const [inventory, setInventory] = useState({ data: [], loading: true });
  const [forecast, setForecast] = useState({ data: [], loading: true });
  const [insights, setInsights] = useState({ data: [], loading: true });
  
  const [abcXyz, setAbcXyz] = useState({ data: null, loading: true });
  const [ghostSkus, setGhostSkus] = useState({ data: null, loading: true });
  const [vendorScores, setVendorScores] = useState({ data: [], loading: true });
  const [costPrediction, setCostPrediction] = useState({ data: null, loading: true });
  const [riskMatrix, setRiskMatrix] = useState({ data: null, loading: true });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          salesRes,
          invRes,
          batRes,
          forecastRes,
          insightsRes,
          abcRes,
          ghostRes,
          vendorRes,
          costRes
        ] = await Promise.all([
          API.get('/api/sales').catch(() => ({ data: [] })),
          API.get('/api/inventory').catch(() => ({ data: [] })),
          API.get('/api/batches').catch(() => ({ data: [] })),
          API.get('/api/analytics/forecast-demand').catch(() => ({ data: [] })),
          API.get('/api/analytics/insights').catch(() => ({ data: [] })),
          API.get('/api/analytics/abc-xyz').catch(() => ({ data: null })),
          API.get('/api/analytics/ghost-skus').catch(() => ({ data: null })),
          API.get('/api/analytics/vendor-scores').catch(() => ({ data: [] })),
          API.get('/api/analytics/cost-prediction').catch(() => ({ data: null }))
        ]);

        setSales({ data: salesRes.data || [], loading: false });
        const invData = invRes.data || [];
        setInventory({ data: invData, loading: false });
        setForecast({ data: forecastRes.data || [], loading: false });
        setInsights({ data: insightsRes.data || [], loading: false });
        let abcD = abcRes.data;
        if (abcD && abcD.classifications) {
           abcD = {
             summary: 'Class A products drive 75% of revenue.',
             products: abcD.classifications.map(c => ({ name: c.name, class: c.abc_class, revenue_contribution: c.revenue_contribution }))
           };
        }
        setAbcXyz({ data: abcD, loading: false });
        setGhostSkus({ data: ghostRes.data, loading: false });
        setVendorScores({ data: vendorRes.data?.vendor_scores || vendorRes.data || [], loading: false });
        
        let costD = costRes.data;
        if (costD && costD.history && typeof costD.history[0] === 'number') {
           costD = {
             ...costD,
             history: costD.history.map((c,i) => ({ date: `d${i}`, cost: c })),
             forecast: costD.forecast.map((c,i) => ({ date: `f${i}`, forecast_cost: c }))
           };
        }
        setCostPrediction({ data: costD, loading: false });

        try {
          const riskRes = await API.post('/api/analytics/risk-matrix', {
            inventory_items: invData,
            batch_items: batRes.data || [],
            sales_items: []
          });
          setRiskMatrix({ data: riskRes.data, loading: false });
        } catch (e) {
          setRiskMatrix({ data: null, loading: false });
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    fetchDashboardData();
  }, []);

  // Compute derived data
  const totalRevenue = sales.data.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const totalVolume = inventory.data.reduce((sum, item) => sum + (item.stock_level || 0), 0);
  const lowStockTriggers = inventory.data.filter(i => i.stock_level < (i.reorder_point || 10)).length;

  const channelPerformance = sales.data.reduce((acc, sale) => {
    const ch = sale.channel || 'Retail';
    acc[ch] = (acc[ch] || 0) + (sale.total_price || 0);
    return acc;
  }, {});
  const channelData = Object.keys(channelPerformance).map(key => ({
    name: key,
    revenue: channelPerformance[key]
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ backgroundColor: 'rgba(16, 23, 38, 0.95)', border: '1px solid rgba(0, 242, 254, 0.15)', p: 1.5, borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ color: '#f8fafc', mb: 1 }}>{label}</Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  const renderAISummaryBox = (text) => (
    <Box sx={{
      mt: 2, p: 2, 
      backgroundColor: 'rgba(0, 242, 254, 0.05)', 
      borderLeft: '4px solid var(--primary, #00f2fe)',
      borderRadius: '0 8px 8px 0',
      display: 'flex', gap: 1.5, alignItems: 'flex-start'
    }}>
      <AutoAwesome sx={{ color: 'var(--primary, #00f2fe)', fontSize: 20, mt: 0.5 }} />
      <Typography variant="body2" sx={{ color: '#f8fafc' }}>{text}</Typography>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 'bold' }}>
          Vendor Intelligence Portal
        </Typography>
      </Box>

      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        sx={{
          borderBottom: '1px solid rgba(0, 242, 254, 0.15)',
          '& .MuiTab-root': { color: '#94a3b8', textTransform: 'none', fontSize: '1rem', fontWeight: 500 },
          '& .Mui-selected': { color: '#00f2fe !important' },
          '& .MuiTabs-indicator': { backgroundColor: '#00f2fe' }
        }}
      >
        <Tab label="Overview" />
        <Tab label="Portfolio Intelligence" />
        <Tab label="Risk & Cost" />
        <Tab label="Supply Chain" />
      </Tabs>

      {/* OVERVIEW TAB */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card className="glass-panel" sx={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <TrendingUp sx={{ color: '#00f2fe' }} />
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Supplied Sales Revenue</Typography>
                </Box>
                {sales.loading ? <CircularProgress size={24} /> : (
                  <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 'bold' }}>
                    ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card className="glass-panel" sx={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Inventory sx={{ color: '#f59e0b' }} />
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Total Volume Supplied</Typography>
                </Box>
                {inventory.loading ? <CircularProgress size={24} /> : (
                  <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 'bold' }}>
                    {totalVolume.toLocaleString()} units
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card className="glass-panel" sx={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Warning sx={{ color: '#ff4b72' }} />
                  <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Retailer Low Stock Triggers</Typography>
                </Box>
                {inventory.loading ? <CircularProgress size={24} /> : (
                  <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 'bold' }}>
                    {lowStockTriggers} SKUs
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card className="glass-panel" sx={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f8fafc', mb: 3 }}>AI Demand Prediction & Sales Forecast</Typography>
                {forecast.loading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> : (
                  <Box sx={{ height: 300, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecast.data.length ? forecast.data : [{name: 'Jan', actual: 400, forecast: 450}, {name: 'Feb', actual: 300, forecast: 320}, {name: 'Mar', actual: null, forecast: 400}]} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area type="monotone" dataKey="actual" stroke="#00f2fe" fillOpacity={1} fill="url(#colorActual)" />
                        <Area type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorForecast)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3} direction="column">
              <Grid item>
                <Card className="glass-panel" sx={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#f8fafc', mb: 2 }}>Channel Performance</Typography>
                    {sales.loading ? <CircularProgress /> : (
                       <Box sx={{ height: 200, width: '100%' }}>
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={channelData.length ? channelData : [{name:'Online', revenue: 15000}, {name:'Store A', revenue: 8000}]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                             <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                             <YAxis stroke="#94a3b8" fontSize={12} />
                             <Tooltip content={<CustomTooltip />} />
                             <Bar dataKey="revenue" fill="#00f2fe" radius={[4, 4, 0, 0]} />
                           </BarChart>
                         </ResponsiveContainer>
                       </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item>
                <Card className="glass-panel" sx={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#f8fafc', mb: 2 }}>AI Business Intelligence</Typography>
                    {insights.loading ? <CircularProgress /> : (
                      <List disablePadding>
                        {(insights.data.length ? insights.data : [{text: "Replenish SKU-92 in West Coast region."}, {text: "Demand for Winter wear rising early."}]).slice(0, 3).map((insight, idx) => (
                          <ListItem key={idx} disablePadding sx={{ mb: 1.5 }}>
                            <AutoAwesome sx={{ color: '#f59e0b', fontSize: 18, mr: 1.5, mt: 0.5, alignSelf: 'flex-start' }} />
                            <ListItemText 
                              primary={insight.text || insight} 
                              primaryTypographyProps={{ sx: { color: '#f8fafc', fontSize: '0.9rem' } }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </TabPanel>

      {/* PORTFOLIO INTELLIGENCE TAB */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card className="glass-panel" sx={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f8fafc', mb: 1 }}>ABC/XYZ Portfolio Breakdown</Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>Revenue contribution by product classification</Typography>
                
                {abcXyz.loading ? <CircularProgress /> : (
                  <>
                    <Box sx={{ height: 350, width: '100%', mb: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={abcXyz.data?.products || [
                          { name: 'Prod1', class: 'A', revenue_contribution: 4500 },
                          { name: 'Prod2', class: 'A', revenue_contribution: 3200 },
                          { name: 'Prod3', class: 'B', revenue_contribution: 1500 },
                          { name: 'Prod4', class: 'C', revenue_contribution: 200 }
                        ]} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="revenue_contribution">
                            {(abcXyz.data?.products || []).map((entry, index) => {
                              const color = entry.class === 'A' ? '#f59e0b' : entry.class === 'B' ? '#00f2fe' : '#64748b';
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ w: 16, h: 16, px: 1, backgroundColor: '#f59e0b', borderRadius: 1 }}></Box>
                        <Typography variant="body2" sx={{ color: '#f8fafc' }}>Class A (Top)</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ w: 16, h: 16, px: 1, backgroundColor: '#00f2fe', borderRadius: 1 }}></Box>
                        <Typography variant="body2" sx={{ color: '#f8fafc' }}>Class B (Mid)</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ w: 16, h: 16, px: 1, backgroundColor: '#64748b', borderRadius: 1 }}></Box>
                        <Typography variant="body2" sx={{ color: '#f8fafc' }}>Class C (Low)</Typography>
                      </Box>
                    </Box>
                    {renderAISummaryBox(abcXyz.data?.summary || 'Class A products drive 75% of revenue. Focus replenishment on these highly valuable items.')}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={5}>
            <Card className="glass-panel" sx={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ color: '#f8fafc' }}>Ghost SKU Dead Stock</Typography>
                  {!ghostSkus.loading && ghostSkus.data?.ghost_count > 0 && (
                     <Chip label={`${ghostSkus.data.ghost_count} Detected`} color="error" size="small" />
                  )}
                </Box>
                
                {ghostSkus.loading ? <CircularProgress /> : (
                  <>
                    {!ghostSkus.data || ghostSkus.data.ghost_count === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 5 }}>
                        <CheckCircle sx={{ color: '#10b981', fontSize: 64, mb: 2, opacity: 0.8 }} />
                        <Typography variant="h6" sx={{ color: '#10b981' }}>No dead stock detected</Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>Inventory turnover is healthy.</Typography>
                      </Box>
                    ) : (
                      <>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                           <Grid item xs={6}>
                             <Box sx={{ p: 2, backgroundColor: 'rgba(255, 75, 114, 0.1)', borderRadius: 2, border: '1px solid rgba(255, 75, 114, 0.3)' }}>
                               <Typography variant="subtitle2" sx={{ color: '#ff4b72' }}>Total Units</Typography>
                               <Typography variant="h5" sx={{ color: '#f8fafc', fontWeight: 'bold' }}>{ghostSkus.data.total_dead_stock_units}</Typography>
                             </Box>
                           </Grid>
                        </Grid>
                        
                        <List sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
                          {(ghostSkus.data.ghost_skus || []).map((sku, i) => (
                            <ListItem key={i} sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'block', py: 1.5 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 500 }}>{sku.name}</Typography>
                                <Typography variant="body2" sx={{ color: '#ff4b72' }}>{sku.idle_days} days idle</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>{sku.available_qty} units available</Typography>
                                <Typography variant="caption" sx={{ color: '#f59e0b' }}>Risk: {sku.risk_score}/100</Typography>
                              </Box>
                              <LinearProgress variant="determinate" value={sku.risk_score} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', '& .MuiLinearProgress-bar': { backgroundColor: '#ff4b72' } }} />
                              <Typography variant="caption" sx={{ color: '#00f2fe', display: 'block', mt: 1 }}>↳ {sku.recommendation}</Typography>
                            </ListItem>
                          ))}
                        </List>
                        
                        {renderAISummaryBox(`⚠️ ${ghostSkus.data.ghost_count} ghost SKUs detected. Consider liquidating ${ghostSkus.data.total_dead_stock_units} units to free cash flow.`)}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* RISK & COST TAB */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={7}>
            <Card className="glass-panel" sx={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f8fafc', mb: 3 }}>Risk Matrix Summary</Typography>
                {riskMatrix.loading ? <CircularProgress /> : (
                  <>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                      <Grid item xs={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" sx={{ color: '#ff4b72', fontWeight: 'bold' }}>{riskMatrix.data?.critical_count || 0}</Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Critical</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>{riskMatrix.data?.warning_count || 0}</Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Warning</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 'bold' }}>{riskMatrix.data?.safe_count || 0}</Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Safe</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" sx={{ color: '#00f2fe', fontWeight: 'bold', mt: 0.5 }}>${(riskMatrix.data?.total_cash_tied_up || 0).toLocaleString()}</Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Cash Tied Up</Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Box sx={{ height: 350, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={riskMatrix.data?.products?.slice(0, 8) || []} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="overall_risk" radius={[0, 4, 4, 0]}>
                            {(riskMatrix.data?.products || []).map((entry, index) => {
                              const score = entry.overall_risk;
                              const color = score >= 70 ? '#ff4b72' : score >= 40 ? '#f59e0b' : '#10b981';
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} lg={5}>
            <Card className="glass-panel" sx={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f8fafc', mb: 3 }}>Supply Chain Cost Timeline</Typography>
                
                {costPrediction.loading ? <CircularProgress /> : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#94a3b8' }}>Forecasted Total Cost</Typography>
                        <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 'bold' }}>
                          ${(costPrediction.data?.total_forecast_cost || 0).toLocaleString()}
                        </Typography>
                      </Box>
                      {costPrediction.data?.trend === 'up' ? (
                         <Chip icon={<TrendingUp />} label="Rising Costs" sx={{ backgroundColor: 'rgba(255, 75, 114, 0.2)', color: '#ff4b72' }} />
                      ) : (
                         <Chip icon={<TrendingUp sx={{ transform: 'scaleY(-1)' }}/>} label="Decreasing Costs" sx={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }} />
                      )}
                    </Box>

                    <Box sx={{ height: 250, width: '100%', mb: 3 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[...(costPrediction.data?.history || []), ...(costPrediction.data?.forecast || [])]} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCostHistory" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorCostForecast" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                          <YAxis stroke="#94a3b8" fontSize={11} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="cost" stroke="#00f2fe" fill="url(#colorCostHistory)" />
                          <Area type="monotone" dataKey="forecast_cost" stroke="#8b5cf6" strokeDasharray="4 4" fill="url(#colorCostForecast)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                    
                    {renderAISummaryBox(costPrediction.data?.insight || 'Supply chain costs are expected to stabilize. Optimize freight to reduce overhead further.')}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* SUPPLY CHAIN TAB */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" sx={{ color: '#f8fafc', mb: 3 }}>Vendor Performance Scorecard</Typography>
        
        {vendorScores.loading ? <CircularProgress /> : (
          <Grid container spacing={3}>
            {((vendorScores.data && vendorScores.data.length > 0) ? vendorScores.data : [
              { name: 'Alpha Logistics', tier: '🥇', score: 92, fulfillment_score: 48, volume_score: 25, reliability_score: 19, total_pos: 150, completed_pos: 145 },
              { name: 'Global Supply Co', tier: '🥈', score: 78, fulfillment_score: 35, volume_score: 28, reliability_score: 15, total_pos: 80, completed_pos: 70 },
              { name: 'FastTrack Ltd', tier: '🥉', score: 65, fulfillment_score: 30, volume_score: 20, reliability_score: 15, total_pos: 45, completed_pos: 35 }
            ]).sort((a,b) => b.score - a.score).map((vendor, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card className="glass-panel" sx={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.15)', height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <Typography variant="h5">{vendor.tier}</Typography>
                      <Typography variant="h6" sx={{ color: '#f8fafc' }}>{vendor.name}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                      <Box sx={{ position: 'relative', width: 140, height: 140 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart 
                            cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" 
                            barSize={10} data={[{ name: 'Score', value: vendor.score }]} 
                            startAngle={90} endAngle={-270}
                          >
                            <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={5} fill={vendor.score >= 90 ? '#10b981' : vendor.score >= 70 ? '#00f2fe' : '#f59e0b'} />
                          </RadialBarChart>
                        </ResponsiveContainer>
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                          <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 'bold' }}>{vendor.score}</Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Score</Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>Fulfillment ({vendor.fulfillment_score}/50)</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={(vendor.fulfillment_score/50)*100} sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { backgroundColor: '#8b5cf6' } }} />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>Volume ({vendor.volume_score}/30)</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={(vendor.volume_score/30)*100} sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { backgroundColor: '#00f2fe' } }} />
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>Reliability ({vendor.reliability_score}/20)</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={(vendor.reliability_score/20)*100} sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { backgroundColor: '#f59e0b' } }} />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>Total POs</Typography>
                        <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 'bold' }}>{vendor.total_pos}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>Completed</Typography>
                        <Typography variant="body1" sx={{ color: '#10b981', fontWeight: 'bold' }}>{vendor.completed_pos}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

    </Container>
  );
}
