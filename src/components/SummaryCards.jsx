import React from 'react';
import { POS_CONFIG, POS_KEYS, getNeededPOSM, isStoreComplete } from '../utils/storage';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function SummaryCards({ stores = [], activeFilter, onFilterChange }) {
  const totalStores = stores.length;
  const storesWithPOSM = stores.filter(d => getNeededPOSM(d).length > 0);
  const completeStores = storesWithPOSM.filter(isStoreComplete).length;
  const incompleteStores = storesWithPOSM.length - completeStores;
  const overallPct = storesWithPOSM.length > 0 
    ? Math.round((completeStores / storesWithPOSM.length) * 100) 
    : 0;

  const totalPhotos = stores.reduce((total, d) => {
    return total + POS_KEYS.reduce((sub, k) => sub + (d[k]?.e?.length || 0), 0);
  }, 0);

  const posmMetrics = POS_KEYS.map(k => {
    const config = POS_CONFIG[k];
    const totalPcs = stores.reduce((sum, d) => sum + (+d[k]?.q || 0), 0);
    const targetStores = stores.filter(d => (d[k]?.q || 0) > 0);
    const withPhotoStores = targetStores.filter(d => d[k]?.e && d[k].e.length > 0);
    const missingCount = targetStores.length - withPhotoStores.length;
    const pct = targetStores.length > 0 
      ? Math.round((withPhotoStores.length / targetStores.length) * 100) 
      : 0;

    return {
      key: k,
      config,
      totalPcs,
      targetCount: targetStores.length,
      withPhotoCount: withPhotoStores.length,
      missingCount,
      pct,
    };
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {/* Overview Card */}
      <Card 
        onClick={() => onFilterChange(activeFilter === 'no' ? '' : 'no')}
        className={`cursor-pointer transition-all hover:border-zinc-400 bg-card ${
          activeFilter === 'no' ? 'ring-1 ring-foreground border-foreground' : ''
        }`}
      >
        <CardContent className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Ringkasan
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {overallPct}%
            </span>
          </div>

          <div>
            <div className="font-heading text-xl font-bold tracking-tight text-foreground">
              {completeStores} <span className="text-xs font-normal text-muted-foreground">/ {totalStores}</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {totalPhotos} foto terkumpul
            </p>
          </div>

          <Progress value={overallPct} className="h-1 bg-zinc-100 dark:bg-zinc-800" indicatorClassName="bg-zinc-900 dark:bg-zinc-100" />

          <div className="text-[11px] font-medium">
            {incompleteStores > 0 ? (
              <span className="text-zinc-600 dark:text-zinc-400">{incompleteStores} belum lengkap</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">✓ Semua lengkap</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* POSM Cards */}
      {posmMetrics.map(item => {
        const isFilterActive = activeFilter === item.key;
        const hasMissing = item.missingCount > 0;

        return (
          <Card 
            key={item.key}
            onClick={() => {
              if (item.targetCount > 0) {
                onFilterChange(isFilterActive ? '' : item.key);
              }
            }}
            className={`cursor-pointer transition-all hover:border-zinc-400 bg-card ${
              isFilterActive ? 'ring-1 ring-foreground border-foreground' : ''
            }`}
          >
            <CardContent className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground truncate" title={item.config.name}>
                  {item.config.short}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {item.pct}%
                </span>
              </div>

              <div>
                <div className="font-heading text-xl font-bold tracking-tight text-foreground">
                  {item.totalPcs} <span className="text-xs font-normal text-muted-foreground">{item.config.unit}</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {item.withPhotoCount}/{item.targetCount} store berfoto
                </p>
              </div>

              <Progress 
                value={item.pct} 
                className="h-1 bg-zinc-100 dark:bg-zinc-800" 
                indicatorClassName={item.pct === 100 ? 'bg-emerald-600' : 'bg-zinc-700 dark:bg-zinc-300'}
              />

              <div className="text-[11px] font-medium">
                {hasMissing ? (
                  <span className="text-zinc-600 dark:text-zinc-400">{item.missingCount} butuh foto</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">✓ Lengkap</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
