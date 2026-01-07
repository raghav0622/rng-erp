/**
 * Value types for complex non-primitive fields
 */

/**
 * Geo location value with coordinates and optional address
 */
export interface GeoValue {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Math expression value with description and computed result
 */
export interface MathValue {
  description: string;
  value: number;
  unit?: string;
}

/**
 * Signature value as Base64 encoded string
 */
export type SignatureValue = string;

/**
 * Image value with metadata
 */
export interface ImageValue {
  url: string;
  file?: File;
  metadata?: {
    width?: number;
    height?: number;
    size?: number;
    name?: string;
  };
}

/**
 * File value with metadata
 */
export interface FileValue {
  url: string;
  file?: File;
  name: string;
  size?: number;
  type?: string;
}

/**
 * Date range value
 */
export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

/**
 * Range slider value (tuple)
 */
export type RangeValue = [number, number];
