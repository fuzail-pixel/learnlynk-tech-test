// LearnLynk Tech Test - Task 3: Edge Function create-task

// Deno + Supabase Edge Functions style
// Docs reference: https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type CreateTaskPayload = {
  application_id: string;
  task_type: string;
  due_at: string;
};

const VALID_TYPES = ["call", "email", "review"];

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Partial<CreateTaskPayload>;
    const { application_id, task_type, due_at } = body;

    // TODO: validate application_id, task_type, due_at
    // - check task_type in VALID_TYPES
    // - parse due_at and ensure it's in the future
    if (!application_id || typeof application_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid or missing application_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!task_type || !VALID_TYPES.includes(task_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid task_type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let parsedDueDate: Date;
    try {
      parsedDueDate = new Date(due_at!);
      if (isNaN(parsedDueDate.getTime())) throw new Error("invalid");
    } catch (_) {
      return new Response(
        JSON.stringify({ error: "Invalid due_at format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (parsedDueDate <= new Date()) {
      return new Response(
        JSON.stringify({ error: "due_at must be a future timestamp" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // TODO: insert into tasks table using supabase client

    // Example:
    // const { data, error } = await supabase
    //   .from("tasks")
    //   .insert({ ... })
    //   .select()
    //   .single();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        application_id,
        type: task_type,
        due_at,
        status: "open",

// tenant_id is intentionally not included here, but in the real one this value will be taken form the jwt claims or the parent application record via db triggeer.
      })
      .select()
      .single();
    // TODO: handle error and return appropriate status code

    // Example successful response:
    // return new Response(JSON.stringify({ success: true, task_id: data.id }), {
    //   status: 200,
    //   headers: { "Content-Type": "application/json" },
    // });

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to create task" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Emit realtime event (optional but included per assignment)
    await supabase.channel("tasks").send({
      type: "broadcast",
      event: "task.created",
      payload: { task_id: data.id, application_id, type: task_type },
    });

    // Example successful response:
    return new Response(JSON.stringify({ success: true, task_id: data.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
