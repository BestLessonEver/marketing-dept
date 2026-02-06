# Studio OS Lead Analysis Report

**Generated:** February 5, 2026
**Data Range:** December 2023 -- February 2026 (26 months)
**Source:** Supabase `monthly_snapshots` and `lead_source_monthly_snapshots` tables

---

## Executive Summary

Studio OS has grown from 63 active students (Dec 2023) to 150 active students (Feb 2026), a 138% increase. Lead volume averaged **27.0 leads/month** over the last 12 months (Feb 2025 -- Jan 2026), with the business averaging **10.8 conversions/month** over the same period. The trial-to-conversion rate averages **59.4%** across all months with data, indicating strong closing ability once prospects attend a trial. The primary bottleneck is lead generation volume, not conversion efficiency.

---

## 1. Lead Volume Analysis

### Monthly Lead Counts (Full History)

| Month | New Leads | Trials Booked | Trials Attended | Conversions | Conv Rate |
|-------|-----------|---------------|-----------------|-------------|-----------|
| 2024-01 | 21 | 14 | 13 | 5 | 38.5% |
| 2024-02 | 15 | 8 | 8 | 4 | 50.0% |
| 2024-03 | 27 | 9 | 9 | 8 | 88.9% |
| 2024-04 | 14 | 5 | 5 | 3 | 60.0% |
| 2024-05 | 21 | 8 | 7 | 4 | 57.1% |
| 2024-06 | 13 | 14 | 14 | 9 | 64.3% |
| 2024-07 | 4 | 2 | 2 | 0 | 0.0% |
| 2024-08 | 29 | 16 | 15 | 12 | 80.0% |
| 2024-09 | 9 | 13 | 13 | 10 | 76.9% |
| 2024-10 | 25 | 21 | 20 | 11 | 55.0% |
| 2024-11 | 23 | 22 | 21 | 13 | 61.9% |
| 2024-12 | 21 | 16 | 12 | 8 | 66.7% |
| 2025-01 | 43 | 40 | 36 | 22 | 61.1% |
| 2025-02 | 31 | 13 | 12 | 9 | 75.0% |
| 2025-03 | 55 | 16 | 12 | 11 | 91.7% |
| 2025-04 | 37 | 24 | 22 | 13 | 59.1% |
| 2025-05 | 35 | 23 | 22 | 7 | 31.8% |
| 2025-06 | 31 | 21 | 18 | 9 | 50.0% |
| 2025-07 | 18 | 15 | 13 | 3 | 23.1% |
| 2025-08 | 52 | 26 | 25 | 14 | 56.0% |
| 2025-09 | 52 | 27 | 24 | 15 | 62.5% |
| 2025-10 | 35 | 21 | 16 | 10 | 62.5% |
| 2025-11 | 27 | 11 | 11 | 5 | 45.5% |
| 2025-12 | 53 | 8 | 8 | 4 | 50.0% |
| 2026-01 | 43 | 38 | 34 | 19 | 55.9% |

### Average Leads Per Month

| Period | Avg Leads/Mo | Avg Conversions/Mo | Avg Conv Rate |
|--------|-------------:|-------------------:|--------------:|
| **All time (Jan 2024 -- Jan 2026)** | 28.1 | 8.8 | 59.4% |
| **2024 (Jan--Dec)** | 18.5 | 6.4 | 58.3% |
| **2025 (Jan--Dec)** | 37.4 | 10.5 | 55.4% |
| **Last 12 months (Feb 2025 -- Jan 2026)** | 37.0 | 10.8 | 57.7% |
| **Last 6 months (Aug 2025 -- Jan 2026)** | 43.7 | 11.2 | 55.4% |
| **Last 3 months (Nov 2025 -- Jan 2026)** | 41.0 | 9.3 | 50.4% |

**Key Insight:** Lead volume has doubled from 2024 (18.5/mo) to 2025 (37.4/mo). The most recent 6 months average 43.7 leads/mo, approaching the 75-lead/month target but not yet consistently reaching it. Peak months were March 2025 (55), December 2025 (53), and both August and September 2025 (52 each).

---

## 2. Funnel Stage Conversion Rates

### Lead-to-Trial Booking Rate

