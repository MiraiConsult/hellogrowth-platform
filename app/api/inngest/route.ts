import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest-client";
import { helloWorld } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    // Novas funções serão adicionadas aqui conforme implementadas
  ],
});
