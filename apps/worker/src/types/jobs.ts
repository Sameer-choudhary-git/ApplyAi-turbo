export type ApplyAgentInput = {
  userId: string;
  cookie: string;
  preferences: any;
  skills: string[];
};

export type ApplyResult = {
  success: boolean;
  applications: {
    platform: string;
    title: string;
    company: string;
    link: string;
    status: string;
    notes?: string;
    type: string;
  }[];
  error?: string;
}; 