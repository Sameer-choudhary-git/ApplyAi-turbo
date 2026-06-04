export type ApplyAgentInput = {
  userId: string;
  cookie: string;
  preferences: any;
  skills: string[];
};

export type ApplyResult = {
  success: boolean;
  applications: {
    title: string;
    company: string;
    link: string;
    status: string;
    notes?: string;
  }[];
}; 