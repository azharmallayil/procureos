import {
  Item,
  Vendor,
  RFQ,
  QuotationEvaluation,
  PurchaseOrder,
  Delivery,
  PaymentMilestone,
  Asset,
  UserProfile,
} from '../types/procurement';

export const DEMO_DATA_DISCLAIMER = '';

// ============================================================================
// Production Master User Store
// Super Admins: admin@procureos.com & Muhammed Azhar (muhammed.azhar@arabitra.com)
// ============================================================================
export const MOCK_USERS: UserProfile[] = [
  {
    id: 'USR-ADMIN',
    name: 'ProcureOS System Administrator',
    email: 'admin@procureos.com',
    role: 'Super Admin',
    entity: 'GROUP',
    department: 'Technical Systems & Security',
    status: 'Active',
    twoFactorEnabled: true,
    lastLogin: 'Just now',
  },
  {
    id: 'USR-AZHAR',
    name: 'Muhammed Azhar',
    email: 'muhammed.azhar@arabitra.com',
    role: 'Super Admin',
    entity: 'GROUP',
    department: 'Executive Administration',
    status: 'Active',
    twoFactorEnabled: true,
    lastLogin: 'Just now',
  },
];

// ============================================================================
// Clean Production Master Datasets (Zero Demo Transactions)
// Ready for live office operations, genuine vendor onboarding, and item imports
// ============================================================================
export const MOCK_ITEMS: Item[] = [];
export const MOCK_VENDORS: Vendor[] = [];
export const MOCK_RFQS: RFQ[] = [];
export const MOCK_QUOTATIONS: QuotationEvaluation[] = [];
export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [];
export const MOCK_DELIVERIES: Delivery[] = [];
export const MOCK_PAYMENTS: PaymentMilestone[] = [];
export const MOCK_ASSETS: Asset[] = [];

// Baseline Analytics Aggregations for Cockpit Visualization
export const SPEND_BY_MONTH = [
  { month: 'May 2026', fitco: 0, arabitra: 0, total: 0 },
  { month: 'Jun 2026', fitco: 0, arabitra: 0, total: 0 },
  { month: 'Jul 2026', fitco: 0, arabitra: 0, total: 0 },
  { month: 'Aug 2026', fitco: 0, arabitra: 0, total: 0 },
  { month: 'Sep 2026', fitco: 0, arabitra: 0, total: 0 },
  { month: 'Oct 2026', fitco: 0, arabitra: 0, total: 0 },
];

export const SPEND_BY_CATEGORY = [
  { name: 'AI Worker Safety & Dashcams', value: 0, color: '#06b6d4' },
  { name: 'Fleet Telematics & GPS Trackers', value: 0, color: '#10b981' },
  { name: 'LMI Crane Systems & Rigging Sensors', value: 0, color: '#3b82f6' },
  { name: 'Cold Chain BLE & Fuel Sensors', value: 0, color: '#f59e0b' },
  { name: 'Network Routers & PoE Switches', value: 0, color: '#8b5cf6' },
];

export const SUPPLIER_PERFORMANCE_METRICS = [
  { supplier: 'Active Approved Suppliers', onTime: 100, quality: 100, spendM: 0 },
];
