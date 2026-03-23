import * as z from 'zod';

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.').min(1, '이메일을 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
});

export const signupSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
  nickname: z.string().min(2, '닉네임은 최소 2자 이상이어야 합니다.'),
  birthDate: z.string().min(1, '생년월일을 입력해주세요.'),
  gender: z.enum(['MALE', 'FEMALE']),
  githubUrl: z.string().url('올바른 URL 형식이 아닙니다.').optional().or(z.literal('')),
  level: z.enum(['JUNIOR', 'MIDDLE', 'SENIOR']),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type SignupSchema = z.infer<typeof signupSchema>;
