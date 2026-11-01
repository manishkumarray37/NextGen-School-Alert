export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();

  // 🚀 SAFETY FIX: If browser requests assets from subpaths like /app/config.js or /student/fee-engine.js, serve from root!
  if (url.pathname.startsWith('/app/') || url.pathname.startsWith('/student/')) {
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.ico')) {
      url.pathname = '/' + url.pathname.split('/').pop();
      return context.env.ASSETS.fetch(url);
    }
  }

  // 1. Static files (.js, .css, .png, favicon, etc.) and /api/ requests pass through
  if (url.pathname.startsWith('/api/') || (url.pathname.includes('.') && !url.pathname.endsWith('.html'))) {
    return context.next();
  }

  // 2. Student Subdomain (student.*) -> Always serve student.html
  if (hostname.startsWith('student.')) {
    url.pathname = '/student.html';
    return context.env.ASSETS.fetch(url);
  }

  // 3. Super Admin Subdomains (admin.* or superadmin.*) -> Always serve superadmin.html
  if (hostname.startsWith('admin.') || hostname.startsWith('superadmin.')) {
    url.pathname = '/superadmin.html';
    return context.env.ASSETS.fetch(url);
  }

  // 4. Staff & School Admin Subdomain (app.*) -> Always serve app.html
  if (hostname.startsWith('app.')) {
    url.pathname = '/app.html';
    return context.env.ASSETS.fetch(url);
  }

  // 5. Direct URL paths for testing on *.pages.dev or localhost (Supports all modules like /app/ViewStudent)
  if (url.pathname === '/student' || url.pathname.startsWith('/student/')) {
    url.pathname = '/student.html';
    return context.env.ASSETS.fetch(url);
  }
  if (url.pathname === '/app' || url.pathname.startsWith('/app/')) {
    url.pathname = '/app.html';
    return context.env.ASSETS.fetch(url);
  }
  if (url.pathname === '/superadmin' || url.pathname.startsWith('/superadmin/') || url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    url.pathname = '/superadmin.html';
    return context.env.ASSETS.fetch(url);
  }

  // 6. Default Apex Domain -> Serve index.html
  return context.next();
}