export interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  created_at: string
}

export interface ShapData {
  feature_names: string[]
  shap_values: number[]
  base_value: number
  prediction_value: number
}

export interface PredictionResult {
  id: string
  prediction: 0 | 1
  probability: number
  confidence: number
  label: string
  latitude: number
  longitude: number
  sea_surface_temperature: number
  location_name?: string
  shap_data?: ShapData
  explanation?: string
  created_at: string
}

export interface PredictionHistoryItem {
  id: string
  prediction: 0 | 1
  probability: number
  confidence: number
  label: string
  latitude: number
  longitude: number
  sea_surface_temperature: number
  location_name?: string
  explanation?: string
  created_at: string
}

export interface PaginatedHistory {
  items: PredictionHistoryItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AnalyticsStats {
  total_predictions: number
  high_risk_count: number
  low_risk_count: number
  high_risk_percentage: number
  avg_confidence: number
  avg_probability: number
}

export interface TrendPoint {
  date: string
  total: number
  high_risk: number
  low_risk: number
  avg_confidence: number
}

export interface AnalyticsTrend {
  period: string
  data: TrendPoint[]
}

export interface RiskyLocationEntry {
  location_name: string
  latitude: number
  longitude: number
  max_sea_surface_temperature: number
  risk_probability: number
  risk_label: string
}

export interface DetailedAnalyticsResponse {
  stats: AnalyticsStats
  prediction_trend: TrendPoint[]
  confidence_trend: TrendPoint[]
  monthly_bleaching_rate: Array<{ month: string; bleaching_rate_pct: number; total: number }>
  sst_histogram: Array<{ bin_range: string; count: number; high_risk_count: number }>
  top_risky_locations: RiskyLocationEntry[]
}

export interface ModelInfo {
  model_name: string
  version: string
  roc_auc: number
  avg_precision: number
  cross_val_accuracy: number
  cross_val_std: number
  features: Array<{ name: string; importance: number; mean_shap: number }>
  threshold: number
}

export interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
  description?: string
  created_at: string
}

export interface Report {
  id: string
  title: string
  status: 'pending' | 'generating' | 'ready' | 'failed'
  prediction_id?: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user?: User
}

export interface EnvironmentalTelemetry {
  latitude: number
  longitude: number
  region_name: string
  sea_surface_temperature: number
  ocean_metadata: {
    ocean_basin: string
    salinity_psu?: number
    wave_height_m?: number
    live_status: string
  }
  provider_name: string
  is_live: boolean
}