| Period | Leads | Trials Booked | Booking Rate |
|--------|------:|-------------:|-------------:|
| All time | 703 | 439 | 62.4% |
| 2024 | 222 | 148 | 66.7% |
| 2025 | 449 | 245 | 54.6% |
| Last 12 months | 462 | 243 | 52.6% |

### Trial Booking-to-Attendance Rate

| Period | Trials Booked | Trials Attended | Attendance Rate |
|--------|-------------:|----------------:|----------------:|
| All time | 439 | 397 | 90.4% |
| 2024 | 148 | 139 | 93.9% |
| 2025 | 245 | 218 | 89.0% |
| Last 12 months | 243 | 218 | 89.7% |

### Trial Attendance-to-Conversion Rate

| Period | Trials Attended | Conversions | Conv Rate |
|--------|----------------:|------------:|----------:|
| All time | 397 | 219 | 55.2% |
| 2024 | 139 | 77 | 55.4% |
| 2025 | 218 | 122 | 56.0% |
| Last 12 months | 218 | 129 | 59.2% |

### Full Funnel Summary (Last 12 Months)

```
New Leads:         462 (100%)
   |
   v  52.6% booking rate
Trials Booked:     243
   |
   v  89.7% show rate
Trials Attended:   218
   |
   v  59.2% close rate
Conversions:       129
```

**Overall lead-to-conversion rate (last 12 months): 27.9%**

**Key Insight:** The trial show rate (89.7%) is excellent. The booking rate (52.6%) has room for improvement -- nearly half of leads never book a trial. The close rate at trial (59.2%) is solid and has been improving over time.

---

## 3. Lead Source Breakdown

### Source Attribution Status

Lead source attribution in `lead_source_monthly_snapshots` currently shows **all 435 tracked leads attributed to "Unknown"**. The nine configured sources (Google Ads, Facebook Ads, Instagram, Referral, Website, Walk-in, Call-in, Event, Unknown) have zero spend and zero leads recorded except for "Unknown."

**This means per-source CAC analysis is not currently possible from the database.** The monthly_snapshots table uses a default $300/month marketing spend assumption for aggregate CAC calculation.

### Configured Lead Sources

| Source | Type | Leads (All Time) | Status |
|--------|------|------------------:|--------|
| Google Ads | Paid | 0 | No data yet |
| Facebook Ads | Paid | 0 | No data yet |
| Instagram | Paid | 0 | No data yet |
| Referral | Referral | 0 | No data yet |
| Website | Organic | 0 | No data yet |
| Walk-in | Direct | 0 | No data yet |
| Call-in | Direct | 0 | No data yet |
| Event | Event | 0 | No data yet |
| Unknown | Unknown | 435 | Default bucket |

### Recommendation

To enable per-source ROI analysis, lead source attribution needs to be implemented:
1. Tag incoming leads with their source at point of entry
2. Backfill historical leads from CRM data if available
3. Connect Google Ads spend data (credentials already configured in .env.local)
4. Track Facebook/Instagram ad spend alongside lead counts

---

## 4. CAC Trends

The database uses a **default $300/month marketing spend** when no per-source spend data exists. This produces a synthetic CAC metric in monthly_snapshots.

### Monthly CAC (Using Default $300/mo Spend)

| Month | Conversions | CAC (at $300/mo) | LTV:CAC Ratio |
|-------|------------:|------------------:|--------------:|
| 2024-01 | 5 | $60.00 | 23.6x |
| 2024-02 | 4 | $75.00 | 18.9x |
| 2024-03 | 8 | $37.50 | 37.8x |
| 2024-04 | 3 | $100.00 | 14.2x |
| 2024-05 | 4 | $75.00 | 18.9x |
| 2024-06 | 9 | $33.33 | 42.6x |
| 2024-07 | 0 | N/A | N/A |
| 2024-08 | 12 | $25.00 | 56.8x |
| 2024-09 | 10 | $30.00 | 47.3x |
| 2024-10 | 11 | $27.27 | 52.0x |
| 2024-11 | 13 | $23.08 | 61.5x |
| 2024-12 | 8 | $37.50 | 37.8x |
| 2025-01 | 22 | $13.64 | 104.1x |
| 2025-02 | 9 | $33.33 | 42.6x |
| 2025-03 | 11 | $27.27 | 52.0x |
| 2025-04 | 13 | $23.08 | 61.5x |
| 2025-05 | 7 | $42.86 | 33.1x |
| 2025-06 | 9 | $33.33 | 42.6x |
| 2025-07 | 3 | $100.00 | 14.2x |
| 2025-08 | 14 | $21.43 | 66.2x |
| 2025-09 | 15 | $20.00 | 70.9x |
| 2025-10 | 10 | $30.00 | 47.3x |
| 2025-11 | 5 | $60.00 | 23.6x |
| 2025-12 | 4 | $75.00 | 18.9x |
| 2026-01 | 19 | $15.79 | 89.9x |

