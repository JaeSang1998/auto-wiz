import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Automation Wizard",
    description:
      "노션처럼 호버 툴바로 웹 자동화를 레코드하고 실행하는 PoC 확장 프로그램",
    version: "0.0.1",
    permissions: ["storage", "activeTab", "scripting", "tabs", "background"],
    host_permissions: ["http://*/*", "https://*/*"],
    side_panel: {
      default_path: "sidepanel/index.html",
    },
    action: {
      default_popup: "popup/index.html",
    },
  },
});
