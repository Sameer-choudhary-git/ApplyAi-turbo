import { unstopApplyAgent } from "./unstop/apply";

export const agentRegistry: Record<string, any> = {
  unstop: unstopApplyAgent,
};