### CAC Summary

| Period | Avg Conversions/Mo | Avg CAC | Avg LTV:CAC |
|--------|-------------------:|--------:|------------:|
| 2024 (excl. Jul) | 7.2 | $47.47 | 37.4x |
| 2025 | 10.2 | $40.08 | 48.0x |
| Last 6 months | 11.2 | $37.04 | 52.5x |

**Note:** These CAC figures are based on the $300/mo default assumption. Actual marketing spend (Google Ads, etc.) would likely produce different CAC values. With the Google Ads integration credentials already in .env.local, connecting real spend data should be a priority.

**LTV reference:** $1,418.88 (average tenure 7.2 months at $197/month ARPU)

---

## 5. Month-over-Month Trends

### Lead Growth Trends

| Month | Leads | MoM Change | MoM % |
|-------|------:|-----------:|------:|
| 2024-01 | 21 | -- | -- |
| 2024-02 | 15 | -6 | -28.6% |
| 2024-03 | 27 | +12 | +80.0% |
| 2024-04 | 14 | -13 | -48.1% |
| 2024-05 | 21 | +7 | +50.0% |
| 2024-06 | 13 | -8 | -38.1% |
| 2024-07 | 4 | -9 | -69.2% |
| 2024-08 | 29 | +25 | +625.0% |
| 2024-09 | 9 | -20 | -69.0% |
| 2024-10 | 25 | +16 | +177.8% |
| 2024-11 | 23 | -2 | -8.0% |
| 2024-12 | 21 | -2 | -8.7% |
| 2025-01 | 43 | +22 | +104.8% |
| 2025-02 | 31 | -12 | -27.9% |
| 2025-03 | 55 | +24 | +77.4% |
| 2025-04 | 37 | -18 | -32.7% |
| 2025-05 | 35 | -2 | -5.4% |
| 2025-06 | 31 | -4 | -11.4% |
| 2025-07 | 18 | -13 | -41.9% |
| 2025-08 | 52 | +34 | +188.9% |
| 2025-09 | 52 | 0 | 0.0% |
| 2025-10 | 35 | -17 | -32.7% |
| 2025-11 | 27 | -8 | -22.9% |
| 2025-12 | 53 | +26 | +96.3% |
| 2026-01 | 43 | -10 | -18.9% |

### Seasonal Patterns Observed

- **Summer dip (Jul):** Both 2024 and 2025 show sharp drops in July (4 and 18 leads respectively). This is the weakest month consistently.
- **Back-to-school surge (Aug--Sep):** Both years show strong rebounds. Aug 2024: 29 leads, Aug 2025: 52 leads.
- **January spike:** Jan 2025 (43) and Jan 2026 (43) both show strong New Year interest.
- **March spike:** Mar 2025 was the all-time peak at 55 leads.
- **High variability:** Month-to-month swings of 30-50% are common, suggesting lead generation is not yet systematized.

### Student Growth Trajectory

| Month | Active Students | Net Change | Revenue | ARPU |
|-------|----------------:|-----------:|--------:|-----:|
| 2023-12 | 63 | -- | $0 | $0 |
| 2024-06 | 58 | -5 | $12,497 | $215 |
| 2024-12 | 89 | +31 | $17,205 | $193 |
| 2025-06 | 132 | +43 | $26,060 | $197 |
| 2025-12 | 136 | +4 | $28,401 | $209 |
| 2026-01 | 147 | +11 | $29,846 | $203 |
| 2026-02* | 150 | +3 | $29,336 | $196 |

*February 2026 is a partial month (5 days in).

