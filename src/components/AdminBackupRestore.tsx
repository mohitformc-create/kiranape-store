import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  Database,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Layers,
  ShoppingBag,
  Info,
  X,
  Sparkles,
} from 'lucide-react';
import { Product, StoreSettings, CustomCategory, PromoBanner } from '../types';
import {
  downloadStoreBackup,
  getWhatsAppBackupUrl,
  validateBackupFile,
  executeRestoreBackup,
  getLastBackupTimestamp,
  generateStoreBackup,
  BackupValidationResult,
  mergeAndInjectWholesaleCatalog,
} from '../services/storageService';

interface AdminBackupRestoreProps {
  products: Product[];
  categories: CustomCategory[];
  storeSettings: StoreSettings;
  banners: PromoBanner[];
  onDataRestored?: () => void;
}

export const AdminBackupRestore: React.FC<AdminBackupRestoreProps> = ({
  products,
  categories,
  storeSettings,
  banners,
  onDataRestored,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(() => getLastBackupTimestamp());
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Pending restore confirmation state
  const [pendingRestore, setPendingRestore] = useState<{
    filename: string;
    preview: NonNullable<BackupValidationResult['preview']>;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Refresh last backup time if storage changes
  useEffect(() => {
    setLastBackupTime(getLastBackupTimestamp());
  }, []);

  const handleDownloadBackup = () => {
    setIsExporting(true);
    setRestoreError(null);
    try {
      const { filename, backup } = downloadStoreBackup();
      setLastBackupTime(backup.timestamp);
      setExportNotice(`Backup file "${filename}" downloaded! Contains ${backup.stats.productsCount} products & ${backup.stats.categoriesCount} categories.`);
      setSuccessToast(`Backup downloaded to your device storage!`);
      setTimeout(() => {
        setExportNotice(null);
        setSuccessToast(null);
      }, 5000);
    } catch (err: any) {
      setRestoreError(`Export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendToWhatsApp = () => {
    try {
      // 1. Also download file to ensure local phone storage copy exists
      const { filename, backup } = downloadStoreBackup();
      setLastBackupTime(backup.timestamp);

      // 2. Open WhatsApp with detailed backup report
      const waUrl = getWhatsAppBackupUrl(backup);
      window.open(waUrl, '_blank');

      setExportNotice(`Backup "${filename}" downloaded and opened in WhatsApp chat!`);
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err: any) {
      setRestoreError(`WhatsApp backup failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleOpenFilePicker = () => {
    setRestoreError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset to allow re-selecting same file
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setRestoreError('Invalid file format. Please select a .json backup file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setRestoreError('The selected file is empty.');
        return;
      }

      const validation = validateBackupFile(content);
      if (!validation.isValid || !validation.preview) {
        setRestoreError(validation.error || 'Invalid backup structure.');
        return;
      }

      // Validated! Open confirmation dialog
      setPendingRestore({
        filename: file.name,
        preview: validation.preview,
      });
      setRestoreError(null);
    };

    reader.onerror = () => {
      setRestoreError('Failed to read the selected file. Please try again.');
    };

    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!pendingRestore) return;
    setIsRestoring(true);

    try {
      const result = executeRestoreBackup(pendingRestore.preview);
      setLastBackupTime(Date.now());
      setSuccessToast(`Store data successfully restored! (${result.productsCount} products & ${result.categoriesCount} categories)`);
      setPendingRestore(null);

      if (onDataRestored) {
        onDataRestored();
      }

      setTimeout(() => {
        setSuccessToast(null);
      }, 5000);
    } catch (err: any) {
      setRestoreError(`Restore failed: ${err?.message || 'Failed to save data'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleInjectWholesale = () => {
    try {
      const merged = mergeAndInjectWholesaleCatalog();
      setSuccessToast(`Wholesale Catalog (105 Items) merged successfully! Active products: ${merged.length}`);
      if (onDataRestored) {
        onDataRestored();
      }
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      setRestoreError(`Wholesale injection failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const formatLastBackupDate = (ts: number | null) => {
    if (!ts) return 'Not yet backed up on this device';
    const date = new Date(ts);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-6">
      {/* Hidden File Input for Native Picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-2xs">
            <Database className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-stone-900 text-base sm:text-lg flex items-center gap-2">
              <span>Offline 1-Tap Data Backup & Restore Engine</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Safe & Local
              </span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Protect your grocery catalog and custom categories. Download instant JSON backups to phone storage or WhatsApp.
            </p>
          </div>
        </div>

        {/* Live Catalog Metric Badge */}
        <div className="flex items-center gap-2 text-xs bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 text-stone-600 font-medium">
          <Layers className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            Current: <strong className="text-stone-900 font-bold">{products.length}</strong> products •{' '}
            <strong className="text-stone-900 font-bold">{categories.length}</strong> categories
          </span>
        </div>
      </div>

      {/* Success / Error Toasts */}
      {successToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {exportNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2 animate-in fade-in">
          <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {restoreError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-semibold flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{restoreError}</span>
          </div>
          <button
            type="button"
            onClick={() => setRestoreError(null)}
            className="text-rose-700 hover:text-rose-950 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Two-Column Actions Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: One-Click Backup Export */}
        <div className="bg-stone-50/80 rounded-2xl p-4 sm:p-5 border border-stone-200/80 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Download className="w-3 h-3" /> 1. Export Data Backup
              </span>
              <span className="text-[10px] text-stone-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                {lastBackupTime ? formatLastBackupDate(lastBackupTime) : 'No backup yet'}
              </span>
            </div>
            <h4 className="font-heading font-bold text-stone-900 text-sm sm:text-base">
              Download Store Data (.json)
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Creates a complete offline backup file named with today's date (<code>kiranape_backup_DD-MM-YYYY.json</code>). Saves directly to your phone or computer Downloads folder.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {/* Primary Action Button */}
            <button
              type="button"
              id="download-store-backup-btn"
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-heading font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>{isExporting ? 'Generating Backup...' : '📥 Download Store Data Backup (.json)'}</span>
            </button>

            {/* Alternative Action: Send to WhatsApp */}
            <button
              type="button"
              id="whatsapp-backup-btn"
              onClick={handleSendToWhatsApp}
              className="w-full py-2.5 px-4 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 active:scale-[0.99] rounded-xl text-xs font-heading font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <span className="text-sm">🟢</span>
              <span>📲 Send Backup to WhatsApp (9424316081)</span>
            </button>
          </div>
        </div>

        {/* Card 2: One-Click Restore / Import Engine */}
        <div className="bg-stone-50/80 rounded-2xl p-4 sm:p-5 border border-stone-200/80 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-800 bg-stone-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Upload className="w-3 h-3" /> 2. Import & Restore Data
              </span>
              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Safe Validation
              </span>
            </div>
            <h4 className="font-heading font-bold text-stone-900 text-sm sm:text-base">
              Restore from JSON Backup File
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Restore previously saved products, custom categories, and store settings on any phone or browser. Safe pre-restore validation protects against corrupted files.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {/* Secure Restore Button */}
            <button
              type="button"
              id="restore-backup-file-btn"
              onClick={handleOpenFilePicker}
              className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-heading font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>📤 Restore Backup File</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Protected inside Admin Hub • Zero auto-wipe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Safety & Safeguard Advisory */}
      <div className="p-3 bg-stone-100/70 border border-stone-200 rounded-xl text-stone-600 text-[11px] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
        <div className="leading-relaxed">
          <strong className="text-stone-800">Shopkeeper Tip:</strong> Always keep a copy of your backup file in Google Drive or your WhatsApp chat with <strong>9424316081</strong>. When switching phones or clearing browser cache, simply tap <em>Restore Backup File</em> to reload all your inventory in 1 second.
        </div>
      </div>

      {/* Wholesale Catalog Ingestion Action */}
      <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h5 className="font-heading font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Wholesale 105 Master Catalog Sync</span>
          </h5>
          <p className="text-[11px] text-amber-800">
            Merge & sync the complete 105-item wholesale FMCG catalog with authentic retail pack-shots into your store.
          </p>
        </div>
        <button
          type="button"
          id="inject-wholesale-105-catalog-btn"
          onClick={handleInjectWholesale}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-heading font-extrabold shadow-xs transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Merge 105 Wholesale Catalog</span>
        </button>
      </div>

      {/* ================= MODAL: RESTORE CONFIRMATION & VALIDATION PREVIEW ================= */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 text-left space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <RefreshCw className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="font-heading font-extrabold text-stone-900 text-base">
                    Restore Store Data?
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    File: <span className="font-mono text-stone-700 font-semibold">{pendingRestore.filename}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prompt Statement as explicitly requested */}
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl space-y-1">
              <p className="font-heading font-bold text-emerald-950 text-sm">
                Restore this backup? This will sync {pendingRestore.preview.productsCount} products and {pendingRestore.preview.categoriesCount} categories.
              </p>
              <p className="text-[11px] text-emerald-800">
                Your current local inventory will be cleanly updated to match the backup file.
              </p>
            </div>

            {/* Structured Itemization Preview */}
            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 text-xs space-y-2">
              <div className="flex items-center justify-between text-stone-600">
                <span>Products in Backup:</span>
                <strong className="text-stone-900 font-bold">{pendingRestore.preview.productsCount} items</strong>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Categories in Backup:</span>
                <strong className="text-stone-900 font-bold">{pendingRestore.preview.categoriesCount} categories</strong>
              </div>
              {pendingRestore.preview.storeName && (
                <div className="flex items-center justify-between text-stone-600">
                  <span>Store Name:</span>
                  <span className="text-stone-800 font-semibold">{pendingRestore.preview.storeName}</span>
                </div>
              )}
              {pendingRestore.preview.exportDate && (
                <div className="flex items-center justify-between text-stone-600">
                  <span>Exported On:</span>
                  <span className="text-stone-800">
                    {new Date(pendingRestore.preview.exportDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Confirmation Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                disabled={isRestoring}
                className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-restore-btn"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-heading font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-emerald-200" />
                <span>{isRestoring ? 'Restoring...' : 'Yes, Restore Backup'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
