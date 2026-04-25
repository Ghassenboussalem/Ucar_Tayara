"""
Forecast service using Facebook Prophet.
Generates time-series forecasts with confidence bands for KPI data.
"""
import logging
import pandas as pd
import numpy as np
from prophet import Prophet

logger = logging.getLogger(__name__)

# Map semester labels to ISO dates (mid-semester)
SEM_TO_DATE = {
    'S1_2023': '2023-02-15',
    'S2_2023': '2023-09-15',
    'S1_2024': '2024-02-15',
    'S2_2024': '2024-09-15',
    'S1_2025': '2025-02-15',
    'S2_2025': '2025-09-15',
    'S1_2026': '2026-02-15',
    'S2_2026': '2026-09-15',
}

DATE_TO_SEM = {v: k for k, v in SEM_TO_DATE.items()}


def forecast_kpi(
    historical_data: list[dict],
    kpi_field: str,
    periods: int = 2,
) -> dict | None:
    """
    Run Prophet on KPI time series and return forecast with confidence bands.

    Args:
        historical_data: list of row dicts from academic_kpis / finance_kpis / hr_kpis
        kpi_field: column name to forecast (e.g. 'success_rate', 'dropout_rate')
        periods: number of future semesters to forecast (default 2)

    Returns:
        {
          points: [{name, actual, forecast, lower, upper, is_forecast}],
          trend: 'up' | 'down' | 'stable',
          change_pct: float,         # % change from last actual to last forecast
          confidence: int,           # 0-100
        }
        or None if insufficient data.
    """
    # Build dataframe
    rows = []
    for d in historical_data:
        sem = d.get('semester') or d.get('fiscal_year')
        val = d.get(kpi_field)
        if sem and val is not None and sem in SEM_TO_DATE:
            rows.append({'ds': SEM_TO_DATE[sem], 'y': float(val)})

    if len(rows) < 3:
        return None  # Prophet needs at least 3 data points

    df = pd.DataFrame(rows).sort_values('ds').drop_duplicates('ds')

    try:
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
            changepoint_prior_scale=0.3,  # flexible for only 3-6 points
            interval_width=0.80,          # 80% confidence bands
        )
        model.fit(df, iter=300)           # fewer iterations = faster for small data

        # Generate future periods (6-month frequency)
        future = model.make_future_dataframe(periods=periods, freq='6MS')
        forecast = model.predict(future)

        # Merge actual + predicted
        actual_by_date = {r['ds']: r['y'] for r in rows}
        all_sem_dates = sorted(SEM_TO_DATE.items(), key=lambda x: x[1])  # [(label, date)]

        points = []
        for _, row in forecast.iterrows():
            ds = str(row['ds'].date())
            # Snap to nearest semester label (within 60-day window)
            sem_label = DATE_TO_SEM.get(ds)
            if not sem_label:
                # Find nearest semester by date proximity
                from datetime import datetime
                row_dt = datetime.strptime(ds, '%Y-%m-%d')
                closest = min(all_sem_dates, key=lambda x: abs((datetime.strptime(x[1], '%Y-%m-%d') - row_dt).days))
                if abs((datetime.strptime(closest[1], '%Y-%m-%d') - row_dt).days) <= 90:
                    sem_label = closest[0]
                else:
                    sem_label = ds[:7]  # fallback: YYYY-MM
            is_fc = ds not in actual_by_date
            points.append({
                'name': sem_label,
                'actual': round(actual_by_date[ds], 2) if not is_fc else None,
                'forecast': round(float(row['yhat']), 2),
                'lower': round(float(row['yhat_lower']), 2),
                'upper': round(float(row['yhat_upper']), 2),
                'is_forecast': is_fc,
            })

        # Metrics
        last_actual = df['y'].iloc[-1]
        last_forecast = float(forecast['yhat'].iloc[-1])
        change_pct = round((last_forecast - last_actual) / last_actual * 100, 1) if last_actual != 0 else 0

        # Confidence: inverse of relative uncertainty in last forecast period
        last_fc_row = forecast.iloc[-1]
        band_width = float(last_fc_row['yhat_upper'] - last_fc_row['yhat_lower'])
        relative_uncertainty = band_width / abs(float(last_fc_row['yhat'])) if last_fc_row['yhat'] != 0 else 1
        confidence = max(40, min(92, int(100 - relative_uncertainty * 60)))

        trend = 'up' if change_pct > 1.5 else 'down' if change_pct < -1.5 else 'stable'

        return {
            'points': points,
            'trend': trend,
            'change_pct': change_pct,
            'confidence': confidence,
            'last_actual': round(float(last_actual), 2),
            'last_forecast': round(last_forecast, 2),
        }

    except Exception as e:
        logger.warning(f"Prophet forecast failed for {kpi_field}: {e}")
        return _linear_fallback(df, kpi_field, periods)


