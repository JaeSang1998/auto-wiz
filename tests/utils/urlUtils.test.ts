import { describe, it, expect } from "vitest";

/**
 * URL 처리 유틸리티 테스트
 * 
 * URL 비교 및 네비게이션 필요 여부 판단 로직을 테스트합니다.
 */

// URL 비교 함수 (background.ts에서 추출)
const shouldNavigate = (stepUrl: string, currentUrl: string): boolean => {
  try {
    const stepUrlObj = new URL(stepUrl);
    const currentUrlObj = new URL(currentUrl);

    // origin + pathname 비교
    const stepUrlPath = stepUrlObj.origin + stepUrlObj.pathname;
    const currentUrlPath = currentUrlObj.origin + currentUrlObj.pathname;

    return stepUrlPath !== currentUrlPath;
  } catch (error) {
    return false;
  }
};

const isSameOrigin = (url1: string, url2: string): boolean => {
  try {
    const url1Obj = new URL(url1);
    const url2Obj = new URL(url2);
    return url1Obj.origin === url2Obj.origin;
  } catch {
    return false;
  }
};

const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.origin + urlObj.pathname;
  } catch {
    return url;
  }
};

describe("URL Utilities", () => {
  describe("shouldNavigate", () => {
    it("should return false for identical URLs", () => {
      const url = "https://example.com/page";
      expect(shouldNavigate(url, url)).toBe(false);
    });

    it("should return false for URLs with different query params", () => {
      const url1 = "https://example.com/page?foo=bar";
      const url2 = "https://example.com/page?baz=qux";

      // origin + pathname은 같으므로 네비게이션 불필요
      expect(shouldNavigate(url1, url2)).toBe(false);
    });

    it("should return false for URLs with different hash", () => {
      const url1 = "https://example.com/page#section1";
      const url2 = "https://example.com/page#section2";

      expect(shouldNavigate(url1, url2)).toBe(false);
    });

    it("should return true for different pathnames", () => {
      const url1 = "https://example.com/page1";
      const url2 = "https://example.com/page2";

      expect(shouldNavigate(url1, url2)).toBe(true);
    });

    it("should return true for different origins", () => {
      const url1 = "https://example.com/page";
      const url2 = "https://different.com/page";

      expect(shouldNavigate(url1, url2)).toBe(true);
    });

    it("should return true for http vs https", () => {
      const url1 = "http://example.com/page";
      const url2 = "https://example.com/page";

      expect(shouldNavigate(url1, url2)).toBe(true);
    });

    it("should handle URLs with trailing slash", () => {
      const url1 = "https://example.com/page";
      const url2 = "https://example.com/page/";

      // 브라우저는 이를 다르게 처리하므로 true
      expect(shouldNavigate(url1, url2)).toBe(true);
    });

    it("should handle invalid URLs gracefully", () => {
      const validUrl = "https://example.com/page";
      const invalidUrl = "not-a-url";

      expect(shouldNavigate(validUrl, invalidUrl)).toBe(false);
      expect(shouldNavigate(invalidUrl, validUrl)).toBe(false);
    });

    it("should handle URLs with ports", () => {
      const url1 = "https://example.com:3000/page";
      const url2 = "https://example.com:3001/page";

      expect(shouldNavigate(url1, url2)).toBe(true);
    });

    it("should handle localhost URLs", () => {
      const url1 = "http://localhost:3000/page";
      const url2 = "http://localhost:3000/other";

      expect(shouldNavigate(url1, url2)).toBe(true);
    });
  });

  describe("isSameOrigin", () => {
    it("should return true for same origin", () => {
      const url1 = "https://example.com/page1";
      const url2 = "https://example.com/page2";

      expect(isSameOrigin(url1, url2)).toBe(true);
    });

    it("should return false for different origins", () => {
      const url1 = "https://example.com/page";
      const url2 = "https://different.com/page";

      expect(isSameOrigin(url1, url2)).toBe(false);
    });

    it("should return false for different protocols", () => {
      const url1 = "http://example.com/page";
      const url2 = "https://example.com/page";

      expect(isSameOrigin(url1, url2)).toBe(false);
    });

    it("should return false for different ports", () => {
      const url1 = "https://example.com:3000/page";
      const url2 = "https://example.com:3001/page";

      expect(isSameOrigin(url1, url2)).toBe(false);
    });

    it("should handle invalid URLs", () => {
      const validUrl = "https://example.com/page";
      const invalidUrl = "not-a-url";

      expect(isSameOrigin(validUrl, invalidUrl)).toBe(false);
      expect(isSameOrigin(invalidUrl, validUrl)).toBe(false);
      expect(isSameOrigin(invalidUrl, invalidUrl)).toBe(false);
    });

    it("should handle subdomains", () => {
      const url1 = "https://app.example.com/page";
      const url2 = "https://api.example.com/page";

      expect(isSameOrigin(url1, url2)).toBe(false);
    });
  });

  describe("normalizeUrl", () => {
    it("should normalize URL to origin + pathname", () => {
      const url = "https://example.com/page?foo=bar#section";
      const normalized = normalizeUrl(url);

      expect(normalized).toBe("https://example.com/page");
    });

    it("should keep trailing slash in pathname", () => {
      const url = "https://example.com/page/?foo=bar";
      const normalized = normalizeUrl(url);

      expect(normalized).toBe("https://example.com/page/");
    });

    it("should handle root path", () => {
      const url = "https://example.com";
      const normalized = normalizeUrl(url);

      expect(normalized).toBe("https://example.com/");
    });

    it("should handle invalid URLs", () => {
      const invalidUrl = "not-a-url";
      const normalized = normalizeUrl(invalidUrl);

      expect(normalized).toBe(invalidUrl);
    });

    it("should handle URLs with ports", () => {
      const url = "https://example.com:3000/page";
      const normalized = normalizeUrl(url);

      expect(normalized).toBe("https://example.com:3000/page");
    });

    it("should handle complex paths", () => {
      const url = "https://example.com/path/to/page.html?query=1#hash";
      const normalized = normalizeUrl(url);

      expect(normalized).toBe("https://example.com/path/to/page.html");
    });
  });

  describe("URL matching edge cases", () => {
    it("should handle URLs with unicode characters", () => {
      const url1 = "https://example.com/page/한글";
      const url2 = "https://example.com/page/한글";

      expect(shouldNavigate(url1, url2)).toBe(false);
    });

    it("should handle URLs with encoded characters", () => {
      const url1 = "https://example.com/page%20with%20spaces";
      const url2 = "https://example.com/page with spaces";

      // 인코딩 차이로 인해 다른 URL로 인식될 수 있음
      const result = shouldNavigate(url1, url2);
      expect(typeof result).toBe("boolean");
    });

    it("should handle relative vs absolute URLs", () => {
      const absoluteUrl = "https://example.com/page";
      const relativeUrl = "/page";

      // relative URL은 유효하지 않은 URL로 처리됨
      expect(shouldNavigate(absoluteUrl, relativeUrl)).toBe(false);
    });

    it("should handle about:blank", () => {
      const aboutBlank = "about:blank";
      const normalUrl = "https://example.com/page";

      const result = shouldNavigate(aboutBlank, normalUrl);
      expect(typeof result).toBe("boolean");
    });

    it("should handle data URLs", () => {
      const dataUrl = "data:text/html,<h1>Hello</h1>";
      const normalUrl = "https://example.com/page";

      const result = shouldNavigate(dataUrl, normalUrl);
      expect(typeof result).toBe("boolean");
    });
  });

  describe("Navigation scenarios", () => {
    it("should navigate from home to about page", () => {
      const homeUrl = "https://example.com/";
      const aboutUrl = "https://example.com/about";

      expect(shouldNavigate(aboutUrl, homeUrl)).toBe(true);
    });

    it("should not navigate when only query changes", () => {
      const listUrl = "https://example.com/products";
      const filteredUrl = "https://example.com/products?filter=active";

      expect(shouldNavigate(filteredUrl, listUrl)).toBe(false);
    });

    it("should not navigate when only hash changes", () => {
      const pageUrl = "https://example.com/docs";
      const sectionUrl = "https://example.com/docs#api";

      expect(shouldNavigate(sectionUrl, pageUrl)).toBe(false);
    });

    it("should navigate when path changes", () => {
      const loginUrl = "https://example.com/login";
      const dashboardUrl = "https://example.com/dashboard";

      expect(shouldNavigate(dashboardUrl, loginUrl)).toBe(true);
    });

    it("should navigate to different subdomain", () => {
      const mainUrl = "https://example.com/page";
      const apiUrl = "https://api.example.com/page";

      expect(shouldNavigate(apiUrl, mainUrl)).toBe(true);
    });
  });
});

