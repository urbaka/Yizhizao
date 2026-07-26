export interface Region {
  code: string;
  name: string;
  center: [number, number]; // [lng, lat]
  children?: Region[];
}

export type BusinessCategory = string;

export interface AmapPOI {
  id: string;
  name: string;
  category: string;
  categoryType: BusinessCategory;
  matchedKeyword?: string;
  province: string;
  city: string;
  district: string;
  address: string;
  location: [number, number]; // [lng, lat]
  tel: string;
  source: '高德 POI';
  typeCode?: string;
  createdAt?: string;
  isExcludedHit?: boolean;
  excludedKeyword?: string;
}

export interface MeituanStore {
  poiId: string;
  name: string;
  category: string;
  address: string;
  rawLat: number; // e.g. 39996500 (10^6)
  rawLng: number; // e.g. 116481200
  lat: number;    // converted standard GCJ-02
  lng: number;    // converted standard GCJ-02
  phone: string;
  rating: number;
  reviewCount: number;
  avgPrice?: number;
  salesVolume?: number;
}

export interface MatchDetails {
  distance: number; // in meters
  distancePassed: boolean;
  nameSimilarity: number; // 0 to 1
  similarityPassed: boolean;
  cleanedAmapName: string;
  cleanedMeituanName: string;
  confidenceScore: number;
  matchStatus: '高置信度' | '中等置信度' | '匹配失败' | '未知';
  reason: string;
}

export interface FusionEntity {
  fusionId: string;
  amapPoi: AmapPOI;
  meituanStore?: MeituanStore;
  matchDetails: MatchDetails;
  canonicalEntity: {
    name: string;
    branch?: string;
    mergedAddress: string;
    location: [number, number];
    contact: string;
  };
  vitalityIndicators: {
    isOpen: boolean;
    reviewVelocity: 'high' | 'medium' | 'low';
    vitalityScore: number;
  };
}

export interface LeadItem extends AmapPOI {
  status: '已匹配' | '已保存' | '已忽略';
  isExcludedHit?: boolean;
  excludedKeyword?: string;
  fusionMatched?: boolean;
  meituanName?: string;
}

export interface ApiSettings {
  amapKey: string;
  amapStatus: 'connected' | 'disconnected' | 'testing';
  meituanAppId: string;
  meituanAppSecret: string;
  meituanStatus: 'connected' | 'disconnected' | 'testing';
  meituanMode?: 'third_party_open' | 'official_bound'; // 'third_party_open' = 免绑定全网检索, 'official_bound' = 官方API授权绑定
  coordScaleEnabled: boolean;
  suffixRegexPattern: string;
  coreRadiusMeters: number;
  edgeRadiusMeters: number;
  nameSimilarityThreshold: number; // default 0.8
  distanceThresholdMeters: number; // default 50
}

export interface FusionSummary {
  analysisId: string;
  analysisTime: string;
  region: string;
  method: string;
  amapCount: number;
  meituanCount: number;
  matchedCount: number;
  unmatchedCount: number;
  matchRate: number; // e.g. 68.9
  vitalityScore: number;
  highDensityAreasCount: number;
  potentialVacantCount: number;
}

export interface StructFusionJSON {
  fusion_id: string;
  confidence_score: number;
  canonical_entity: {
    name: string;
    branch: string;
    merged_address: string;
    location: [number, number];
    contact: string;
  };
  sources: {
    amap_id: string;
    meituan_id?: string;
  };
  vitality_indicators: {
    is_open: boolean;
    review_velocity: string;
  };
}
