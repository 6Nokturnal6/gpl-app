import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('gpl_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('gpl_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, institution, nome) => api.post('/auth/register', { email, password, institution, nome }),
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

async function triggerDownload(url, filename) {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    // Check if response is actually an error JSON disguised as blob
    if (res.data.type === 'application/json') {
      const text = await res.data.text();
      const json = JSON.parse(text);
      throw new Error(json.error || 'Erro ao exportar');
    }
    const href = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = href; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch (err) {
    const msg = err.response?.data
      ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
      : err.message || 'Erro desconhecido ao exportar';
    alert(`Não foi possível exportar: ${msg}`);
    throw err;
  }
}

export const exportApi = {
  downloadXlsx: (filename) => triggerDownload('/export/xlsx', filename || 'Formulario.xlsx'),
  downloadPdf: (filename) => triggerDownload('/export/pdf', filename || 'Formulario.pdf'),
  downloadUniversityXlsx: (filename) => triggerDownload('/export/university/xlsx', filename || 'Consolidado.xlsx'),
  downloadUniversityPdf: (filename) => triggerDownload('/export/university/pdf', filename || 'Consolidado.pdf'),
  downloadSubmissionPdf: (subId, filename) => triggerDownload(`/export/pdf/${subId}`, filename || 'Formulario.pdf'),
  downloadSubmissionXlsx: (subId, filename) => triggerDownload(`/export/xlsx/${subId}`, filename || 'Formulario.xlsx'),
};

export const adminApi = {
  getSubmissions: (params) => api.get('/admin/submissions', { params }),
  getSubmission: (id) => api.get(`/admin/submissions/${id}`),
  setStatus: (id, status, note) => api.patch(`/admin/submissions/${id}/status`, { status, note }),
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
};

export const campusApi = {
  list: (university_id) => api.get('/campuses', { params: university_id ? { university_id } : {} }),
  create: (data) => api.post('/campuses', data),
  update: (id, data) => api.put(`/campuses/${id}`, data),
  delete: (id) => api.delete(`/campuses/${id}`),
  assign: (campusId, user_id, university_id) => api.post(`/campuses/${campusId}/assign`, { user_id, university_id }),
  unassigned: () => api.get('/campuses/unassigned'),
};

export const universityApi = {
  list: () => api.get('/universities'),
  create: (data) => api.post('/universities', data),
  summary: (id) => api.get(`/universities/${id}/summary`),
  submit: (id) => api.post(`/universities/${id}/submit`),
};

export const lockApi = {
  getLocks: (submissionId) => api.get(`/locks/${submissionId}`),
  getUnlockRequests: (universityId) => api.get(`/locks/university/${universityId}/requests`),
  lock: (submissionId, section) => api.post(`/locks/${submissionId}/${section}`),
  requestUnlock: (submissionId, section) => api.post(`/locks/${submissionId}/${section}/request-unlock`),
  unlock: (submissionId, section) => api.delete(`/locks/${submissionId}/${section}`),
};

export const auditApi = {
  getFull: (params) => api.get('/audit', { params }),
  getSummary: () => api.get('/audit/summary'),
};

export const userMgmtApi = {
  list: () => api.get('/users'),
  stats: () => api.get('/users/stats'),
  deactivate: (id) => api.patch(`/users/${id}/deactivate`),
  reactivate: (id) => api.patch(`/users/${id}/reactivate`),
  changeRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  resetPassword: (id, password) => api.patch(`/users/${id}/reset-password`, { password }),
  delete: (id) => api.delete(`/users/${id}`),
};

export default api;
