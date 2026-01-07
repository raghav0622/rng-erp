import { CompressionStrategy } from '../types';

export function applyCompression(data: any, strategy: CompressionStrategy): any {
  if (!strategy) return data;
  return strategy.compress(data);
}

export function applyDecompression(data: any, strategy: CompressionStrategy): any {
  if (!strategy) return data;
  return strategy.decompress(data);
}
