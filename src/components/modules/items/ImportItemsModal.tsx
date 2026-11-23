import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileUp,
  RefreshCw,
  Plus,
  ArrowRight,
  Boxes,
} from 'lucide-react';
import { Item, ItemCategory } from '../../../types/procurement';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';

interface ImportItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingItems: Item[];
  onConfirmImport: (importedItems: Item[]) => void;
}

interface ParsedImportRow {
  sku: string;
  name: string;
  category: ItemCategory;
  uom: string;
  stockLevel: number;
  reorderPoint: number;
  unitPriceSAR: number;
  location: string;
  description: string;
  isExisting: boolean;
  existingItem?: Item;
}

export const ImportItemsModal: React.FC<ImportItemsModalProps> = ({
  isOpen,
  onClose,
  existingItems,
  onConfirmImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // ── 1. Download Existing Inventory Pre-filled Template ────────────────────
  const handleDownloadTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    // Generate template rows from existing items
    const templateData = existingItems.map((item) => ({
      'SKU': item.sku,
      'Item Name': item.name,
      'Category': item.category,
      'UOM': item.uom || 'EA',
      'Stock Level': item.stockLevel,
      'Reorder Point': item.reorderPoint,
      'Unit Price (SAR)': item.unitPriceSAR,
      'Location': item.location || 'Arabitra Head Office Store Khobar',
      'Description': item.description || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Auto-fit column widths
    const columnWidths = [
      { wch: 22 }, // SKU
      { wch: 45 }, // Item Name
      { wch: 32 }, // Category
      { wch: 8 },  // UOM
      { wch: 14 }, // Stock Level
      { wch: 14 }, // Reorder Point
      { wch: 18 }, // Unit Price (SAR)
      { wch: 35 }, // Location
      { wch: 60 }, // Description
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory_Catalogue');

    const today = new Date().toISOString().split('T')[0];
    const fileName = `procureos_inventory_catalogue_${today}.${format}`;

    XLSX.writeFile(workbook, fileName, { bookType: format });
  };

  // ── 2. Parse Uploaded Excel / CSV Spreadsheet ────────────────────────────
  const parseFile = (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error('Spreadsheet contains no worksheets.');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (rawRows.length === 0) {
          throw new Error('Spreadsheet contains no data rows.');
        }

        // Build lookup maps for existing items
        const skuMap = new Map(existingItems.map((item) => [item.sku.toUpperCase().trim(), item]));
        const nameMap = new Map(
          existingItems.map((item) => [item.name.toLowerCase().trim(), item])
        );

        const results: ParsedImportRow[] = [];

        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];

          // Normalize keys (trim, lower-case, remove special chars)
          const normalized: Record<string, any> = {};
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            normalized[cleanKey] = row[key];
          }

          // Extract fields flexibly
          const skuVal = (
            normalized.sku ||
            normalized.itemcode ||
            normalized.code ||
            normalized.partnumber ||
            normalized.partno ||
            ''
          ).toString().trim();

          const nameVal = (
            normalized.name ||
            normalized.itemname ||
            normalized.product ||
            normalized.title ||
            ''
          ).toString().trim();

          if (!skuVal && !nameVal) {
            continue; // Skip empty rows
          }

          // Check if item exists
          const existingBySku = skuVal ? skuMap.get(skuVal.toUpperCase()) : undefined;
          const existingByName = nameVal ? nameMap.get(nameVal.toLowerCase()) : undefined;
          const existingItem = existingBySku || existingByName;

          // Resolve Stock Level (support MinimumStock, Stock, Qty, etc.)
          const rawStock =
            normalized.stocklevel !== undefined && normalized.stocklevel !== ''
              ? normalized.stocklevel
              : normalized.stock !== undefined && normalized.stock !== ''
              ? normalized.stock
              : normalized.minimumstock !== undefined && normalized.minimumstock !== ''
              ? normalized.minimumstock
              : normalized.minstock !== undefined && normalized.minstock !== ''
              ? normalized.minstock
              : normalized.quantity !== undefined && normalized.quantity !== ''
              ? normalized.quantity
              : normalized.qty !== undefined && normalized.qty !== ''
              ? normalized.qty
              : 0;

          // Resolve Reorder Point
          const rawReorder =
            normalized.reorderpoint !== undefined && normalized.reorderpoint !== ''
              ? normalized.reorderpoint
              : normalized.reorder !== undefined && normalized.reorder !== ''
              ? normalized.reorder
              : normalized.reorderthreshold !== undefined && normalized.reorderthreshold !== ''
              ? normalized.reorderthreshold
              : normalized.rop !== undefined && normalized.rop !== ''
              ? normalized.rop
              : 0;

          // Resolve Price
          const rawPrice =
            normalized.unitpricesar !== undefined && normalized.unitpricesar !== ''
              ? normalized.unitpricesar
              : normalized.unitprice !== undefined && normalized.unitprice !== ''
              ? normalized.unitprice
              : normalized.price !== undefined && normalized.price !== ''
              ? normalized.price
              : existingItem?.unitPriceSAR || 0;

          // Resolve Category
          const categoryVal = (
            normalized.category ||
            normalized.itemcategory ||
            existingItem?.category ||
            'GPS Trackers & Asset Gateways'
          ) as ItemCategory;

          // Resolve UOM
          const uomVal = (
            normalized.uom ||
            normalized.unit ||
            existingItem?.uom ||
            'EA'
          ).toString().toUpperCase();

          // Resolve Location
          const locationVal = (
            normalized.location ||
            normalized.depot ||
            normalized.warehouse ||
            existingItem?.location ||
            'Arabitra Head Office Store Khobar'
          ).toString();

          // Resolve Description
          const descVal = (
            normalized.description ||
            normalized.desc ||
            existingItem?.description ||
            nameVal
          ).toString();

          const stockNum = Math.max(0, parseInt(String(rawStock), 10) || 0);
          const reorderNum = Math.max(0, parseInt(String(rawReorder), 10) || 0);
          const priceNum = Math.max(0, parseFloat(String(rawPrice)) || 0);

          results.push({
            sku: skuVal || existingItem?.sku || `SKU-${Date.now().toString().slice(-4)}`,
            name: nameVal || existingItem?.name || 'Unnamed Item',
            category: categoryVal,
            uom: uomVal,
            stockLevel: stockNum,
            reorderPoint: reorderNum,
            unitPriceSAR: priceNum,
            location: locationVal,
            description: descVal,
            isExisting: Boolean(existingItem),
            existingItem,
          });
        }

        if (results.length === 0) {
          throw new Error('No valid item rows could be identified in the file.');
        }

        setParsedRows(results);
        setSelectedFile(file);
      } catch (err: any) {
        console.error('[ImportItemsModal] Parse error:', err);
        setErrorMessage(err.message || 'Failed to parse the file. Please verify column headers.');
        setParsedRows([]);
        setSelectedFile(null);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      setErrorMessage('Failed to read the file.');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  // ── 3. Apply Import & Commit ──────────────────────────────────────────────
  const handleApplyImport = () => {
    if (parsedRows.length === 0) return;

    // Create a working map initialized with current items
    const finalMap = new Map<string, Item>(
      existingItems.map((item) => [item.sku.toUpperCase(), { ...item }])
    );
    const nameMap = new Map<string, string>(
      existingItems.map((item) => [item.name.toLowerCase().trim(), item.sku.toUpperCase()])
    );

    const nowStr = new Date().toISOString().split('T')[0];

    parsedRows.forEach((row, idx) => {
      const skuKey = row.sku.toUpperCase();
      const existingSku = finalMap.has(skuKey) ? skuKey : nameMap.get(row.name.toLowerCase().trim());

      if (existingSku && finalMap.has(existingSku)) {
        // Update existing item
        const curr = finalMap.get(existingSku)!;
        finalMap.set(existingSku, {
          ...curr,
          name: row.name || curr.name,
          stockLevel: row.stockLevel,
          reorderPoint: row.reorderPoint,
          unitPriceSAR: row.unitPriceSAR || curr.unitPriceSAR,
          category: row.category || curr.category,
          uom: row.uom || curr.uom,
          description: row.description || curr.description,
          location: row.location || curr.location || 'Arabitra Head Office Store Khobar',
          updatedAt: nowStr,
        });
      } else {
        // Add new item
        const newItem: Item = {
          id: `ITM-TEL-${Date.now().toString().slice(-4)}-${idx + 1}`,
          sku: row.sku.toUpperCase(),
          name: row.name,
          description: row.description || row.name,
          category: row.category,
          uom: row.uom || 'EA',
          stockLevel: row.stockLevel,
          reorderPoint: row.reorderPoint,
          unitPriceSAR: row.unitPriceSAR,
          entity: 'ARABITRA',
          primaryVendorId: 'VND-001',
          location: row.location || 'Arabitra Head Office Store Khobar',
          status: 'Pending Head Approval',
          approvalStatus: 'Pending Head Approval',
          leadTimeDays: 7,
          updatedAt: nowStr,
          requestedBy: 'Bulk Inventory Import',
        };
        finalMap.set(skuKey, newItem);
        nameMap.set(row.name.toLowerCase().trim(), skuKey);
      }
    });

    const finalItems = Array.from(finalMap.values());
    onConfirmImport(finalItems);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setErrorMessage(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updatedCount = parsedRows.filter((r) => r.isExisting).length;
  const newCount = parsedRows.filter((r) => !r.isExisting).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Import Items & Update Stock Levels"
      subtitle="Upload Excel (.xlsx, .xls) or CSV files to sync live inventory stocks, reorder points, or add new items."
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Step 1: Download Live Template */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                <h4 className="text-sm font-bold text-slate-100">1. Download Inventory Template</h4>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Contains all <strong className="text-cyan-300">{existingItems.length} items</strong> currently in your catalog with their live stock levels. Open in Excel/Numbers, update stock/reorder columns or add new rows, and upload below.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5 text-emerald-400" />}
                onClick={() => handleDownloadTemplate('xlsx')}
                className="text-xs font-semibold"
              >
                Download (.xlsx)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Download className="w-3.5 h-3.5 text-slate-400" />}
                onClick={() => handleDownloadTemplate('csv')}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                .CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Step 2: Upload File Dropzone */}
        <div>
          <h4 className="text-sm font-bold text-slate-100 mb-2 flex items-center gap-2">
            <Upload className="w-4 h-4 text-cyan-400" />
            2. Upload Updated Spreadsheet
          </h4>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/30'
                : selectedFile
                ? 'border-emerald-500/50 bg-emerald-950/20'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-900'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                  selectedFile
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-cyan-400'
                }`}
              >
                {selectedFile ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <FileUp className="w-6 h-6" />
                )}
              </div>

              {selectedFile ? (
                <div>
                  <p className="text-sm font-bold text-slate-100">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB · Click or drag to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200">
                    Drag and drop your updated Excel or CSV file here, or{' '}
                    <span className="text-cyan-400 underline">browse</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports .xlsx, .xls, and .csv files
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">File Parsing Notice</p>
              <p className="mt-0.5 text-rose-300/90">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Parsing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-cyan-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Analyzing spreadsheet rows and matching SKUs...</span>
          </div>
        )}

        {/* Step 3: Parsed Data Preview & Comparison */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            {/* Stat Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-semibold text-slate-300">
                Found <strong className="text-white font-mono">{parsedRows.length}</strong> items in file
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/40 font-semibold text-cyan-300">
                <strong className="font-mono">{updatedCount}</strong> existing items will be updated
              </span>
              {newCount > 0 && (
                <span className="px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 font-semibold text-emerald-300">
                  <strong className="font-mono">{newCount}</strong> new items will be added
                </span>
              )}
            </div>

            {/* Preview Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Action</th>
                    <th className="py-2.5 px-3 font-semibold">SKU</th>
                    <th className="py-2.5 px-3 font-semibold">Item Name</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Stock Level</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Reorder Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {parsedRows.slice(0, 15).map((row, idx) => {
                    const hasStockChange =
                      row.existingItem && row.existingItem.stockLevel !== row.stockLevel;
                    const hasReorderChange =
                      row.existingItem && row.existingItem.reorderPoint !== row.reorderPoint;

                    return (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.isExisting ? (
                            <Badge variant="cyan" className="text-[10px]">
                              Update Stock
                            </Badge>
                          ) : (
                            <Badge variant="emerald" className="text-[10px]">
                              New Item
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                          {row.sku}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 min-w-[200px] leading-snug">
                          {row.name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {row.isExisting ? (
                            <span className="flex items-center justify-end gap-1.5">
                              <span className="text-slate-500 text-[11px]">
                                {row.existingItem?.stockLevel ?? 0}
                              </span>
                              {hasStockChange && (
                                <ArrowRight className="w-3 h-3 text-cyan-400 inline" />
                              )}
                              <span
                                className={
                                  hasStockChange ? 'text-emerald-400 font-bold' : 'text-slate-200'
                                }
                              >
                                {row.stockLevel}
                              </span>
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold">{row.stockLevel}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {row.isExisting ? (
                            <span className="flex items-center justify-end gap-1.5">
                              <span className="text-slate-500 text-[11px]">
                                {row.existingItem?.reorderPoint ?? 0}
                              </span>
                              {hasReorderChange && (
                                <ArrowRight className="w-3 h-3 text-cyan-400 inline" />
                              )}
                              <span
                                className={
                                  hasReorderChange ? 'text-cyan-400 font-bold' : 'text-slate-200'
                                }
                              >
                                {row.reorderPoint}
                              </span>
                            </span>
                          ) : (
                            <span className="text-cyan-400 font-bold">{row.reorderPoint}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {parsedRows.length > 15 && (
                <div className="py-2 px-3 text-center text-[11px] text-slate-500 bg-slate-900/40 border-t border-slate-800">
                  Showing first 15 of {parsedRows.length} items. All items will be imported.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="text-xs text-slate-400"
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<CheckCircle2 className="w-4 h-4" />}
            disabled={parsedRows.length === 0}
            onClick={handleApplyImport}
            className="text-xs font-bold"
          >
            Confirm & Make Live ({parsedRows.length} Items)
          </Button>
        </div>
      </div>
    </Modal>
  );
};
