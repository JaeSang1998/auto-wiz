/**
 * Locator Edge Cases 테스트
 * 까다로운 시나리오와 edge case 처리
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  generateRobustLocator,
  findByRole,
  findByCleanText,
  findByFuzzyText,
  findByLocator,
  findByText,
  findByLabelText,
} from "@auto-wiz/dom"; // Note: locatorUtils might not be exported from core index.ts yet? I should check.
import type { ElementLocator } from "@auto-wiz/core";

describe("Locator Edge Cases", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe("Special characters in attributes", () => {
    it("should handle quotes in attributes", () => {
      container.innerHTML = `
        <button data-testid='btn-with-"quotes"'>Button</button>
      `;

      const button = container.querySelector("button") as HTMLElement;
      const locator = generateRobustLocator(button);

      expect(locator.metadata?.testId).toBe('btn-with-"quotes"');
    });

    it("should handle spaces in text content", () => {
      container.innerHTML = `
        <button>   Multiple   Spaces   </button>
      `;

      const button = container.querySelector("button") as HTMLElement;
      const locator = generateRobustLocator(button);

      // 텍스트가 trim되어야 함
      expect(locator.metadata?.text).toBeTruthy();
      expect(locator.metadata?.text?.trim().length).toBeGreaterThan(0);
    });

    it("should handle special CSS characters", () => {
      container.innerHTML = `
        <div id="id:with:colons">Content</div>
      `;

      const div = container.querySelector("div") as HTMLElement;
      const locator = generateRobustLocator(div);

      // CSS.escape should handle special characters
      expect(locator.primary).toBeTruthy();
    });
  });

  describe("Multiple elements with same selector", () => {
    it("should prefer visible element over hidden", () => {
      container.innerHTML = `
        <button data-testid="btn" style="display: none;">Hidden</button>
        <button data-testid="btn-visible">Visible</button>
      `;

      // 첫 번째는 숨겨져 있음
      const locator: ElementLocator = {
        primary: '[data-testid="btn"]',
        fallbacks: [],
      };

      const element = findByLocator(locator);
      // isVisible 체크로 인해 숨겨진 요소는 선택되지 않음
      expect(element).toBeNull();
    });

    it("should handle duplicate text content", () => {
      container.innerHTML = `
        <button>Submit</button>
        <button>Submit</button>
        <button>Submit</button>
      `;

      const elements = findByText("Submit", { exact: true });
      expect(elements.length).toBe(3);
    });

    it("should differentiate by role when text is same", () => {
      container.innerHTML = `
        <button>Action</button>
        <a href="#">Action</a>
      `;

      const buttons = findByText("Action", { role: "button" });
      expect(buttons.length).toBe(1);
      expect(buttons[0]?.tagName).toBe("BUTTON");

      const links = findByText("Action", { role: "link" });
      expect(links.length).toBe(1);
      expect(links[0]?.tagName).toBe("A");
    });
  });

  describe("Empty or missing attributes", () => {
    it("should handle element with no attributes", () => {
      container.innerHTML = `
        <div>Plain div with no attributes</div>
      `;

      const div = container.querySelector("div") as HTMLElement;
      const locator = generateRobustLocator(div);

      // 최소한 구조 기반 selector는 있어야 함
      expect(locator.primary).toBeTruthy();
      // fallback은 중복 제거로 인해 0개일 수 있음
      expect(locator.fallbacks).toBeDefined();
    });

    it("should handle empty text content", () => {
      container.innerHTML = `
        <button data-testid="empty"></button>
      `;

      const button = container.querySelector("button") as HTMLElement;
      const locator = generateRobustLocator(button);

      expect(locator.primary).toBe('[data-testid="empty"]');
      expect(locator.metadata?.text).toBeFalsy();
    });

    it("should handle whitespace-only content", () => {
      container.innerHTML = `
        <div>     </div>
      `;

      const div = container.querySelector("div") as HTMLElement;
      const locator = generateRobustLocator(div);

      // Whitespace만 있는 경우 텍스트 없음으로 처리
      expect(locator.metadata?.text).toBeFalsy();
    });
  });

  describe("Long text content", () => {
    it("should truncate very long text", () => {
      const longText = "A".repeat(200);
      container.innerHTML = `
        <div>${longText}</div>
      `;

      const div = container.querySelector("div") as HTMLElement;
      const locator = generateRobustLocator(div);

      // 50자로 제한되어야 함
      expect(locator.metadata?.text?.length).toBeLessThanOrEqual(50);
    });

    it("should handle multiline text", () => {
      container.innerHTML = `
        <div>
          Line 1
          Line 2
          Line 3
        </div>
      `;

      const div = container.querySelector("div") as HTMLElement;
      const locator = generateRobustLocator(div);

      expect(locator.metadata?.text).toBeTruthy();
    });
  });

  describe("Form elements edge cases", () => {
    it("should handle input without placeholder", () => {
      container.innerHTML = `
        <input type="text" name="field" />
      `;

      const input = container.querySelector("input") as HTMLElement;
      const locator = generateRobustLocator(input);

      // name 속성이 있어야 함
      const allSelectors = [locator.primary, ...locator.fallbacks];
      expect(allSelectors.some((s) => s.includes('name="field"'))).toBe(true);
    });

    it("should handle label without for attribute", () => {
      container.innerHTML = `
        <label>
          Username
          <input type="text" />
        </label>
      `;

      const elements = findByLabelText("Username");
      expect(elements.length).toBe(1);
      expect(elements[0]?.tagName).toBe("INPUT");
    });

    it("should handle label with for attribute", () => {
      container.innerHTML = `
        <label for="email-input">Email</label>
        <input type="text" id="email-input" />
      `;

      const elements = findByLabelText("Email");
      expect(elements.length).toBe(1);
      expect(elements[0]?.id).toBe("email-input");
    });

    it("should handle select with optgroups", () => {
      container.innerHTML = `
        <select data-testid="grouped">
          <optgroup label="Group 1">
            <option value="1">Option 1</option>
          </optgroup>
          <optgroup label="Group 2">
            <option value="2">Option 2</option>
          </optgroup>
        </select>
      `;

      const select = container.querySelector("select") as HTMLElement;
      const locator = generateRobustLocator(select);

      expect(locator.primary).toBe('[data-testid="grouped"]');
    });
  });

  describe("Dynamic and generated IDs/classes", () => {
    it("should skip random hash IDs", () => {
      container.innerHTML = `
        <button id="btn-abc123def456" data-testid="action">Action</button>
      `;

      const button = container.querySelector("button") as HTMLElement;
      const locator = generateRobustLocator(button);

      // data-testid가 primary여야 함 (random ID는 스킵)
      expect(locator.primary).toBe('[data-testid="action"]');
    });

    it("should skip generated class names", () => {
      container.innerHTML = `
        <div class="_abc123def _xyz789" data-testid="content">Content</div>
      `;

      const div = container.querySelector("div") as HTMLElement;
      const locator = generateRobustLocator(div);

      // Underscore로 시작하는 클래스는 스킵되어야 함
      expect(locator.primary).toBe('[data-testid="content"]');
    });
  });

  describe("Nested and complex structures", () => {
    it("should handle deeply nested elements", () => {
      container.innerHTML = `
        <div>
          <div>
            <div>
              <div>
                <div>
                  <button data-testid="deep">Deep Button</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      const button = container.querySelector("button") as HTMLElement;
      const locator = generateRobustLocator(button);

      expect(locator.primary).toBe('[data-testid="deep"]');
    });

    it("should handle table elements", () => {
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th data-testid="header">Header</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-testid="cell">Cell</td>
            </tr>
          </tbody>
        </table>
      `;

      const th = container.querySelector("th") as HTMLElement;
      const td = container.querySelector("td") as HTMLElement;

      const headerLoc = generateRobustLocator(th);
      const cellLoc = generateRobustLocator(td);

      expect(headerLoc.primary).toBe('[data-testid="header"]');
      expect(cellLoc.primary).toBe('[data-testid="cell"]');
    });

    it("should handle list items", () => {
      container.innerHTML = `
        <ul>
          <li data-testid="item-1">Item 1</li>
          <li data-testid="item-2">Item 2</li>
          <li data-testid="item-3">Item 3</li>
        </ul>
      `;

      const li = container.querySelector('li[data-testid="item-2"]') as HTMLElement;
      const locator = generateRobustLocator(li);

      expect(locator.primary).toBe('[data-testid="item-2"]');
    });
  });

  describe("ARIA attributes", () => {
    it("should handle aria-labelledby", () => {
      container.innerHTML = `
        <div id="label-text">Save Changes</div>
        <button aria-labelledby="label-text">💾</button>
      `;

      const button = container.querySelector("button") as HTMLElement;
      const locator = generateRobustLocator(button);

      // aria-labelledby는 metadata에 없지만 fallback에는 있을 수 있음
      expect(locator.primary).toBeTruthy();
    });

    it("should handle aria-describedby", () => {
      container.innerHTML = `
        <div id="help-text">Enter your email address</div>
        <input type="email" aria-describedby="help-text" data-testid="email" />
      `;

      const input = container.querySelector("input") as HTMLElement;
      const locator = generateRobustLocator(input);

      expect(locator.primary).toBe('[data-testid="email"]');
    });

    it("should handle multiple ARIA attributes", () => {
      container.innerHTML = `
        <button 
          aria-label="Close"
          aria-pressed="false"
          aria-expanded="false"
          data-testid="close">
          ×
        </button>
      `;

      const button = container.querySelector("button") as HTMLElement;
      const locator = generateRobustLocator(button);

      expect(locator.metadata?.ariaLabel).toBe("Close");
      expect(locator.primary).toBe('[data-testid="close"]');
    });
  });

  describe("Input types", () => {
    it("should handle checkbox", () => {
      container.innerHTML = `
        <input type="checkbox" data-testid="agree" />
      `;

      const checkbox = container.querySelector("input") as HTMLElement;
      const locator = generateRobustLocator(checkbox);

      expect(locator.primary).toBe('[data-testid="agree"]');
    });

    it("should handle radio buttons", () => {
      container.innerHTML = `
        <input type="radio" name="choice" value="a" data-testid="choice-a" />
        <input type="radio" name="choice" value="b" data-testid="choice-b" />
      `;

      const radio = container.querySelector('input[value="a"]') as HTMLElement;
      const locator = generateRobustLocator(radio);

      expect(locator.primary).toBe('[data-testid="choice-a"]');
    });

    it("should handle file input", () => {
      container.innerHTML = `
        <input type="file" data-testid="upload" />
      `;

      const fileInput = container.querySelector("input") as HTMLElement;
      const locator = generateRobustLocator(fileInput);

      expect(locator.primary).toBe('[data-testid="upload"]');
    });

    it("should handle range input", () => {
      container.innerHTML = `
        <input type="range" min="0" max="100" data-testid="slider" />
      `;

      const slider = container.querySelector("input") as HTMLElement;
      const locator = generateRobustLocator(slider);

      expect(locator.primary).toBe('[data-testid="slider"]');
    });
  });

  describe("SVG and non-standard elements", () => {
    it("should handle SVG elements", () => {
      container.innerHTML = `
        <svg>
          <circle data-testid="circle" cx="50" cy="50" r="40" />
        </svg>
      `;

      const circle = container.querySelector("circle") as unknown as HTMLElement;
      const locator = generateRobustLocator(circle);

      expect(locator.primary).toBe('[data-testid="circle"]');
    });

    it("should handle custom elements", () => {
      container.innerHTML = `
        <custom-element data-testid="custom">Custom Content</custom-element>
      `;

      const custom = container.querySelector("custom-element") as HTMLElement;
      const locator = generateRobustLocator(custom);

      expect(locator.primary).toBe('[data-testid="custom"]');
    });
  });

  describe("Unicode and international text", () => {
    it("should handle Korean text", () => {
      container.innerHTML = `
        <button>제출하기</button>
      `;

      const button = container.querySelector("button") as HTMLElement;
      const locator = generateRobustLocator(button);

      expect(locator.metadata?.text).toBe("제출하기");
    });

    it("should handle emoji", () => {
      container.innerHTML = `
        <button>💾 Save</button>
      `;

      const button = container.querySelector("button") as HTMLElement;
      const locator = generateRobustLocator(button);

      expect(locator.metadata?.text).toContain("💾");
    });

    it("should handle mixed scripts", () => {
      container.innerHTML = `
        <button>Save 저장 保存 сохранить</button>
      `;

      const button = container.querySelector("button") as HTMLElement;
      const locator = generateRobustLocator(button);

      expect(locator.metadata?.text).toBeTruthy();
    });
  });

  describe("Form with multiple similar inputs (sibling label pattern)", () => {
    it("should capture labelText from sibling label element", () => {
      container.innerHTML = `
        <form class="space-y-4">
          <div>
            <label class="block text-sm mb-2">제품명</label>
            <input type="text" class="w-full px-3 py-2 border" value="무선 마우스">
          </div>
          <div>
            <label class="block text-sm mb-2">카테고리</label>
            <input type="text" class="w-full px-3 py-2 border" value="전자제품">
          </div>
          <div>
            <label class="block text-sm mb-2">재고 수량</label>
            <input type="number" class="w-full px-3 py-2 border" value="15">
          </div>
        </form>
      `;

      const inputs = container.querySelectorAll("input");

      // 제품명 input
      const productLocator = generateRobustLocator(inputs[0] as HTMLInputElement);
      expect(productLocator.metadata?.labelText).toBe("제품명");

      // 카테고리 input
      const categoryLocator = generateRobustLocator(inputs[1] as HTMLInputElement);
      expect(categoryLocator.metadata?.labelText).toBe("카테고리");

      // 재고 수량 input
      const stockLocator = generateRobustLocator(inputs[2] as HTMLInputElement);
      expect(stockLocator.metadata?.labelText).toBe("재고 수량");
    });

    it("should capture formContext for inputs in form", () => {
      container.innerHTML = `
        <form class="space-y-4">
          <div>
            <label class="block text-sm mb-2">제품명</label>
            <input type="text" class="w-full px-3 py-2 border">
          </div>
          <div>
            <label class="block text-sm mb-2">카테고리</label>
            <input type="text" class="w-full px-3 py-2 border">
          </div>
          <div>
            <label class="block text-sm mb-2">가격</label>
            <input type="number" class="w-full px-3 py-2 border">
          </div>
        </form>
      `;

      const inputs = container.querySelectorAll("input");

      // 첫 번째 input - fieldIndex 1
      const firstLocator = generateRobustLocator(inputs[0] as HTMLInputElement);
      expect(firstLocator.metadata?.formContext).toBeDefined();
      expect(firstLocator.metadata?.formContext?.fieldIndex).toBe(1);

      // 두 번째 input - fieldIndex 2
      const secondLocator = generateRobustLocator(inputs[1] as HTMLInputElement);
      expect(secondLocator.metadata?.formContext?.fieldIndex).toBe(2);

      // 세 번째 input - fieldIndex 3
      const thirdLocator = generateRobustLocator(inputs[2] as HTMLInputElement);
      expect(thirdLocator.metadata?.formContext?.fieldIndex).toBe(3);
    });

    it("should find correct input using labelText metadata when multiple inputs match", () => {
      container.innerHTML = `
        <form class="space-y-4">
          <div>
            <label class="block text-sm mb-2">제품명</label>
            <input type="text" class="w-full px-3 py-2 border">
          </div>
          <div>
            <label class="block text-sm mb-2">카테고리</label>
            <input type="text" class="w-full px-3 py-2 border">
          </div>
        </form>
      `;

      const inputs = container.querySelectorAll("input");
      const categoryInput = inputs[1] as HTMLInputElement;

      // 카테고리 input의 locator 생성
      const locator = generateRobustLocator(categoryInput);

      // findByLocator로 정확한 요소 찾기
      const foundElement = findByLocator(locator);

      expect(foundElement).toBe(categoryInput);
    });

    it("should differentiate inputs in same form by labelText", () => {
      container.innerHTML = `
        <form id="product-form">
          <div>
            <label>이름</label>
            <input type="text" class="input-field">
          </div>
          <div>
            <label>설명</label>
            <input type="text" class="input-field">
          </div>
          <div>
            <label>가격</label>
            <input type="text" class="input-field">
          </div>
        </form>
      `;

      const inputs = container.querySelectorAll("input");

      // 각 input의 locator 생성
      const nameLocator = generateRobustLocator(inputs[0] as HTMLInputElement);
      const descLocator = generateRobustLocator(inputs[1] as HTMLInputElement);
      const priceLocator = generateRobustLocator(inputs[2] as HTMLInputElement);

      // labelText로 구분되어야 함
      expect(nameLocator.metadata?.labelText).toBe("이름");
      expect(descLocator.metadata?.labelText).toBe("설명");
      expect(priceLocator.metadata?.labelText).toBe("가격");

      // 각 locator로 올바른 input을 찾아야 함
      expect(findByLocator(nameLocator)).toBe(inputs[0]);
      expect(findByLocator(descLocator)).toBe(inputs[1]);
      expect(findByLocator(priceLocator)).toBe(inputs[2]);
    });

    it("should handle form with mixed input types", () => {
      container.innerHTML = `
        <form class="product-form">
          <div>
            <label>제품명</label>
            <input type="text">
          </div>
          <div>
            <label>수량</label>
            <input type="number">
          </div>
          <div>
            <label>메모</label>
            <textarea></textarea>
          </div>
          <div>
            <label>카테고리</label>
            <select>
              <option value="1">전자제품</option>
              <option value="2">의류</option>
            </select>
          </div>
        </form>
      `;

      const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;
      const numberInput = container.querySelector('input[type="number"]') as HTMLInputElement;
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      const select = container.querySelector("select") as HTMLSelectElement;

      const textLocator = generateRobustLocator(textInput);
      const numberLocator = generateRobustLocator(numberInput);
      const textareaLocator = generateRobustLocator(textarea);
      const selectLocator = generateRobustLocator(select);

      expect(textLocator.metadata?.labelText).toBe("제품명");
      expect(numberLocator.metadata?.labelText).toBe("수량");
      expect(textareaLocator.metadata?.labelText).toBe("메모");
      expect(selectLocator.metadata?.labelText).toBe("카테고리");

      // formContext도 있어야 함
      expect(textLocator.metadata?.formContext?.fieldIndex).toBe(1);
      expect(numberLocator.metadata?.formContext?.fieldIndex).toBe(2);
      expect(textareaLocator.metadata?.formContext?.fieldIndex).toBe(3);
      expect(selectLocator.metadata?.formContext?.fieldIndex).toBe(4);
    });

    it("should use formContext when labelText is not available", () => {
      container.innerHTML = `
        <form id="simple-form">
          <input type="text" placeholder="First">
          <input type="text" placeholder="Second">
          <input type="text" placeholder="Third">
        </form>
      `;

      const inputs = container.querySelectorAll("input");

      // placeholder가 있는 경우
      const firstLocator = generateRobustLocator(inputs[0] as HTMLInputElement);
      const secondLocator = generateRobustLocator(inputs[1] as HTMLInputElement);

      // labelText는 없지만 formContext는 있어야 함
      expect(firstLocator.metadata?.labelText).toBeFalsy();
      expect(firstLocator.metadata?.formContext?.fieldIndex).toBe(1);

      expect(secondLocator.metadata?.labelText).toBeFalsy();
      expect(secondLocator.metadata?.formContext?.fieldIndex).toBe(2);

      // placeholder로 구분 가능
      expect(firstLocator.metadata?.placeholder).toBe("First");
      expect(secondLocator.metadata?.placeholder).toBe("Second");
    });
  });
});

