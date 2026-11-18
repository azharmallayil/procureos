import React, { useEffect, useState } from 'react';
import { CompanyProvider } from './context/CompanyContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardModule } from './components/modules/dashboard/DashboardModule';
import { ItemsModule } from './components/modules/items/ItemsModule';
import { VendorsModule } from './components/modules/vendors/VendorsModule';
import { RfqsModule } from './components/modules/rfqs/RfqsModule';
import { RequisitionsModule } from './components/modules/requisitions/RequisitionsModule';
import { QuotationsModule } from './components/modules/quotations/QuotationsModule';
import { PurchaseOrdersModule } from './components/modules/purchaseOrders/PurchaseOrdersModule';
import { DeliveriesModule } from './components/modules/deliveries/DeliveriesModule';
import { PaymentsModule } from './components/modules/payments/PaymentsModule';
import { AssetsModule } from './components/modules/assets/AssetsModule';
import { TeamModule } from './components/modules/team/TeamModule';
import { AdminModule } from './components/modules/admin/AdminModule';
import {
  MOCK_ITEMS,
  MOCK_VENDORS,
  MOCK_RFQS,
  MOCK_QUOTATIONS,
  MOCK_PURCHASE_ORDERS,
  MOCK_DELIVERIES,
  MOCK_PAYMENTS,
  MOCK_ASSETS,
  MOCK_USERS,
} from './data/mockData';
import {
  ModuleId,
  Item,
  Vendor,
  RFQ,
  PurchaseOrder,
  POStatus,
  Delivery,
  Asset,
  QuotationComparisonItem,
  QuoteLineItemPrice,
  QuotationEvaluation,
  PurchaseRequisition,
  PaymentMilestone,
} from './types/procurement';
import { useLocalStorage } from './lib/useLocalStorage';
import { recordAuditLog } from './lib/liveSync';
import { useToast } from './context/ToastContext';
import { deleteQuotationFiles, clearAllStoredPdfDocuments } from './lib/pdfStorage';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

