import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if running in Vercel serverless environment
    // Daytona generation requires child_process which is not available in serverless
    if (process.env.VERCEL) {
      return new Response(
        JSON.stringify({
          error: "Daytona generation is not available in serverless environments. Please use the /api/generate endpoint instead, or run this locally."
        }),
        { status: 501, headers: { "Content-Type": "application/json" } }
      );
    }

    const { prompt, organizationId } = await req.json();

    if (!prompt || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Prompt and organizationId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify user is a member of the organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "You are not a member of this organization" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create project record
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        organization_id: organizationId,
        created_by: user.id,
        name: prompt.substring(0, 100), // Use first 100 chars of prompt as name
        prompt: prompt,
      })
      .select()
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Failed to create project" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.DAYTONA_API_KEY || !process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing API keys" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[API] Starting Daytona generation for prompt:", prompt);
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Start the async generation
    (async () => {
      try {
        // Use the generate-in-daytona.ts script
        const scriptPath = path.join(process.cwd(), "scripts", "generate-in-daytona.ts");
        const child = spawn("npx", ["tsx", scriptPath, prompt], {
          env: {
            ...process.env,
            DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          },
        });
        
        let sandboxId = "";
        let previewUrl = "";
        let buffer = "";
        let dbSandboxId = "";
        
        // Capture stdout
        child.stdout.on("data", async (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            // Parse Claude messages
            if (line.includes('__CLAUDE_MESSAGE__')) {
              const jsonStart = line.indexOf('__CLAUDE_MESSAGE__') + '__CLAUDE_MESSAGE__'.length;
              try {
                const message = JSON.parse(line.substring(jsonStart).trim());
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "claude_message", 
                    content: message.content 
                  })}\n\n`)
                );
              } catch (e) {
                // Ignore parse errors
              }
            }
            // Parse tool uses
            else if (line.includes('__TOOL_USE__')) {
              const jsonStart = line.indexOf('__TOOL_USE__') + '__TOOL_USE__'.length;
              try {
                const toolUse = JSON.parse(line.substring(jsonStart).trim());
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "tool_use", 
                    name: toolUse.name,
                    input: toolUse.input 
                  })}\n\n`)
                );
              } catch (e) {
                // Ignore parse errors
              }
            }
            // Parse tool results
            else if (line.includes('__TOOL_RESULT__')) {
              // Skip tool results for now to reduce noise
              continue;
            }
            // Regular progress messages
            else {
              const output = line.trim();
              
              // Filter out internal logs
              if (output && 
                  !output.includes('[Claude]:') && 
                  !output.includes('[Tool]:') &&
                  !output.includes('__')) {
                
                // Send as progress
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "progress", 
                    message: output 
                  })}\n\n`)
                );
                
                // Extract sandbox ID and save to database
                const sandboxMatch = output.match(/Sandbox created: ([a-f0-9-]+)/);
                if (sandboxMatch && !dbSandboxId) {
                  sandboxId = sandboxMatch[1];

                  // Create sandbox record in database
                  const { data: sandbox } = await supabase
                    .from("sandboxes")
                    .insert({
                      project_id: project.id,
                      daytona_sandbox_id: sandboxId,
                      status: "active",
                    })
                    .select()
                    .single();

                  if (sandbox) {
                    dbSandboxId = sandbox.id;
                  }
                }
                
                // Extract preview URL and update database
                const previewMatch = output.match(/Preview URL: (https:\/\/[^\s]+)/);
                if (previewMatch && dbSandboxId) {
                  previewUrl = previewMatch[1];

                  // Update sandbox record with preview URL
                  await supabase
                    .from("sandboxes")
                    .update({ preview_url: previewUrl })
                    .eq("id", dbSandboxId);
                }
              }
            }
          }
        });
        
        // Capture stderr
        child.stderr.on("data", async (data) => {
          const error = data.toString();
          console.error("[Daytona Error]:", error);
          
          // Only send actual errors, not debug info
          if (error.includes("Error") || error.includes("Failed")) {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ 
                type: "error", 
                message: error.trim() 
              })}\n\n`)
            );
          }
        });
        
        // Wait for process to complete
        await new Promise((resolve, reject) => {
          child.on("exit", (code) => {
            if (code === 0) {
              resolve(code);
            } else {
              reject(new Error(`Process exited with code ${code}`));
            }
          });
          
          child.on("error", reject);
        });
        
        // Send completion with preview URL and project ID
        if (previewUrl) {
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({
              type: "complete",
              projectId: project.id,
              sandboxId,
              previewUrl
            })}\n\n`)
          );
          console.log(`[API] Generation complete. Project: ${project.id}, Preview URL: ${previewUrl}`);
        } else {
          throw new Error("Failed to get preview URL");
        }
        
        // Send done signal
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (error: any) {
        console.error("[API] Error during generation:", error);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: "error", 
            message: error.message 
          })}\n\n`)
        );
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } finally {
        await writer.close();
      }
    })();
    
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
    
  } catch (error: any) {
    console.error("[API] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}