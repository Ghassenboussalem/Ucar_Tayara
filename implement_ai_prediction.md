# Implementation Plan — Real Predictive Analytics
**Assigned to:** Team Member B  
**References:** `context/05-analytics-module.md`, `context/09-ai-agents.md`, `context/13-demo-data-strategy.md`  
**Estimated effort:** 6–10h  
**Priority:** High — most impressive visual feature for the demo

---

## Current State

The `/api/predictions` endpoint returns **hardcoded arithmetic**:
```python
predicted = float(avg_dropout) * 1.31   # 1.31 is a magic number, NOT a model
confidence = 68                          # hardcoded
```
The `WhatIfPanel.jsx` uses **hardcoded values from file 13** verbatim (correct approach for hackathon, but static).

There is **no forecast chart, no confidence bands, no risk matrix, no A/B/C scenario comparison.**

---

## What to Build

### Priority 1 — Forecast Chart with Confidence Bands (most visual impact)

A time series chart showing:
- **Past semesters** (solid line, actual data from DB)
- **Future forecast** (dashed line + shaded confidence band)

Visual: `S1_2025 → S2_2025 → S1_2026 → [S2_2026 FORECAST]`

### Priority 2 — Risk Matrix

A 2D scatter plot per institution:
- X axis: probability of degradation (based on trend slope)
- Y axis: impact (based on enrollment count)
- Each dot = one institution, color = severity

### Priority 3 — Scenario A/B/C Comparison (upgrade the WhatIfPanel)

Show all 3 intervention scenarios **side by side** instead of radio buttons:

| | No Action | Scholarships Fixed | Both |
|---|---|---|---|
| Dropout S2 2026 | 10.4% | 8.1% | 7.6% |
| Confidence | — | 71% | 62% |

---

## Option A: With Prophet (real model, harder)

### Install
```bash
cd hack4ucar-backend
pip install prophet pandas
pip freeze > requirements.txt
```

### Create `hack4ucar-backend/services/forecast_service.py`

```python
import pandas as pd
from prophet import Prophet

def forecast_kpi(historical_data: list[dict], kpi_field: str, periods: int = 2) -> dict:
    """
    historical_data: list of {semester: 'S1_2025', value: 78.3}
    Returns: {forecast: [...], lower: [...], upper: [...]}
    """
    # Convert semester labels to dates
    sem_to_date = {
        'S1_2024': '2024-02-01', 'S2_2024': '2024-09-01',
        'S1_2025': '2025-02-01', 'S2_2025': '2025-09-01',
        'S1_2026': '2026-02-01', 'S2_2026': '2026-09-01',
    }
    df = pd.DataFrame([
        {'ds': sem_to_date[d['semester']], 'y': float(d[kpi_field])}
        for d in historical_data if d['semester'] in sem_to_date and d.get(kpi_field)
    ])
    if len(df) < 3:
        return None  # not enough data

    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.3,
    )
    model.fit(df)
    future = model.make_future_dataframe(periods=periods, freq='6MS')
    forecast = model.predict(future)

    return {
        "dates": forecast['ds'].dt.strftime('%Y-%m').tolist(),
        "forecast": forecast['yhat'].round(2).tolist(),
        "lower": forecast['yhat_lower'].round(2).tolist(),
        "upper": forecast['yhat_upper'].round(2).tolist(),
        "is_forecast": [i >= len(df) for i in range(len(forecast))],
    }
```

### Add Backend Endpoint

```python
# In routes/api.py
@router.get("/forecast/{institution_id}/{kpi_field}")
def get_forecast(institution_id: int, kpi_field: str, db: Session = Depends(get_db)):
    from services.forecast_service import forecast_kpi
    rows = db.query(AcademicKPI).filter(
        AcademicKPI.institution_id == institution_id
    ).order_by(AcademicKPI.semester).all()
    data = [_row_to_dict(r) for r in rows]
    result = forecast_kpi(data, kpi_field)
    if not result:
        raise HTTPException(400, "Données insuffisantes pour la prévision")
    return result
```

---

## Option B: Pre-computed (hackathon-safe, recommended)

Skip Prophet. Instead, compute a **simple linear regression** on the existing DB data:

