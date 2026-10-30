# REDOWN: Mass-adoption pricing, positioning, unit economics and buyer pitch

**Type:** Product/business IDEAS; NOT a pricing launch, subscription configuration or commercial promise  
**Captured:** 2026-10-30  
**Target audience:** Owner/founding team; subsequent marketing copy can be adapted for paying customers  
**Architecture companion:** [IMPORTANT_UNIVERSAL_S3_MEGA_S4_MULTI_CLOUD_EXPLORER_AND_RIGHT_CLICK_VISION.md](IMPORTANT_UNIVERSAL_S3_MEGA_S4_MULTI_CLOUD_EXPLORER_AND_RIGHT_CLICK_VISION.md)

## 1. Owner's objective

**Maximize sustainable adoption and the number of customers who happily pay.** Lower price is acceptable if the increase in paid users, retention and referrals compensates. Don't optimize only revenue per user or blindly assume cheapest always wins. Product must remain dependable and affordable. A beautiful interface and low-friction habit are the differentiators.

The old hypothetical **$5/month or $12/year** implies an 80% annual discount. That is not inherently invalid, but the two options feel disproportionately far apart. Recommended starting test: **$1.99/month, $12/year** (annual equals $1/month, roughly 50% less than 12 monthly payments). Keep a meaningful free plan.

This is a pricing **hypothesis** to validate with production usage, conversion and cost data. Do not silently convert existing buyers or announce prices in public until explicitly approved.

## 2. Recommended launch tiers

| Tier | Candidate price | Why it exists | Candidate entitlements (to test) |
| --- | ---: | --- | --- |
| REDOWN Free | $0 | Distribution, trust, discovery, word of mouth | A genuinely usable browser right-click save and one connected S3-compatible account, basic Explorer, ZIP/CBZ and GLB previews where supported, perhaps 10 remote saves/day. No required R2 storage account. |
| REDOWN Plus | **$1.99/month** or **$12/year** | The mass-market default: small impulse purchase | Multiple connected accounts, universal provider chooser, independent dual-pane UI, custom right-click destinations, richer history/shortcuts, provider-neutral archive/3D experiences, fair-use cloud-side transfers within an explicitly measured quota. |
| REDOWN Power (only after usage measurement) | **$4.99/month** or **$36/year** | Heavy users who require disproportionately more transfer infrastructure | More durable jobs, larger metered transfer allowances, queue concurrency, scheduled mirroring/backups if actually built. Keep transparent boundaries; do not call bandwidth unlimited. |

**Do not**:
- Charge more just because the user prefers MEGA S4 instead of Cloudflare R2, or wants to use only MEGA.
- Require purchasing R2 to use S3-compatible MEGA or another certified provider.
- Force purchase of Power just to see ZIP/CBZ/GLB previews that can be done safely at reasonable cost.
- Promise automatic cloud storage GB. REDOWN is a **storage-management and remote-transfer tool**; users separately pay their cloud storage provider.
- Advertise **unlimited server-side traffic** at $12/year without validated cost containment.
- Make REDOWN's core Explorer unusable at the free tier. Free users should be able to experience its special value.

### Alternative for testing, not default

Offer **$9/year founding-member price** to a limited early cohort if margins and support capacity justify it. Keep $12/year as target recurring standard. A decrease from $12 to $9 requires **33.3% more paying annual customers** just to match gross annual revenue at equal retention, before accounting for payment fees or support. Another experiment: $14.99/year when durable transfer costs exceed expectations. Avoid changing price based solely on download counts.

## 3. Competitive context, verified source checks

