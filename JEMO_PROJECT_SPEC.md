JEMO PLATFORM – TECHNICAL PROJECT DOCUMENT (MVP)

1. Project Overview

Project Name: Jemo
Type: Online Marketplace with Hybrid Logistics
Target Country: Cameroon
Primary Goal:
Build a secure marketplace connecting Customers, Vendors, Independent Riders, and Admins, enabling real product sales, payments, and deliveries.

This document defines the exact MVP scope, roles, database, and development order.
Anything not explicitly listed here is out of MVP scope.

⸻

2. MVP Scope (Locked)

The MVP must support end-to-end order completion with trust and accountability.

MVP Must Support
	•	Product browsing
	•	Order placement
	•	Vendor fulfillment
	•	Rider delivery
	•	Admin moderation
	•	Payment recording (manual or API)

MVP Must NOT Include
	•	Subscriptions
	•	Promotions
	•	Wallet balances
	•	Analytics dashboards
	•	Mobile apps
	•	Automation-heavy logistics
	•	AI or recommendations

⸻

3. User Roles (Locked)

Each user has ONE role only.

Roles
	•	CUSTOMER
	•	VENDOR
	•	RIDER
	•	ADMIN

A user cannot have multiple roles in MVP.

⸻

4. Role Capabilities

4.1 CUSTOMER

Can:
	•	Browse products
	•	Add products to cart
	•	Checkout
	•	View order status
	•	Open disputes

Cannot:
	•	Sell products
	•	Accept deliveries
	•	Access admin tools

⸻

4.2 VENDOR

Can:
	•	Register vendor account
	•	Submit KYC
	•	List products
	•	Manage stock
	•	Receive and manage orders
	•	Choose delivery type per product

Cannot:
	•	Sell without KYC approval
	•	Approve own KYC
	•	Access admin tools

Important Rule:
Vendor products are hidden until KYC status = APPROVED.

⸻

4.3 RIDER

Can:
	•	Register rider account
	•	Submit KYC
	•	View available delivery jobs
	•	Accept delivery jobs
	•	Update delivery status

Cannot:
	•	Browse products as a seller
	•	Manage orders
	•	Access admin tools

⸻

4.4 ADMIN

Can:
	•	Approve/reject KYC
	•	Manage vendors, riders, customers
	•	View all orders
	•	Resolve disputes
	•	Suspend users

Cannot:
	•	Operate as a normal buyer/seller

⸻

5. Delivery Model (Hybrid – Locked)

Each product/order must specify delivery type:

Delivery Types
	•	VENDOR_DELIVERY
	•	JEMO_RIDER

Rules
	•	Vendor delivery → Vendor handles delivery manually
	•	Jemo rider → Delivery job is created and assigned to a rider
	•	Rider is optional until job is accepted

⸻

6. Order Lifecycle

Order Status Flow

PENDING_PAYMENT
→ CONFIRMED
→ PREPARING
→ OUT_FOR_DELIVERY
→ DELIVERED
→ (optional) DISPUTED

Payment Rules
	•	Orders may be prepaid or cash-on-delivery
	•	Payment record must exist for every order
	•	Payment confirmation unlocks delivery

⸻

7. KYC Rules (Critical)

Who Requires KYC
	•	Vendors
	•	Riders

KYC Statuses
	•	PENDING
	•	APPROVED
	•	REJECTED

Enforcement
	•	Vendors cannot list products unless approved
	•	Riders cannot accept jobs unless approved
	•	Admin approval is manual in MVP

⸻

8. Technology Stack (Locked)

Frontend
	•	Next.js (TypeScript)
	•	Tailwind CSS
	•	Single web app for all roles

Backend
	•	NestJS (TypeScript)
	•	REST API
	•	JWT-based authentication

Database
	•	PostgreSQL
	•	Prisma ORM

Storage
	•	S3-compatible storage (Cloudflare R2 or AWS S3)

Deployment
	•	Web: Vercel
	•	API: Railway / Render / Fly.io
	•	DB: Hosted PostgreSQL

⸻

9. Monorepo Structure (Recommended)

jemo-platform/
│
├─ apps/
│  ├─ web/        # Next.js app
│  └─ api/        # NestJS API
│
├─ prisma/
│  └─ schema.prisma
│
├─ packages/
│  └─ shared/     # Shared types & schemas
│
└─ README.md

10. Database Schema (Prisma – v1)

This schema is authoritative for MVP.

(Use exactly as defined)

Enums

enum UserRole { CUSTOMER VENDOR RIDER ADMIN }
enum KycStatus { PENDING APPROVED REJECTED }
enum OrderStatus { PENDING_PAYMENT CONFIRMED PREPARING OUT_FOR_DELIVERY DELIVERED CANCELLED }
enum PaymentStatus { INITIATED SUCCESS FAILED REFUNDED }
enum DeliveryStatus { SEARCHING_RIDER ASSIGNED PICKED_UP ON_THE_WAY DELIVERED CANCELLED }
enum DeliveryType { VENDOR_DELIVERY JEMO_RIDER }

Core Models
	•	User
	•	VendorProfile
	•	RiderProfile
	•	KycSubmission
	•	Product
	•	ProductImage
	•	Order
	•	OrderItem
	•	Payment
	•	Delivery
	•	Dispute

(Use the exact schema already provided previously without modification.)

⸻

11. API Responsibility Breakdown

Auth Module
	•	Register
	•	Login
	•	Role-based access guards

Vendor Module
	•	Profile
	•	KYC submission
	•	Product CRUD
	•	Order management

Rider Module
	•	Profile
	•	KYC submission
	•	View deliveries
	•	Accept/update delivery jobs

Order Module
	•	Create order
	•	Update order status
	•	Fetch order history

Payment Module
	•	Initiate payment
	•	Record webhook/manual payment
	•	Update order status

Admin Module
	•	KYC approval
	•	User management
	•	Order overview
	•	Dispute resolution

⸻

12. Development Order (STRICT)

You must build in this order:
	1.	Database schema + migrations
	2.	Authentication + role guards
	3.	Vendor onboarding + KYC
	4.	Product listing
	5.	Order creation
	6.	Delivery logic
	7.	Rider job acceptance
	8.	Payment recording
	9.	Admin moderation
	10.	Disputes

Skipping steps is not allowed.

⸻

13. Cursor Usage Rules (Important)
	•	Generate one module at a time
	•	Never ask Cursor to build “the whole app”
	•	Always test after each module
	•	Commit after each working feature
	•	Refer back to this document when unsure

⸻

14. MVP Success Criteria

The MVP is successful when:
	•	A vendor can sell a product
	•	A customer can receive it
	•	A rider can deliver it
	•	Admin can resolve disputes
	•	Money is accounted for

⸻

15. Post-MVP (Explicitly Out of Scope)
	•	Vendor subscriptions
	•	Promotions
	•	Wallet balances
	•	Mobile apps
	•	Automation-heavy logistics
	•	Analytics