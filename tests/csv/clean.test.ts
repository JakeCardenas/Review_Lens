import { describe, expect, it } from "vitest";
import { cleanText, looksMisencoded, maskPersonalData } from "@/lib/csv/clean";

describe("cleanText", () => {
  it("removes HTML tags and decodes entities", () => {
    expect(cleanText("<p>Great&nbsp;value &amp; fast<br/>shipping</p>")).toBe("Great value & fast shipping");
  });

  it("collapses whitespace and line breaks", () => {
    expect(cleanText("  Too\r\n\n small \t\t size  ")).toBe("Too small size");
  });

  it("removes control characters but keeps emoji and accents", () => {
    expect(cleanText("Café\u0007 was great 😀")).toBe("Café was great 😀");
  });
});

describe("maskPersonalData", () => {
  it("masks emails", () => {
    expect(maskPersonalData("Email me at jane.doe@example.com please")).toBe("Email me at [email] please");
  });

  it("masks phone numbers", () => {
    expect(maskPersonalData("Call +1 (555) 123-4567 now")).toBe("Call [phone] now");
  });

  it("masks links", () => {
    expect(maskPersonalData("See https://shop.example.com/item?id=3 and www.example.org")).toBe("See [link] and [link]");
  });

  it("masks social handles but not emails twice", () => {
    expect(maskPersonalData("Thanks @maria_k! Write to a@b.co")).toBe("Thanks [handle]! Write to [email]");
  });

  it("masks long account or order numbers", () => {
    expect(maskPersonalData("Order 1234567890123456 was late")).toBe("Order [number] was late");
  });

  it("keeps short numbers and ISO dates", () => {
    expect(maskPersonalData("Took 3 days, arrived 2025-10-03, cost $49.99")).toBe(
      "Took 3 days, arrived 2025-10-03, cost $49.99",
    );
  });
});

describe("looksMisencoded", () => {
  it("spots replacement characters and mojibake", () => {
    expect(looksMisencoded("Caf� was nice")).toBe(true);
    expect(looksMisencoded("Itâ€™s great")).toBe(true);
  });

  it("accepts normal text", () => {
    expect(looksMisencoded("It's great, café")).toBe(false);
  });
});
