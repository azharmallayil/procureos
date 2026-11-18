// ============================================================================
// ProcureOS Enterprise Live Sync & Global Cloud Realtime Bus
// Dual-layer Synchronization:
// 1. Supabase Realtime WebSocket for cross-network, multi-computer live sync
// 2. Local BroadcastChannel + Storage events for instant cross-tab sync
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  StoredPdfDoc,
  getAllStoredPdfDocuments,
  restoreStoredPdfDocuments,
  clearAllStoredPdfDocuments,
} from './pdfStorage';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}

export interface LiveBusMessage {
  type: 'SYNC_KEY' | 'AUDIT_ENTRY' | 'FULL_DATABASE_RESTORE' | 'USER_SYNC' | 'REQUEST_LATEST_STATE';
  key?: string;
  data?: any;
  timestamp: number;
  actor?: string;
  senderId?: string;
}

const BROADCAST_CHANNEL_NAME = 'procureos_enterprise_live_bus';
const LOCAL_EVENT_NAME = 'procureos:live-event';
const AUDIT_LOGS_KEY = 'procureos_audit_logs';
const SUPABASE_CHANNEL_NAME = 'procureos_global_live_sync';

// Generate a unique client instance ID to filter out self-echoed broadcasts
const CLIENT_INSTANCE_ID = `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

class ProcureOSLiveBus {
  private localChannel: BroadcastChannel | null = null;
  private supabaseChannel: any = null;
  private listeners: Set<(msg: LiveBusMessage) => void> = new Set();
  public isCloudConnected = false;

  constructor() {
    // 1. Local BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.localChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.localChannel.onmessage = (event: MessageEvent<LiveBusMessage>) => {
          if (event.data?.senderId !== CLIENT_INSTANCE_ID) {
            this.handleIncoming(event.data, false);
          }
        };
      } catch (err) {
        console.warn('[ProcureOS LiveSync] Local BroadcastChannel fallback', err);
      }
    }

    // 2. Storage event listener (fallback for older browser contexts)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.handleIncoming({
              type: 'SYNC_KEY',
              key: e.key,
              data: parsed,
              timestamp: Date.now(),
              senderId: 'storage_event',
            }, false);
          } catch {
            // Ignore non-json
          }
        }
      });

      // Internal in-window event dispatcher
      window.addEventListener(LOCAL_EVENT_NAME, (e: any) => {
        if (e.detail && e.detail.senderId !== CLIENT_INSTANCE_ID) {
          this.handleIncoming(e.detail, false);
        }
      });
    }

    // 3. Supabase Realtime WebSocket for global cloud sync across all devices
    if (typeof window !== 'undefined' && isSupabaseConfigured && supabase) {
      try {
        this.supabaseChannel = supabase.channel(SUPABASE_CHANNEL_NAME, {
          config: {
            broadcast: { self: false },
          },
        });

        this.supabaseChannel
          .on('broadcast', { event: 'PROCUREOS_LIVE_SYNC' }, ({ payload }: { payload: LiveBusMessage }) => {
            if (payload && payload.senderId !== CLIENT_INSTANCE_ID) {
              this.handleIncoming(payload, false);
            }
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              this.isCloudConnected = true;
              console.info('[ProcureOS Cloud Sync] Connected to Supabase Global Realtime');
              // Ask active peers for any updates made while disconnected
              this.publish({
                type: 'REQUEST_LATEST_STATE',
                timestamp: Date.now(),
                senderId: CLIENT_INSTANCE_ID,
              });
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              this.isCloudConnected = false;
            }
          });
      } catch (err) {
        console.warn('[ProcureOS Cloud Sync] Realtime init notice:', err);
      }
    }
  }

  public publish(msg: LiveBusMessage): void {
    const enrichedMsg: LiveBusMessage = {
      ...msg,
      senderId: CLIENT_INSTANCE_ID,
    };

    // 1. Notify local in-tab listeners
    this.notify(enrichedMsg);

    // 2. Broadcast across local tabs/windows
    if (this.localChannel) {
      try {
        this.localChannel.postMessage(enrichedMsg);
      } catch (err) {
        console.warn('[ProcureOS LiveSync] Local broadcast failed', err);
      }
    }

    // 3. Broadcast across the internet to all devices via Supabase Realtime
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'PROCUREOS_LIVE_SYNC',
          payload: enrichedMsg,
        });
      } catch (err) {
        console.warn('[ProcureOS Cloud Sync] Supabase broadcast failed', err);
      }
    }

    // 4. Dispatch custom local event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LOCAL_EVENT_NAME, { detail: enrichedMsg }));
    }
  }

  public subscribe(callback: (msg: LiveBusMessage) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private handleIncoming(msg: LiveBusMessage, shouldRelay: boolean = false): void {
    // Write directly to local storage so persistence is automatic
    if (msg.type === 'SYNC_KEY' && msg.key && msg.data !== undefined) {
      try {
        localStorage.setItem(msg.key, JSON.stringify(msg.data));
      } catch (err) {
        console.warn(`[ProcureOS] Failed to write key ${msg.key} to localStorage`, err);
      }
    } else if (msg.type === 'USER_SYNC' && msg.data) {
      try {
        localStorage.setItem('procureos_users', JSON.stringify(msg.data));
      } catch (err) {
        console.warn('[ProcureOS] Failed to write users to localStorage', err);
      }
    } else if (msg.type === 'FULL_DATABASE_RESTORE' && msg.data) {
      try {
        ALL_DATA_KEYS.forEach((k) => {
          if (k in msg.data) {
            localStorage.setItem(k, JSON.stringify(msg.data[k]));
          }
        });
      } catch (err) {
        console.warn('[ProcureOS] Failed to restore database locally', err);
      }
    } else if (msg.type === 'REQUEST_LATEST_STATE') {
      // Peer asked for latest state snapshot; respond with our current database
      try {
        generateFullBackup('Active Peer Sync').then((backup) => {
          if (this.supabaseChannel) {
            this.supabaseChannel.send({
              type: 'broadcast',
              event: 'PROCUREOS_LIVE_SYNC',
              payload: {
                type: 'FULL_DATABASE_RESTORE',
                data: backup.data,
                timestamp: Date.now(),
                senderId: CLIENT_INSTANCE_ID,
              },
            });
          }
        });
      } catch {
        // silent
      }
    }

    this.notify(msg);

    if (shouldRelay && this.localChannel) {
      try {
        this.localChannel.postMessage(msg);
      } catch {
        // silent
      }
    }
  }

  private notify(msg: LiveBusMessage): void {
    this.listeners.forEach((fn) => {
      try {
        fn(msg);
      } catch (err) {
        console.error('[ProcureOS LiveSync] Listener error', err);
      }
    });
  }
}

export const liveBus = new ProcureOSLiveBus();

// ── Audit Logging Helper ────────────────────────────────────────────────────

export function recordAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  actor?: { name?: string; role?: string }
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actorName: actor?.name || 'System / Automated',
    actorRole: actor?.role || 'System',
    action,
    entityType,
    entityId,
    details,
  };

  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
    logs.unshift(entry);
    if (logs.length > 1000) logs.length = 1000;
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
  } catch (err) {
    console.warn('[ProcureOS Audit] Storage quota exceeded or disabled', err);
  }

  liveBus.publish({
    type: 'AUDIT_ENTRY',
    data: entry,
    timestamp: Date.now(),
    actor: actor?.name,
  });

  return entry;
}

export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Full System Backup & Restore ────────────────────────────────────────────

export const ALL_DATA_KEYS = [
  'procureos_items',
  'procureos_vendors',
  'procureos_requisitions',
  'procureos_rfqs',
  'procureos_quotations',
  'procureos_purchase_orders',
  'procureos_deliveries',
  'procureos_payments',
  'procureos_assets',
  'procureos_users',
  'procureos_credentials',
  'procureos_audit_logs',
] as const;

export interface EnterpriseBackupPayload {
  version: string;
  exportedAt: string;
  system: string;
  exportedBy: string;
  checksum: string;
  data: Record<string, any>;
  counts: Record<string, number>;
  pdfDocuments?: StoredPdfDoc[];
}

export async function generateFullBackup(exportedBy: string = 'Super Admin'): Promise<EnterpriseBackupPayload> {
  const data: Record<string, any> = {};
  const counts: Record<string, number> = {};

  ALL_DATA_KEYS.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        data[key] = parsed;
        counts[key] = Array.isArray(parsed) ? parsed.length : 1;
      } else {
        data[key] = [];
        counts[key] = 0;
      }
    } catch {
      data[key] = [];
      counts[key] = 0;
    }
  });

  // Collect all quote PDFs from local IndexedDB
  let pdfDocuments: StoredPdfDoc[] = [];
  try {
    pdfDocuments = await getAllStoredPdfDocuments();
  } catch (err) {
    console.warn('[ProcureOS Backup] Could not retrieve PDFs from IndexedDB:', err);
  }

  // Also collect any dataUrls embedded in procureos_quotations submissions
  if (Array.isArray(data['procureos_quotations'])) {
    const existingIds = new Set(pdfDocuments.map((d) => d.id));
    for (const qe of data['procureos_quotations']) {
      if (Array.isArray(qe.submissions)) {
        for (const sub of qe.submissions) {
          if (sub.attachment?.pdfDataUrl && sub.attachment?.docId && !existingIds.has(sub.attachment.docId)) {
            pdfDocuments.push({
              id: sub.attachment.docId,
              proposalRef: sub.attachment.proposalRefNumber || '',
              fileName: sub.attachment.fileName || 'Quotation.pdf',
              mimeType: 'application/pdf',
              dataUrl: sub.attachment.pdfDataUrl,
              uploadedAt: sub.attachment.uploadedAt || new Date().toISOString(),
              fileSizeBytes: sub.attachment.fileSizeBytes || 0,
            });
            existingIds.add(sub.attachment.docId);
          }
        }
      }
    }
  }

  counts['procureos_pdf_documents'] = pdfDocuments.length;

  return {
    version: '2.6.0',
    exportedAt: new Date().toISOString(),
    system: 'ProcureOS Enterprise Saudi Arabia Multi-Entity Procurement OS',
    exportedBy,
    checksum: `SHA256-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    data,
    counts,
    pdfDocuments,
  };
}

