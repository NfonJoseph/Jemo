Version: MVP v1
Inspiration: Jumia (UX patterns), Jemo (Brand & color)
Target Market: Cameroon (mobile-first users)

⸻

1. DESIGN PHILOSOPHY

1.1 Core Principles

Jemo’s design must be:
	•	Trust-first → Users feel safe buying from local vendors
	•	Mobile-first → Majority of users are on phones
	•	Frictionless → Minimal steps to browse and order
	•	Familiar → Inspired by Jumia so users instantly understand it
	•	Modern & clean → Flat UI, good spacing, no clutter

Rule: If a user has to think, the design failed.

⸻

2. BRAND IDENTITY

2.1 Brand Personality
	•	Friendly
	•	Reliable
	•	Local
	•	Professional
	•	Fast

2.2 Logo Usage

Assets already exist in /assets:
	•	logo-orange.jpg → primary logo
	•	logo-white.png → dark/orange backgrounds
	•	favicon.png → browser icon

Rules
	•	Never stretch the logo
	•	Maintain padding around logo (minimum 12px)
	•	Use white logo on orange backgrounds

⸻

3. COLOR SYSTEM (VERY IMPORTANT)

3.1 Primary Color (Brand)

Jemo Orange (from existing site)

--jemo-orange: #E46A2E;

Usage:
	•	Primary buttons
	•	Header background
	•	Active icons
	•	Highlights
	•	Price tags
	•	CTA elements

⸻

3.2 Neutral Colors (UI Backbone)

--gray-900: #0F172A;   /* Headings */
--gray-700: #334155;   /* Body text */
--gray-500: #64748B;   /* Muted text */
--gray-300: #CBD5E1;   /* Borders */
--gray-100: #F1F5F9;   /* Background */
--white:    #FFFFFF;

3.3 Semantic Colors (Status System)
Purpose               Color              Usage
Success             #16A34A            Delivered, Approved
Warning             #F59E0B            Pending, In progress
Error               #DC2626            Failed, Rejected
Info                #2563EB            Neutral info

3.4 Status Badge Mapping (GLOBAL RULE)
Status Type	Status	Color
KYC	PENDING	Amber
KYC	APPROVED	Green
KYC	REJECTED	Red
Order	PENDING_PAYMENT	Amber
Order	CONFIRMED	Blue
Order	PREPARING	Indigo
Order	OUT_FOR_DELIVERY	Purple
Order	DELIVERED	Green
Order	CANCELLED	Red
Payment	INITIATED	Amber
Payment	SUCCESS	Green
Payment	FAILED	Red
Delivery	SEARCHING_RIDER	Amber
Delivery	ASSIGNED	Blue
Delivery	PICKED_UP	Indigo
Delivery	ON_THE_WAY	Purple
Delivery	DELIVERED	Green
Dispute	OPEN	Amber
Dispute	RESOLVED	Green
Dispute	REJECTED	Red

4. TYPOGRAPHY

4.1 Font Family

Primary: Inter (or system-ui fallback)

font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

4.2 Type Scale

Element	Size	Weight
H1	28–32px	700
H2	22–24px	600
H3	18–20px	600
Body	14–16px	400
Small	12–13px	400

Rules:
	•	No text smaller than 12px
	•	Line height: 1.5–1.7

⸻

5. LAYOUT SYSTEM

5.1 Grid & Width
	•	Max width: 1200px
	•	Centered layout on desktop
	•	Full-width sections allowed for banners

5.2 Spacing System

Use 4px scale:
4 / 8 / 12 / 16 / 24 / 32 / 48

Never random spacing.

⸻

6. HEADER & NAVIGATION (JUMIA-INSPIRED)

6.1 Header Structure (Mobile First)

Top bar:
	•	Logo (left)
	•	Search input (center, full width)
	•	Icons (right):
	•	Cart
	•	Account

Sticky on scroll.

