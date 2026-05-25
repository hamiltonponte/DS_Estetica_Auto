import React, { useState } from 'react';
import { Gift, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StampsTab from '@/components/promotions/StampsTab';
import SubscriptionsTab from '@/components/promotions/SubscriptionsTab';

const TABS = [
  { id: 'stamps', label: '⭐ Programa de Selos' },
  { id: 'subscriptions', label: '🔄 Assinaturas' },
];

export default function Promotions() {
  const [activeTab, setActiveTab] = useState('stamps');

  return (
    <div className="min-h-screen">
      <PageHeader title="Promoções" subtitle="Programa de selos e assinaturas mensais" />

      <div className="px-4 md:px-6 py-6 max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-muted/50 p-1 rounded-xl w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'stamps' && <StampsTab />}
        {activeTab === 'subscriptions' && <SubscriptionsTab />}
      </div>
    </div>
  );
}