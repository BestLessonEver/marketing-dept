# Marketing Department - Best Lesson Ever

Agent team workspace for marketing strategy, content generation, and lead growth.

## Business Context

### Studio Details
- **Name**: Best Lesson Ever
- **Location**: Friendswood, TX (Houston metro area)
- **Upcoming Location**: Sugar Land, TX
- **Website**: bestlessonever.com/friendswood
- **Active Students**: ~150
- **Monthly Revenue**: ~$30,000
- **Ad Budget**: $100-500/month (Google Ads + Facebook)

### Services
Guitar, Piano, Voice, Drums, Violin, Bass, Ukulele lessons

### Target Audience
- Parents of children ages 5-18
- Adults seeking music lessons
- Service area: Friendswood, League City, Pearland, Clear Lake, Sugar Land

### Brand Voice
- **Irreverent and witty** - meme-energy, internet-savvy
- **Fun first** - don't take ourselves too seriously
- **Encouraging** - supportive without being cheesy
- **Educational** - real value, not fluff
- Think: cool music teacher with great Twitter game

### Hard Rules
- 3-4 sentences MAX for social content
- No corporate speak
- No cliches ("music builds discipline", "unlock potential")
- No hard sales, soft CTA only
- No cheesy sentimentality

### What Makes Us Different
1. **More performance opportunities than anywhere** - recitals, showcases, real stages
2. **Teachers who actually play music for a living** - working musicians, not just instructors
3. **Learning that's actually fun** - no boring method books, no pressure

---

## Lead Funnel & KPIs

### Current Metrics (from Studio OS)
- **Lead Target**: 75 leads/month
- **Current Avg**: ~20-30 leads/month
- **Trial Booking Rate**: ~60% of leads book a trial
- **Trial Attendance Rate**: ~75% of booked trials attend
- **Trial Conversion Rate**: ~55% of attended trials convert
- **ARPU**: ~$203/student/month
- **LTV**: ~$1,449 (avg 7.2 months tenure)
- **CAC**: Varies by channel

### Funnel Definition
```
Lead → Trial Booked → Trial Attended → Member
```
- **Conversion Rate = Conversions / Trials Attended** (NOT leads)
- Converted statuses: `member`, `member_lost`

### Data Sources
- **Studio OS Supabase**: Lead counts, trial data, conversion rates, revenue
- **Google Ads**: Campaign metrics, spend, conversions, search terms
- Lead source tracking in `lead_source_monthly_snapshots` table

---

## 75-Lead Strategy Target

### The Math
To hit 75 leads/month with current funnel rates:
- 75 leads → ~45 trials booked → ~34 trials attended → ~19 new students/month
- At $203 ARPU → ~$3,857 additional monthly revenue per cohort
- At current CAC, need ~$2,250-3,750/month total marketing spend

### Channel Mix Targets
| Channel | Current | Target | Strategy |
|---------|---------|--------|----------|
| Google Ads | ~10/mo | 25/mo | Increase budget, optimize keywords |
| Organic/SEO | ~3/mo | 15/mo | City pages, blog content, local SEO |
| Facebook | ~5/mo | 10/mo | Retargeting, lookalike audiences |
| Referral | ~5/mo | 10/mo | Referral program, incentives |
| Events | ~3/mo | 10/mo | Community events, school partnerships |
| Walk-in/Other | ~4/mo | 5/mo | Signage, local presence |

---

## Content Strategy

### SEO Keywords (7 instruments x 5 cities = 35 landing pages)
**Instruments**: guitar, piano, voice, drums, violin, bass, ukulele
**Cities**: Friendswood, League City, Pearland, Clear Lake, Sugar Land

**Primary keywords**: "[instrument] lessons [city] TX"
**Secondary**: "kids [instrument] lessons near me", "adult [instrument] classes [city]"

### Content Calendar Cadence
- **Blog posts**: 2/week (SEO-focused, educational)
- **Social media**: 5/week across platforms
- **Email newsletter**: 1/week to leads, 1/month to members
- **City landing pages**: Build all 35, then maintain

### Content Pillars
1. Student highlights & success stories (30%)
2. Practice tips & music education (25%)
3. Teacher spotlights & expertise (25%)
4. Behind the scenes & studio culture (20%)

---

## Infrastructure

### Existing Systems
- **Studio OS** (`~/studio-os-v2/`): Analytics dashboard, Supabase database
- **Marketing Assistant** (`~/marketing-assistant/`): Next.js app with AI content generation
- **Google Ads Tools** (`~/google-ads-tools/`): Google Ads API scripts
- **WordPress**: bestlessonever.com (needs REST API credentials)

### Credentials Needed
- Supabase: Available in `~/studio-os-v2/web/.env.local`
- Google Ads: Available in `~/google-ads-tools/.env`
- WordPress: Needs Application Password setup (blocked)
- Anthropic: Available in `~/studio-os-v2/web/.env.local`

---

## Agent Team Playbooks

### Sprint 1: SEO Foundation
1. Build keyword research matrix (35 instrument+city combinations)
2. Create city landing page templates
3. Write first 10 blog posts targeting high-volume keywords
4. Set up content calendar

### Sprint 2: Paid Ads Optimization
1. Audit current Google Ads campaigns
2. Create new ad copy variants
3. Set up conversion tracking
4. Build remarketing audiences

### Sprint 3: Content Engine
1. Email nurture sequences for trial leads
2. Social media content batch creation
3. Newsletter template and schedule
4. Referral program materials

### Sprint 4: Events & Partnerships
1. Event marketing playbook
2. School partnership outreach templates
3. Community event calendar
4. Local business cross-promotion


<claude-mem-context>

</claude-mem-context>