// @refresh reload

import { mount, StartClient } from "@solidjs/start/client";
import { inject } from "@vercel/analytics";

mount(() => <StartClient />, document.getElementById("app")!);

if (import.meta.env.PROD) {
  inject({ framework: "solidstart" });
}
