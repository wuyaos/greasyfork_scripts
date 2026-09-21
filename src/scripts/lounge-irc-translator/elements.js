

function gmJson({ method, url, headers = {}, data = null }) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers,
        data,
        timeout: 30000,
        onload: (res) => {
          let json = null;
          try {
            json = JSON.parse(res.responseText || "{}");
          } catch {}
          if (res.status >= 400 && !json)
            reject(new Error(`HTTP ${res.status}`));
          else resolve(json || {});
        },
        onerror: () => reject(new Error("网络错误")),
        ontimeout: () => reject(new Error("请求超时")),
      });
    });
  }

function clean(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

function field(labelText, child) {
    return el("div", { class: "lit-field" }, el("label", {}, labelText), child);
  }

function el(tag, attrs = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const kid of kids.flat()) {
      if (kid == null) continue;
      node.append(
        kid instanceof Node ? kid : document.createTextNode(String(kid)),
      );
    }
    return node;
  }



export { clean, el, field, gmJson, sleep };
