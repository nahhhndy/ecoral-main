import axios from 'axios'

const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const baseURL = `${rawBase.replace(/\/+$/, '')}/api/v1`

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  console.log(
    `[EcoRal API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
  )

  return config
})

api.interceptors.response.use(
  (response) => {
    console.log(
      `[EcoRal API Success] ${response.status} ${response.config.url}`
    )

    return response
  },
  async (error) => {
    const status = error.response?.status

    if (status && status >= 400 && status < 500) {
      console.warn(
        `[EcoRal API Warning] ${error.config?.url}: ${status}`,
        error.response?.data
      )
    } else {
      console.error(
        `[EcoRal API Error] ${error.config?.url}:`,
        error.message,
        status || 'No Response'
      )
    }

    if (status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname

      if (
        path !== '/login' &&
        path !== '/register' &&
        path !== '/'
      ) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export const authApi = {
  register: (data: {
    email: string
    full_name: string
    password: string
  }) =>
    api.post('/auth/register', data).then((r) => r.data),

  login: (data: {
    email: string
    password: string
  }) =>
    api.post('/auth/login', data).then((r) => r.data),

  me: () =>
    api.get('/auth/me').then((r) => r.data),

  resetPassword: (data: {
    email: string
    new_password: string
    confirm_password?: string
  }) =>
    api.post('/auth/reset-password', data).then((r) => r.data),

  verifyAccount: (email: string) =>
    api.get('/auth/verify-account', { params: { email } }).then((r) => r.data),
}


export const predictApi = {
  predict: (data: {
    latitude: number
    longitude: number
    sea_surface_temperature: number
    location_name?: string
  }) =>
    api.post('/predict', data).then((r) => r.data),

  get: (id: string) =>
    api.get(`/predict/${id}`).then((r) => r.data),
}

export const historyApi = {
  list: (page = 1, pageSize = 20) =>
    api
      .get('/history', {
        params: {
          page,
          page_size: pageSize,
        },
      })
      .then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/history/${id}`),
}

export const analyticsApi = {
  stats: () =>
    api.get('/analytics/stats').then((r) => r.data),

  trends: (days = 30) =>
    api
      .get('/analytics/trends', {
        params: { days },
      })
      .then((r) => r.data),

  model: () =>
    api.get('/analytics/model-info').then((r) => r.data),

  detailed: () =>
    api.get('/analytics/detailed').then((r) => r.data),
}

export const locationsApi = {
  list: () =>
    api.get('/locations').then((r) => r.data),

  create: (data: {
    name: string
    latitude: number
    longitude: number
    description?: string
  }) =>
    api.post('/locations', data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/locations/${id}`),
}

export const reportsApi = {
  generate: (data: {
    prediction_id: string
    title?: string
  }) =>
    api.post('/reports/generate', data).then((r) => r.data),

  list: () =>
    api.get('/reports').then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/reports/${id}`),

  downloadReport: async (
    id: string,
    title?: string
  ) => {
    const response = await api.get(
      `/reports/${id}/download`,
      {
        responseType: 'blob',
      }
    )

    const dataBlob = response.data as Blob

    if (
      dataBlob.type === 'application/json' ||
      dataBlob.size < 50
    ) {
      const text = await dataBlob.text()

      try {
        const json = JSON.parse(text)
        throw new Error(
          json.detail || 'Report is not ready yet'
        )
      } catch (error: any) {
        if (
          error.message &&
          !error.message.includes('JSON')
        ) {
          throw error
        }

        throw new Error(
          `Invalid PDF file returned (${dataBlob.size} bytes)`
        )
      }
    }

    const pdfBlob = new Blob(
      [dataBlob],
      { type: 'application/pdf' }
    )

    const url = window.URL.createObjectURL(pdfBlob)

    const link = document.createElement('a')

    link.href = url
    link.download = `${title || 'EcoRal_Report'}.pdf`

    document.body.appendChild(link)

    link.click()
    link.remove()

    setTimeout(() => {
      window.URL.revokeObjectURL(url)
    }, 1000)
  },
}

export const environmentalApi = {
  getTelemetry: (
    latitude: number,
    longitude: number
  ) =>
    api
      .get('/environmental/telemetry', {
        params: {
          latitude,
          longitude,
        },
      })
      .then((r) => r.data),
}

export const assistantApi = {
  chat: (data: {
    message: string
    conversation_history?: Array<{
      role: string
      content: string
    }>
    context?: Record<string, any>
  }) =>
    api.post('/assistant/chat', data).then((r) => r.data),
}

export const gridApi = {
  predictRegion: (data: {
    region_name: string
    min_latitude: number
    max_latitude: number
    min_longitude: number
    max_longitude: number
    grid_resolution?: number
    default_sst?: number
  }) =>
    api
      .post('/grid/predict-region', data)
      .then((r) => r.data),
}

export const intelligenceApi = {
  getSummary: () =>
    api
      .get('/intelligence/global-summary')
      .then((r) => r.data),

  getStatus: () =>
    api
      .get('/intelligence/status')
      .then((r) => r.data),

  triggerScan: () =>
    api
      .post('/intelligence/trigger-scan')
      .then((r) => r.data),
}

export const forecastingApi = {
  predictForecast: (data: {
    latitude: number
    longitude: number
    sea_surface_temperature: number
    horizon?: string
  }) =>
    api
      .post('/forecasting/predict-forecast', data)
      .then((r) => r.data),
}

export const workspaceApi = {
  listProjects: () =>
    api
      .get('/workspace/projects')
      .then((r) => r.data),

  createProject: (data: {
    title: string
    description?: string
    tags?: string
    is_collaborative?: boolean
  }) =>
    api
      .post('/workspace/projects', data)
      .then((r) => r.data),

  deleteProject: (id: string) =>
    api.delete(`/workspace/projects/${id}`),

  deleteExperiment: (
    projectId: string,
    experimentId: string
  ) =>
    api.delete(
      `/workspace/projects/${projectId}/experiments/${experimentId}`
    ),

  getProject: (id: string) =>
    api
      .get(`/workspace/projects/${id}`)
      .then((r) => r.data),

  addNote: (
    id: string,
    data: { content: string }
  ) =>
    api
      .post(`/workspace/projects/${id}/notes`, data)
      .then((r) => r.data),

  addExperiment: (
    id: string,
    data: any
  ) =>
    api
      .post(`/workspace/projects/${id}/experiments`, data)
      .then((r) => r.data),

  exportProjectCSV: async (
    id: string,
    projectTitle?: string
  ) => {
    const response = await api.get(
      `/workspace/projects/${id}/export-dataset`,
      {
        responseType: 'blob',
      }
    )

    const blob = new Blob(
      [response.data],
      { type: 'text/csv' }
    )

    const url = window.URL.createObjectURL(blob)

    const link = document.createElement('a')

    link.href = url

    link.download =
      `${
        projectTitle
          ? projectTitle.replace(/[^a-zA-Z0-9]/g, '_')
          : 'ecoral_project'
      }_dataset.csv`

    document.body.appendChild(link)

    link.click()
    link.remove()

    window.URL.revokeObjectURL(url)
  },
}