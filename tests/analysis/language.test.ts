import { describe, expect, it } from "vitest";
import { detectLanguage } from "@/lib/analysis/language";

describe("detectLanguage", () => {
  it("accepts English reviews", () => {
    expect(detectLanguage("The kettle arrived quickly and works perfectly, very happy with it.")).toMatchObject({
      status: "supported",
      code: "eng",
    });
  });

  it("marks another language as unsupported and names it", () => {
    expect(detectLanguage("El producto llegó tarde y la caja estaba rota, estoy muy decepcionado con la tienda.")).toEqual({
      status: "unsupported",
      code: "spa",
      name: "Spanish",
    });
  });

  it("marks reviews that mix English with another language", () => {
    expect(detectLanguage("Great product pero mabagal ang delivery at sira ang kahon pagdating.").status).toBe("mixed");
  });

  it("cannot tell the language of very short text", () => {
    expect(detectLanguage("Love it!").status).toBe("undetermined");
    expect(detectLanguage("").status).toBe("undetermined");
  });
});
