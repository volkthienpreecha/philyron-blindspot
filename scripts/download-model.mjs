import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
export const REVISION = '751bff37182d3f1213fa05d7196b954e230abad9';
for (const file of ['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx']) {
  const dest = path.join(process.cwd(), 'models/Xenova/all-MiniLM-L6-v2', file);
  try { if ((await stat(dest)).size > 100) continue; } catch {}
  const response = await fetch(`https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/${REVISION}/${file}`);
  if (!response.ok) throw new Error(`Model download failed: ${file} ${response.status}`);
  await mkdir(path.dirname(dest), {recursive:true});
  await writeFile(dest, Buffer.from(await response.arrayBuffer()));
  console.log(`Prepared model asset: ${file}`);
}
