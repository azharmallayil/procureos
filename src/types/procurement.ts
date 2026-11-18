export type Company = 'FITCO' | 'ARABITRA' | 'ALL';

export type EntityId = 'FITCO' | 'ARABITRA';

export type ModuleId =
  | 'dashboard'
  | 'items'
  | 'vendors'
  | 'requisitions'
  | 'rfqs'
  | 'quotations'
  | 'purchaseOrders'
  | 'deliveries'
  | 'payments'
  | 'assets'
  | 'team'
  | 'admin';

export type UserRole =
  | 'Super Admin'
  | 'Procurement Director'
  | 'Procurement Engineer'
  | 'Purchasing Specialist'
  | 'Site Receiving Officer'
  | 'Financial Controller'
  | 'Internal Auditor';

export const ALL_USER_ROLES: UserRole[] = [
  'Super Admin',
  'Procurement Director',
  'Procurement Engineer',
  'Purchasing Specialist',
  'Site Receiving Officer',
  'Financial Controller',
  'Internal Auditor',
];

export const ROLE_MODULE_ACCESS: Record<UserRole, ModuleId[]> = {
  'Super Admin': [
    'dashboard',
    'items',
    'vendors',
    'requisitions',
    'rfqs',
    'quotations',
    'purchaseOrders',
    'deliveries',
    'payments',
    'assets',
    'admin',
  ],
  'Procurement Director': [
    'dashboard',
    'items',
    'vendors',
    'requisitions',
    'rfqs',
    'quotations',
    'purchaseOrders',
    'deliveries',
    'payments',
    'assets',
  ],
  'Procurement Engineer': [
    'dashboard',
    'items',
    'vendors',
    'requisitions',
    'rfqs',
    'quotations',
    'purchaseOrders',
    'assets',
  ],
  'Purchasing Specialist': [
    'dashboard',
    'items',
    'vendors',
    'requisitions',
    'rfqs',
    'quotations',
    'purchaseOrders',
  ],
  'Site Receiving Officer': [
    'dashboard',
    'items',
    'purchaseOrders',
    'deliveries',
    'assets',
  ],
  'Financial Controller': [
    'dashboard',
    'vendors',
    'quotations',
    'purchaseOrders',
    'payments',
  ],
  'Internal Auditor': [
    'dashboard',
    'items',
    'vendors',
    'requisitions',
    'rfqs',
    'quotations',
    'purchaseOrders',
    'deliveries',
    'payments',
    'assets',
  ],
};

export const ROLE_DETAILS: Record<
  UserRole,
  {
    title: string;
    category: string;
    description: string;
    badgeVariant: 'amber' | 'cyan' | 'emerald' | 'rose' | 'indigo' | 'purple' | 'slate' | 'blue';
  }
> = {
  'Super Admin': {
    title: 'Super Admin',
    category: 'System Governance',
    description: 'Full unconstrained platform control, telemetry, user management & disaster recovery',
    badgeVariant: 'amber',
  },
  'Procurement Director': {
    title: 'Procurement Director',
    category: 'Executive Procurement',
    description: 'High-value PO sign-offs, commercial vendor governance & tender awards',
    badgeVariant: 'purple',
  },
  'Procurement Engineer': {
    title: 'Procurement Engineer',
    category: 'Technical & Tendering',
    description: 'Requisitioning, RFQ specification, BOQ comparison & item master catalog',
    badgeVariant: 'cyan',
  },
  'Purchasing Specialist': {
    title: 'Purchasing Specialist',
    category: 'Commercial Sourcing',
    description: 'Vendor bidding, commercial quote pricing adjustments & PO issuance',
    badgeVariant: 'blue',
  },
  'Site Receiving Officer': {
    title: 'Site Receiving Officer',
    category: 'Logistics & Receiving',
    description: 'Physical site deliveries, GRN goods inspection & equipment acceptance',
    badgeVariant: 'emerald',
  },
  'Financial Controller': {
    title: 'Financial Controller',
    category: 'Finance & Treasury',
    description: 'PO commercial approval, SARIE bank disbursements & tax invoice validation',
    badgeVariant: 'indigo',
  },
  'Internal Auditor': {
    title: 'Internal Auditor',
    category: 'Compliance & Audit',
    description: 'Read-only audit inspection across all transactions, ledgers & audit logs',
    badgeVariant: 'slate',
  },
};

