import { unstopApplyAgent } from "./untop/apply";

export const agentRegistry: Record<string, any> = {
  unstop: unstopApplyAgent,
};