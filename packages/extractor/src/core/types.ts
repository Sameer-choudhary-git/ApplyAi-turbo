export interface Extractor {
  platform: string
  category: string

  run(): Promise<any[]>
}