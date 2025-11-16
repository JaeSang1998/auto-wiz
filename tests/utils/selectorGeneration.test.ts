import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * 선택자 생성 로직 테스트
 * 
 * makeSelector 함수는 다음 우선순위로 선택자를 생성합니다:
 * 1. id 속성
 * 2. data-testid 속성
 * 3. aria-label 속성
 * 4. 구조 기반 (nth-of-type)
 * 
 * 최대 깊이는 5단계로 제한됩니다.
 */

// makeSelector 함수 구현 (HoverToolbar.tsx에서 추출)
const makeSelector = (el: HTMLElement): string => {
  const segs: string[] = [];
  let cur: HTMLElement | null = el;

  for (let depth = 0; cur && depth < 5; depth++) {
    let s = cur.nodeName.toLowerCase();
    const id = cur.id;

    if (id) {
      segs.unshift(`${s}#${CSS.escape(id)}`);
      break;
    }

    const testid = cur.getAttribute("data-testid");
    const aria = cur.getAttribute("aria-label");

    if (testid) {
      s += `[data-testid="${testid}"]`;
    } else if (aria) {
      s += `[aria-label="${aria}"]`;
    } else {
      const parent = cur.parentElement;
      if (parent && cur) {
        const currentNode = cur;
        const same = Array.from(parent.children).filter(
          (c) => c.nodeName === currentNode.nodeName
        );
        if (same.length > 1) {
          s += `:nth-of-type(${same.indexOf(currentNode) + 1})`;
        }
      }
    }

    segs.unshift(s);
    cur = cur.parentElement;
  }

  return segs.join(">");
};