const MainApplication: React.FC = () => {
  const { currentUser, activeRole } = useAuth();
  const { success, warning } = useToast();

  const isAdmin =
    activeRole === 'Super Admin' ||
    currentUser?.role === 'Super Admin' ||
    currentUser?.email === 'admin@procureos.com' ||
    currentUser?.email === 'muhammed.azhar@arabitra.com';

  // Navigation module and workspace filter are user-scoped session states
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');

  useEffect(() => {
    if ((activeModule === 'admin' || (activeModule as string) === 'team') && !isAdmin) {
      setActiveModule('dashboard');
      warning('Access Restricted', 'The Admin Command Center is reserved exclusively for system administrators.');
    }
  }, [activeModule, isAdmin]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for quick action triggers from Topbar
  const [quickCreateModal, setQuickCreateModal] = useState<
    'rfq' | 'po' | 'item' | 'delivery' | null
  >(null);

  // ── Persisted application state (Clean Production Defaults) ─────────────
  const [items, setItems] = useLocalStorage<Item[]>('procureos_items', []);
  const [vendors, setVendors] = useLocalStorage<Vendor[]>('procureos_vendors', []);
  const [rfqs, setRfqs] = useLocalStorage<RFQ[]>('procureos_rfqs', []);
  const [requisitions, setRequisitions] = useLocalStorage<PurchaseRequisition[]>('procureos_requisitions', []);
  const [quotations, setQuotations] = useLocalStorage<QuotationEvaluation[]>('procureos_quotations', []);
  const [selectedQuoteRfqId, setSelectedQuoteRfqId] = useState<string | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('procureos_purchase_orders', []);
  const [deliveries, setDeliveries] = useLocalStorage<Delivery[]>('procureos_deliveries', []);
  const [payments, setPayments] = useLocalStorage<PaymentMilestone[]>('procureos_payments', []);
  const [assets, setAssets] = useLocalStorage<Asset[]>('procureos_assets', []);

  // ── Production Live Database Migration & Clean Slate Enforcement ────────
  useEffect(() => {
    const currentDbVer = localStorage.getItem('procureos_db_version');
    const PROD_LIVE_VER = '2026.11.18.admin_console';

    if (currentDbVer !== PROD_LIVE_VER) {
      // 1. Purge all mock transactions
      setRfqs([]);
      localStorage.setItem('procureos_rfqs', JSON.stringify([]));
      setQuotations([]);
      localStorage.setItem('procureos_quotations', JSON.stringify([]));
      setRequisitions([]);
      localStorage.setItem('procureos_requisitions', JSON.stringify([]));
      setPurchaseOrders([]);
      localStorage.setItem('procureos_purchase_orders', JSON.stringify([]));
      setDeliveries([]);
      localStorage.setItem('procureos_deliveries', JSON.stringify([]));
      setPayments([]);
      localStorage.setItem('procureos_payments', JSON.stringify([]));
      setAssets([]);
      localStorage.setItem('procureos_assets', JSON.stringify([]));

      // 2. Clear demo items & vendors to clean production slate
      setItems([]);
      localStorage.setItem('procureos_items', JSON.stringify([]));
      setVendors([]);
      localStorage.setItem('procureos_vendors', JSON.stringify([]));

      // 3. Reset users & credentials to Super Admins
      localStorage.setItem('procureos_users', JSON.stringify(MOCK_USERS));

      // 4. Clear all stored quote PDFs in IndexedDB
      clearAllStoredPdfDocuments().catch(() => {});

      // 5. Mark environment and production version
      localStorage.setItem('procureos_db_version', PROD_LIVE_VER);
      localStorage.setItem('procureos_environment', 'production');

      // 6. Immutable audit entry
      recordAuditLog(
        'Admin Console Initialized',
        'System',
        'ADMIN-SETUP',
        'System administrative module activated for admin@procureos.com and muhammed.azhar@arabitra.com.',
        { name: 'System Admin', role: 'Super Admin' }
      );
    }
  }, []);

  // Keep the quotation work queue in sync with the RFQ master list. This also
  // repairs older locally-saved RFQs that were created before this linkage existed.
  useEffect(() => {
    setQuotations((existing) => {
      const knownRfqIds = new Set(existing.map((evaluation) => evaluation.rfqId));
      const missingEvaluations: QuotationEvaluation[] = rfqs
        .filter((rfq) => !knownRfqIds.has(rfq.id))
        .map((rfq) => ({
          id: `QEV-${rfq.id}`,
          rfqId: rfq.id,
          rfqNumber: rfq.rfqNumber,
          rfqTitle: rfq.title,
          projectName: rfq.projectName,
          entity: rfq.entity,
          totalBudgetSAR: rfq.budgetEstimatedSAR,
          evaluators: [currentUser?.name || 'Procurement Team'],
          status: rfq.status === 'Awarded' ? 'Awarded' : 'Draft Evaluation',
          submissions: [],
        }));
      return missingEvaluations.length ? [...missingEvaluations, ...existing] : existing;
    });
  }, [rfqs, setQuotations, currentUser?.name]);

  // Transaction mutations
  const handleAddItem = (item: Item) => {
    setItems((prev) => [item, ...prev]);
    recordAuditLog('Item Cataloged', 'Item', item.id, `Created inventory SKU ${item.sku}: ${item.name}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleAddVendor = (vendor: Vendor) => {
    setVendors((prev) => [vendor, ...prev]);
    recordAuditLog('Vendor Registered', 'Vendor', vendor.id, `Registered supplier ${vendor.name} (CR: ${vendor.crNumber})`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleAddRfq = (rfq: RFQ) => {
    setRfqs((prev) => [rfq, ...prev]);
    setSelectedQuoteRfqId(rfq.id);
    // Create its quotation workspace at the same time as the RFQ. No separate
    // manual record or duplicate RFQ entry is required in Quotations & Bids.
    setQuotations((prev) => {
      if (prev.some((evaluation) => evaluation.rfqId === rfq.id)) return prev;
      const evaluation: QuotationEvaluation = {
        id: `QEV-${rfq.id}`,
        rfqId: rfq.id,
        rfqNumber: rfq.rfqNumber,
        rfqTitle: rfq.title,
        projectName: rfq.projectName,
        entity: rfq.entity,
        totalBudgetSAR: rfq.budgetEstimatedSAR,
        evaluators: [currentUser?.name || 'Procurement Team'],
        status: 'Draft Evaluation',
        submissions: [],
      };
      return [evaluation, ...prev];
    });
    recordAuditLog('RFQ Published', 'RFQ', rfq.id, `Published competitive tender ${rfq.rfqNumber}: ${rfq.title}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleCreateRequisition = (requisition: PurchaseRequisition) => {
    setRequisitions((prev) => [requisition, ...prev]);
    recordAuditLog('Purchase Requisition Submitted', 'PurchaseRequisition', requisition.id, `Submitted ${requisition.prNumber} for ${requisition.lineItems.length} line item(s)`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleApproveRequisition = (requisitionId: string) => {
    const requisition = requisitions.find((item) => item.id === requisitionId);
    if (!requisition || requisition.status !== 'Pending Approval') return;
    setRequisitions((prev) => prev.map((item) => item.id === requisitionId
      ? { ...item, status: 'Approved', approvedBy: currentUser?.name || 'Authorized Approver', approvedAt: new Date().toISOString() }
      : item
    ));
    recordAuditLog('Purchase Requisition Approved', 'PurchaseRequisition', requisitionId, `Approved ${requisition.prNumber}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
    success('Requisition approved', `${requisition.prNumber} is ready for RFQ creation.`);
  };

  const handleRejectRequisition = (requisitionId: string, reason: string) => {
    const requisition = requisitions.find((item) => item.id === requisitionId);
    if (!requisition || requisition.status !== 'Pending Approval') return;
    setRequisitions((prev) => prev.map((item) => item.id === requisitionId
      ? { ...item, status: 'Rejected', rejectionReason: reason }
      : item
    ));
    recordAuditLog('Purchase Requisition Rejected', 'PurchaseRequisition', requisitionId, `Rejected ${requisition.prNumber}: ${reason}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
    warning('Requisition rejected', `${requisition.prNumber} was returned with a recorded reason.`);
  };

  const handleCreateRfqFromRequisition = (requisition: PurchaseRequisition) => {
    if (requisition.status !== 'Approved' || requisition.linkedRfqId) return;
    const requestedCategories = new Set(requisition.lineItems
      .map((line) => items.find((catalogueItem) => catalogueItem.id === line.itemId)?.category)
      .filter((category): category is NonNullable<typeof category> => Boolean(category)));
    const invitedVendorIds = vendors.filter((vendor) =>
      (vendor.status === 'Approved' || vendor.status === 'Preferred') &&
      (vendor.entityScope === 'Joint / Group' ||
        (requisition.entity === 'FITCO' && vendor.entityScope === 'FITCO Approved') ||
        (requisition.entity === 'ARABITRA' && vendor.entityScope === 'Arabitra Approved')) &&
      (requestedCategories.size === 0 || requestedCategories.has(vendor.category))
    ).map((vendor) => vendor.id);
    if (invitedVendorIds.length === 0) {
      warning('No approved vendors available', 'Approve at least one supplier for this company before converting the requisition to an RFQ.');
      return;
    }
    const now = new Date();
    const suffix = `${now.getTime().toString().slice(-7)}${Math.floor(Math.random() * 10)}`;
    const newRfq: RFQ = {
      id: `RFQ-${globalThis.crypto?.randomUUID?.() || now.getTime().toString()}`,
      rfqNumber: `RFQ-${requisition.entity === 'FITCO' ? 'FTC' : 'ARB'}-${now.getFullYear()}-${suffix}`,
      title: requisition.title,
      projectName: requisition.projectName,
      entity: requisition.entity,
      status: 'Open',
      publishDate: now.toISOString().split('T')[0],
      closingDate: new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0],
      budgetEstimatedSAR: requisition.estimatedTotalSAR,
      invitedVendorsCount: invitedVendorIds.length,
      invitedVendorIds,
      purchaseRequisitionId: requisition.id,
      purchaseRequisitionNumber: requisition.prNumber,
      receivedBidsCount: 0,
      requestedBy: requisition.requestedBy,
      priority: requisition.priority,
      lineItems: requisition.lineItems.map((line) => ({
        id: `RFQL-${line.id}`,
        itemId: line.itemId,
        description: line.description,
        quantity: line.quantity,
        uom: line.uom,
        targetPriceSAR: line.estimatedUnitPriceSAR,
      })),
    };
    handleAddRfq(newRfq);
    setRequisitions((prev) => prev.map((item) => item.id === requisition.id
      ? { ...item, status: 'Converted to RFQ', linkedRfqId: newRfq.id, linkedRfqNumber: newRfq.rfqNumber }
      : item
    ));
    setActiveModule('rfqs');
    success('RFQ created from requisition', `${requisition.prNumber} was converted into ${newRfq.rfqNumber}.`);
  };

  const handleAddPO = (po: PurchaseOrder) => {
    setPurchaseOrders((prev) => [po, ...prev]);
    recordAuditLog('Purchase Order Issued', 'PurchaseOrder', po.id, `Issued PO ${po.poNumber} for SAR ${po.grandTotalSAR.toLocaleString()}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleAddDelivery = (del: Delivery) => {
    setDeliveries((prev) => [del, ...prev]);
    recordAuditLog('Shipment Created', 'Delivery', del.id, `Created delivery tracking ${del.trackingNumber}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleAddAsset = (asset: Asset) => {
    setAssets((prev) => [asset, ...prev]);
    recordAuditLog('Asset Tagged', 'Asset', asset.id, `Added enterprise asset ${asset.assetTag}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleApprovePO = (poId: string) => {
    const targetPO = purchaseOrders.find((po) => po.id === poId);
    if (!targetPO || ['Cancelled', 'Closed'].includes(targetPO.status)) return;

    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: 'Approved' as const } : po))
    );

    // An approved PO automatically opens its delivery/logistics record.
    setDeliveries((prev) => {
      if (prev.some((delivery) => delivery.poNumber === targetPO.poNumber)) return prev;
      const now = new Date();
      const delivery: Delivery = {
        id: `DEL-${globalThis.crypto?.randomUUID?.() || now.getTime().toString()}`,
        trackingNumber: `PENDING-${targetPO.poNumber}`,
        poNumber: targetPO.poNumber,
        vendorName: targetPO.vendorName,
        entity: targetPO.entity,
        destinationSite: targetPO.projectSite,
        carrier: 'Awaiting vendor dispatch details',
        dispatchDate: now.toISOString().split('T')[0],
        expectedDate: targetPO.expectedDeliveryDate,
        status: 'Scheduled',
        isOverdue: false,
        qcInspectionStatus: 'Pending Inspection',
        remarks: 'Automatically created when the purchase order was approved. Update with carrier and shipment details when dispatched.',
      };
      return [delivery, ...prev];
    });

    recordAuditLog('PO Approved', 'PurchaseOrder', poId, `Approved purchase order authorization and opened delivery tracking`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleRejectPO = (poId: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: 'Draft' as const } : po))
    );
    recordAuditLog('PO Rejected', 'PurchaseOrder', poId, `Rejected PO and reverted to Draft stage`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleSubmitForApprovalPO = (poId: string) => {
    const targetPO = purchaseOrders.find((po) => po.id === poId);
    if (!targetPO || targetPO.status !== 'Draft') return;
    setPurchaseOrders((prev) =>
      prev.map((po) =>
        po.id === poId
          ? { ...po, status: 'Pending Approval' as const, currentApproverRole: 'Procurement Director' }
          : po
      )
    );
    recordAuditLog('PO Submitted for Approval', 'PurchaseOrder', poId, `Submitted ${targetPO.poNumber} for executive authorization`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleIssuePO = (poId: string) => {
    const targetPO = purchaseOrders.find((po) => po.id === poId);
    if (!targetPO) return;
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: 'Issued' as const } : po))
    );
    // Ensure delivery tracking exists
    setDeliveries((prev) => {
      if (prev.some((delivery) => delivery.poNumber === targetPO.poNumber)) return prev;
      const now = new Date();
      const delivery: Delivery = {
        id: `DEL-${globalThis.crypto?.randomUUID?.() || now.getTime().toString()}`,
        trackingNumber: `PENDING-${targetPO.poNumber}`,
        poNumber: targetPO.poNumber,
        vendorName: targetPO.vendorName,
        entity: targetPO.entity,
        destinationSite: targetPO.projectSite,
        carrier: 'Awaiting vendor dispatch details',
        dispatchDate: now.toISOString().split('T')[0],
        expectedDate: targetPO.expectedDeliveryDate,
        status: 'Scheduled',
        isOverdue: false,
        qcInspectionStatus: 'Pending Inspection',
        remarks: 'Purchase Order officially issued to supplier. Awaiting carrier assignment.',
      };
      return [delivery, ...prev];
    });
    recordAuditLog('PO Issued to Vendor', 'PurchaseOrder', poId, `Dispatched official purchase order ${targetPO.poNumber} to ${targetPO.vendorName}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleUpdatePOStatus = (poId: string, nextStatus: POStatus) => {
    const targetPO = purchaseOrders.find((po) => po.id === poId);
    if (!targetPO) return;
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: nextStatus } : po))
    );
    if (nextStatus === 'In Transit') {
      setDeliveries((prev) =>
        prev.map((d) => d.poNumber === targetPO.poNumber ? { ...d, status: 'In Transit' } : d)
      );
    } else if (nextStatus === 'Received') {
      setDeliveries((prev) =>
        prev.map((d) => d.poNumber === targetPO.poNumber ? { ...d, status: 'Delivered', qcInspectionStatus: 'Pending Inspection' } : d)
      );
    }
    recordAuditLog(`PO Status Changed to ${nextStatus}`, 'PurchaseOrder', poId, `Updated ${targetPO.poNumber} status to ${nextStatus}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleMarkInspected = (deliveryId: string) => {
    const targetDelivery = deliveries.find((delivery) => delivery.id === deliveryId);
    if (!targetDelivery || targetDelivery.status === 'Inspected & Accepted') return;
    const relatedPO = purchaseOrders.find((po) => po.poNumber === targetDelivery.poNumber);

    setDeliveries((prev) => prev.map((delivery) =>
      delivery.id === deliveryId
        ? { ...delivery, status: 'Inspected & Accepted' as const, qcInspectionStatus: 'Passed' as const, isOverdue: false, actualDate: new Date().toISOString().split('T')[0] }
        : delivery
    ));

    // Once-only GRN posting updates catalog stock for PO lines that match an item SKU.
    const receiptAlreadyPosted = deliveries.some((delivery) =>
      delivery.poNumber === targetDelivery.poNumber &&
      delivery.status === 'Inspected & Accepted'
    );
    if (relatedPO && !receiptAlreadyPosted) {
      setItems((prev) => prev.map((item) => {
        const receivedLine = relatedPO.lineItems.find((line) => line.sku === item.sku);
        if (!receivedLine) return item;
        const nextStock = item.stockLevel + receivedLine.quantity;
        const nextStatus = nextStock <= 0
          ? 'Critical'
          : nextStock <= item.reorderPoint
            ? 'Low Stock'
            : 'In Stock';
        return { ...item, stockLevel: nextStock, status: nextStatus, updatedAt: new Date().toISOString().split('T')[0] };
      }));
      setPurchaseOrders((prev) => prev.map((po) => po.id === relatedPO.id ? { ...po, status: 'Received' as const } : po));
    }

    recordAuditLog('Delivery Accepted (GRN)', 'Delivery', deliveryId, `QC inspection passed; receipt posted for PO ${targetDelivery.poNumber}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleReleasePayment = (paymentId: string) => {
    const targetPayment = payments.find((payment) => payment.id === paymentId);
    if (!targetPayment || targetPayment.status === 'Paid') return;

    setPayments((prev) => prev.map((payment) =>
      payment.id === paymentId
        ? {
            ...payment,
            status: 'Paid' as const,
            bankReference: payment.bankReference || `SARIE-SNB-${Math.floor(100000000 + Math.random() * 900000000)}`,
            paymentDate: new Date().toISOString().split('T')[0],
          }
        : payment
    ));

    // Recalculate the PO payment position from posted payment milestones.
    const relatedPO = purchaseOrders.find((po) => po.poNumber === targetPayment.poNumber);
    if (relatedPO) {
      const alreadyPaid = payments
        .filter((payment) => payment.poNumber === targetPayment.poNumber && payment.status === 'Paid')
        .reduce((sum, payment) => sum + payment.amountSAR, 0);
      const nextPaid = alreadyPaid + targetPayment.amountSAR;
      const nextPaymentStatus: PurchaseOrder['paymentStatus'] = nextPaid >= relatedPO.grandTotalSAR
        ? 'Fully Paid'
        : nextPaid >= relatedPO.grandTotalSAR * 0.5
          ? 'Milestone 50%'
          : 'Advance Paid';
      setPurchaseOrders((prev) => prev.map((po) => po.id === relatedPO.id
        ? { ...po, paymentStatus: nextPaymentStatus, status: nextPaymentStatus === 'Fully Paid' && po.status === 'Received' ? 'Closed' : po.status }
        : po
      ));
    }

    recordAuditLog('Payment Released', 'Payment', paymentId, `Payment released for PO ${targetPayment.poNumber}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleAwardBid = (
    quoteEvaluationId: string,
    vendorId: string,
    autoSubmitForApproval: boolean = true
  ) => {
    const targetEvaluation = quotations.find((evaluation) => evaluation.id === quoteEvaluationId);
    const targetBid = targetEvaluation?.submissions.find((submission) => submission.vendorId === vendorId);
    if (!targetEvaluation || !targetBid) return;

    // Award actions are idempotent: never create a second PO for the same RFQ award.
    const existingAwardPo = purchaseOrders.find(
      (po) => po.rfqNumber === targetEvaluation.rfqNumber && po.vendorId === vendorId
    );
    setQuotations((prev) => prev.map((evaluation) =>
      evaluation.id === quoteEvaluationId
        ? {
            ...evaluation,
            status: 'Awarded',
            submissions: evaluation.submissions.map((submission) =>
              submission.vendorId === vendorId
                ? { ...submission, status: 'Awarded' }
                : { ...submission, status: 'Rejected' }
            ),
          }
        : evaluation
    ));
    setRfqs((prev) => prev.map((rfq) =>
      rfq.id === targetEvaluation.rfqId ? { ...rfq, status: 'Awarded' } : rfq
    ));

    if (!existingAwardPo) {
      const now = new Date();
      const net = targetBid.quotedTotalSAR;
      const vat = net * 0.15;
      const targetRfq = rfqs.find((rfq) => rfq.id === targetEvaluation.rfqId);
      const expectedDelivery = new Date(now.getTime() + Math.max(1, targetBid.leadTimeDays) * 86400000);
      const initialStatus: POStatus = autoSubmitForApproval ? 'Pending Approval' : 'Draft';
      const newPO: PurchaseOrder = {
        id: `PO-${globalThis.crypto?.randomUUID?.() || now.getTime().toString()}`,
        poNumber: `PO-${targetEvaluation.entity === 'FITCO' ? 'FTC' : 'ARB'}-${now.getFullYear()}-${now.getTime().toString().slice(-7)}`,
        rfqNumber: targetEvaluation.rfqNumber,
        vendorId: targetBid.vendorId,
        vendorName: targetBid.vendorName,
        entity: targetEvaluation.entity,
        projectSite: targetEvaluation.projectName,
        issueDate: now.toISOString().split('T')[0],
        expectedDeliveryDate: expectedDelivery.toISOString().split('T')[0],
        totalAmountSAR: net,
        taxAmountSAR: vat,
        grandTotalSAR: net + vat,
        status: initialStatus,
        paymentTerms: 'As stated in the approved supplier quotation',
        approvalStage: 'Purchasing',
        currentApproverRole: 'Procurement Director',
        paymentStatus: 'Unpaid',
        lineItems: targetBid.lineItems?.length
          ? targetBid.lineItems.map((line, index) => ({
              id: `POL-${now.getTime()}-${index + 1}`,
              sku: (() => {
                const sourceItemId = targetRfq?.lineItems.find((rfqLine) => rfqLine.id === line.rfqLineItemId)?.itemId;
                return items.find((item) => item.id === sourceItemId)?.sku || sourceItemId || 'RFQ-SCOPE';
              })(),
              description: line.description,
              quantity: line.quantity,
              uom: line.uom,
              unitPriceSAR: line.unitPriceSAR,
              totalPriceSAR: line.totalPriceSAR,
            }))
          : [{
              id: `POL-${now.getTime()}-1`,
              sku: 'RFQ-SCOPE',
              description: `${targetEvaluation.rfqTitle} awarded scope`,
              quantity: 1,
              uom: 'LOT',
              unitPriceSAR: net,
              totalPriceSAR: net,
            }],
      };
      setPurchaseOrders((prev) => [newPO, ...prev]);
      recordAuditLog('Draft PO Generated', 'PurchaseOrder', newPO.id, `Generated ${newPO.poNumber} from approved award ${targetEvaluation.rfqNumber}`, {
        name: currentUser?.name,
        role: activeRole || 'User',
      });
    }

    recordAuditLog('Bid Awarded', 'Quotation', quoteEvaluationId, `Awarded ${targetEvaluation.rfqNumber} to vendor ${vendorId}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  const handleUpdateQuotePrice = (
    rfqId: string,
    vendorId: string,
    updatedLineItems: QuoteLineItemPrice[],
    newTotalSAR: number
  ) => {
    setQuotations((prev) =>
      prev.map((qe) => {
        if (qe.rfqId === rfqId) {
          const updatedSubmissions = qe.submissions.map((sub) => {
            if (sub.vendorId === vendorId) {
              return {
                ...sub,
                quotedTotalSAR: newTotalSAR,
                lineItems: updatedLineItems,
              };
            }
            return sub;
          });
          const sorted = [...updatedSubmissions].sort((a, b) => a.quotedTotalSAR - b.quotedTotalSAR);
          const ranked = sorted.map((item, idx) => ({
            ...item,
            compositeRank: idx + 1,
            recommended: idx === 0,
          }));
          return {
            ...qe,
            submissions: ranked,
          };
        }
        return qe;
      })
    );
  };

  const handleQuoteUploaded = (rfqId: string, newSubmission: QuotationComparisonItem) => {
    const targetRfq = rfqs.find((rfq) => rfq.id === rfqId);
    if (!targetRfq) return;

    setSelectedQuoteRfqId(rfqId);
    setActiveModule('quotations');

    setQuotations((prev) => {
      const existingEvaluation = prev.find((evaluation) => evaluation.rfqId === rfqId);
      const baseEvaluation: QuotationEvaluation = existingEvaluation || {
        id: `QEV-${targetRfq.id}`,
        rfqId: targetRfq.id,
        rfqNumber: targetRfq.rfqNumber,
        rfqTitle: targetRfq.title,
        projectName: targetRfq.projectName,
        entity: targetRfq.entity,
        totalBudgetSAR: targetRfq.budgetEstimatedSAR,
        evaluators: [currentUser?.name || 'Procurement Team'],
        status: 'Draft Evaluation',
        submissions: [],
      };

      // Filter out older submission from same vendor to allow re-upload/update
      const otherSubmissions = baseEvaluation.submissions.filter(
        (submission) => submission.vendorId !== newSubmission.vendorId
      );

      const updatedSubmissions = [...otherSubmissions, newSubmission]
        .sort((a, b) => a.quotedTotalSAR - b.quotedTotalSAR)
        .map((submission, index) => ({
          ...submission,
          compositeRank: index + 1,
          recommended: index === 0 && submission.status !== 'Rejected',
        }));

      const updatedEvaluation: QuotationEvaluation = {
        ...baseEvaluation,
        status: 'Draft Evaluation',
        submissions: updatedSubmissions,
      };

      return existingEvaluation
        ? prev.map((evaluation) => (evaluation.rfqId === rfqId ? updatedEvaluation : evaluation))
        : [updatedEvaluation, ...prev];
    });

    // Derive the count from the quotation records, avoiding counter drift.
    setRfqs((prev) => prev.map((rfq) => {
      if (rfq.id !== rfqId) return rfq;
      const currentInvited = rfq.invitedVendorIds || [];
      const updatedInvited = currentInvited.includes(newSubmission.vendorId)
        ? currentInvited
        : [...currentInvited, newSubmission.vendorId];
      const nextBidsCount = (rfq.receivedBidsCount || 0) + 1;
      return {
        ...rfq,
        invitedVendorIds: updatedInvited,
        invitedVendorsCount: Math.max(rfq.invitedVendorsCount, updatedInvited.length),
        receivedBidsCount: nextBidsCount,
        status: 'Under Evaluation',
      };
    }));
    setSelectedQuoteRfqId(rfqId);
    recordAuditLog('Quotation Received', 'Quotation', `${rfqId}-${newSubmission.vendorId}`, `Received ${newSubmission.attachment?.proposalRefNumber || 'supplier quotation'} for ${targetRfq.rfqNumber}`, {
      name: currentUser?.name,
      role: activeRole || 'User',
    });
  };

  // ── Quotation Deletion Management ──────────────────────────────────────────
  const handleDeleteQuotation = async (rfqId: string, vendorId: string): Promise<boolean> => {
    const targetEvaluation = quotations.find((evaluation) => evaluation.rfqId === rfqId);
    const targetBid = targetEvaluation?.submissions.find((sub) => sub.vendorId === vendorId);
    const targetRfq = rfqs.find((rfq) => rfq.id === rfqId);

    if (!targetEvaluation || !targetBid) {
      warning('Quotation Not Found', 'The requested quotation could not be located.');
      return false;
    }

    // 1. Permanently delete PDF files from Supabase Storage and IndexedDB
    try {
      if (targetBid.attachment) {
        await deleteQuotationFiles(targetBid.attachment);
      }
    } catch (err) {
      console.warn('[ProcureOS Lifecycle] Failed to delete quotation PDF storage file:', err);
    }

    // 2. If Supabase is connected, delete from database
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('quotations')
          .delete()
          .eq('rfq_id', rfqId)
          .eq('vendor_id', vendorId);
      } catch (err) {
        console.warn('[ProcureOS Database] Supabase quotation delete error:', err);
      }
    }

    // 3. Update local state: remove submission & recalculate rankings
    setQuotations((prev) =>
      prev.map((evaluation) => {
        if (evaluation.rfqId !== rfqId) return evaluation;
        const remainingSubmissions = evaluation.submissions
          .filter((sub) => sub.vendorId !== vendorId)
          .sort((a, b) => a.quotedTotalSAR - b.quotedTotalSAR)
          .map((sub, idx) => ({
            ...sub,
            compositeRank: idx + 1,
            recommended: idx === 0 && sub.status !== 'Rejected',
          }));
        return {
          ...evaluation,
          submissions: remainingSubmissions,
          status: remainingSubmissions.length > 0 ? evaluation.status : 'Draft Evaluation',
        };
      })
    );

    // 4. Update RFQ received bids count
    setRfqs((prev) =>
      prev.map((rfq) => {
        if (rfq.id !== rfqId) return rfq;
        const newCount = Math.max(0, (rfq.receivedBidsCount || 1) - 1);
        return {
          ...rfq,
          receivedBidsCount: newCount,
          status: newCount === 0 && rfq.status === 'Under Evaluation' ? 'Open' : rfq.status,
        };
      })
    );

    // 5. Audit log & notification
    recordAuditLog(
      'Quotation Deleted',
      'Quotation',
      `${rfqId}-${vendorId}`,
      `Permanently deleted quotation from ${targetBid.vendorName} for RFQ ${targetRfq?.rfqNumber || rfqId}`,
      {
        name: currentUser?.name,
        role: activeRole || 'User',
      }
    );
    success(
      'Quotation Deleted',
      `Quotation from ${targetBid.vendorName} and all associated files have been permanently deleted.`
    );
    return true;
  };

  // ── RFQ Parent Deletion Management ─────────────────────────────────────────
  const handleDeleteRfq = async (rfqId: string): Promise<boolean> => {
    const targetRfq = rfqs.find((rfq) => rfq.id === rfqId);
    if (!targetRfq) {
      warning('RFQ Not Found', 'The requested RFQ could not be located.');
      return false;
    }

    const targetEvaluation = quotations.find((evaluation) => evaluation.rfqId === rfqId);

    // 1. Permanently delete all PDF files associated with all bids in this RFQ
    if (targetEvaluation?.submissions) {
      for (const sub of targetEvaluation.submissions) {
        if (sub.attachment) {
          try {
            await deleteQuotationFiles(sub.attachment);
          } catch (err) {
            console.warn('[ProcureOS Lifecycle] Failed to delete RFQ quotation file:', err);
          }
        }
      }
    }

    // 2. Delete from Supabase Database if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('rfqs').delete().eq('id', rfqId);
        await supabase.from('quotations').delete().eq('rfq_id', rfqId);
      } catch (err) {
        console.warn('[ProcureOS Database] Supabase RFQ delete error:', err);
      }
    }

    // 3. Remove RFQ from local state
    setRfqs((prev) => prev.filter((r) => r.id !== rfqId));

    // 4. Remove quotation evaluation from local state
    setQuotations((prev) => prev.filter((q) => q.rfqId !== rfqId));

    // 5. If linked to a requisition, revert the requisition back to Approved so it can be re-tendered
    setRequisitions((prev) =>
      prev.map((req) =>
        req.linkedRfqId === rfqId || req.id === targetRfq.purchaseRequisitionId
          ? {
              ...req,
              status: 'Approved',
              linkedRfqId: undefined,
              linkedRfqNumber: undefined,
            }
          : req
      )
    );

    if (selectedQuoteRfqId === rfqId) {
      setSelectedQuoteRfqId(null);
    }

    // 6. Audit log & notification
    recordAuditLog(
      'RFQ Deleted',
      'RFQ',
      rfqId,
      `Permanently deleted RFQ ${targetRfq.rfqNumber}: ${targetRfq.title} and all ${targetEvaluation?.submissions.length || 0} associated quotation files`,
      {
        name: currentUser?.name,
        role: activeRole || 'User',
      }
    );
    success(
      'RFQ Deleted',
      `Tender package ${targetRfq.rfqNumber} and all associated quotation files have been permanently deleted.`
    );
    return true;
  };

  const handleQuickAction = (actionType: 'rfq' | 'po' | 'item' | 'delivery' | 'quote') => {
    if (actionType === 'rfq') {
      setActiveModule('rfqs');
      setQuickCreateModal('rfq');
    } else if (actionType === 'po') {
      setActiveModule('purchaseOrders');
      setQuickCreateModal('po');
    } else if (actionType === 'item') {
      setActiveModule('items');
      setQuickCreateModal('item');
    } else if (actionType === 'delivery') {
      setActiveModule('deliveries');
      setQuickCreateModal('delivery');
    } else if (actionType === 'quote') {
      setActiveModule('quotations');
    }
  };

  return (
    <div className="min-h-screen bg-[#080c15] text-slate-100 flex flex-col font-sans">
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          counts={{
            items: items.length,
            vendors: vendors.length,
            requisitions: requisitions.length,
            rfqs: rfqs.filter((r) => r.status === 'Open' || r.status === 'Under Evaluation').length,
            quotations: quotations.length,
            purchaseOrders: purchaseOrders.filter((p) => p.status === 'Pending Approval').length,
            deliveries: deliveries.filter((d) => d.isOverdue || d.status === 'Delayed').length,
            payments: payments.filter((p) => p.status === 'Processing' || p.status === 'Pending Approval' || p.status === 'Scheduled').length,
            assets: assets.length,
          }}
        />

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {/* Top Header Bar */}
          <Topbar
            onOpenMobileMenu={() => setMobileOpen(true)}
            onQuickAction={handleQuickAction}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNavigateModule={setActiveModule}
          />

          {/* Module Content View */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-16">
            {activeModule === 'dashboard' && (
              <DashboardModule
                rfqs={rfqs}
                purchaseOrders={purchaseOrders}
                deliveries={deliveries}
                vendors={vendors}
                items={items}
                onNavigateModule={setActiveModule}
                onApprovePO={handleApprovePO}
                onRejectPO={handleRejectPO}
                onMarkInspected={handleMarkInspected}
              />
            )}

            {activeModule === 'items' && (
              <ItemsModule
                items={items}
                onAddItem={handleAddItem}
                openCreateModal={quickCreateModal === 'item'}
                onCloseCreateModal={() => setQuickCreateModal(null)}
              />
            )}

            {activeModule === 'vendors' && (
              <VendorsModule vendors={vendors} onAddVendor={handleAddVendor} />
            )}

            {activeModule === 'requisitions' && (
              <RequisitionsModule
                requisitions={requisitions}
                items={items}
                onCreate={handleCreateRequisition}
                onApprove={handleApproveRequisition}
                onReject={handleRejectRequisition}
                onCreateRfq={handleCreateRfqFromRequisition}
              />
            )}

            {activeModule === 'rfqs' && (
              <RfqsModule
                rfqs={rfqs}
                vendors={vendors}
                onAddRfq={handleAddRfq}
                onNavigateToQuotes={(rfqId) => { setSelectedQuoteRfqId(rfqId); setActiveModule('quotations'); }}
                onDeleteRfq={handleDeleteRfq}
                openCreateModal={quickCreateModal === 'rfq'}
                onCloseCreateModal={() => setQuickCreateModal(null)}
              />
            )}

            {activeModule === 'quotations' && (
              <QuotationsModule
                quotations={quotations}
                selectedRfqId={selectedQuoteRfqId || undefined}
                onSelectRfqId={setSelectedQuoteRfqId}
                rfqs={rfqs}
                vendors={vendors}
                onAwardBid={handleAwardBid}
                onQuoteUploaded={handleQuoteUploaded}
                onAddVendor={handleAddVendor}
                onUpdateQuotePrice={handleUpdateQuotePrice}
                onDeleteQuotation={handleDeleteQuotation}
              />
            )}

            {activeModule === 'purchaseOrders' && (
              <PurchaseOrdersModule
                purchaseOrders={purchaseOrders}
                onAddPO={handleAddPO}
                onApprovePO={handleApprovePO}
                onRejectPO={handleRejectPO}
                onSubmitForApprovalPO={handleSubmitForApprovalPO}
                onIssuePO={handleIssuePO}
                onUpdatePOStatus={handleUpdatePOStatus}
                openCreateModal={quickCreateModal === 'po'}
                onCloseCreateModal={() => setQuickCreateModal(null)}
              />
            )}

            {activeModule === 'deliveries' && (
              <DeliveriesModule
                deliveries={deliveries}
                onMarkInspected={handleMarkInspected}
                onAddDelivery={handleAddDelivery}
                openCreateModal={quickCreateModal === 'delivery'}
                onCloseCreateModal={() => setQuickCreateModal(null)}
              />
            )}

            {activeModule === 'payments' && (
              <PaymentsModule
                payments={payments}
                onReleasePayment={handleReleasePayment}
              />
            )}

            {activeModule === 'assets' && (
              <AssetsModule assets={assets} onAddAsset={handleAddAsset} />
            )}

            {(activeModule === 'admin' || activeModule === 'team') && (
              <AdminModule
                items={items}
                vendors={vendors}
                rfqs={rfqs}
                quotations={quotations}
                purchaseOrders={purchaseOrders}
                deliveries={deliveries}
                payments={payments}
                assets={assets}
                requisitions={requisitions}
              />
            )}
          </main>

          {/* Enterprise Footer */}
          <footer className="border-t border-slate-800/80 bg-[#090d16] px-6 py-4 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/fitco-logo.png"
                alt="Fitco"
                className="h-4.5 w-auto object-contain opacity-90"
              />
              <span className="font-bold text-slate-200">ProcureOS</span>
              <span className="text-emerald-400 font-semibold">by Fitco</span>
              <span className="text-slate-600">•</span>
              <span>Unified EPC Procurement System for FITCO & Arabitra</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span>Kingdom of Saudi Arabia</span>
              <span>•</span>
              <span>Aramco & SEC Compliant</span>
              <span>•</span>
              <span className="font-mono text-cyan-400">v2.6 Enterprise</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

// ── Auth Gate: wraps the main app with login requirement ────────────────────
const AuthGate: React.FC = () => {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Verifying session…</p>
        </div>
      </div>
    );
  }

  // Not logged in, or needs to change password first → show login/change page
  if (!isAuthenticated || mustChangePassword) {
    return <LoginPage />;
  }

  // Fully authenticated — render the full application
  return <MainApplication />;
};

export const App: React.FC = () => {
  return (
    <CompanyProvider>
      <AuthProvider>
        <ToastProvider>
          <AuthGate />
        </ToastProvider>
      </AuthProvider>
    </CompanyProvider>
  );
};

export default App;