---

## 6. Revenue & Retention Correlation

### Monthly Revenue Growth

| Period | Avg Monthly Revenue | Avg Students | Avg ARPU |
|--------|--------------------:|-------------:|---------:|
| Q1 2024 | $13,360 | 65 | $204 |
| Q2 2024 | $12,889 | 57 | $226 |
| Q3 2024 | $11,977 | 58 | $206 |
| Q4 2024 | $16,209 | 82 | $197 |
| Q1 2025 | $23,784 | 114 | $207 |
| Q2 2025 | $26,124 | 132 | $198 |
| Q3 2025 | $27,635 | 134 | $206 |
| Q4 2025 | $29,076 | 143 | $204 |

**Revenue has grown 118% from Q1 2024 ($13,360/mo) to Q4 2025 ($29,076/mo).**

### Retention & Churn

| Period | Avg Retention Rate | Avg Monthly Churn | Avg Lost Students/Mo |
|--------|-------------------:|------------------:|---------------------:|
| 2024 | 87.0% | 13.0% | 6.6 |
| 2025 | 91.5% | 8.5% | 8.6 |
| Last 6 months | 91.6% | 8.4% | 10.7 |

**Note:** While the retention rate has improved, the absolute number of lost students is increasing as the base grows. At 150 students and ~9% monthly churn, the studio loses approximately 13-14 students per month, requiring at least that many conversions just to maintain headcount.

---

## 7. Key Findings and Recommendations

### Strengths
1. **Strong trial close rate (59.2%)** -- Once someone attends a trial, there's a good chance of conversion
2. **Excellent trial show rate (89.7%)** -- Very few no-shows for booked trials
3. **Healthy LTV:CAC ratio** -- Even with conservative estimates, LTV far exceeds CAC
4. **Consistent growth trajectory** -- Student count has more than doubled in 2 years
5. **Revenue nearly $30K/month** -- Up from ~$13K/month two years ago

### Weaknesses
1. **Lead source attribution gap** -- All leads tracked as "Unknown," preventing ROI-by-channel analysis
2. **High variability in lead flow** -- Monthly swings of 30-50% suggest reliance on inconsistent/organic channels
3. **Booking rate declining** -- Lead-to-trial booking rate dropped from 66.7% (2024) to 54.6% (2025), possibly due to higher lead volume without commensurate follow-up capacity
4. **Summer slump** -- July is consistently weak for leads
5. **Rising absolute churn** -- As base grows, net growth requires increasingly more leads

### Path to 75 Leads/Month

Current average: **37 leads/month** (last 12 months). Gap: **38 additional leads/month needed.**

To reach 75 leads/month, the studio needs to:
- **Maintain organic baseline** (~30-40 leads/month from current sources)
- **Add 35-40 paid/structured leads/month** from tracked channels
- **Improve booking rate** back to 65%+ (would yield ~49 trials/month at 75 leads)
- **At 59% close rate on 49 trials** = ~29 conversions/month (net +15-16 after churn)

This would accelerate growth from current +3-5 students/month to +15 students/month, reaching ~200 students within 4 months of sustaining 75 leads/month.

### Priority Actions
1. **Implement lead source attribution** -- Connect Google Ads API (credentials exist), tag leads at entry
2. **Systematize follow-up** -- Address the declining booking rate with structured outreach sequences
3. **Build July/summer strategy** -- Pre-emptive campaigns for the consistent summer dip
4. **Track real marketing spend** -- Replace $300/mo default with actual channel costs
5. **Set up lead source dashboards** -- Enable real-time ROI visibility by channel

---

## Appendix: Data Quality Notes

1. **Dec 2023 snapshot** has zero revenue/lessons data (likely before invoice import began)
2. **Feb 2026 is partial** -- Only 5 days of data, metrics like conversions and attendance show as 0
3. **Lead source data** is entirely "Unknown" -- attribution was not configured during the data collection period
4. **CAC calculations** use the system default of $300/month marketing spend when no per-source spend exists
5. **Conversion rate** is calculated as conversions / trials attended (not conversions / total leads), per the Studio OS business logic
6. **LTV** is calculated from average tenure (7.2 months) x average ARPU (~$197), yielding approximately $1,419
