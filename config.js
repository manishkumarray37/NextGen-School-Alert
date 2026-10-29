const SUPABASE_URL = "https://yanzstgfsvnlspbrminc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbnpzdGdmc3ZubHNwYnJtaW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjEyNjAsImV4cCI6MjEwNjQzNzI2MH0.mFYUSJio3AlPwkideCDMHCjg1Ek5hNhZkgW_x92Kmjo";

// Global Supabase Database Client
window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.STORAGE_BUCKET = "School_Data";
window.R2_PUBLIC_URL = "https://pub-edbd94d93c744b28be5bc8dca7ea9c1d.r2.dev";

// Universal R2 File Uploader
window.uploadToR2 = async function(file, moduleName, customFileName) {
  try {
    const user = JSON.parse(localStorage.getItem("a2z_user") || "{}");
    const activeSchool = user.schoolId;

    if (!activeSchool) {
      throw new Error("Active school session not found.");
    }

    const cleanModule = (moduleName || "general").toLowerCase();
    const ext = file.name ? file.name.split('.').pop() : "bin";
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
      throw new Error(data.error || "Failed to upload file to storage");
    }

    return data.url;
  } catch (err) {
    console.error("R2 Upload Error:", err);
    throw err;
  }
};
