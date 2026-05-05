export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const email =
      request.headers.get("Cf-Access-Authenticated-User-Email") ||
      "unknown-user";

    const country =
      request.cf && request.cf.country
        ? request.cf.country
        : request.headers.get("CF-IPCountry") || "XX";

    const timestamp = new Date().toISOString();

    if (url.pathname === "/secure") {
      const countryUrl = `/secure/${country}`;

      const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Authenticated User</title>
  </head>
  <body>
    <h1>Cloudflare Access Authentication Result</h1>
    <p>
      ${escapeHtml(email)} authenticated at ${escapeHtml(timestamp)} from
      <a href="${countryUrl}">${escapeHtml(country)}</a>
    </p>
  </body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=UTF-8",
          "cache-control": "no-store"
        }
      });
    }

    if (url.pathname.startsWith("/secure/")) {
      const requestedCountry = url.pathname.split("/").filter(Boolean)[1];

      if (!requestedCountry || !/^[A-Za-z]{2}$/.test(requestedCountry)) {
        return new Response("Invalid country code", { status: 400 });
      }

      const normalizedCountry = requestedCountry.toUpperCase();
      const objectKey = `${normalizedCountry}.png`;

      const object = await env.FLAGS_BUCKET.get(objectKey);

      if (!object) {
        return new Response(`Flag not found for ${normalizedCountry}`, {
          status: 404,
          headers: {
            "content-type": "text/plain; charset=UTF-8"
          }
        });
      }

      return new Response(object.body, {
        status: 200,
        headers: {
          "content-type": object.httpMetadata?.contentType || "image/png",
          "cache-control": "private, max-age=300"
        }
      });
    }

    return fetch(request);
  }
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
