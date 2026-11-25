import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  RefreshCw,
  Truck,
  AlertCircle,
  Power,
} from 'lucide-react';
import {
  DeliveryZone,
  DEFAULT_DELIVERY_ZONES,
  getDeliveryZones,
  saveDeliveryZones,
  syncDeliveryZonesFromSupabase,
} from '../services/deliveryZonesService';

interface AdminDeliveryZonesManagerProps {
  onSavedNotice?: (message: string) => void;
}

export const AdminDeliveryZonesManager: React.FC<AdminDeliveryZonesManagerProps> = ({
  onSavedNotice,
}) => {
  const [zones, setZones] = useState<DeliveryZone[]>(() => getDeliveryZones());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Add new area form state
  const [newAreaName, setNewAreaName] = useState('');
  const [newBaseCharge, setNewBaseCharge] = useState('29');
  const [newFreeEnabled, setNewFreeEnabled] = useState(false);
  const [newFreeAbove, setNewFreeAbove] = useState('499');

  // Hydrate latest zones from Supabase when opening the Delivery Zones tab
  useEffect(() => {
    let mounted = true;
    syncDeliveryZonesFromSupabase()
      .then((cloudZones) => {
        if (mounted && Array.isArray(cloudZones) && cloudZones.length > 0) {
          setZones(cloudZones);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusNotice({ type, text });
    if (type === 'success') {
      onSavedNotice?.(text);
    }
    setTimeout(() => {
      setStatusNotice((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const handleUpdateZoneField = (
    id: string,
    patch: Partial<DeliveryZone>
  ) => {
    setZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, ...patch } : z))
    );
    setHasUnsavedChanges(true);
  };

  const handleToggleFreeThreshold = (zone: DeliveryZone) => {
    const currentlyEnabled = zone.freeDeliveryAbove !== null && zone.freeDeliveryAbove > 0;
    handleUpdateZoneField(zone.id, {
      freeDeliveryAbove: currentlyEnabled ? null : 499,
    });
  };

  const handleToggleActive = (zone: DeliveryZone) => {
    const activeCount = zones.filter((z) => z.isActive).length;
    if (zone.isActive && activeCount <= 1) {
      showNotice('error', 'कम से कम 1 डिलीवरी एरिया Active रहना ज़रूरी है।');
      return;
    }
    handleUpdateZoneField(zone.id, { isActive: !zone.isActive });
  };

  const handleDeleteZone = (id: string) => {
    if (zones.length <= 1) {
      showNotice('error', 'कम से कम 1 डिलीवरी एरिया सूची में रहना ज़रूरी है।');
      return;
    }
    const remaining = zones.filter((z) => z.id !== id);
    const hasAnyActive = remaining.some((z) => z.isActive);
    const nextZones = hasAnyActive
      ? remaining
      : remaining.map((z, i) => (i === 0 ? { ...z, isActive: true } : z));
    setZones(nextZones);
    setHasUnsavedChanges(true);
  };

  const handleAddNewArea = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newAreaName.trim();
    if (!cleanName) {
      showNotice('error', 'कृपया नए एरिया का नाम दर्ज करें।');
      return;
    }

    const exists = zones.some(
      (z) => z.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      showNotice('error', `"${cleanName}" पहले से डिलीवरी ज़ोन लिस्ट में मौजूद है।`);
      return;
    }

    const parsedBase = Math.max(0, Math.round(Number(newBaseCharge) || 0));
    const parsedFree =
      newFreeEnabled && Number(newFreeAbove) > 0
        ? Math.round(Number(newFreeAbove))
        : null;

    const newZone: DeliveryZone = {
      id: `zone-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: cleanName,
      baseCharge: parsedBase,
      freeDeliveryAbove: parsedFree,
      isActive: true,
      sortOrder: zones.length + 1,
    };

    setZones((prev) => [...prev, newZone]);
    setNewAreaName('');
    setNewBaseCharge('29');
    setNewFreeEnabled(false);
    setNewFreeAbove('499');
    setHasUnsavedChanges(true);
  };

  const handleResetDefaults = () => {
    setZones(DEFAULT_DELIVERY_ZONES.map((z) => ({ ...z })));
    setHasUnsavedChanges(true);
    showNotice(
      'success',
      'डिफ़ॉल्ट 10 एरिया लोड हो गए हैं — लाइव लागू करने के लिए "Save Delivery Settings" पर क्लिक करें।'
    );
  };

  const handleSaveSettings = async () => {
    if (isSaving) return;

    // Validate all area names non-empty and at least 1 active
    const cleaned = zones
      .map((z) => ({
        ...z,
        name: z.name.trim(),
        baseCharge: Math.max(0, Math.round(Number(z.baseCharge) || 0)),
        freeDeliveryAbove:
          z.freeDeliveryAbove !== null && Number(z.freeDeliveryAbove) > 0
            ? Math.round(Number(z.freeDeliveryAbove))
            : null,
      }))
      .filter((z) => z.name.length > 0);

    if (cleaned.length === 0) {
      showNotice('error', 'कम से कम 1 वैध एरिया आवश्यक है।');
      return;
    }

    if (!cleaned.some((z) => z.isActive)) {
      cleaned[0].isActive = true;
    }

    setIsSaving(true);
    try {
      const result = await saveDeliveryZones(cleaned);
      setZones(result.zones);
      setHasUnsavedChanges(false);
      showNotice(
        'success',
        result.savedToSupabase
          ? '✅ डिलीवरी चार्ज सेटिंग्स Supabase और स्टोर में लाइव सेव हो गईं!'
          : '✅ डिलीवरी चार्ज सेटिंग्स सेव हो गईं! सभी ग्राहकों के लिए लाइव रेट अपडेट हो गए हैं।'
      );
    } catch (err: any) {
      showNotice('error', err?.message || 'सेटिंग्स सेव करने में समस्या आई।');
    } finally {
      setIsSaving(false);
    }
  };

  const activeZonesCount = zones.filter((z) => z.isActive).length;
  const freeRuleZonesCount = zones.filter(
    (z) => z.isActive && z.freeDeliveryAbove !== null && z.freeDeliveryAbove > 0
  ).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Save Toolbar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-[#0c831f] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-stone-950 text-lg leading-tight">
                📍 एरिया और डिलीवरी चार्ज मैनेजर (Delivery Zones)
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                हर एरिया का डिलीवरी चार्ज और Free Delivery लिमिट यहीं से बदलें। Save करते ही ग्राहक के कार्ट में तुरंत लाइव रेट अपडेट होंगे।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              id="admin-save-delivery-settings-btn"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-heading font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
                hasUnsavedChanges
                  ? 'bg-[#0c831f] hover:bg-[#0a731b] ring-2 ring-emerald-400/50'
                  : 'bg-stone-900 hover:bg-stone-800'
              } disabled:opacity-50`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Delivery Settings'}</span>
            </button>
          </div>
        </div>

        {/* Clean Summary Metrics Strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-600 tabular-nums">
          <span>
            Total Areas: <strong className="text-stone-950">{zones.length}</strong>
          </span>
          <span aria-hidden="true" className="text-stone-300">
            ·
          </span>
          <span>
            Active Zones: <strong className="text-[#0c831f]">{activeZonesCount}</strong>
          </span>
          <span aria-hidden="true" className="text-stone-300">
            ·
          </span>
          <span>
            Free Delivery Eligible Areas:{' '}
            <strong className="text-stone-950">{freeRuleZonesCount}</strong>
          </span>
          {hasUnsavedChanges && (
            <>
              <span aria-hidden="true" className="text-stone-300">
                ·
              </span>
              <span className="font-bold text-amber-700">
                Unsaved changes — click "Save Delivery Settings"
              </span>
            </>
          )}
        </div>

        {/* Status Toast / Feedback */}
        {statusNotice && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              statusNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#0c831f] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusNotice.text}</span>
          </div>
        )}

        {/* Add New Area Form */}
        <form
          onSubmit={handleAddNewArea}
          className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-heading font-black text-stone-900">
            <Plus className="w-4 h-4 text-[#0c831f]" />
            <span>नया एरिया जोड़ें (Add New Delivery Area)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-5">
              <label
                htmlFor="new-zone-name-input"
                className="block text-[11px] font-bold text-stone-600 mb-1"
              >
                Area / Locality Name
              </label>
              <input
                id="new-zone-name-input"
                type="text"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="e.g. मोरवा (Morwa) या सिंगरौली"
                className="w-full min-h-[42px] px-3 py-2 text-xs font-semibold bg-white border border-stone-200 rounded-xl text-stone-900 focus:border-[#0c831f] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="new-zone-charge-input"
                className="block text-[11px] font-bold text-stone-600 mb-1"
              >
                Charge (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                  ₹
                </span>
                <input
                  id="new-zone-charge-input"
                  type="number"
                  min={0}
                  step={1}
                  value={newBaseCharge}
                  onChange={(e) => setNewBaseCharge(e.target.value)}
                  className="w-full min-h-[42px] pl-7 pr-2.5 py-2 text-xs font-bold tabular-nums bg-white border border-stone-200 rounded-xl text-stone-900 focus:border-[#0c831f] focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 mb-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newFreeEnabled}
                  onChange={(e) => setNewFreeEnabled(e.target.checked)}
                  className="rounded border-stone-300 text-[#0c831f] focus:ring-[#0c831f]"
                />
                <span>Free Delivery Above (₹)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                  ₹
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  disabled={!newFreeEnabled}
                  value={newFreeEnabled ? newFreeAbove : ''}
                  onChange={(e) => setNewFreeAbove(e.target.value)}
                  placeholder="None (Always Paid)"
                  className="w-full min-h-[42px] pl-7 pr-2.5 py-2 text-xs font-bold tabular-nums bg-white disabled:bg-stone-100 disabled:text-stone-400 border border-stone-200 rounded-xl text-stone-900 focus:border-[#0c831f] focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                id="admin-add-new-area-btn"
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ नया एरिया जोड़ें</span>
              </button>
            </div>
          </div>
        </form>

        {/* Editable Table of All Delivery Areas */}
        <div className="overflow-x-auto border border-stone-200 rounded-2xl">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-600">
                <th className="py-3 px-3.5 w-10 text-center">#</th>
                <th className="py-3 px-3.5">Area / Locality</th>
                <th className="py-3 px-3.5 w-36">Delivery Charge (₹)</th>
                <th className="py-3 px-3.5 w-56">Free Delivery Above (₹)</th>
                <th className="py-3 px-3.5 w-28 text-center">Status</th>
                <th className="py-3 px-3.5 w-20 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs bg-white">
              {zones.map((zone, idx) => {
                const isFreeEnabled =
                  zone.freeDeliveryAbove !== null && zone.freeDeliveryAbove > 0;

                return (
                  <tr
                    key={zone.id}
                    className={`transition-colors ${
                      zone.isActive ? 'hover:bg-stone-50/70' : 'bg-stone-50/80 opacity-65'
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3 px-3.5 text-center font-mono text-stone-400 font-bold tabular-nums">
                      {idx + 1}
                    </td>

                    {/* Editable Area Name */}
                    <td className="py-3 px-3.5">
                      <input
                        type="text"
                        value={zone.name}
                        onChange={(e) =>
                          handleUpdateZoneField(zone.id, { name: e.target.value })
                        }
                        aria-label={`Area name ${idx + 1}`}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-stone-200 focus:border-[#0c831f] focus:bg-white bg-transparent font-bold text-stone-900 text-xs sm:text-[13px] focus:outline-none transition-colors"
                      />
                    </td>

                    {/* Editable Base Delivery Charge (₹) */}
                    <td className="py-3 px-3.5">
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={zone.baseCharge}
                          onChange={(e) =>
                            handleUpdateZoneField(zone.id, {
                              baseCharge: Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          aria-label={`Delivery charge for ${zone.name}`}
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-[#0c831f] font-mono font-bold text-stone-950 text-xs tabular-nums focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Toggle + Input for Free Delivery Above ₹ */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleFreeThreshold(zone)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                            isFreeEnabled
                              ? 'bg-emerald-50 border-emerald-300 text-[#0c831f]'
                              : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200/70'
                          }`}
                          title="Toggle free delivery threshold for this area"
                        >
                          {isFreeEnabled ? 'Enabled' : 'None'}
                        </button>

                        {isFreeEnabled ? (
                          <div className="relative w-24">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">
                              ₹
                            </span>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={zone.freeDeliveryAbove ?? 499}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                handleUpdateZoneField(zone.id, {
                                  freeDeliveryAbove: Number.isFinite(val) && val > 0 ? val : null,
                                });
                              }}
                              aria-label={`Free delivery threshold for ${zone.name}`}
                              className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/50 focus:bg-white focus:border-[#0c831f] font-mono font-bold text-emerald-950 text-xs tabular-nums focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-500 font-medium whitespace-nowrap tabular-nums">
                            Always ₹{zone.baseCharge}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Active / Paused Toggle */}
                    <td className="py-3 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(zone)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                          zone.isActive
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{zone.isActive ? 'Active' : 'Paused'}</span>
                      </button>
                    </td>

                    {/* Delete Zone */}
                    <td className="py-3 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteZone(zone.id)}
                        className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={`Delete ${zone.name}`}
                        aria-label={`Delete ${zone.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Sticky-Style Save Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-2 text-[11px] text-stone-500">
            <Truck className="w-4 h-4 text-[#0c831f] shrink-0" />
            <span>
              Store Pickup चुनने पर सभी एरिया के लिए डिलीवरी चार्ज हमेशा <strong>₹0 (FREE)</strong> रहता है।
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0c831f] hover:bg-[#0a731b] disabled:opacity-50 text-white text-xs sm:text-sm font-heading font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Settings...' : 'Save Delivery Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
