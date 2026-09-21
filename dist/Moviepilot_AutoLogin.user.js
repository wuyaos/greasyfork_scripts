// ==UserScript==
// @name         MoviePilot自动登录(自用)
// @namespace    http://tampermonkey.net/
// @version      1.3.2
// @description  MoviePilot自动填充账号密码。
// @author       ffwu
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/moviepilot.png
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Moviepilot_AutoLogin.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Moviepilot_AutoLogin.user.js
// ==/UserScript==

// Generated from src/scripts/moviepilot-auto-login/index.js; do not edit dist files.
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // src/scripts/moviepilot-auto-login/config.js
  var CONFIG_KEY = "moviepilot_configs";
  var POLLING_INTERVAL = 500;
  var TIMEOUT = 1e4;

  // src/scripts/moviepilot-auto-login/storage.js
  function getConfigs() {
    return JSON.parse(GM_getValue(CONFIG_KEY, "[]"));
  }
  __name(getConfigs, "getConfigs");
  function saveConfigs(configs) {
    GM_setValue(CONFIG_KEY, JSON.stringify(configs));
  }
  __name(saveConfigs, "saveConfigs");

  // src/scripts/moviepilot-auto-login/styles/popup-template.css
  var popup_template_default = "\n        #mp-config-overlay {\n            position: fixed; top: 0; left: 0; width: 100%; height: 100%;\n            background-color: rgba(0,0,0,0.5); z-index: 9998;\n        }\n        #mp-config-popup {\n            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);\n            background-color: #f9f9f9; padding: 20px; border-radius: 8px;\n            box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 9999;\n            width: 400px; font-family: sans-serif;\n        }\n        #mp-config-popup h2 { margin-top: 0; color: #333; }\n        #mp-config-popup .form-group { margin-bottom: 15px; }\n        #mp-config-popup label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }\n        #mp-config-popup input, #mp-config-popup select {\n            width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; color: #333;\n        }\n        #mp-config-popup .button-group { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }\n        #mp-config-popup button {\n            padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;\n        }\n        #btn_save { background-color: #28a745; color: white; }\n        #btn_delete { background-color: #dc3545; color: white; }\n        #btn_close_popup {\n            position: absolute; top: 10px; right: 15px; font-size: 24px;\n            font-weight: bold; cursor: pointer; border: none; background: none; color: #333;\n        }\n        @media (prefers-color-scheme: dark) {\n            #mp-config-popup {\n                background-color: #2d2d2d;\n                color: #f1f1f1;\n            }\n            #mp-config-popup h2, #mp-config-popup label, #mp-config-popup #btn_close_popup {\n                color: #f1f1f1;\n            }\n            #mp-config-popup input, #mp-config-popup select {\n                background-color: #3c3c3c;\n                color: #f1f1f1;\n                border: 1px solid #555;\n            }\n            #mp-config-popup button#btn_get_current_url {\n                background-color: #555;\n                color: #f1f1f1;\n                border: 1px solid #777;\n            }\n        }\n    ";

  // src/scripts/moviepilot-auto-login/popup-template.js
  var POPUP_STYLE = popup_template_default;
  var POPUP_HTML = `
        <button id="btn_close_popup">&times;</button>
        <h2>MoviePilot 登录配置</h2>
        <div class="form-group">
            <label for="config_select">选择配置</label>
            <select id="config_select">
                <option value="new">-- 新建配置 --</option>
            </select>
        </div>
        <div class="form-group">
            <label for="config_name">配置名称 (自动生成)</label>
            <input type="text" id="config_name" readonly placeholder="由下方URL自动生成">
        </div>
        <div class="form-group">
            <div style="display: flex; gap: 5px; align-items: center; margin-bottom: 5px;">
                <label for="config_url">MoviePilot URL</label>
                <button type="button" id="btn_get_current_url" title="自动获取当前网址" style="flex-shrink: 0; padding: 4px; line-height: 0; border-radius: 4px; margin-left: 5px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>
                </button>
            </div>
            <input type="text" id="config_url" placeholder="例如：http://192.168.1.10:3000" style="width: 100%;">
        </div>
        <div class="form-group">
            <label for="config_username">账号</label>
            <input type="text" id="config_username">
        </div>
        <div class="form-group">
            <label for="config_password">密码</label>
            <input type="password" id="config_password">
        </div>
        <div class="button-group">
            <button id="btn_delete">删除</button>
            <button id="btn_save">保存</button>
        </div>
    `;

  // src/scripts/moviepilot-auto-login/settings.js
  function showConfigPopup(defaultUrl, isFirstTime = false) {
    if (typeof defaultUrl !== "string") {
      defaultUrl = window.location.origin;
    }
    if (document.getElementById("mp-config-popup")) {
      return;
    }
    GM_addStyle(POPUP_STYLE);
    const overlay = document.createElement("div");
    overlay.id = "mp-config-overlay";
    const popup = document.createElement("div");
    popup.id = "mp-config-popup";
    popup.innerHTML = POPUP_HTML;
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    bindPopupLogic(defaultUrl);
  }
  __name(showConfigPopup, "showConfigPopup");
  function bindPopupLogic(defaultUrl) {
    const elements = {
      select: document.getElementById("config_select"),
      nameInput: document.getElementById("config_name"),
      urlInput: document.getElementById("config_url"),
      usernameInput: document.getElementById("config_username"),
      passwordInput: document.getElementById("config_password"),
      saveButton: document.getElementById("btn_save"),
      deleteButton: document.getElementById("btn_delete"),
      closeButton: document.getElementById("btn_close_popup"),
      overlay: document.getElementById("mp-config-overlay"),
      popup: document.getElementById("mp-config-popup"),
      getCurrentUrlButton: document.getElementById("btn_get_current_url")
    };
    const closePopup = /* @__PURE__ */ __name(() => {
      document.body.removeChild(elements.overlay);
      document.body.removeChild(elements.popup);
    }, "closePopup");
    const loadConfigsIntoSelect = /* @__PURE__ */ __name(() => {
      const configs = getConfigs();
      elements.select.innerHTML = '<option value="new">-- 新建配置 --</option>';
      configs.forEach((c) => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = c.name;
        elements.select.appendChild(option);
      });
      displayConfigDetails("new");
    }, "loadConfigsIntoSelect");
    const displayConfigDetails = /* @__PURE__ */ __name((configId) => {
      if (configId === "new") {
        elements.nameInput.value = "";
        elements.urlInput.value = "";
        elements.usernameInput.value = "";
        elements.passwordInput.value = "";
        elements.deleteButton.disabled = true;
      } else {
        const config = getConfigs().find((c) => c.id === configId);
        if (config) {
          elements.nameInput.value = config.name;
          elements.urlInput.value = config.url;
          elements.usernameInput.value = config.username;
          elements.passwordInput.value = config.password;
        }
        elements.deleteButton.disabled = false;
      }
    }, "displayConfigDetails");
    const updateConfigNameFromUrl = /* @__PURE__ */ __name(() => {
      try {
        const url = new URL(elements.urlInput.value);
        const port = url.port ? `:${url.port}` : "";
        elements.nameInput.value = `MoviePilot(${url.hostname}${port})`;
      } catch (e) {
        elements.nameInput.value = "";
      }
    }, "updateConfigNameFromUrl");
    const saveConfiguration = /* @__PURE__ */ __name(() => {
      const name = elements.nameInput.value.trim();
      const url = elements.urlInput.value.trim();
      if (!name || !url) {
        alert("配置名称和URL不能为空！");
        return;
      }
      let configs = getConfigs();
      const selectedId = elements.select.value;
      let savedConfig;
      if (selectedId === "new") {
        const newConfig = {
          id: Date.now().toString(),
          name,
          url,
          username: elements.usernameInput.value,
          password: elements.passwordInput.value
        };
        configs.push(newConfig);
        savedConfig = newConfig;
      } else {
        const configIndex = configs.findIndex((c) => c.id === selectedId);
        if (configIndex > -1) {
          configs[configIndex] = { ...configs[configIndex], name, url, username: elements.usernameInput.value, password: elements.passwordInput.value };
          savedConfig = configs[configIndex];
        }
      }
      saveConfigs(configs);
      alert("保存成功！");
      if (savedConfig && savedConfig.url === window.location.origin) {
        const usernameEl = document.querySelector('input[name="username"]');
        const passwordEl = document.querySelector('input[name="current-password"]');
        if (usernameEl && passwordEl) {
          autofillAndLogin(savedConfig, usernameEl, passwordEl);
        }
      }
      closePopup();
    }, "saveConfiguration");
    const deleteConfiguration = /* @__PURE__ */ __name(() => {
      const selectedId = elements.select.value;
      if (selectedId === "new") return;
      const selectedOption = elements.select.options[elements.select.selectedIndex];
      if (confirm(`确定要删除配置 "${selectedOption.text}" 吗？`)) {
        let configs = getConfigs();
        configs = configs.filter((c) => c.id !== selectedId);
        saveConfigs(configs);
        alert("删除成功！");
        loadConfigsIntoSelect();
      }
    }, "deleteConfiguration");
    elements.select.addEventListener("change", () => displayConfigDetails(elements.select.value));
    elements.urlInput.addEventListener("input", updateConfigNameFromUrl);
    elements.saveButton.addEventListener("click", saveConfiguration);
    elements.deleteButton.addEventListener("click", deleteConfiguration);
    elements.closeButton.addEventListener("click", closePopup);
    elements.overlay.addEventListener("click", closePopup);
    elements.getCurrentUrlButton.addEventListener("click", () => {
      elements.urlInput.value = window.location.origin;
      updateConfigNameFromUrl();
    });
    loadConfigsIntoSelect();
    elements.urlInput.value = defaultUrl;
    updateConfigNameFromUrl();
  }
  __name(bindPopupLogic, "bindPopupLogic");

  // src/scripts/moviepilot-auto-login/login.js
  function initialize() {
    if (document.title !== "MoviePilot") {
      return;
    }
    let intervalId = null;
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      console.log("Moviepilot AutoLogin: 等待登录表单超时。");
    }, TIMEOUT);
    intervalId = setInterval(() => {
      const usernameInput = document.querySelector('input[name="username"]');
      const passwordInput = document.querySelector('input[name="password"]');
      if (usernameInput && passwordInput) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        handleLoginForm(usernameInput, passwordInput);
      }
    }, POLLING_INTERVAL);
  }
  __name(initialize, "initialize");
  function handleLoginForm(usernameInput, passwordInput) {
    const configs = getConfigs();
    const currentOrigin = window.location.origin;
    const matchingConfig = configs.find((c) => c.url === currentOrigin);
    if (matchingConfig && matchingConfig.username && matchingConfig.password) {
      autofillAndLogin(matchingConfig, usernameInput, passwordInput);
    } else {
      showConfigPopup(currentOrigin, true);
    }
  }
  __name(handleLoginForm, "handleLoginForm");
  function autofillAndLogin(config, usernameInput, passwordInput) {
    const loginButton = document.querySelector('button[type="submit"]');
    if (loginButton) {
      setInputValue(usernameInput, config.username);
      setInputValue(passwordInput, config.password);
      loginButton.click();
    }
    const observer = new MutationObserver((mutations, obs) => {
      const errorElement = document.querySelector(".bg-red-500");
      if (errorElement) {
        alert("账号或密码错误，请通过油猴菜单检查您的配置。");
        obs.disconnect();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  __name(autofillAndLogin, "autofillAndLogin");
  function setInputValue(element, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeInputValueSetter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
  __name(setInputValue, "setInputValue");

  // src/scripts/moviepilot-auto-login/startup.js
  function bootstrap() {
    GM_registerMenuCommand("⚙️ 配置 MoviePilot 登录", showConfigPopup);
    initialize();
  }
  __name(bootstrap, "bootstrap");

  // src/scripts/moviepilot-auto-login/index.js
  bootstrap();
})();