export interface PermissionMatrix {
  canApprovePO: boolean;
  canApproveHighValuePO: boolean;
  canCreateRFQ: boolean;
  canAwardBid: boolean;
  canReleasePayment: boolean;
  canAuditLogs: boolean;
  canManageVendors: boolean;
  canReceiveShipment: boolean;
  canEditQuotePrice: boolean;
  canDeleteQuotation: boolean;
  canDeleteRFQ: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  entity: EntityId | 'GROUP';
  avatar?: string;
  department: string;
  status: 'Active' | 'Suspended' | 'Pending Verification';
  twoFactorEnabled: boolean;
  lastLogin: string;
  customPermissions?: Partial<PermissionMatrix>;
}

export type ItemCategory =
  | 'Heavy Equipment & Spares'
  | 'Mechanical & Piping'
  | 'Electrical & Instrumentation'
  | 'Civil & Structural'
  | 'Safety & PPE'
  | 'IT & Automation';

export interface Item {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: ItemCategory;
  uom: string; // Unit of measure (e.g. EA, M, MT, SET, LOT)
  stockLevel: number;
  reorderPoint: number;
  unitPriceSAR: number;
  entity: EntityId | 'SHARED';
  primaryVendorId: string;
  location: string;
  status: 'In Stock' | 'Low Stock' | 'Critical' | 'Discontinued';
  leadTimeDays: number;
  updatedAt: string;
}

export type VendorStatus = 'Approved' | 'Preferred' | 'Under Audit' | 'Probation' | 'Blacklisted';

export interface Vendor {
  id: string;
  name: string;
  code: string;
  crNumber: string; // Commercial Registration
  vatNumber: string;
  category: ItemCategory;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  status: VendorStatus;
  entityScope: 'FITCO Approved' | 'Arabitra Approved' | 'Joint / Group';
  rating: number; // 1-5
  onTimeDeliveryRate: number; // percentage e.g. 96
  qualityComplianceRate: number; // percentage
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  country: string;
  totalSpendSAR: number;
  activeContractsCount: number;
}

export type RFQStatus = 'Draft' | 'Open' | 'Under Evaluation' | 'Awarded' | 'Closed' | 'Cancelled';

export type PurchaseRequisitionStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Converted to RFQ' | 'Cancelled';

export interface PurchaseRequisitionLineItem {
  id: string;
  itemId?: string;
  sku?: string;
  description: string;
  quantity: number;
  uom: string;
  estimatedUnitPriceSAR: number;
  estimatedTotalSAR: number;
}

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  title: string;
  entity: EntityId;
  department: string;
  requestedBy: string;
  requestDate: string;
  requiredDate: string;
  projectName: string;
  deliveryLocation: string;
  justification: string;
  priority: 'Urgent' | 'High' | 'Normal';
  status: PurchaseRequisitionStatus;
  estimatedTotalSAR: number;
  lineItems: PurchaseRequisitionLineItem[];
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  linkedRfqId?: string;
  linkedRfqNumber?: string;
}


export interface RFQLineItem {
  id: string;
  itemId?: string;
  description: string;
  quantity: number;
  uom: string;
  targetPriceSAR?: number;
}

export interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  projectName: string;
  entity: EntityId;
  status: RFQStatus;
  publishDate: string;
  closingDate: string;
  budgetEstimatedSAR: number;
  invitedVendorsCount: number;
  invitedVendorIds?: string[];
  purchaseRequisitionId?: string;
  purchaseRequisitionNumber?: string;
  receivedBidsCount: number;
  requestedBy: string;
  lineItems: RFQLineItem[];
  priority: 'Urgent' | 'High' | 'Normal';
}

export type ItemMatchStatus =
  | 'Exact Match'
  | 'Possible Match / Alternative'
  | 'Additional Quoted Item'
  | 'Unmatched / Needs Review';

export interface QuotationPdfAttachment {
  docId?: string;
  fileName: string;
  fileSizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  proposalRefNumber?: string;
  pdfDataUrl?: string;
  cloudStoragePath?: string;
}

export interface QuoteLineItemPrice {
  rfqLineItemId?: string;
  lineNumber?: number;
  itemName?: string;
  sku?: string;
  modelNumber?: string;
  brand?: string;
  description: string;
  quantity: number; // Supplier's quoted quantity (primary source of truth)
  requestedQuantity?: number; // Original RFQ requested quantity (if matched)
  uom: string;
  unitPriceSAR: number;
  discountPercent?: number;
  taxPercent?: number;
  totalPriceSAR: number;
  notes?: string;
  remarks?: string;
  matchStatus?: ItemMatchStatus;
  matchConfidence?: number; // 0 - 100
  matchReason?: string;
  needsVerification?: boolean;
}

