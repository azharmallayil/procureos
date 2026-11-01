import React, { useState } from 'react';
import { CompanyProvider } from './context/CompanyContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { DemoBanner } from './components/common/DemoBanner';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardModule } from './components/modules/dashboard/DashboardModule';
import { ItemsModule } from './components/modules/items/ItemsModule';
import { VendorsModule } from './components/modules/vendors/VendorsModule';
import { RfqsModule } from './components/modules/rfqs/RfqsModule';
import { QuotationsModule } from './components/modules/quotations/QuotationsModule';
import { PurchaseOrdersModule } from './components/modules/purchaseOrders/PurchaseOrdersModule';
import { DeliveriesModule } from './components/modules/deliveries/DeliveriesModule';
import { PaymentsModule } from './components/modules/payments/PaymentsModule';
import { AssetsModule } from './components/modules/assets/AssetsModule';
import { TeamModule } from './components/modules/team/TeamModule';
import {
  MOCK_ITEMS,
  MOCK_VENDORS,
  MOCK_RFQS,
  MOCK_QUOTATIONS,
  MOCK_PURCHASE_ORDERS,
  MOCK_DELIVERIES,
  MOCK_PAYMENTS,
  MOCK_ASSETS,
} from './data/mockData';
import {
  ModuleId,
  Item,
  Vendor,
  RFQ,
  PurchaseOrder,
  Delivery,
  Asset,
  QuotationComparisonItem,
  QuoteLineItemPrice,
} from './types/procurement';