Current price pages and open-source facts checked 2026-10-30:
- **Cyberduck**: open-source/free cloud storage browser supporting S3 and other protocols. https://docs.cyberduck.io/cyberduck/faq/
- **rclone**: free/open-source command-line and API cloud file manager, with extensive S3 backends and transfer/backup capabilities. https://rclone.org/ and https://rclone.org/s3/
- **MultCloud**: commercial multi-cloud traffic-based plans; a currently published price page shows 100 GB/month around $7.99/month and 1,200 GB/year around $49.99/year, with other published pages/offers differing. Cite the specific page at launch instead of presenting a universal fixed market price: https://www.multcloud.com/plan.html
- **CloudMounter**: third-party 2026 directory lists $29.99/year starting personal subscription; validate official storefront before advertising competitor comparisons. https://www.capterra.com/p/153524/CloudMounter/pricing/

Competitive advantage must not be falsely described as "nobody else has cloud syncing." Our distinctive mix is **browser right-click URL-to-cloud saves + polished account-switching Explorer + archive-as-folder/CBZ + native 3D object preview + optional side-by-side provider management + theme-aware design + exceptionally affordable subscription**. A competitor can already be free; quality, convenience and workflow integration justify our price, not just the number of providers.

## 4. Economics: avoid $1/year fantasy pricing

Reference for cost modeling, not a computed bill:
- Cloudflare Workers: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Workflows: https://developers.cloudflare.com/workflows/platform/pricing/
- Cloudflare R2: https://developers.cloudflare.com/r2/pricing/
- Stripe US standard online card rate (published): 2.9% + $0.30 for a successful domestic card transaction, subject to actual merchant/transaction terms: https://stripe.com/pricing

### Simple gross illustrations, not forecasts

| Annual paid subscribers at $12/year | Gross annual receipts |
| ---: | ---: |
| 1,000 | $12,000 |
| 10,000 | $120,000 |
| 50,000 | $600,000 |
| 100,000 | $1,200,000 |

Payment-cost illustration with the public US card rate: one annual $12 charge would incur roughly **$0.65** processing fee before taxes, refunds and other fees; a recurring $1.99 monthly charge would incur roughly **$0.36 per successful payment**, a much higher percentage because of the fixed $0.30. Annual billing is operationally attractive, although some customers prefer monthly.

Do not confuse revenue with margin. Model per paying active user and p95 heavy-user workloads:
- Remote URL fetch and source egress, Worker CPU/request usage, Workflows/queues/Durable Objects.
- Provider API operations, outbound data, storage fees owed to *user's provider* versus charges paid by REDOWN.
- Cache footprint and invalidation for CBZ cover and folder thumbnails; compute/time for decompression.
- Multipart upload retries, transfer verification (read-back adds reads), large CBZ/ZIP/GLB preview reads.
- Support, subscription processing, tax, chargebacks, fraud, credential recovery and abuse.
- Customer acquisition cost, trial conversion, refunds, churn and referrals.

**Recommended billing discipline**: provide cheap client-side Explorer features generously; reserve server-side transfer capacity on free tier, add explicit fair-use quotas and transparent overage/pause/upgrade options for costly transfer jobs. Avoid surprising overage billing. Distinguish destination storage fees from REDOWN fees.

If users bring their own R2/MEGA credentials, they still may incur provider storage/network fees, and REDOWN may incur its own backend costs. R2 free egress does not mean third-party provider egress or every request is free.

## 5. Experiment, don't guess

Test cohort conversion and retention under:
1. Free + $1.99 monthly / $12 annual (recommended control).
2. Free + $1.99 monthly / $9 founding annual (limited opt-in launch variant).
3. Free + $2.49 monthly / $15 annual (sustainability comparison, only if needed).

Track by cohort:
- Install -> first connection -> first right-click save -> first preview -> D1/D7/D30 retention.
- Percentage completing first S3 connection and choosing a destination without support.
- Annual vs monthly checkout completion; paid conversion rate; months to recover acquisition costs.
- Referral and organic discovery from happy free users; free-to-paid upgrade events.
- Measured cost per successful remote save, provider read, thumbnail/CBZ page, durable gigabyte transferred, retries and large-user outliers.
- Gross margin after transaction fees, Cloudflare charges and support; refunds, cancellations and failed renewals.
- Compare revenue per **1,000 installs**, not just revenue per paid account. Reducing price from $12/year to $9/year requires enough additional conversion to compensate.

