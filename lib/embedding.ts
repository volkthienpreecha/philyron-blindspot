import path from 'node:path';
import { env, pipeline } from '@huggingface/transformers';
export const MODEL_VERSION = 'MiniLM-L6-v2@751bff37182d3f1213fa05d7196b954e230abad9:q8:mean:normalized';
env.localModelPath = path.join(process.cwd(), 'models/');
env.allowRemoteModels = false;
if(env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
let extractor: ReturnType<typeof pipeline<'feature-extraction'>> | undefined;
let active = 0;
export async function embed(texts: string[]): Promise<number[][]> {
  if (active >= 2) throw new Error('INFERENCE_BUSY');
  active++;
  try {
    extractor ??= pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{dtype:'q8',device:'cpu'});
    const pipe = await extractor;
    const result = await pipe(texts,{pooling:'mean',normalize:true});
    return result.tolist() as number[][];
  } catch (e) { extractor = undefined; throw e; }
  finally { active--; }
}
