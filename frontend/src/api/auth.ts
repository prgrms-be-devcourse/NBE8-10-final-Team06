import client from './client';
import { SignupRequest, SignupResponse, LoginRequest, LoginResponse } from '../types/auth';
import { RsData } from '../types/common';
import { AxiosResponse } from 'axios';

export const authApi = {
  signup: async (data: SignupRequest): Promise<RsData<SignupResponse>> => {
    const response: AxiosResponse<RsData<SignupResponse>> = await client.post('/auth/signup', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<RsData<LoginResponse>> => {
    const response: AxiosResponse<RsData<LoginResponse>> = await client.post('/auth/login', data);
    return response.data;
  },

  checkEmail: async (email: string): Promise<RsData<void>> => {
    const response: AxiosResponse<RsData<void>> = await client.get('/auth/check-email', {
      params: { email }
    });
    return response.data;
  },

  checkNickname: async (nickname: string): Promise<RsData<void>> => {
    const response: AxiosResponse<RsData<void>> = await client.get('/auth/check-nickname', {
      params: { nickname }
    });
    return response.data;
  }
};