def _linear_fallback(df: pd.DataFrame, kpi_field: str, periods: int) -> dict:
    """
    Simple numpy linear regression fallback when Prophet fails.
    Still gives real confidence scores based on data variance.
    """
    x = np.arange(len(df))
    y = df['y'].values
    m, b = np.polyfit(x, y, 1)
    residuals = y - (m * x + b)
    std = np.std(residuals)
    confidence = max(40, min(85, int(100 - std / (np.mean(y) + 1e-6) * 100)))

    points = []
    dates = df['ds'].tolist()
    for i, (ds, yi) in enumerate(zip(dates, y)):
        sem_label = DATE_TO_SEM.get(str(pd.Timestamp(ds).date()), str(ds)[:7])
        predicted = m * i + b
        points.append({
            'name': sem_label,
            'actual': round(float(yi), 2),
            'forecast': round(float(predicted), 2),
            'lower': round(float(predicted - 1.28 * std), 2),
            'upper': round(float(predicted + 1.28 * std), 2),
            'is_forecast': False,
        })

    # Add future periods
    last_date = pd.Timestamp(dates[-1])
    sem_keys = list(SEM_TO_DATE.keys())
    last_sem_date = str(last_date.date())
    last_sem_idx = list(SEM_TO_DATE.values()).index(last_sem_date) if last_sem_date in list(SEM_TO_DATE.values()) else -1

    for j in range(1, periods + 1):
        fi = len(x) + j - 1
        predicted = m * fi + b
        sem_label = sem_keys[last_sem_idx + j] if last_sem_idx + j < len(sem_keys) else f'Prév. {j}'
        points.append({
            'name': sem_label,
            'actual': None,
            'forecast': round(float(predicted), 2),
            'lower': round(float(predicted - 1.28 * std), 2),
            'upper': round(float(predicted + 1.28 * std), 2),
            'is_forecast': True,
        })

    last_actual = float(y[-1])
    last_forecast = points[-1]['forecast']
    change_pct = round((last_forecast - last_actual) / last_actual * 100, 1) if last_actual != 0 else 0
    trend = 'up' if change_pct > 1.5 else 'down' if change_pct < -1.5 else 'stable'

    return {
        'points': points,
        'trend': trend,
        'change_pct': change_pct,
        'confidence': confidence,
        'last_actual': round(last_actual, 2),
        'last_forecast': round(last_forecast, 2),
    }


def compute_risk_matrix(institutions_data: list[dict]) -> list[dict]:
    """
    Compute probability × impact risk score for each institution.
    
    probability: based on slope of last 3 dropout_rate values (how fast it's rising)
    impact: based on total_enrolled (how many students affected)
    """
    results = []
    for inst in institutions_data:
        academic = inst.get('academic', [])
        if not academic:
            continue

        # Probability: slope of dropout trend
        dropout_vals = [float(r.get('dropout_rate') or 0) for r in academic[-3:] if r.get('dropout_rate')]
        if len(dropout_vals) >= 2:
            slope = (dropout_vals[-1] - dropout_vals[0]) / max(1, len(dropout_vals) - 1)
            probability = min(95, max(5, int(50 + slope * 15)))
        else:
            probability = int(float(academic[-1].get('dropout_rate') or 0) * 6)

        # Impact: enrollment size
        enrolled = int(academic[-1].get('total_enrolled') or 0)
        impact = enrolled

        # Severity
        latest_dropout = float(academic[-1].get('dropout_rate') or 0)
        severity = 'critical' if latest_dropout > 12 else 'warning' if latest_dropout > 7 else 'ok'

        results.append({
            'id': inst['institution']['id'],
            'name': inst['institution']['name_fr'],
            'code': inst['institution']['code'],
            'probability': probability,
            'impact': impact,
            'dropout_rate': latest_dropout,
            'severity': severity,
        })

    return sorted(results, key=lambda x: x['probability'] * x['impact'], reverse=True)
