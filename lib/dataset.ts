import data from '../fixtures/evidence.json';
import type {SensorCase,Equipment,Note} from './types';
export const dataset=data as unknown as {version:string;asOf:string;modelVersion:string;matchThreshold:number;clusterThreshold:number;equipment:Equipment[];cases:SensorCase[];notes:Note[]};
