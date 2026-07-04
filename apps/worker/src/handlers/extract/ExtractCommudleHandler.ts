import { JobHandler } from "@applyai/queue";
import { ExtractService } from "../../services/extract/ExtractService";
export class ExtractCommudleHandler implements JobHandler {
  private readonly extractService = new ExtractService();
  async execute(): Promise<void> {
    await this.extractService.extractCommudleEvents();
  }
}
