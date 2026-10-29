export async function onRequestPost({ request, env }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const path = formData.get('path'); // e.g., "SCH101/homework/filename.pdf"

    if (!file || !path) {
      return new Response(JSON.stringify({ error: "Missing file or path" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Save directly to Cloudflare R2 bucket
    await env.R2_STORAGE.put(path, file.stream(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream"
      }
    });

    // Public URL of the uploaded file
    const publicBaseUrl = "https://pub-edbd94d93c744b28be5bc8dca7ea9c1d.r2.dev";
    const fileUrl = `${publicBaseUrl}/${path}`;

    return new Response(JSON.stringify({ success: true, url: fileUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
