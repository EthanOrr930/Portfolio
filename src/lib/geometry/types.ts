export interface ProcessingParams {
  sampleCount: number;
  lloydPasses: number;
  candidateMultiplier: number;
  curvatureK: number;
  curvatureGridCell: number;
  curvatureThreshold: number;
  noiseFreq: number;
}

export const DEFAULT_PROCESSING_PARAMS: ProcessingParams = {
  sampleCount: 12000,
  lloydPasses: 2,
  candidateMultiplier: 3,
  curvatureK: 8,
  curvatureGridCell: 0.15,
  curvatureThreshold: 0.45,
  noiseFreq: 1.0,
};

export interface ProcessingResult {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  curvatures: Float32Array;
  scales: Float32Array; // baked base scale per point (density-derived)
  order: Float32Array;
  count: number;
}

export interface ProgressInfo {
  stage: string;
  progress: number; // 0..1
}