describe("Selector Generation", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("ID-based selector", () => {
    it("should generate selector with id", () => {
      const button = document.createElement("button");
      button.id = "submit-button";
      document.body.appendChild(button);

      const selector = makeSelector(button);

      expect(selector).toContain("#submit-button");
      expect(selector).toContain("button");
    });

    it("should escape special characters in id", () => {
      const div = document.createElement("div");
      div.id = "my:special.id";
      document.body.appendChild(div);

      const selector = makeSelector(div);

      // CSS.escape should handle special characters (escape but not remove)
      expect(selector).toContain("div#");
      expect(selector).toContain("\\:");
      expect(selector).toContain("\\.");
    });

    it("should stop at element with id", () => {
      const container = document.createElement("div");
      container.id = "container";
      const wrapper = document.createElement("div");
      const button = document.createElement("button");

      container.appendChild(wrapper);
      wrapper.appendChild(button);
      document.body.appendChild(container);

      const selector = makeSelector(button);

      // Should stop at container with id
      expect(selector).toContain("#container");
      expect(selector.split(">").length).toBeLessThanOrEqual(3);
    });
  });

  describe("data-testid based selector", () => {
    it("should use data-testid when no id present", () => {
      const button = document.createElement("button");
      button.setAttribute("data-testid", "submit-btn");
      document.body.appendChild(button);

      const selector = makeSelector(button);

      expect(selector).toContain('[data-testid="submit-btn"]');
    });

    it("should prefer id over data-testid", () => {
      const button = document.createElement("button");
      button.id = "btn-id";
      button.setAttribute("data-testid", "btn-testid");
      document.body.appendChild(button);

      const selector = makeSelector(button);

      expect(selector).toContain("#btn-id");
      expect(selector).not.toContain("data-testid");
    });
  });

  describe("aria-label based selector", () => {
    it("should use aria-label when no id or testid", () => {
      const button = document.createElement("button");
      button.setAttribute("aria-label", "Submit form");
      document.body.appendChild(button);

      const selector = makeSelector(button);

      expect(selector).toContain('[aria-label="Submit form"]');
    });

    it("should prefer data-testid over aria-label", () => {
      const button = document.createElement("button");
      button.setAttribute("data-testid", "submit-btn");
      button.setAttribute("aria-label", "Submit");
      document.body.appendChild(button);

      const selector = makeSelector(button);

      expect(selector).toContain("data-testid");
      expect(selector).not.toContain("aria-label");
    });
  });

  describe("Structure-based selector (nth-of-type)", () => {
    it("should use nth-of-type for multiple same-type siblings", () => {
      const container = document.createElement("div");
      const button1 = document.createElement("button");
      const button2 = document.createElement("button");
      const button3 = document.createElement("button");

      container.appendChild(button1);
      container.appendChild(button2);
      container.appendChild(button3);
      document.body.appendChild(container);

      const selector2 = makeSelector(button2);

      expect(selector2).toContain(":nth-of-type(2)");
    });

    it("should not use nth-of-type for single child", () => {
      const container = document.createElement("div");
      const button = document.createElement("button");

      container.appendChild(button);
      document.body.appendChild(container);

      const selector = makeSelector(button);

      expect(selector).not.toContain(":nth-of-type");
    });

    it("should handle mixed sibling types", () => {
      const container = document.createElement("div");
      const span1 = document.createElement("span");
      const button = document.createElement("button");
      const span2 = document.createElement("span");

      container.appendChild(span1);
      container.appendChild(button);
      container.appendChild(span2);
      document.body.appendChild(container);

      const buttonSelector = makeSelector(button);
      const span2Selector = makeSelector(span2);

      // Button is the only button, so no nth-of-type
      expect(buttonSelector).not.toContain(":nth-of-type");

      // span2 is the second span
      expect(span2Selector).toContain(":nth-of-type(2)");
    });
  });

  describe("Depth limitation", () => {
    it("should limit selector depth to 5 levels", () => {
      let current = document.body;
      for (let i = 0; i < 10; i++) {
        const div = document.createElement("div");
        div.className = `level-${i}`;
        current.appendChild(div);
        current = div;
      }

      const deepElement = current;
      const selector = makeSelector(deepElement);

      // Should have at most 5 segments (excluding body)
      const segments = selector.split(">");
      expect(segments.length).toBeLessThanOrEqual(5);
    });

    it("should start from target element going up", () => {
      const container = document.createElement("div");
      container.id = "container";
      const level1 = document.createElement("div");
      const level2 = document.createElement("div");
      const level3 = document.createElement("div");
      const target = document.createElement("button");

      container.appendChild(level1);
      level1.appendChild(level2);
      level2.appendChild(level3);
      level3.appendChild(target);
      document.body.appendChild(container);

      const selector = makeSelector(target);

      // Should include target button and go up to container
      expect(selector).toContain("button");
      expect(selector).toContain("#container");
    });
  });

  describe("Complex nested structures", () => {
    it("should handle complex HTML structure", () => {
      const form = document.createElement("form");
      form.id = "login-form";

      const fieldset = document.createElement("fieldset");
      const div = document.createElement("div");
      div.setAttribute("data-testid", "username-field");

      const input = document.createElement("input");
      input.type = "text";

      div.appendChild(input);
      fieldset.appendChild(div);
      form.appendChild(fieldset);
      document.body.appendChild(form);

      const selector = makeSelector(input);

      expect(selector).toContain("#login-form");
      expect(selector).toContain('[data-testid="username-field"]');
      expect(selector).toContain("input");
    });

    it("should handle table structure", () => {
      const table = document.createElement("table");
      const tbody = document.createElement("tbody");
      const tr1 = document.createElement("tr");
      const tr2 = document.createElement("tr");
      const td1 = document.createElement("td");
      const td2 = document.createElement("td");
      const td3 = document.createElement("td");

      tr1.appendChild(td1);
      tr1.appendChild(td2);
      tr2.appendChild(td3);
      tbody.appendChild(tr1);
      tbody.appendChild(tr2);
      table.appendChild(tbody);
      document.body.appendChild(table);

      const selector = makeSelector(td2);

      expect(selector).toContain("td:nth-of-type(2)");
      expect(selector).toContain("tr:nth-of-type(1)");
    });
  });

  describe("Edge cases", () => {
    it("should handle body as target", () => {
      const selector = makeSelector(document.body as HTMLElement);

      // body는 html의 자식이므로 html>body가 반환됨
      expect(selector).toContain("body");
    });

    it("should handle element with empty id", () => {
      const div = document.createElement("div");
      div.id = "";
      document.body.appendChild(div);

      const selector = makeSelector(div);

      // Empty id should not be used
      expect(selector).not.toContain("#");
    });

    it("should handle special HTML entities", () => {
      const div = document.createElement("div");
      div.setAttribute("data-testid", "test<>&\"'");
      document.body.appendChild(div);

      const selector = makeSelector(div);

      // Should still generate valid selector
      expect(selector).toContain("data-testid");
    });
  });
});

