/// <reference types="@solidjs/start/env" />

declare module "*.wasm?url" {
  const url: string;
  export default url;
}
