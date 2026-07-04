export interface ApplyInternshipPayload {
  userId: string;

  platforms: string[];

  skills: string[];

  preferences: {
    workModes: string[];
    opportunityTypes: string[];
    preferredLocations: string[];
    minStipend: number;
    rolesOfInterest: string[];
  };

  cookies: {
    platform: string;
    cookie: string;
  }[];
}