6.2 Search Bar (Very Important)
	•	Rounded input
	•	Placeholder: “What are you looking for…”
	•	Always visible on home
	•	Full-width on mobile

⸻

7. HOME PAGE DESIGN

7.1 Hero / Banner
	•	Large promotional banner (Flash Sale, Offers)
	•	Use illustrations (not heavy photos)
	•	CTA: Shop Now

7.2 Category Shortcuts

Horizontal scroll cards:
	•	Electronics
	•	Fashion
	•	Home
	•	Baby
	•	More…

7.3 Product Sections
	•	“Today’s Popular Picks”
	•	“Flash Sales”
	•	“New Arrivals”

Each product uses Product Card component.

⸻

8. PRODUCT CARD DESIGN (CRITICAL)

8.1 Card Elements
	•	Image (1:1 ratio)
	•	Product name (2 lines max)
	•	Price (bold, orange)
	•	Old price (optional, strikethrough)
	•	Vendor city (small text)
	•	Add to cart button (icon)

8.2 Card Rules
	•	Entire card clickable
	•	Hover elevation (desktop)
	•	Tap feedback (mobile)

⸻

9. PRODUCT DETAILS PAGE

Sections:
	1.	Image gallery (swipe on mobile)
	2.	Product name + price
	3.	Stock status
	4.	Vendor info (business name + city)
	5.	Description
	6.	Delivery type
	7.	Add to cart / Order CTA

CTA must always be visible (sticky bottom on mobile).

⸻

10. AUTH PAGES (LOGIN / REGISTER)

10.1 Design
	•	Simple centered card
	•	No distractions
	•	Phone + password primary
	•	Role selection on register

10.2 UX Rules
	•	Clear error messages
	•	Loading states
	•	Password visibility toggle

⸻

11. DASHBOARDS (ROLE-BASED)

11.1 Customer Dashboard
	•	My Orders
	•	Order Details
	•	Disputes

11.2 Vendor Dashboard
	•	KYC Status (top alert)
	•	Products
	•	Orders
	•	Create Product CTA

11.3 Rider Dashboard
	•	Available Jobs
	•	My Deliveries
	•	Status update buttons

11.4 Admin Dashboard
	•	Sidebar layout
	•	Tables for:
	•	KYC
	•	Orders
	•	Payments
	•	Disputes

⸻

12. FORMS & INPUTS

12.1 Input Style
	•	Rounded corners
	•	Clear focus state (orange outline)
	•	Error text in red

12.2 Buttons
Type	Style	Type
Primary	Orange background, white text	Primary
Secondary	Gray border	Secondary
Destructive	Red	Destructive
Ghost	No background	Ghost
Type	Style	Type

13. FEEDBACK & STATES

13.1 Loading
	•	Skeleton loaders for lists
	•	Spinner only for small actions

13.2 Empty States
	•	Friendly illustration
	•	Clear CTA (“Add your first product”)

13.3 Toasts
	•	Success (green)
	•	Error (red)
	•	Info (blue)

⸻

14. MOBILE UX RULES (NON-NEGOTIABLE)
	•	Sticky bottom actions
	•	Large tap targets
	•	Swipe where possible
	•	No hover-only actions
	•	Thumb-friendly spacing

⸻

15. ACCESSIBILITY
	•	Contrast ratio ≥ 4.5
	•	Buttons min height 44px
	•	Labels for inputs
	•	Keyboard navigation supported

⸻

16. DESIGN GOVERNANCE RULES
	1.	No inline styles
	2.	No random colors
	3.	No new components without updating this document
	4.	Reuse components always
	5.	Mobile-first, then desktop

⸻

17. IMPLEMENTATION STACK (CONFIRMED)
	•	Next.js
	•	Tailwind CSS
	•	shadcn/ui
	•	Framer Motion (light animations only)
	•	Lucide icons

⸻

18. FINAL DESIGN GOAL

Jemo should feel like Jumia-level usability,
but cleaner, lighter, and more local.

