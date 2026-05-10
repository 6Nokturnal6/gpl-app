import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('gpl_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gpl_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, institution) => api.post('/auth/register', { email, password, institution }),
  me: () => api.get('/auth/me'),
};

export const submissionApi = {
  getCurrent: () => api.get('/submissions/current'),
  saveIdIes: (data) => api.put('/submissions/idies', data),
  saveEstudantes: (data) => api.put('/submissions/estudantes', data),
  saveDocentes: (data) => api.put('/submissions/docentes', data),
  saveInvestigadores: (data) => api.put('/submissions/investigadores', data),
  saveFinancas: (data) => api.put('/submissions/financas', data),
  saveInfra: (data) => api.put('/submissions/infra', data),
  savePrevisao: (data) => api.put('/submissions/previsao', data),
  submit: () => api.post('/submissions/submit'),
};

export const exportApi = {
  downloadXlsx: async (filename) => {
    const res = await api.get('/export/xlsx', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'Formulario_Recolha_2024.xlsx';
    a.click(); URL.revokeObjectURL(url);
  },
  downloadPdf: async (filename) => {
    const res = await api.get('/export/pdf', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'Formulario_Recolha_2024.pdf';
    a.click(); URL.revokeObjectURL(url);
  },
  downloadSubmissionPdf: async (submissionId, filename) => {
    const res = await api.get(`/export/pdf/${submissionId}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'Formulario_2024.pdf';
    a.click(); URL.revokeObjectURL(url);
  },
};

export const adminApi = {
  getSubmissions: (params) => api.get('/admin/submissions', { params }),
  getSubmission: (id) => api.get(`/admin/submissions/${id}`),
  setStatus: (id, status, note) => api.patch(`/admin/submissions/${id}/status`, { status, note }),
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
};

export default api;
