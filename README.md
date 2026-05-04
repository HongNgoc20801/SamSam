# SamSam – Structured Family Management Platform

## Overview

SamSam is a structured digital platform designed to help separated or divorced parents coordinate child care more effectively.

Unlike traditional messaging apps, SamSam does **not support free-form chat**. Instead, it focuses on:

- Structured information  
- Clear responsibility assignment  
- Activity tracking related to children  
- Verifiable history of actions  
- Parent confirmation workflows  

The goal of this project is to **reduce conflict**, **increase transparency**, and **create a stable environment for children**.

---

## Core Concept

SamSam is built as a **structured system**, not a chat tool.

Instead of messaging, users interact through:

- Events  
- Status updates  
- Confirmations  
- Notifications  
- Trackable data  
- Audit logs  

This approach helps reduce misunderstandings and emotional conflict.

---

## System Goals

- Provide a structured co-parenting system  
- Increase transparency between parents  
- Reduce emotional communication  
- Focus on data, events, and responsibilities  
- Support long-term collaboration  
- Protect sensitive family information  

---

##  Target Users

### Primary Users
- Divorced or separated parents  
- High-conflict families  
- Parents who want to minimize direct communication  

### Future Users
- Legal guardians
- Caregivers or grandparents 
- Lawer / family professionals 

## Tech Stack

### Frontend
- Next.js  
- React  
- TypeScript  
- CSS Modules  

### Backend
- Payload CMS  
- SQLite  

### Libraries & Tools
- React Big Calendar  
- date-fns  
- Lucide React  
- Custom notification system  
- Custom i18n (EN / NO)  
- Custom audit log system  
- npm  

---

## Installation & Running
### 1. Clone the repository 
```bash
git clone https://github.com/HongNgoc20801/SamSam.git
cd SamSam 
```
### 2. Install dependencies
```bash
npm install
```
### 3. Setup environment variables
- Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```
Example .env:
# Database configuration
DATABASE_URL=file:./samsamweb.db
# Payload CMS secret key
PAYLOAD_SECRET=your-secret
# Open Banking (mock mode)
OPEN_BANKING_MOCK=0
# Enable Banking API configuration
ENABLE_BANKING_APP_ID=your-app-id
ENABLE_BANKING_API_BASE_URL=https://api.enablebanking.com
ENABLE_BANKING_ASPSP_NAME=Mock ASPSP
ENABLE_BANKING_ASPSP_COUNTRY=NO
# Path to private key for banking integration
ENABLE_BANKING_PRIVATE_KEY_PATH=./private.key
### 4. Run project 
```bash
npm run dev
```

## 📁 Project Structure

```bash
src/
├── app/
│   ├── (frontend)/        # Public pages (landing, auth)
│   ├── (protected)/       # Authenticated pages
│   │   ├── dashboard/
│   │   ├── calendar/
│   │   ├── child-info/
│   │   ├── economy/
│   │   ├── notifications/
│   │   ├── oppdateringer/
│   │   ├── profile/
│   │   ├── settings/
│   │   └── audit-logs/
│   ├── components/        # Reusable UI components
│   └── providers/         # Global providers (context, settings)
│
├── lib/
│   ├── i18n/              # Internationalization system
│   ├── notifications/     # Notification logic
│   ├── settings/          # User settings logic
│   ├── serverFetch.ts     # API utilities
│   ├── logAudit.ts        # Audit logging system
│   └── openBanking.ts     # Banking integration
│
├── collections/           # Payload CMS collections
│   ├── Users.ts
│   ├── Customers.ts
│   ├── Families.ts
│   ├── Children.ts
│   ├── CalendarEvents.ts
│   ├── EconomyTransactions.ts
│   ├── Posts.ts
│   ├── Notifications.ts
│   └── AuditLogs.ts
│
└── payload.config.ts      # Payload CMS configuration
```
## Local Development
- App : http://localhost:3000
- Login: http://localhost:3000/login
- Admin Panel: http://localhost:3000/admin

## Key Features

- Dashboard overview  
- Calendar & event management  
- Custody scheduling  
- Structured updates (no chat system)  
- Financial tracking (economy)  
- Child information & document management  
- Notifications system  
- Audit log for activity tracking  
- User profile & settings  
- Internationalization (EN / NO)  

## How to Use

After starting the application and logging in, users can navigate through the main features using the sidebar.

### 1. Dashboard
- View an overview of children and daily activities  
- Check notifications and pending tasks  

### 2. Calendar
- Create and manage events  
- Assign responsibilities to parents  
- Request confirmations for important events  

### 3. Custody Schedule
- Track which parent is currently responsible  
- Manage handovers between parents  

### 4. Updates
- Share structured updates instead of free chat  
- Comment and react to updates  

### 5. Economy
- Track shared expenses and income  
- Monitor payment status  

### 6. Child Information & Documents
- Manage child profiles and important data  
- Upload and track documents  

### 7. Audit Log
- Track system activity and changes  
- Ensure transparency between parents  

>  SamSam replaces free communication with structured actions to reduce conflict and improve collaboration.