```python
# In routes/api.py — upgrade /api/predictions
import numpy as np

def linear_forecast(values: list[float], steps: int = 2) -> tuple[float, float]:
    """Simple OLS on index → value, return next `steps` predicted values."""
    x = np.arange(len(values))
    if len(x) < 2:
        return values[-1], values[-1]
    m, b = np.polyfit(x, values, 1)
    next_val = m * (len(values) + steps - 1) + b
    # Confidence: inverse of variance
    residuals = values - (m * x + b)
    confidence = max(40, min(95, int(100 - np.std(residuals) * 20)))
    return round(float(next_val), 1), confidence
```

This gives **real confidence scores** derived from actual data variance — much better than hardcoded `68`.

---

## Frontend — Forecast Chart Component

### Create `hack4ucar-frontend/src/components/ForecastChart.jsx`

```jsx
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, 
         Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

export default function ForecastChart({ data, color = 'rgb(29,83,148)', label }) {
  // data = [{name, actual, forecast, lower, upper, isForecast}]
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        {/* Confidence band — shaded area */}
        <Area dataKey="upper" stroke="none" fill={color} fillOpacity={0.08} />
        <Area dataKey="lower" stroke="none" fill="white" fillOpacity={1} />
        {/* Historical line — solid */}
        <Line dataKey="actual" stroke={color} strokeWidth={2.5} dot={{ r: 4 }} 
              connectNulls={false} />
        {/* Forecast line — dashed */}
        <Line dataKey="forecast" stroke={color} strokeWidth={2} strokeDasharray="6 3"
              dot={{ r: 4, fill: 'white', stroke: color }} connectNulls={false} />
        {/* Divider between past and future */}
        <ReferenceLine x="S2_2026" stroke="#94a3b8" strokeDasharray="4 2"
          label={{ value: 'Prévision →', fontSize: 10, fill: '#94a3b8' }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
```

### Add to `InstitutionDetailPage.jsx`

Replace the existing `LineChart` in the Academic tab with `ForecastChart`.  
Fetch from `/api/forecast/{id}/success_rate` on tab load.

---

## Risk Matrix Component

### Create `hack4ucar-frontend/src/components/RiskMatrix.jsx`

```jsx
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, 
         CartesianGrid, ResponsiveContainer, Cell } from 'recharts'

// data = [{name, probability, impact, severity}]
export default function RiskMatrix({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart>
        <CartesianGrid />
        <XAxis dataKey="probability" name="Probabilité" unit="%" 
               label={{ value: 'Probabilité dégradation', position: 'bottom' }} />
        <YAxis dataKey="impact" name="Impact" 
               label={{ value: 'Impact (étudiants)', angle: -90 }} />
        <ZAxis range={[60, 200]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }}
          content={({ payload }) => payload?.[0] && (
            <div style={{ background: 'white', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <p style={{ fontWeight: 700 }}>{payload[0].payload.name}</p>
              <p>Probabilité: {payload[0].payload.probability}%</p>
              <p>Impact: {payload[0].payload.impact} étudiants</p>
            </div>
          )} />
        <Scatter data={data}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.severity === 'critical' ? '#dc2626' : d.severity === 'warning' ? '#f59e0b' : '#22c55e'} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}
```

---

## WhatIfPanel Upgrade — A/B/C Side by Side

In `WhatIfPanel.jsx`, replace the radio buttons with a **3-column comparison table**:

```jsx
// Show all scenarios simultaneously
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
  {data.interventions.map((intv) => (
    <div key={intv.id} style={{ 
      padding: '14px', borderRadius: '10px', 
      border: selected?.id === intv.id ? '2px solid rgb(29,83,148)' : '1px solid #e2e8f0',
      cursor: 'pointer'
    }} onClick={() => setSelected(intv)}>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
        {intv.result}{data.unit}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{intv.label}</div>
      <div style={{ ...deltaBadge }}>{intv.delta}{data.unit}</div>
    </div>
  ))}
</div>
```

---

## Do NOT Touch

- `api.py` /api/predictions endpoint — leave it for the dashboard  
- `DashboardPage.jsx` — Ghassen's work, do not modify  
- `WhatIfPanel.jsx` — only extend, don't rewrite the scenarios  
- Database schema — no changes

---

## Merge Strategy

Branch: `feat/predictive-analytics`  
Conflict risk: `InstitutionDetailPage.jsx` (chart section) — coordinate with Ghassen.  
New files only: `ForecastChart.jsx`, `RiskMatrix.jsx`, `forecast_service.py`
