export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();

  // 1. Static asset bypass & subpath fix (/app/config.js, /website/config.js -> /config.js)
  if (url.pathname.startsWith('/app/') || url.pathname.startsWith('/student/') || url.pathname.startsWith('/website/')) {
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.ico')) {
      url.pathname = '/' + url.pathname.split('/').pop();
      return context.env.ASSETS.fetch(url);
    }
  }

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

  // 🚀 4.5 NEW: DEMO & CUSTOM SCHOOL SUBDOMAINS (demo.schoolalarm.online, sphs.schoolalarm.online etc.)
  // Checks if subdomain is NOT student, admin, app, or www -> Serves website/school1.html
  if (hostname.startsWith('demo.') || (hostname.split('.').length > 2 && !hostname.startsWith('www.'))) {
    url.pathname = '/website/school1.html';
    return context.env.ASSETS.fetch(url);
  }

  // 5. Direct URL paths for testing on *.pages.dev or localhost
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
  // Testing path for demo website on pages.dev
  if (url.pathname === '/demo' || url.pathname.startsWith('/demo/')) {
    url.pathname = '/website/school1.html';
    return context.env.ASSETS.fetch(url);
  }

  // 6. Root Landing Page
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return context.next();
  }

  // 🚀 7. DYNAMIC FILE CHECK: Try fetching the requested asset/page first.
  // If the file actually exists on server (e.g. /website/school1.html, /about.html, etc.), serve it automatically!
  const assetResponse = await context.env.ASSETS.fetch(context.request);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  // ❌ 8. REAL 404: If the file does not exist anywhere, show 404.html page.
  url.pathname = '/404.html';
  return context.env.ASSETS.fetch(url);
}