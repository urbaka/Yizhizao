import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { RegionalAnalysisView } from './components/RegionalAnalysisView';
import { LeadSearchView } from './components/LeadSearchView';
import { QuestionAssistantView } from './components/QuestionAssistantView';
import { ContractManagementView } from './components/ContractManagementView';
import { MeetingAssistantView } from './components/MeetingAssistantView';
import { AdminManagementView } from './components/AdminManagementView';
import { SiteAccessLogin } from './components/SiteAccessLogin';
import { GradientBackground } from '@/components/ui/gradient-background';
import {
  ApiSettings,
  LeadItem,
  FusionSummary,
  AmapPOI,
  BusinessCategory,
} from './types';

const TAB_PATHS: Record<ActiveTab, string> = {
  'regional-analysis': '/',
  'lead-search': '/leads',
  'question-assistant': '/assistant',
  'contract-management': '/contracts',
  'meeting-assistant': '/meetings',
  admin: '/admin',
};

type SiteAccessStatus = {
  mode: 'public' | 'private';
  granted: boolean;
  username: string | null;
};

function getTabFromPath(pathname: string): ActiveTab {
  const matchedEntry = Object.entries(TAB_PATHS).find(([, path]) => path === pathname);
  return (matchedEntry?.[0] as ActiveTab | undefined) || 'regional-analysis';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => getTabFromPath(window.location.pathname));
  const [knowledgeVersion, setKnowledgeVersion] = useState(0);
  const [siteAccess, setSiteAccess] = useState<SiteAccessStatus | null>(null);

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

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/access/status', { signal: controller.signal, cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        setSiteAccess({
          mode: data?.mode === 'private' ? 'private' : 'public',
          granted: Boolean(data?.granted),
          username: typeof data?.username === 'string' ? data.username : null,
        });
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setSiteAccess({ mode: 'private', granted: false, username: null });
        }
      });
    return () => controller.abort();
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => setActiveTab(getTabFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const nextPath = TAB_PATHS[tab];
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath);
  };

  // API test handlers
  const handleTestAmapConnection = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/amap/test', {
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
      case 'contract-management':
        return '合同管理';
      case 'meeting-assistant':
        return '会议助手';
      case 'admin':
        return '后台管理';
    }
  };

  const amapReady = Boolean(settings.hasAmapKey);

  if (!siteAccess) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-100 text-sm text-slate-500">
        正在检查网站访问权限…
      </div>
    );
  }

  if (activeTab !== 'admin' && !siteAccess.granted) {
    return (
      <SiteAccessLogin
        onGranted={(username) => {
          setSiteAccess({ mode: 'private', granted: true, username });
          handleTabChange('regional-analysis');
        }}
        onOpenAdmin={() => handleTabChange('admin')}
      />
    );
  }

  const handleSiteLogout = async () => {
    await fetch('/api/access/logout', { method: 'POST' }).catch(() => undefined);
    setSiteAccess({ mode: 'private', granted: false, username: null });
  };

  return (
    <GradientBackground
      animationDuration={20}
      enableCenterContent={false}
      className="h-[100dvh] min-h-0"
    >
      <div
        data-app-shell=""
        className="relative isolate flex h-[100dvh] overflow-hidden pb-16 font-sans text-slate-800 antialiased md:pb-0"
      >
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
        />

        {/* Main Content Area */}
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            title="意智造"
            subtitle={getHeaderTitle()}
            accessUsername={siteAccess.mode === 'private' ? siteAccess.username : null}
            onAccessLogout={siteAccess.mode === 'private' ? handleSiteLogout : undefined}
          />

          <main className="relative min-h-0 flex-1 overflow-y-auto">
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

          <div className={activeTab === 'contract-management' ? 'h-full' : 'hidden h-full'}>
            <ContractManagementView />
          </div>

          <div className={activeTab === 'meeting-assistant' ? 'h-full' : 'hidden h-full'}>
            <MeetingAssistantView />
          </div>

          <div className={activeTab === 'admin' ? 'h-full' : 'hidden h-full'}>
            <AdminManagementView
              settings={settings}
              knowledgeVersion={knowledgeVersion}
              onKnowledgeChanged={() => setKnowledgeVersion((version) => version + 1)}
              onTestAmapConnection={handleTestAmapConnection}
            />
          </div>
          </main>
        </div>
      </div>
    </GradientBackground>
  );
}
