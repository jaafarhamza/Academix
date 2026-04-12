import type { SchoolCycle, SchoolYear } from "../types/student.types";

export const schoolYearLabels: Record<SchoolYear, string> = {
  FIRST_YEAR: "1st Year",
  SECOND_YEAR: "2nd Year",
  THIRD_YEAR: "3rd Year",
  FOURTH_YEAR: "4th Year",
  FIFTH_YEAR: "5th Year",
  SIXTH_YEAR: "6th Year",
};

export const schoolCycleLabels: Record<SchoolCycle, string> = {
  PRIMARY: "Primary",
  COLLEGE: "College",
  LYCEE: "Lycee",
};

export const schoolYearOptions = Object.entries(schoolYearLabels) as Array<
  [SchoolYear, string]
>;

export const schoolCycleOptions = Object.entries(schoolCycleLabels) as Array<
  [SchoolCycle, string]
>;
