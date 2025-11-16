import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

/**
 * 간단한 컴포넌트 테스트 예제
 * 
 * 실제 컴포넌트를 테스트하려면:
 * 1. 테스트할 컴포넌트를 import
 * 2. render()로 컴포넌트 렌더링
 * 3. screen을 사용하여 요소 찾기
 * 4. 기대하는 동작 검증
 */

// 예제 컴포넌트
const SimpleButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => {
  return (
    <button onClick={onClick} data-testid="simple-button">
      {children}
    </button>
  );
};

describe("React Component Testing Example", () => {
  it("should render a button with text", () => {
    render(<SimpleButton onClick={() => {}}>Click Me</SimpleButton>);

    const button = screen.getByTestId("simple-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Click Me");
  });

  it("should call onClick when button is clicked", async () => {
    let clicked = false;
    const handleClick = () => {
      clicked = true;
    };

    render(<SimpleButton onClick={handleClick}>Click Me</SimpleButton>);

    const button = screen.getByTestId("simple-button");
    button.click();

    expect(clicked).toBe(true);
  });
});

// 예제: Flow 타입 검증
describe("Flow Type Example", () => {
  it("should create a valid flow object", () => {
    const flow = {
      id: crypto.randomUUID(),
      title: "Test Flow",
      steps: [],
      createdAt: Date.now(),
    };

    expect(flow.id).toBeDefined();
    expect(typeof flow.id).toBe("string");
    expect(flow.title).toBe("Test Flow");
    expect(Array.isArray(flow.steps)).toBe(true);
    expect(typeof flow.createdAt).toBe("number");
  });
});

// 예제: Step 타입 검증
describe("Step Type Example", () => {
  it("should validate different step types", () => {
    const steps = [
      { type: "click", selector: "#button" },
      { type: "type", selector: "#input", text: "hello" },
      { type: "navigate", url: "https://example.com" },
      { type: "extract", selector: "#result", prop: "innerText" },
    ];

    expect(steps).toHaveLength(4);
    expect(steps[0].type).toBe("click");
    expect(steps[1].type).toBe("type");
    expect(steps[2].type).toBe("navigate");
    expect(steps[3].type).toBe("extract");
  });
});

/**
 * 실제 컴포넌트 테스트 예제 (HoverToolbar를 테스트한다면):
 * 
 * import { HoverToolbar } from "../../entrypoints/content/HoverToolbar";
 * 
 * describe("HoverToolbar", () => {
 *   it("should render toolbar with action buttons", () => {
 *     render(
 *       <HoverToolbar
 *         element={document.createElement("div")}
 *         onAction={() => {}}
 *         onClose={() => {}}
 *       />
 *     );
 * 
 *     expect(screen.getByText("👆 Click")).toBeInTheDocument();
 *     expect(screen.getByText("⌨️ Type")).toBeInTheDocument();
 *     expect(screen.getByText("📄 Extract")).toBeInTheDocument();
 *     expect(screen.getByText("⏱️ Wait")).toBeInTheDocument();
 *   });
 * });
 */

