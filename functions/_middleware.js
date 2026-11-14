// 🚀 Helper: Automatically resolves the school's assigned template (school1 to school5) from Supabase
async function resolveSchoolTemplate(context, url, subSlug) {
  let chosenTemplate = "school1";

  // 1. Instant preview override via URL query (?template=school4)
  const previewTpl = url.searchParams.get("template");
  if (previewTpl && /^school[1-5]$/.test(previewTpl)) {
    return `/website/${previewTpl}.html`;
  }

  try {
    let sbUrl = context.env.SUPABASE_URL || "";
    let sbKey = context.env.SUPABASE_KEY || "";

    // Automatically extract Supabase credentials from /config.js if not set in env
    if (!sbUrl || !sbKey) {
      const cfgRes = await context.env.ASSETS.fetch(new URL('/config.js', url.origin));
      if (cfgRes.ok) {
        const cfgText = await cfgRes.text();
        const uMatch = cfgText.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
        const kMatch = cfgText.match(/['"](eyJ[a-zA-Z0-9_.-]+|sb_publishable_[a-zA-Z0-9_.-]+)['"]/);
        if (uMatch) sbUrl = uMatch[0];
        if (kMatch) sbKey = kMatch[1];
      }
    }

    // 2. Fast Edge REST query to Supabase School_Websites table
    if (sbUrl && sbKey && subSlug) {
      const apiEndpoint = `${sbUrl}/rest/v1/School_Websites?Subdomain=eq.${encodeURIComponent(subSlug)}&select=WebsiteTemplate&limit=1`;
      const dbRes = await fetch(apiEndpoint, {
        headers: {
          "apikey": sbKey,
          "Authorization": `Bearer ${sbKey}`
        }
      });

      if (dbRes.ok) {
        const rows = await dbRes.json();
        if (rows && rows.length > 0 && rows[0].WebsiteTemplate) {
          const tpl = String(rows[0].WebsiteTemplate).trim();
          if (/^school[1-5]$/.test(tpl)) {
            chosenTemplate = tpl;
          }
        }
      }
    }
  } catch (err) {
    // Silent fallback to school1
  }

  return `/website/${chosenTemplate}.html`;
}

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

  // 🚀 4.5 DEMO & CUSTOM SCHOOL SUBDOMAINS (demo.schoolalarm.online, sphs.schoolalarm.online etc.)
  const isCustomSubdomain = hostname.split('.').length > 2 &&
                            !hostname.startsWith('www.') &&
                            !hostname.endsWith('.pages.dev') &&
                            !hostname.endsWith('.workers.dev');

  if (hostname.startsWith('demo.') || isCustomSubdomain) {
    const subSlug = hostname.split('.')[0];
    url.pathname = await resolveSchoolTemplate(context, url, subSlug);
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
    url.pathname = await resolveSchoolTemplate(context, url, 'demo');
    return context.env.ASSETS.fetch(url);
  }

  // 6. Root Landing Page
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return context.next();
  }

  // 🚀 7. DYNAMIC FILE CHECK
  const assetResponse = await context.env.ASSETS.fetch(context.request);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  // ❌ 8. REAL 404 PAGE
  url.pathname = '/404.html';
  return context.env.ASSETS.fetch(url);
}
