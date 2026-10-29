export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();

  // 1. Static files (.js, .css, .png, favicon, etc.) and /api/ requests pass through directly
  if (url.pathname.startsWith('/api/') || (url.pathname.includes('.') && !url.pathname.endsWith('.html'))) {
    return context.next();
  }

  // 2. Student Subdomain (student.yourdomain.com) -> Always serve /student.html on any path or refresh
  if (hostname.startsWith('student.')) {
    url.pathname = '/student.html';
    return context.env.ASSETS.fetch(url);
  }

  // 3. Staff & School Admin Subdomain (app.yourdomain.com) -> Always serve /app.html on any path or refresh
  if (hostname.startsWith('app.')) {
    url.pathname = '/app.html';
    return context.env.ASSETS.fetch(url);
  }

  // 4. Super Admin Subdomain (admin.yourdomain.com) -> Always serve /superadmin.html on any path or refresh
  if (hostname.startsWith('admin.')) {
    url.pathname = '/superadmin.html';
    return context.env.ASSETS.fetch(url);
  }

  // 5. Main domain (yourdomain.com) -> Serve landing page
  return context.next();
}
