/** multipart에서 JSON request 파트 (게시글·프로필 수정 등) */
export function appendJsonRequestPart(formData: FormData, body: unknown, partName = 'request'): void {
  formData.append(partName, new Blob([JSON.stringify(body)], { type: 'application/json' }));
}

export function appendFileParts(formData: FormData, files: File[], fieldName = 'files'): void {
  files.forEach((f) => formData.append(fieldName, f));
}

export function appendOptionalFormField(formData: FormData, key: string, value: string | undefined | null): void {
  const v = value != null ? String(value).trim() : '';
  if (v !== '') formData.append(key, v);
}
