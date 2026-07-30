import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { RegionalAnalysisView } from './components/RegionalAnalysisView';
import { LeadSearchView } from './components/LeadSearchView';
import { ApiSettingsView } from './components/ApiSettingsView';
import { QuestionAssistantView } from './components/QuestionAssistantView';
import { KnowledgeManagementView } from './components/KnowledgeManagementView';
import { GradientBackground } from '@/components/ui/gradient-background';
import {
  ApiSettings,
  LeadItem,
  FusionSummary,
  AmapPOI,
  BusinessCategory,
} from './types';
export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('regional-analysis');
  const [knowledgeVersion, setKnowledgeVersion] = useState(0);

  // API Settings State
  const [settings, setSettings] = useState<ApiSettings>({
    amapKey: '',
    hasAmapKey: false,
    amapStatus: 'disconnected',
    meituanAppId: '',
    meituanAppSecret: '',
    meituanStatus: 'disconnected',
    boundStoreIds: ['MT-8839201', 'MT-9921002', 'MT-7712399', 'MT-6638102'],
    coordScaleEnabled: true,
    suffixRegexPattern: '(总店|分店|有限公司|加盟店|旗舰店)$',
    coreRadiusMeters: 500,
    edgeRadiusMeters: 1500,
  });

  // Search data must only come from a configured API.
  const [amapPois, setAmapPois] = useState<AmapPOI[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);

  const [fusionSummary, setFusionSummary] = useState<FusionSummary>({
    amapCount: 0,
    meituanCount: 0,
    matchedCount: 0,
    matchRate: 0,
    vitalityScore: 0,
  });

  const [isSearching, setIsSearching] = useState(false);

  // Load backend settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((err) => {
        console.warn('Backend settings endpoint not reachable, using local state.');
      });
  }, []);

  // API test handlers
  const handleTestAmapConnection = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/amap/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success || data.status === 'success') {
        setSettings((prev) => ({
          ...prev,
          hasAmapKey: true,
          amapStatus: 'connected',
        }));
        return true;
      } else {
        setSettings((prev) => ({
          ...prev,
          amapStatus: 'disconnected',
        }));
        return false;
      }
    } catch {
      setSettings((prev) => ({ ...prev, amapStatus: 'disconnected' }));
      return false;
    }
  };

  // Lead search execution
  const handleSearchLeads = async (params: {
    keywords: string[];
    excludedKeywords: string[];
    province: string;
    city: string;
    district: string;
    radius?: number;
    center?: [number, number];
    limit?: number;
  }): Promise<AmapPOI[]> => {
    const hasConfiguredAmapApi = Boolean(settings.hasAmapKey);

    if (!hasConfiguredAmapApi) {
      setAmapPois([]);
      setLeads([]);
      alert('请接入高德地图 API 后再进行检索。');
      return [];
    }

    setIsSearching(true);
    try {
      const res = await fetch('/api/amap/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: params.keywords,
          excludedKeywords: params.excludedKeywords,
          province: params.province,
          city: params.city,
          district: params.district,
          radius: params.radius || 50000,
          center: params.center,
          limit: params.limit || 20,
        }),
      });

      const data = await res.json();
      if ((data.status === 'success' || data.success) && Array.isArray(data.pois)) {
        setAmapPois(data.pois);
        const newLeads: LeadItem[] = data.pois.map((poi: AmapPOI) => {
          const exHit = poi.isExcludedHit || params.excludedKeywords.some((ex) => poi.name.includes(ex) || (poi.category && poi.category.includes(ex)));
          const exKw = poi.excludedKeyword || params.excludedKeywords.find((ex) => poi.name.includes(ex) || (poi.category && poi.category.includes(ex)));
          return {
            id: poi.id,
            name: poi.name,
            category: poi.categoryType || poi.category,
            matchedKeyword: poi.matchedKeyword,
            province: poi.province,
            city: poi.city,
            district: poi.district,
            address: poi.address,
            location: poi.location,
            tel: poi.tel,
            status: '已匹配',
            isExcludedHit: Boolean(exHit),
            excludedKeyword: exKw,
          };
        });
        setLeads(newLeads);
        return data.pois;
      } else if (data.message) {
        setAmapPois([]);
        setLeads([]);
        alert(`检索提示: ${data.message}`);
      }
      return [];
    } catch (err) {
      console.error('Lead search error:', err);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // Regional analysis execution
  const handleExecuteRegionalAnalysis = async (params: {
    province: string;
    city: string;
    district: string;
    radius: number;
    categories: BusinessCategory[];
    center?: [number, number];
    limit?: number;
  }): Promise<AmapPOI[]> => {
    return await handleSearchLeads({
      keywords: params.categories,
      excludedKeywords: [],
      province: params.province,
      city: params.city,
      district: params.district,
      radius: params.radius,
      center: params.center,
      limit: params.limit,
    });
  };

  // Batch save leads
  const handleBatchSaveLeads = (ids: string[]) => {
    setLeads((prev) =>
      prev.map((lead) =>
        ids.includes(lead.id) ? { ...lead, status: '已保存' } : lead
      )
    );
  };

  // CSV Export helper
  const handleExportCsv = (items: LeadItem[]) => {
    const headers = 'POI ID,商户名称,经营类目,命中关键词,省份,城市,区县,门牌地址,经度,纬度,电话,状态\n';
    const rows = items
      .map(
        (i) =>
          `"${i.id}","${i.name}","${i.category}","${i.matchedKeyword || ''}","${i.province}","${i.city}","${i.district}","${i.address}",${i.location[0]},${i.location[1]},"${i.tel || ''}","${i.status}"`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `招商线索数据_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export helper
  const handleExportJson = (data: any, fileName: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'regional-analysis':
        return '区域分析';
      case 'lead-search':
        return '线索检索';
      case 'question-assistant':
        return '问题助手';
      case 'knowledge-management':
        return '资料管理';
      case 'api-settings':
        return '接口设置';
    }
  };

  const amapReady = Boolean(settings.hasAmapKey);

  return (
    <GradientBackground
      animationDuration={12}
      enableCenterContent={false}
      className="h-screen min-h-0"
    >
      <div
        data-gradient-theme=""
        className="relative isolate flex h-screen overflow-hidden font-sans text-slate-800 antialiased"
      >
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header
            title="意智造"
            subtitle={getHeaderTitle()}
          />

          <main className="flex-1 overflow-y-auto relative">
          <div className={activeTab === 'regional-analysis' ? 'h-full' : 'hidden h-full'}>
            <RegionalAnalysisView
              pois={amapPois}
              amapConnected={amapReady}
              isSearching={isSearching}
              onExecuteAnalysis={handleExecuteRegionalAnalysis}
            />
          </div>

          <div className={activeTab === 'lead-search' ? 'h-full' : 'hidden h-full'}>
            <LeadSearchView
              leads={leads}
              onSearchLeads={handleSearchLeads}
              onBatchSave={handleBatchSaveLeads}
              onExportCsv={handleExportCsv}
              onExportJson={(items) => handleExportJson(items, '招商线索数据')}
              isSearching={isSearching}
            />
          </div>

          <div className={activeTab === 'question-assistant' ? 'h-full' : 'hidden h-full'}>
            <QuestionAssistantView knowledgeVersion={knowledgeVersion} />
          </div>

          <div className={activeTab === 'knowledge-management' ? 'h-full' : 'hidden h-full'}>
            <KnowledgeManagementView
              onKnowledgeChanged={() => setKnowledgeVersion((version) => version + 1)}
            />
          </div>

          <div className={activeTab === 'api-settings' ? 'h-full' : 'hidden h-full'}>
            <ApiSettingsView
              settings={settings}
              onTestAmapConnection={handleTestAmapConnection}
            />
          </div>
          </main>
        </div>
      </div>
    </GradientBackground>
  );
}
