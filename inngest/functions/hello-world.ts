import { inngest } from "@/lib/inngest-client";

// Função de teste para validar que o Inngest está funcionando
export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-1s", "1s");
    return { message: `Hello, ${event.data.name ?? "World"}!` };
  }
);
