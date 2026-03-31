import type { SchoolCycle, SchoolYear } from "@/modules/student/types/student.types";

export const schoolCycleLabels: Record<SchoolCycle, string> = {
  PRIMARY: "Primary",
  COLLEGE: "College",
  LYCEE: "Lycee",
};

export const schoolCycleOptions = Object.entries(schoolCycleLabels) as Array<
  [SchoolCycle, string]
>;

export const schoolYearLabels: Record<SchoolYear, string> = {
  FIRST_YEAR: "1st Year",
  SECOND_YEAR: "2nd Year",
  THIRD_YEAR: "3rd Year",
  FOURTH_YEAR: "4th Year",
  FIFTH_YEAR: "5th Year",
  SIXTH_YEAR: "6th Year",
};

export const schoolYearOptions = Object.entries(schoolYearLabels) as Array<
  [SchoolYear, string]
>;

export const allowedSchoolYearsByCycle: Record<SchoolCycle, SchoolYear[]> = {
  PRIMARY: schoolYearOptions.map(([schoolYear]) => schoolYear),
  COLLEGE: ["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR"],
  LYCEE: ["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR"],
};

export function parseSchoolCycle(value: string | null | undefined): SchoolCycle | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return schoolCycleOptions.find(([schoolCycle]) => schoolCycle === normalized)?.[0];
}

export function parseSchoolYear(value: string | null | undefined): SchoolYear | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return schoolYearOptions.find(([schoolYear]) => schoolYear === normalized)?.[0];
}

export function isSchoolYearAllowedForCycle(cycle: SchoolCycle, schoolYear: SchoolYear) {
  return allowedSchoolYearsByCycle[cycle].includes(schoolYear);
}

export function getSchoolYearOptionsForCycle(cycle: SchoolCycle | undefined) {
  if (!cycle) {
    return schoolYearOptions;
  }

  return allowedSchoolYearsByCycle[cycle].map(
    (schoolYear) => [schoolYear, schoolYearLabels[schoolYear]] as const,
  );
}
