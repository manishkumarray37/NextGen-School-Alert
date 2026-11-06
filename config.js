const SUPABASE_URL = "https://yanzstgfsvnlspbrminc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbnpzdGdmc3ZubHNwYnJtaW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjEyNjAsImV4cCI6MjEwNjQzNzI2MH0.mFYUSJio3AlPwkideCDMHCjg1Ek5hNhZkgW_x92Kmjo";

// Global Supabase Database Client
window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.STORAGE_BUCKET = "School_Data";
window.R2_PUBLIC_URL = "https://pub-edbd94d93c744b28be5bc8dca7ea9c1d.r2.dev";

// Universal R2 File Uploader (Supports Files & Canvas Blobs)
window.uploadToR2 = async function(file, moduleName, customFileName) {
  try {
    const user = JSON.parse(localStorage.getItem("a2z_user") || "{}");
    const activeSchool = user.schoolId || "GLOBAL";

    // Auto-detect extension even for compressed Blobs without a name
    let ext = "jpg";
    if (file.name && file.name.includes('.')) {
      ext = file.name.split('.').pop().toLowerCase();
    } else if (file.type && file.type.includes('/')) {
      ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    }

    const cleanModule = (moduleName || "general").toLowerCase();
    const fileName = customFileName || `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const targetPath = `${activeSchool}/${cleanModule}/${fileName}`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", targetPath);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to upload file to Cloudflare R2");
    }

    // Return Full R2 Public URL
    if (data.url && data.url.startsWith("http")) {
      return data.url;
    }
    return `${window.R2_PUBLIC_URL}/${targetPath}`;

  } catch (err) {
    console.error("R2 Upload Error:", err);
    throw err;
  }
};

// Universal R2 File Deletion Helper (POST based for 100% reliability)
window.deleteFromR2 = async function(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return;
  try {
    // Only process R2 URLs
    if (!fileUrl.includes('.r2.dev') && !fileUrl.includes('/api/upload')) return;

    const urlObj = new URL(fileUrl);
    const filePath = urlObj.pathname.replace(/^\/+/, '');
    if (!filePath) return;

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path: filePath })
    });
    
    const data = await res.json();
    return data && data.success;
  } catch (err) {
    console.warn("R2 Delete Warning:", err);
  }
};