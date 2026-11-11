import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppShortcut } from "@bb/domain";
import {
  matchesModifierSubmitShortcut,
  presentModifierSubmitShortcut,
} from "./modifier-submit-shortcut";

const NO_MODIFIERS = {
  mod: false,
  meta: false,
  control: false,
  alt: false,
  shift: false,
};
const MOD_ENTER: AppShortcut = { ...NO_MODIFIERS, key: "Enter", mod: true };

function enter(modifiers: Partial<KeyboardEventInit> = {}) {
  return {
    key: "Enter",
    code: "Enter",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...modifiers,
  };
}

function mockPlatform(platform: string) {
  vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
}

describe("modifier submit shortcut", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["Linux x86_64", "Ctrl + Enter", "Control+Enter"],
    ["MacIntel", "⌘ Enter", "Meta+Enter"],
  ])("presents Mod+Enter on %s", (platform, label, ariaKeyshortcuts) => {
    mockPlatform(platform);
    expect(presentModifierSubmitShortcut(MOD_ENTER)).toEqual({
      label,
      ariaKeyshortcuts,
    });
  });

  it("presents nothing for an unbound shortcut", () => {
    expect(presentModifierSubmitShortcut(null)).toBeNull();
  });

  it.each(["Linux x86_64", "MacIntel"])(
    "accepts Control or Command for Mod on %s, without extra modifiers",
    (platform) => {
      mockPlatform(platform);
      expect(
        matchesModifierSubmitShortcut(enter({ ctrlKey: true }), MOD_ENTER),
      ).toBe(true);
      expect(
        matchesModifierSubmitShortcut(enter({ metaKey: true }), MOD_ENTER),
      ).toBe(true);
      expect(matchesModifierSubmitShortcut(enter(), MOD_ENTER)).toBe(false);
      expect(
        matchesModifierSubmitShortcut(
          enter({ ctrlKey: true, shiftKey: true }),
          MOD_ENTER,
        ),
      ).toBe(false);
      expect(
        matchesModifierSubmitShortcut(
          enter({ metaKey: true, altKey: true }),
          MOD_ENTER,
        ),
      ).toBe(false);
    },
  );

  it("matches a rebound shortcut exactly and nothing when unbound", () => {
    mockPlatform("MacIntel");
    const control: AppShortcut = {
      ...NO_MODIFIERS,
      key: "Enter",
      control: true,
    };
    expect(
      matchesModifierSubmitShortcut(enter({ ctrlKey: true }), control),
    ).toBe(true);
    expect(
      matchesModifierSubmitShortcut(enter({ metaKey: true }), control),
    ).toBe(false);
    expect(matchesModifierSubmitShortcut(enter({ ctrlKey: true }), null)).toBe(
      false,
    );
  });
});
