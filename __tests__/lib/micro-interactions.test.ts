/**
 * Tests for lib/micro-interactions – validates animation configs
 * and entrance delay calculation.
 */
import {
  MicroInteractions,
  getEntranceDelay,
} from "~/lib/micro-interactions";

describe("MicroInteractions", () => {
  it("listItemEntrance returns spring config", () => {
    const config = MicroInteractions.listItemEntrance(0);
    expect(config.type).toBe("spring");
    expect(config.damping).toBe(15);
    expect(config.stiffness).toBe(150);
    expect(config.mass).toBe(1);
  });

  it("buttonPress returns spring config", () => {
    const config = MicroInteractions.buttonPress();
    expect(config.type).toBe("spring");
    expect(config.damping).toBe(10);
    expect(config.stiffness).toBe(400);
  });

  it("stateChange returns timing config", () => {
    const config = MicroInteractions.stateChange();
    expect(config.type).toBe("timing");
    expect(config.duration).toBe(200);
  });

  it("cardExpand returns spring config", () => {
    const config = MicroInteractions.cardExpand();
    expect(config.type).toBe("spring");
    expect(config.damping).toBe(20);
    expect(config.stiffness).toBe(200);
  });

  it("fadeIn returns timing config", () => {
    const config = MicroInteractions.fadeIn();
    expect(config.type).toBe("timing");
    expect(config.duration).toBe(300);
  });

  it("fadeIn accepts optional delay parameter", () => {
    const config = MicroInteractions.fadeIn(100);
    expect(config.type).toBe("timing");
    expect(config.duration).toBe(300);
  });

  it("scaleIn returns spring config", () => {
    const config = MicroInteractions.scaleIn();
    expect(config.type).toBe("spring");
    expect(config.damping).toBe(12);
    expect(config.stiffness).toBe(200);
  });
});

describe("getEntranceDelay", () => {
  it("returns 0 for index 0", () => {
    expect(getEntranceDelay(0)).toBe(0);
  });

  it("returns baseDelay * index for small indices", () => {
    expect(getEntranceDelay(3)).toBe(150);
    expect(getEntranceDelay(5)).toBe(250);
  });

  it("caps at index 10", () => {
    expect(getEntranceDelay(15)).toBe(500);
    expect(getEntranceDelay(100)).toBe(500);
  });

  it("uses custom baseDelay", () => {
    expect(getEntranceDelay(3, 100)).toBe(300);
    expect(getEntranceDelay(15, 100)).toBe(1000);
  });
});