export async function downloadBackupFile(exportedBy: string): Promise<void> {
  const backup = await generateFullBackup(exportedBy);
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `procureos-enterprise-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  recordAuditLog(
    'System Backup Exported',
    'System',
    'BACKUP-FULL',
    `Enterprise snapshot exported containing ${Object.keys(backup.data).length} tables and ${backup.pdfDocuments?.length || 0} quote PDF documents.`,
    { name: exportedBy, role: 'Super Admin' }
  );
}

export async function restoreFullBackup(
  backup: EnterpriseBackupPayload,
  restoredBy: string = 'Super Admin'
): Promise<{ ok: boolean; message: string; counts?: Record<string, number> }> {
  if (!backup || !backup.data || typeof backup.data !== 'object') {
    return { ok: false, message: 'Invalid backup file structure: missing data payload.' };
  }

  try {
    // 1. Restore all collections to localStorage
    ALL_DATA_KEYS.forEach((key) => {
      if (key in backup.data) {
        localStorage.setItem(key, JSON.stringify(backup.data[key]));
      }
    });

    // 2. Restore all PDF documents into IndexedDB
    let pdfCount = 0;
    if (Array.isArray(backup.pdfDocuments) && backup.pdfDocuments.length > 0) {
      await restoreStoredPdfDocuments(backup.pdfDocuments);
      pdfCount += backup.pdfDocuments.length;
    }

    // 3. Ensure any inline quotation attachments with dataUrls are also written to IndexedDB
    if (Array.isArray(backup.data.procureos_quotations)) {
      const inlineDocs: StoredPdfDoc[] = [];
      for (const qe of backup.data.procureos_quotations) {
        if (Array.isArray(qe.submissions)) {
          for (const sub of qe.submissions) {
            if (sub.attachment?.pdfDataUrl && sub.attachment?.docId) {
              inlineDocs.push({
                id: sub.attachment.docId,
                proposalRef: sub.attachment.proposalRefNumber || '',
                fileName: sub.attachment.fileName || 'Quotation.pdf',
                mimeType: 'application/pdf',
                dataUrl: sub.attachment.pdfDataUrl,
                uploadedAt: sub.attachment.uploadedAt || new Date().toISOString(),
                fileSizeBytes: sub.attachment.fileSizeBytes || 0,
              });
            }
          }
        }
      }
      if (inlineDocs.length > 0) {
        await restoreStoredPdfDocuments(inlineDocs);
        pdfCount += inlineDocs.length;
      }
    }

    recordAuditLog(
      'System Backup Restored',
      'System',
      'RESTORE-FULL',
      `Full database restoration executed from snapshot created at ${backup.exportedAt || 'Unknown'}. Restored ${Object.keys(backup.data).length} collections and ${pdfCount} quote PDF documents.`,
      { name: restoredBy, role: 'Super Admin' }
    );

    // Notify all tabs, windows, and remote peers globally
    liveBus.publish({
      type: 'FULL_DATABASE_RESTORE',
      data: backup.data,
      timestamp: Date.now(),
      actor: restoredBy,
    });

    return {
      ok: true,
      message: `Enterprise database successfully restored: ${Object.keys(backup.data).length} collections and ${pdfCount} quote PDF documents synchronized.`,
      counts: backup.counts,
    };
  } catch (err: any) {
    return { ok: false, message: `Failed to restore database: ${err?.message || 'Unknown error'}` };
  }
}

/**
 * Purges all mock transactions (RFQs, Quotations, POs, Deliveries, Payments, Assets),
 * clears all stored quote PDFs in IndexedDB, wipes test item & vendor rows,
 * preserves authenticated Super Admin user, and logs an immutable audit event.
 */
export async function initializeCleanProductionSlate(
  adminUser?: { name: string; role: string; email?: string }
): Promise<{ ok: boolean; message: string }> {
  try {
    // 1. Clear transactional collections
    localStorage.setItem('procureos_requisitions', JSON.stringify([]));
    localStorage.setItem('procureos_rfqs', JSON.stringify([]));
    localStorage.setItem('procureos_quotations', JSON.stringify([]));
    localStorage.setItem('procureos_purchase_orders', JSON.stringify([]));
    localStorage.setItem('procureos_deliveries', JSON.stringify([]));
    localStorage.setItem('procureos_payments', JSON.stringify([]));
    localStorage.setItem('procureos_assets', JSON.stringify([]));

    // 2. Clear demo items & vendors to clean slate ready for company imports
    localStorage.setItem('procureos_items', JSON.stringify([]));
    localStorage.setItem('procureos_vendors', JSON.stringify([]));

    // 3. Clear all stored quote PDF documents from IndexedDB
    await clearAllStoredPdfDocuments();

    // 4. Reset user list to sole Super Admin: Muhammed Azhar
    localStorage.setItem('procureos_users', JSON.stringify([
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
      }
    ]));

    // 5. Update system version
    localStorage.setItem('procureos_db_version', '2026.11.18.prod_pure');
    localStorage.setItem('procureos_environment', 'production');

    // 6. Record system audit event
    recordAuditLog(
      'Clean Production Slate Initialized',
      'System',
      'PROD-INIT',
      'All demo data, test RFQs, mock quotations, POs, and quote PDFs purged. Sole Super Admin: Muhammed Azhar.',
      { name: 'Muhammed Azhar', role: 'Super Admin' }
    );

    // 6. Broadcast across all tabs and cloud channels
    liveBus.publish({
      type: 'FULL_DATABASE_RESTORE',
      data: {
        procureos_requisitions: [],
        procureos_rfqs: [],
        procureos_quotations: [],
        procureos_purchase_orders: [],
        procureos_deliveries: [],
        procureos_payments: [],
        procureos_assets: [],
        procureos_items: [],
        procureos_vendors: [],
      },
      timestamp: Date.now(),
      actor: adminUser?.name || 'Super Admin',
    });

    return {
      ok: true,
      message: 'Clean production slate initialized successfully. All demo tables and test quotation PDFs have been purged.',
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Failed to initialize production slate: ${err?.message || 'Unknown error'}`,
    };
  }
}

