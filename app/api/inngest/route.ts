import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest-client";
import {
  helloWorld,
  npsActionFlow,
  preSaleActionFlow,
  processInboundReply,
  preSaleAutoTrigger,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    npsActionFlow,
    preSaleActionFlow,
    processInboundReply,
    preSaleAutoTrigger,
  ],
});
