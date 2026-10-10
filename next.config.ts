import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node'],
  outputFileTracingIncludes: { '/api/**': ['./models/Xenova/all-MiniLM-L6-v2/**/*'] },
  outputFileTracingExcludes: { '*': ['./node_modules/onnxruntime-node/bin/napi-v3/{darwin,win32}/**/*', './node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**/*', './node_modules/onnxruntime-node/bin/napi-v3/linux/x64/*cuda*', './node_modules/onnxruntime-node/bin/napi-v3/linux/x64/*tensorrt*'] },
};
export default config;
