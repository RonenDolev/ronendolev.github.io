(function () {
  var backendMessage = "תכונות שרת או AI אינן זמינות כרגע בגרסת GitHub Pages. ניתן להשתמש בממשק ובתוכן הסטטי, אך פעולות שדורשות backend אינן זמינות כאן.";
  window.WordGamesAIBackendAvailable = false;
  window.WordGamesAIFallbackMessage = backendMessage;

  function isApiRequest(input) {
    try {
      var raw = "";
      if (typeof input === "string") raw = input;
      else if (input && typeof input.url === "string") raw = input.url;
      else raw = String(input || "");

      if (!raw) return false;
      if (raw.indexOf("/api/") !== -1) return true;

      try {
        var u = new URL(raw, window.location.origin);
        return u.pathname.indexOf("/api/") === 0;
      } catch (e) {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  function fallbackPayload(url) {
    return {
      ok: false,
      source: "github-pages-static",
      error: backendMessage,
      requestedUrl: url || "",
      requiresBackend: true
    };
  }

  var originalFetch = window.fetch ? window.fetch.bind(window) : null;
  if (originalFetch) {
    window.fetch = function (input, init) {
      if (isApiRequest(input)) {
        var payload = fallbackPayload(typeof input === "string" ? input : (input && input.url) || "");
        window.dispatchEvent(new CustomEvent("wordgamesai:backend-required", { detail: payload }));
        return Promise.resolve(
          new Response(JSON.stringify(payload), {
            status: 503,
            headers: { "Content-Type": "application/json; charset=utf-8" }
          })
        );
      }
      return originalFetch(input, init);
    };
  }

  var OriginalXHR = window.XMLHttpRequest;
  if (OriginalXHR) {
    function PatchedXHR() {
      var xhr = new OriginalXHR();
      var originalOpen = xhr.open;
      var originalSend = xhr.send;
      var blockedUrl = "";

      xhr.open = function (method, url) {
        blockedUrl = url || "";
        xhr.__isApiFallback = isApiRequest(url);
        return originalOpen.apply(xhr, arguments);
      };

      xhr.send = function () {
        if (xhr.__isApiFallback) {
          var payload = JSON.stringify(fallbackPayload(blockedUrl));
          window.dispatchEvent(new CustomEvent("wordgamesai:backend-required", { detail: JSON.parse(payload) }));
          setTimeout(function () {
            Object.defineProperty(xhr, "readyState",  { configurable: true, value: 4 });
            Object.defineProperty(xhr, "status",      { configurable: true, value: 503 });
            Object.defineProperty(xhr, "responseText",{ configurable: true, value: payload });
            Object.defineProperty(xhr, "response",    { configurable: true, value: payload });
            if (typeof xhr.onreadystatechange === "function") xhr.onreadystatechange();
            if (typeof xhr.onload === "function") xhr.onload();
          }, 0);
          return;
        }
        return originalSend.apply(xhr, arguments);
      };

      return xhr;
    }

    window.XMLHttpRequest = PatchedXHR;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("github-pages-backend-notice")) return;

    var notice = document.createElement("div");
    notice.id = "github-pages-backend-notice";
    notice.setAttribute("dir", "rtl");
    notice.style.display = "none";
    notice.style.maxWidth = "1100px";
    notice.style.margin = "12px auto";
    notice.style.padding = "10px 14px";
    notice.style.borderRadius = "12px";
    notice.style.background = "#fff3cd";
    notice.style.color = "#664d03";
    notice.style.border = "1px solid #ffecb5";
    notice.style.fontFamily = "Arial, sans-serif";
    notice.style.fontSize = "14px";
    notice.style.lineHeight = "1.5";
    notice.style.textAlign = "right";
    notice.textContent = backendMessage;

    document.body.insertBefore(notice, document.body.firstChild);

    window.addEventListener("wordgamesai:backend-required", function () {
      notice.style.display = "block";
    });
  });
})();
