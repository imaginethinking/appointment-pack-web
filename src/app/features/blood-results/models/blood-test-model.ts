export const BLOOD_TEST_RESULT_FLAGS = ['LOW', 'NORMAL', 'HIGH', 'ABNORMAL'] as const;
export type BloodTestResultFlag = typeof BLOOD_TEST_RESULT_FLAGS[number];

export interface BloodTestResultRequest {
  analyteName: string;
  resultValue: string;
  unit: string | null;
  referenceRange: string | null;
  flag: BloodTestResultFlag | null;
}

export interface BloodTestRequest {
  title: string | null;
  testDate: string;
  provider: string | null;
  notes: string | null;
  results: BloodTestResultRequest[];
}

export type CreateBloodTestRequest = BloodTestRequest;
export type UpdateBloodTestRequest = BloodTestRequest;

export interface BloodTestResultResponse {
  analyteName: string;
  analyteKey: string;
  resultValue: string;
  numericValue: number | null;
  unit: string | null;
  referenceRange: string | null;
  flag: BloodTestResultFlag | null;
}

export interface BloodTestResponse {
  id: string;
  patientRecordId: string;
  title: string | null;
  testDate: string;
  provider: string | null;
  notes: string | null;
  archivedAt: string | null;
  results: BloodTestResultResponse[];
  createdAt: string;
  updatedAt: string;
}
