export type Company = 'FITCO' | 'ARABITRA' | 'ALL';

export type EntityId = 'FITCO' | 'ARABITRA';

export type ModuleId =
  | 'dashboard'
  | 'items'
  | 'vendors'
  | 'rfqs'
  | 'quotations'
  | 'purchaseOrders'
  | 'deliveries'
  | 'payments'
  | 'assets'
  | 'team';

export type UserRole =
  | 'Super Admin'
  | 'Procurement Director'
  | 'Procurement Engineer'
  | 'Purchasing Specialist'
  | 'Site Receiving Officer'
  | 'Financial Controller'
  | 'Internal Auditor';

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
  receivedBidsCount: number;
  requestedBy: string;
  lineItems: RFQLineItem[];
  priority: 'Urgent' | 'High' | 'Normal';
}

export interface QuotationPdfAttachment {
  fileName: string;
  fileSizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  proposalRefNumber?: string;
  pdfDataUrl?: string;
}

export interface QuoteLineItemPrice {
  rfqLineItemId: string;
  description: string;
  quantity: number;
  uom: string;
  unitPriceSAR: number;
  totalPriceSAR: number;
  notes?: string;
}

export interface QuotationComparisonItem {
  vendorId: string;
  vendorName: string;
  quotedTotalSAR: number;
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
