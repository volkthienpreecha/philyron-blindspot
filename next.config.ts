import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node'],
  outputFileTracingIncludes: { '/api/**': ['./models/Xenova/all-MiniLM-L6-v2/**/*', './node_modules/onnxruntime-node/package.json', './node_modules/onnxruntime-node/dist/**/*', './node_modules/onnxruntime-node/bin/napi-*/linux/x64/**/*', './node_modules/onnxruntime-common/package.json', './node_modules/onnxruntime-common/dist/**/*'] },
  outputFileTracingExcludes: { '*': ['./node_modules/onnxruntime-node/bin/napi-*/{darwin,win32}/**/*', './node_modules/onnxruntime-node/bin/napi-*/linux/arm64/**/*', './node_modules/onnxruntime-node/bin/napi-*/linux/x64/*cuda*', './node_modules/onnxruntime-node/bin/napi-*/linux/x64/*tensorrt*'] },
};
export default config;