const MainApplication: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for quick action triggers from Topbar
  const [quickCreateModal, setQuickCreateModal] = useState<
    'rfq' | 'po' | 'item' | 'delivery' | null
  >(null);

  // In-memory persistent state initialized from mock data
  const [items, setItems] = useState<Item[]>(MOCK_ITEMS);
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [rfqs, setRfqs] = useState<RFQ[]>(MOCK_RFQS);
  const [quotations, setQuotations] = useState(MOCK_QUOTATIONS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(MOCK_PURCHASE_ORDERS);
  const [deliveries, setDeliveries] = useState<Delivery[]>(MOCK_DELIVERIES);
  const [payments, setPayments] = useState(MOCK_PAYMENTS);
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);

  // Transaction mutations
  const handleAddItem = (item: Item) => setItems((prev) => [item, ...prev]);
  const handleAddVendor = (vendor: Vendor) => setVendors((prev) => [vendor, ...prev]);
  const handleAddRfq = (rfq: RFQ) => setRfqs((prev) => [rfq, ...prev]);
  const handleAddPO = (po: PurchaseOrder) => setPurchaseOrders((prev) => [po, ...prev]);
  const handleAddDelivery = (del: Delivery) => setDeliveries((prev) => [del, ...prev]);
  const handleAddAsset = (asset: Asset) => setAssets((prev) => [asset, ...prev]);

  const handleApprovePO = (poId: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: 'Approved' as const } : po))
    );
  };

  const handleRejectPO = (poId: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: 'Draft' as const } : po))
    );
  };

  const handleMarkInspected = (deliveryId: string) => {
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: 'Inspected & Accepted' as const,
              qcInspectionStatus: 'Passed' as const,
              isOverdue: false,
            }
          : d
      )
    );
  };

  const handleReleasePayment = (paymentId: string) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              status: 'Paid' as const,
              bankReference: `SARIE-SNB-${Math.floor(100000000 + Math.random() * 900000000)}`,
              paymentDate: new Date().toISOString().split('T')[0],
            }
          : p
      )
    );
  };

  const handleAwardBid = (quoteEvaluationId: string, vendorId: string) => {
    setQuotations((prev) =>
      prev.map((qe) =>
        qe.id === quoteEvaluationId
          ? {
              ...qe,
              status: 'Awarded' as const,
              submissions: qe.submissions.map((sub) =>
                sub.vendorId === vendorId
                  ? { ...sub, status: 'Awarded' as const }
                  : { ...sub, status: 'Rejected' as const }
              ),
            }
          : qe
      )
    );

    // Auto-create draft PO from the awarded bid
    const targetQE = quotations.find((q) => q.id === quoteEvaluationId);
    const targetBid = targetQE?.submissions.find((s) => s.vendorId === vendorId);
    if (targetQE && targetBid) {
      const net = targetBid.quotedTotalSAR;
      const vat = net * 0.15;
      const newPO: PurchaseOrder = {
        id: `PO-${Date.now().toString().slice(-4)}`,
        poNumber: `PO-${targetQE.entity === 'FITCO' ? 'FTC' : 'ARB'}-26-0${Math.floor(520 + Math.random() * 400)}`,
        rfqNumber: targetQE.rfqNumber,
        vendorId: targetBid.vendorId,
        vendorName: targetBid.vendorName,
        entity: targetQE.entity,
        projectSite: targetQE.projectName,
        issueDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '2026-11-30',
        totalAmountSAR: net,
        taxAmountSAR: vat,
        grandTotalSAR: net + vat,
        status: 'Draft',
        paymentTerms: 'Standard 30% Advance, 70% Handover',
        approvalStage: 'Purchasing',
        currentApproverRole: 'Procurement Director',
        paymentStatus: 'Unpaid',
        lineItems:
          targetBid.lineItems && targetBid.lineItems.length > 0
            ? targetBid.lineItems.map((li, idx) => ({
                id: `POL-${idx + 1}`,
                sku: `PKG-VAL-0${idx + 1}`,
                description: li.description,
                quantity: li.quantity,
                uom: li.uom,
                unitPriceSAR: li.unitPriceSAR,
                totalPriceSAR: li.totalPriceSAR,
              }))
            : [
                {
                  id: 'POL-NEW',
                  sku: 'PKG-VAL-01',
                  description: `${targetQE.rfqTitle} awarded scope`,
                  quantity: 1,
                  uom: 'LOT',
                  unitPriceSAR: net,
                  totalPriceSAR: net,
                },
              ],
      };
      setPurchaseOrders((prev) => [newPO, ...prev]);
    }
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
    setQuotations((prev) =>
      prev.map((qe) => {
        if (qe.rfqId === rfqId) {
          const updatedSubmissions = [...qe.submissions, newSubmission];
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

    // Update bids count on corresponding RFQ
    setRfqs((prev) =>
      prev.map((r) =>
        r.id === rfqId ? { ...r, receivedBidsCount: r.receivedBidsCount + 1 } : r
      )
    );
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
      {/* Universal Demo & Security Disclaimer Banner */}
      <DemoBanner />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {/* Top Header Bar */}
          <Topbar
            onOpenMobileMenu={() => setMobileOpen(true)}
            onQuickAction={handleQuickAction}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Module Content View */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-16">
            {activeModule === 'dashboard' && (
              <DashboardModule
                rfqs={rfqs}
                purchaseOrders={purchaseOrders}
                deliveries={deliveries}
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

            {activeModule === 'rfqs' && (
              <RfqsModule
                rfqs={rfqs}
                onAddRfq={handleAddRfq}
                onNavigateToQuotes={(rfqId) => setActiveModule('quotations')}
                openCreateModal={quickCreateModal === 'rfq'}
                onCloseCreateModal={() => setQuickCreateModal(null)}
              />
            )}

            {activeModule === 'quotations' && (
              <QuotationsModule
                quotations={quotations}
                rfqs={rfqs}
                vendors={vendors}
                onAwardBid={handleAwardBid}
                onQuoteUploaded={handleQuoteUploaded}
                onUpdateQuotePrice={handleUpdateQuotePrice}
              />
            )}

            {activeModule === 'purchaseOrders' && (
              <PurchaseOrdersModule
                purchaseOrders={purchaseOrders}
                onAddPO={handleAddPO}
                onApprovePO={handleApprovePO}
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

            {activeModule === 'team' && <TeamModule />}
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

export const App: React.FC = () => {
  return (
    <CompanyProvider>
      <AuthProvider>
        <ToastProvider>
          <MainApplication />
        </ToastProvider>
      </AuthProvider>
    </CompanyProvider>
  );
};

export default App;
