import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: localStorage에서 토큰을 읽어 헤더에 추가
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 에러 처리 및 토큰 갱신 로직 (추후 보완)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // 401 에러 발생 시 리프레시 토큰 로직 등 추가 가능
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 리프레시 토큰 처리 로직 위치
    }
    
    return Promise.reject(error);
  }
);

export default client;