export interface QuotationComparisonItem {
  vendorId: string;
  vendorName: string;
  quotedTotalSAR: number;
  subtotalSAR?: number;
  taxAmountSAR?: number;
  currency?: string;
  quoteReference?: string;
  quotationDate?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  leadTimeDays: number;
  technicalScore: number; // out of 100
  commercialScore: number; // out of 100
  compositeRank: number;
  recommended: boolean;
  status: 'Received' | 'Shortlisted' | 'Awarded' | 'Rejected';
  validityDate: string;
  notes: string;
  attachment?: QuotationPdfAttachment;
  lineItems?: QuoteLineItemPrice[];
  processingStatus?: 'Uploaded' | 'Processing' | 'Extracting' | 'Matching' | 'Review Required' | 'Completed' | 'Failed';
  aiConfidenceScore?: number;
}

export interface QuotationEvaluation {
  id: string;
  rfqId: string;
  rfqNumber: string;
  rfqTitle: string;
  projectName: string;
  entity: EntityId;
  totalBudgetSAR: number;
  evaluators: string[];
  status: 'Draft Evaluation' | 'Final Committee Review' | 'Awarded';
  submissions: QuotationComparisonItem[];
}

export type POStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Issued'
  | 'In Transit'
  | 'Partially Received'
  | 'Received'
  | 'Invoiced'
  | 'Closed'
  | 'Cancelled';

export interface POLineItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  uom: string;
  unitPriceSAR: number;
  totalPriceSAR: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  rfqNumber?: string;
  vendorId: string;
  vendorName: string;
  entity: EntityId;
  projectSite: string;
  issueDate: string;
  expectedDeliveryDate: string;
  totalAmountSAR: number;
  taxAmountSAR: number; // 15% VAT
  grandTotalSAR: number;
  status: POStatus;
  paymentTerms: string;
  approvalStage: 'Purchasing' | 'Technical' | 'Finance Director' | 'Executive VP' | 'Fully Approved';
  currentApproverRole: UserRole | 'None';
  lineItems: POLineItem[];
  paymentStatus: 'Unpaid' | 'Advance Paid' | 'Milestone 50%' | 'Fully Paid';
}

export type DeliveryStatus = 'Scheduled' | 'In Transit' | 'Delivered' | 'Inspected & Accepted' | 'Delayed' | 'Rejected';

export interface Delivery {
  id: string;
  trackingNumber: string;
  poNumber: string;
  vendorName: string;
  entity: EntityId;
  destinationSite: string;
  carrier: string;
  driverName?: string;
  driverContact?: string;
  dispatchDate: string;
  expectedDate: string;
  actualDate?: string;
  status: DeliveryStatus;
  isOverdue: boolean;
  receivedBy?: string;
  qcInspectionStatus: 'Pending Inspection' | 'Passed' | 'Conditional Acceptance' | 'Failed';
  remarks?: string;
}

export type PaymentStatus = 'Scheduled' | 'Pending Approval' | 'Processing' | 'Paid' | 'Hold' | 'Disputed';

export interface PaymentMilestone {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  vendorName: string;
  entity: EntityId;
  amountSAR: number;
  dueDate: string;
  paymentDate?: string;
  milestoneDescription: string;
  status: PaymentStatus;
  paymentMethod: 'Bank Transfer (SARIE)' | 'Letter of Credit (LC)' | 'Corporate Cheque' | 'Escrow';
  bankReference?: string;
  approvedBy?: string;
}

export type AssetCondition = 'Operational' | 'In Maintenance' | 'Calibration Required' | 'Decommissioned' | 'Standby';

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  serialNumber: string;
  category: string;
  entity: EntityId;
  assignedProject: string;
  custodian: string;
  acquisitionCostSAR: number;
  purchaseDate: string;
  condition: AssetCondition;
  lastInspectionDate: string;
  nextInspectionDate: string;
  location: string;
}

export interface KPIStats {
  totalSpendSAR: number;
  spendChangePercent: number;
  activeRfqsCount: number;
  pendingApprovalsCount: number;
  openPosPipelineCount: number;
  overdueDeliveriesCount: number;
  activeVendorsCount: number;
  onTimeDeliveryRate: number;
}
