import React, { useState, useEffect, useMemo } from 'react';
import API from '../config/api';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const RADAR_COLORS = ['#ff4b72', '#f59e0b', '#d946ef', '#00f2fe', '#10b981'];

const RiskAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [riskMatrix, setRiskMatrix] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [ghostSkus, setGhostSkus] = useState([]);
  const [marginHealth, setMarginHealth] = useState([]);
  const [storeScore, setStoreScore] = useState(100);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch inventory and batches to feed into risk-matrix
        const [invRes, batchRes] = await Promise.all([
          API.get('/api/inventory').catch(() => ({ data: [] })),
          API.get('/api/batches').catch(() => ({ data: [] }))
        ]);
        const inventory = invRes.data || [];
        const batches = batchRes.data || [];

        // 2. Fetch risk matrix
        let rmData = [];
        try {
          const rmRes = await API.post('/api/analytics/risk-matrix', {
            inventory_items: inventory,
            batch_items: batches
          });
          rmData = rmRes.data || [];
        } catch (e) {
          console.error(e);
        }

        // 3. Fetch others
        const [anomRes, ghostRes, marginRes] = await Promise.all([
          API.get('/api/analytics/sales-anomalies').catch(() => ({ data: [] })),
          API.get('/api/analytics/ghost-skus').catch(() => ({ data: [] })),
          API.get('/api/analytics/margin-health').catch(() => ({ data: [] }))
        ]);

        let rmArray = rmData?.products || rmData || [];
        if (!Array.isArray(rmArray)) rmArray = [];
        setRiskMatrix(rmArray.sort((a, b) => (b.overall_risk || 0) - (a.overall_risk || 0)));
        const getArr = (d, k) => Array.isArray(d?.[k]) ? d[k] : (Array.isArray(d) ? d : []);
        setAnomalies(getArr(anomRes.data, 'anomalies'));
        setGhostSkus(getArr(ghostRes.data, 'ghost_skus'));
        setMarginHealth(getArr(marginRes.data, 'margin_health'));

        if (rmData.length > 0) {
          const avgRisk = rmData.reduce((sum, r) => sum + (r.overall_risk || 0), 0) / rmData.length;
          setStoreScore(Math.max(0, 100 - avgRisk));
        }

      } catch (err) {
        setError('Failed to fetch risk intelligence data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getRiskColorCode = (score) => {
    if (score >= 70) return '#ff4b72'; // CRITICAL
    if (score >= 40) return '#f59e0b'; // WARNING
    return '#10b981'; // SAFE
  };

  const RiskProgressBar = ({ value }) => (
    <Box display="flex" alignItems="center" gap="8px">
      <LinearProgress 
        variant="determinate" 
        value={Math.min(value, 100)} 
        sx={{ 
          flexGrow: 1, 
          height: 8, 
          borderRadius: 4, 
          backgroundColor: '#162032',
          '& .MuiLinearProgress-bar': { backgroundColor: getRiskColorCode(value) }
        }} 
      />
      <Typography variant="caption" style={{ color: '#cbd5e1', minWidth: '30px' }}>{Math.round(value)}</Typography>
    </Box>
  );

  const topRisks = useMemo(() => riskMatrix.slice(0, 5), [riskMatrix]);
  
  const radarData = useMemo(() => {
    const data = [
      { metric: 'Stockout' },
      { metric: 'Expiry' },
      { metric: 'Ghost' },
      { metric: 'Financial' }
    ];
    topRisks.forEach((p, i) => {
      data[0][`prod${i}`] = p.stockout_risk || 0;
      data[1][`prod${i}`] = p.expiry_risk || 0;
      data[2][`prod${i}`] = p.ghost_risk || 0;
      data[3][`prod${i}`] = p.financial_risk || 0;
    });
    return data;
  }, [topRisks]);

  const marginDataFormatted = useMemo(() => {
    return marginHealth.map(m => ({
      name: m.productName?.substring(0, 15) || `Prod ${m.productId}`,
      margin: m.marginPercent || 0,
      fill: (m.marginPercent || 0) < 15 ? '#ff4b72' : (m.marginPercent < 30 ? '#f59e0b' : '#10b981')
    })).sort((a, b) => b.margin - a.margin).slice(0, 10);
  }, [marginHealth]);

  const narrative = useMemo(() => {
    const total = riskMatrix.length;
    let critical = 0;
    let warning = 0;
    let safe = 0;
    riskMatrix.forEach(r => {
      if (r.overall_risk >= 70) critical++;
      else if (r.overall_risk >= 40) warning++;
      else safe++;
    });

    const topNames = topRisks.map(r => r.product_name).join(', ');
    
    return `AI DIAGNOSTIC REPORT:
Analyzed ${total} inventory items.
Risk Distribution: ${critical} Critical | ${warning} Warning | ${safe} Safe.
Highest Priority Interventions: ${topNames || 'None'}.

RECOMMENDATIONS:
- Immediately review top 3 items for stockout/expiry mitigation.
- Liquidate ${ghostSkus.length} ghost SKUs tying up capital.
- Restock high-margin items to protect store score.`;
  }, [riskMatrix, topRisks, ghostSkus]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress style={{ color: '#00f2fe' }} />
      </Box>
    );
  }

  return (
    <Box className="fade-in" sx={{ paddingBottom: '40px' }}>
      {/* Header */}
      <Grid container spacing={3} alignItems="center" marginBottom="32px">
        <Grid item xs={12} md={8}>
          <Typography variant="h4" className="gradient-text" style={{ fontWeight: 800, fontFamily: 'var(--font-family)' }}>
            🛡️ Risk Intelligence Center
          </Typography>
          <Typography variant="body1" style={{ color: '#94a3b8', marginTop: '8px' }}>
            Real-time multi-dimensional risk analysis powered by AI
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper className="glass-panel" style={{ backgroundColor: '#101726', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px' }}>
             <Box height="100%" width="120px" position="relative">
               <ResponsiveContainer width="100%" height="100%">
                 <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={[{ name: 'Score', value: storeScore, fill: getRiskColorCode(100 - storeScore) }]} startAngle={180} endAngle={0}>
                   <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                   <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                 </RadialBarChart>
               </ResponsiveContainer>
               <Box position="absolute" top="0" left="0" width="100%" height="100%" display="flex" flexDirection="column" justifyContent="center" alignItems="center" style={{ paddingTop: '20px' }}>
                  <Typography variant="h5" style={{ color: '#f8fafc', fontWeight: 800 }}>{Math.round(storeScore)}</Typography>
                  <Typography variant="caption" style={{ color: '#94a3b8' }}>Store Score</Typography>
               </Box>
             </Box>
          </Paper>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" style={{ marginBottom: '24px', borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      {/* Section 1: Risk Matrix */}
      <Typography variant="h6" style={{ color: '#f8fafc', fontWeight: 700, marginBottom: '16px' }}>Comprehensive Risk Matrix</Typography>
      <TableContainer component={Paper} className="glass-panel" style={{ backgroundColor: '#101726', border: '1px solid rgba(0, 242, 254, 0.2)', marginBottom: '40px', maxHeight: '400px' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8', backgroundColor: '#101726' }}>Product</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8', backgroundColor: '#101726' }}>Category</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8', backgroundColor: '#101726', minWidth: '150px' }}>Overall Risk</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8', backgroundColor: '#101726', minWidth: '120px' }}>Stockout</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8', backgroundColor: '#101726', minWidth: '120px' }}>Expiry</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8', backgroundColor: '#101726', minWidth: '120px' }}>Ghost</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8', backgroundColor: '#101726', minWidth: '120px' }}>Financial</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8', backgroundColor: '#101726' }}>Days Rem</TableCell>
              <TableCell style={{ fontWeight: 700, color: '#94a3b8', backgroundColor: '#101726' }}>Cash Tied</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {riskMatrix.map((row) => {
              const overall = row.overall_risk || 0;
              let bg = 'transparent';
              if (overall >= 70) bg = 'rgba(255,75,114,0.05)';
              else if (overall >= 40) bg = 'rgba(245,158,11,0.05)';

              return (
                <TableRow key={row.product_id} style={{ backgroundColor: bg }}>
                  <TableCell style={{ fontWeight: 600, color: '#f8fafc' }}>{row.product_name}</TableCell>
                  <TableCell style={{ color: '#cbd5e1' }}>{row.category || 'General'}</TableCell>
                  <TableCell><RiskProgressBar value={overall} /></TableCell>
                  <TableCell><RiskProgressBar value={row.stockout_risk || 0} /></TableCell>
                  <TableCell><RiskProgressBar value={row.expiry_risk || 0} /></TableCell>
                  <TableCell><RiskProgressBar value={row.ghost_risk || 0} /></TableCell>
                  <TableCell><RiskProgressBar value={row.financial_risk || 0} /></TableCell>
                  <TableCell style={{ color: '#cbd5e1' }}>{row.days_remaining ? row.days_remaining.toFixed(1) : '∞'}</TableCell>
                  <TableCell style={{ color: '#cbd5e1', fontWeight: 600 }}>${(row.cash_tied_up || 0).toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
            {riskMatrix.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" style={{ color: '#94a3b8', padding: '20px' }}>No risk data available.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Section 2: Radar & Anomalies */}
      <Grid container spacing={4} marginBottom="40px">
        <Grid item xs={12} md={6}>
          <Typography variant="h6" style={{ color: '#f8fafc', fontWeight: 700, marginBottom: '16px' }}>Top 5 Risk Profiles</Typography>
          <Paper className="glass-panel" style={{ backgroundColor: '#101726', padding: '20px', height: '350px' }}>
            {topRisks.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                  <PolarGrid stroke="rgba(0, 242, 254, 0.2)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#162032', border: '1px solid rgba(0,242,254,0.3)', color: '#f8fafc' }} />
                  {topRisks.map((p, i) => (
                    <Radar key={p.product_id} name={p.product_name} dataKey={`prod${i}`} stroke={RADAR_COLORS[i % RADAR_COLORS.length]} fill={RADAR_COLORS[i % RADAR_COLORS.length]} fillOpacity={0.3} />
                  ))}
                  <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography style={{ color: '#94a3b8' }}>No data to display.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" style={{ color: '#f8fafc', fontWeight: 700, marginBottom: '16px' }}>Anomaly Detection</Typography>
          <Box display="flex" flexDirection="column" gap="16px" height="350px" overflow="auto">
            {anomalies.length === 0 ? (
              <Paper style={{ padding: '20px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', fontWeight: 600 }}>
                ✅ All sales patterns within normal range. No anomalies detected.
              </Paper>
            ) : (
              anomalies.map((anom, idx) => {
                const isSpike = anom.type === 'SPIKE';
                return (
                  <Card key={idx} style={{ 
                    backgroundColor: isSpike ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255, 75, 114, 0.05)', 
                    border: `1px solid ${isSpike ? '#00f2fe' : '#ff4b72'}`,
                    borderRadius: '8px'
                  }}>
                    <CardContent style={{ padding: '16px' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" style={{ color: '#f8fafc', fontWeight: 700 }}>{anom.productName}</Typography>
                        <Typography variant="caption" style={{ color: isSpike ? '#00f2fe' : '#ff4b72', fontWeight: 800, border: `1px solid ${isSpike ? '#00f2fe' : '#ff4b72'}`, padding: '2px 8px', borderRadius: '12px' }}>
                          Z-Score: {anom.z_score?.toFixed(2)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" style={{ color: '#cbd5e1', marginTop: '8px' }}>{anom.description}</Typography>
                      <Typography variant="caption" style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                        Latest: {anom.latest_sales} vs Mean: {anom.mean_sales?.toFixed(1)}
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Section 4: Ghost SKU & Margin */}
      <Grid container spacing={4} marginBottom="40px">
        <Grid item xs={12} md={4}>
          <Typography variant="h6" style={{ color: '#f8fafc', fontWeight: 700, marginBottom: '16px' }}>Ghost SKU Graveyard</Typography>
          <Paper className="glass-panel" style={{ backgroundColor: '#101726', padding: '16px', height: '300px', overflow: 'auto' }}>
            {ghostSkus.length === 0 ? (
              <Typography style={{ color: '#94a3b8' }}>No ghost SKUs detected.</Typography>
            ) : (
              <Box display="flex" flexDirection="column" gap="12px">
                {ghostSkus.map(g => (
                  <Box key={g.productId} style={{ padding: '12px', backgroundColor: '#162032', borderRadius: '8px', borderLeft: '4px solid #ff4b72' }}>
                    <Typography variant="body2" style={{ color: '#f8fafc', fontWeight: 600 }}>{g.productName}</Typography>
                    <Typography variant="caption" style={{ color: '#94a3b8' }}>Stock: {g.stockQty} | Days Inactive: {g.daysInactive || 'Unknown'}</Typography>
                    <Box display="flex" alignItems="center" gap="8px" marginTop="4px">
                       <Typography variant="caption" style={{ color: '#cbd5e1' }}>Risk Score</Typography>
                       <LinearProgress variant="determinate" value={g.riskScore || 0} sx={{ flexGrow: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { backgroundColor: '#ff4b72' } }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Typography variant="h6" style={{ color: '#f8fafc', fontWeight: 700, marginBottom: '16px' }}>Margin Health</Typography>
          <Paper className="glass-panel" style={{ backgroundColor: '#101726', padding: '20px', height: '300px' }}>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginDataFormatted} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8' }} unit="%" />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#162032', border: '1px solid rgba(0,242,254,0.3)', color: '#f8fafc' }} />
                  <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                    {marginDataFormatted.map((entry, index) => (
                      <cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Section 5: AI Narrative */}
      <Paper style={{ backgroundColor: '#090d16', padding: '24px', border: '1px solid #00f2fe', borderRadius: '12px' }}>
        <Typography variant="h6" style={{ color: '#f8fafc', fontWeight: 700, marginBottom: '16px' }}>AI Risk Narrative</Typography>
        <Box style={{ backgroundColor: '#101726', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #d946ef' }}>
          <Typography variant="body2" component="pre" style={{ color: '#00f2fe', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>
            {narrative}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default RiskAnalysis;
