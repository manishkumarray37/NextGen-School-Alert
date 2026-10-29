export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();

  // If request is for an asset/file (like .js, .css, .png, .svg), let it pass normally
  if (url.pathname.includes('.') && !url.pathname.endsWith('.html')) {
    return context.next();
  }

  // 1. Student Portal Routing (student.yourdomain.com)
  if (hostname.startsWith('student.')) {
    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = '/student.html';
      return context.env.ASSETS.fetch(url);
    }
  }

  // 2. School Admin & Staff Portal Routing (app.yourdomain.com)
  else if (hostname.startsWith('app.')) {
    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = '/app.html';
      return context.env.ASSETS.fetch(url);
    }
  }

  // 3. Superadmin Routing (admin.yourdomain.com)
  else if (hostname.startsWith('admin.')) {
    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = '/superadmin.html';
      return context.env.ASSETS.fetch(url);
    }
  }

  // Default: Pass through to normal routes (e.g., index.html)
  return context.next();
}