Do not treat more signups as proof of increased **paying** adoption. Price accessibility and actual product reliability matter together.

## 6. Suggested funnel and messaging

**Free:** "Right-click. Save to your cloud. Browse your files in one beautiful Explorer." Let the prospect feel the core habit in minutes, without providing cloud storage, a complicated development setup, or an account on a separate provider's web UI every time.

**Plus:** "Your personal multi-cloud command center for $1/month, billed annually." Independent provider accounts, polished universal Explorer, ZIP/CBZ reading, GLB viewer, nested right-click destination setup, and cross-provider transfers within clearly stated allowances.

**Power, when proven:** "More transfer capacity for serious collectors and creators." Do not pretend the provider-side costs vanish.

**MEGA S4 expansion:** "Connect MEGA S4 once using S3 credentials. Choose MEGA as your Explorer account, save from Chrome's right-click menu to your own MEGA bucket, browse ZIP/CBZ comics and GLB objects, or open R2 next to it. No Cloudflare storage account required." Always distinguish S4 from ordinary MEGA Cloud Drive; paid REDOWN plan is not a MEGA storage plan.

### Possible buyer-facing headline

> **REDOWN: Your files. Your cloud. Your rules.**  
> Right-click an image, comic, model or downloadable file. Save to your own cloud storage, then explore, preview, organize and transfer it from one beautiful interface. Choose MEGA S4, Cloudflare R2 or other compatible S3 storage. Work in a single pane or side-by-side. Pay only for the convenience, not a second storage locker.  
> **$1.99/month, or just $12/year.**  
> *All provider support and specialty features shown must be verified and explicitly marked as live or coming soon at the time of publication. Provider storage and egress charges are separate.*

### Core buyer benefits to highlight in campaigns

1. Speed: from right-click to the exact saved destination.
2. Freedom: your own S3-compatible provider/account; use MEGA-only if desired.
3. Control: custom right-click folders, history, favorites and stable object management.
4. Discovery: inspect ZIP/CBZ and GLB/glTF remotely, using one renderer independent of provider.
5. Convenience: optional two panes and robust account switcher.
6. Confidence: Keep Both default, verified move semantics, no accidental public sharing.
7. Design: polished Apple-like pacing with theme-aware provider accent colors.
8. Value: $1/month annualized for Plus, without claiming free storage or unlimited remote processing.

## 7. Product truth and launch gates

REDOWN's current Beta Explorer is still Cloudflare-coupled in `extension/beta/r2-adapter.mjs`. The legacy Explorer already contains a bundled 3D model-viewer; the Beta preview path does **not** currently implement that GLB/glTF path. ZIP/CBZ support needs live/provider-specific range and archive security verification. MEGA S4 / Custom S3 connector, vault, dual-pane multi-cloud and durable cross-cloud transfers are proposals until built, tested and released.

Never publish the customer pitch with future feature descriptions written as already shipping. Use "coming soon" for planned features; distinguish unit tests, mocked browser tests, installed-extension tests and actual provider operation tests.

### Owner decisions remaining

- Approve test prices and whether the annual discount is permanent or limited to founding customers.
- Approve exact Free and Plus usage allowances from measured cost data, not intuition.
- Decide if Power should exist at launch (recommend **no**).
- Choose credential architecture and whether optional vault pauses right-click jobs or uses a consented server session.
- Select order of provider certifications (MEGA S4 first, then custom/major S3 implementations).
- Confirm public release date only when live checks are complete.

## 8. One-line recommendation

**Keep the $12 annual anchor, reduce the monthly entry to $1.99, offer a genuinely usable free tier, and treat high-cost backend transfers as explicitly metered/fair-use. Win on product delight and adoption, not on unsustainably unlimited compute.**
