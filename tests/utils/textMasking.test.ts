import { describe, it, expect } from "vitest";

/**
 * 텍스트 마스킹 유틸리티 테스트
 * 
 * 보안을 위한 텍스트 마스킹 로직을 테스트합니다.
 */

const maskText = (text: string): string => {
  return "*".repeat(text.length);
};

const unmaskText = (originalText: string): string => {
  return originalText;
};

describe("Text Masking", () => {
  describe("maskText", () => {
    it("should mask simple text", () => {
      const text = "password";
      const masked = maskText(text);

      expect(masked).toBe("********");
      expect(masked.length).toBe(text.length);
    });

    it("should mask empty string", () => {
      const text = "";
      const masked = maskText(text);

      expect(masked).toBe("");
    });

    it("should mask single character", () => {
      const text = "a";
      const masked = maskText(text);

      expect(masked).toBe("*");
    });

    it("should mask long text", () => {
      const text = "this is a very long password with spaces";
      const masked = maskText(text);

      expect(masked.length).toBe(text.length);
      expect(masked).toBe("*".repeat(text.length));
    });

    it("should mask numbers", () => {
      const text = "123456";
      const masked = maskText(text);

      expect(masked).toBe("******");
    });

    it("should mask special characters", () => {
      const text = "p@ssw0rd!";
      const masked = maskText(text);

      expect(masked).toBe("*********");
    });

    it("should mask unicode characters", () => {
      const text = "한글비밀번호";
      const masked = maskText(text);

      expect(masked.length).toBe(text.length);
    });

    it("should mask emoji", () => {
      const text = "😀🎉🔒";
      const masked = maskText(text);

      expect(masked.length).toBe(text.length);
    });
  });

  describe("unmaskText", () => {
    it("should preserve original text", () => {
      const originalText = "secret123";
      const preserved = unmaskText(originalText);

      expect(preserved).toBe("secret123");
    });

    it("should handle empty string", () => {
      const originalText = "";
      const preserved = unmaskText(originalText);

      expect(preserved).toBe("");
    });
  });

  describe("Step with masked text", () => {
    it("should store both masked and original text", () => {
      const originalText = "myPassword123";
      const maskedText = maskText(originalText);

      const step = {
        type: "type",
        selector: "#password",
        text: maskedText,
        originalText: originalText,
      };

      expect(step.text).toBe("*************");
      expect(step.originalText).toBe("myPassword123");
    });

    it("should use originalText for replay", () => {
      const step = {
        type: "type",
        selector: "#password",
        text: "********",
        originalText: "password",
      };

      const textForReplay = step.originalText || step.text;

      expect(textForReplay).toBe("password");
    });

    it("should fallback to masked text if no original", () => {
      const step = {
        type: "type",
        selector: "#username",
        text: "john_doe",
      };

      const textForReplay = (step as any).originalText || step.text;

      expect(textForReplay).toBe("john_doe");
    });
  });

  describe("Security considerations", () => {
    it("should not expose original text in logs", () => {
      const originalText = "secretPassword";
      const maskedText = maskText(originalText);

      // 로그에는 마스킹된 텍스트만 표시되어야 함
      const logMessage = `Typing: ${maskedText}`;

      expect(logMessage).not.toContain("secret");
      expect(logMessage).toContain("**************");
    });

    it("should mask credit card numbers", () => {
      const ccNumber = "1234567890123456";
      const masked = maskText(ccNumber);

      expect(masked).toBe("****************");
      expect(masked).not.toContain("1234");
    });

    it("should mask email addresses", () => {
      const email = "user@example.com";
      const masked = maskText(email);

      expect(masked.length).toBe(email.length);
      expect(masked).not.toContain("@");
      expect(masked).not.toContain("example");
    });

    it("should mask API keys", () => {
      const apiKey = "sk-1234567890abcdef";
      const masked = maskText(apiKey);

      expect(masked).toBe("*".repeat(apiKey.length));
      expect(masked).not.toContain("sk-");
    });
  });

  describe("Display formatting", () => {
    it("should show masked text in UI", () => {
      const originalText = "password123";
      const maskedForDisplay = maskText(originalText);

      expect(maskedForDisplay).toBe("***********");
    });

    it("should show character count hint", () => {
      const originalText = "password";
      const maskedText = maskText(originalText);
      const hint = `${maskedText} (${maskedText.length} characters)`;

      expect(hint).toBe("******** (8 characters)");
    });

    it("should format for step description", () => {
      const selector = "#password";
      const maskedText = maskText("secret");
      const description = `Type "${maskedText}" into ${selector}`;

      expect(description).toBe('Type "******" into #password');
    });
  });

  describe("Edge cases", () => {
    it("should handle whitespace", () => {
      const text = "   spaces   ";
      const masked = maskText(text);

      expect(masked.length).toBe(text.length);
      expect(masked).toBe("************");
    });

    it("should handle newlines", () => {
      const text = "line1\nline2";
      const masked = maskText(text);

      expect(masked.length).toBe(text.length);
    });

    it("should handle tabs", () => {
      const text = "tab\there";
      const masked = maskText(text);

      expect(masked.length).toBe(text.length);
    });

    it("should handle null/undefined gracefully", () => {
      const nullText = null;
      const undefinedText = undefined;

      const maskedNull = nullText ? maskText(nullText) : "";
      const maskedUndefined = undefinedText ? maskText(undefinedText) : "";

      expect(maskedNull).toBe("");
      expect(maskedUndefined).toBe("");
    });
  });

  describe("Password field detection", () => {
    it("should identify password input fields", () => {
      const isPasswordField = (type: string) => {
        return type === "password";
      };

      expect(isPasswordField("password")).toBe(true);
      expect(isPasswordField("text")).toBe(false);
      expect(isPasswordField("email")).toBe(false);
    });

    it("should identify password-like selectors", () => {
      const selectors = [
        "#password",
        "#user-password",
        'input[name="password"]',
        ".password-field",
      ];

      const isPasswordRelated = (selector: string) => {
        return selector.toLowerCase().includes("password");
      };

      selectors.forEach((selector) => {
        expect(isPasswordRelated(selector)).toBe(true);
      });
    });

    it("should auto-mask password fields", () => {
      const input = {
        type: "password",
        value: "secretPass",
      };

      const shouldMask = input.type === "password";
      const text = shouldMask ? maskText(input.value) : input.value;

      expect(text).toBe("**********");
    });
  });

  describe("Unmasking for execution", () => {
    it("should unmask text for actual typing", () => {
      const step = {
        type: "type",
        selector: "#password",
        text: "********",
        originalText: "password",
      };

      const actualTextToType = step.originalText || step.text;

      expect(actualTextToType).toBe("password");
    });

    it("should handle missing originalText", () => {
      const step = {
        type: "type",
        selector: "#username",
        text: "john",
      };

      const actualTextToType = (step as any).originalText || step.text;

      expect(actualTextToType).toBe("john");
    });
  });

  describe("Partial masking (optional feature)", () => {
    it("should show first and last characters", () => {
      const partialMask = (text: string, showCount: number = 2) => {
        if (text.length <= showCount * 2) {
          return maskText(text);
        }
        const first = text.substring(0, showCount);
        const last = text.substring(text.length - showCount);
        const middle = "*".repeat(text.length - showCount * 2);
        return `${first}${middle}${last}`;
      };

      expect(partialMask("password123", 2)).toBe("pa*******23");
      expect(partialMask("abc", 2)).toBe("***");
    });

    it("should mask credit card with last 4 digits", () => {
      const maskCreditCard = (cc: string) => {
        if (cc.length < 4) return maskText(cc);
        return "*".repeat(cc.length - 4) + cc.slice(-4);
      };

      expect(maskCreditCard("1234567890123456")).toBe("************3456");
    });
  });
});

