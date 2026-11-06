// Cloudflare R2 Upload & Delete Endpoint (POST & DELETE)
export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  try {
    // 1. Verify R2_STORAGE Binding Exists
    if (!env.R2_STORAGE) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "R2_STORAGE binding is missing in Cloudflare Pages dashboard." 
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const contentType = request.headers.get("content-type") || "";

    // 2. Handle JSON Deletion Request (POST with action: delete from config.js)
    if (contentType.includes("application/json")) {
      const body = await request.json();
      if (body.action === "delete" && body.path) {
        await env.R2_STORAGE.delete(body.path);
        return new Response(JSON.stringify({ 
          success: true, 
          message: "File successfully deleted from R2 storage." 
        }), {
          status: 200,
          headers: corsHeaders
        });
      }
    }

    // 3. Handle File Upload Request (Multipart FormData)
    const formData = await request.formData();
    const file = formData.get('file');
    const path = formData.get('path'); // e.g., "SCH101/greetings/filename.jpg"

    if (!file || !path) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing required file or storage path parameter." 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // 4. Upload directly to Cloudflare R2 Bucket
    await env.R2_STORAGE.put(path, file.stream(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream"
      }
    });

    // 5. Return Public R2 URL
    const publicBaseUrl = "https://pub-edbd94d93c744b28be5bc8dca7ea9c1d.r2.dev";
    const fileUrl = `${publicBaseUrl}/${path}`;

    return new Response(JSON.stringify({ 
      success: true, 
      url: fileUrl, 
      path: path 
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message || "Failed to process R2 storage request." 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 🗑️ Cloudflare R2 File Deletion Endpoint (Direct DELETE method fallback)
export async function onRequestDelete({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  try {
    if (!env.R2_STORAGE) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "R2_STORAGE binding is missing." 
      }), { status: 500, headers: corsHeaders });
    }
    const url = new URL(request.url);
    const filePath = url.searchParams.get("path");

    if (!filePath) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing file path to delete." 
      }), { status: 400, headers: corsHeaders });
    }

    await env.R2_STORAGE.delete(filePath);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "File successfully deleted from R2 storage." 
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message || "Failed to delete file from R2." 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
