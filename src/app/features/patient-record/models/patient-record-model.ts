export const BLOOD_TYPES = [
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE'
] as const;

export type BloodType = typeof BLOOD_TYPES[number];

export const HEIGHT_UNITS = [
  'METERS',
  'CENTIMETERS',
  'FEET',
  'INCHES'
] as const;

export type HeightUnit = typeof HEIGHT_UNITS[number];

export const WEIGHT_UNITS = [
  'KILOGRAMS',
  'GRAMS',
  'STONE',
  'POUNDS'
] as const;

export type WeightUnit = typeof WEIGHT_UNITS[number];

export interface PatientRecordRequest {
  nhsNumber: string | null;
  chiNumber: string | null;
  hcNumber: string | null;
  height: number | null;
  heightUnit: HeightUnit | null;
  weight: number | null;
  weightUnit: WeightUnit | null;
  bloodType: BloodType | null;
}

export type CreatePatientRecordRequest = PatientRecordRequest;

export type UpdatePatientRecordRequest = PatientRecordRequest;

export interface PatientRecordResponse {
  id: string;
  profileId: string;
  nhsNumber: string | null;
  chiNumber: string | null;
  hcNumber: string | null;
  height: number | null;
  heightUnit: HeightUnit | null;
  weight: number | null;
  weightUnit: WeightUnit | null;
  bmi: number | null;
  bloodType: BloodType | null;
}
