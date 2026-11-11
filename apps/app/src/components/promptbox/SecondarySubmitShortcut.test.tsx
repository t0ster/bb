// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultAppSettings, type AppShortcut } from "@bb/domain";
import { AppCommandProvider } from "@/components/commands/AppCommandProvider";
import { registerComposerPlugin } from "@/test/fixtures/composer-plugin";
import { ComposerTestProviders } from "@/test/fixtures/composer-test-providers";
import { testTypeaheadConfig } from "@/test/fixtures/composer-search";
import { ComposerBox } from "./ComposerBox";

const NO_MODIFIERS = {
  mod: false,
  meta: false,
  control: false,
  alt: false,
  shift: false,
};
const MOD_ENTER: AppShortcut = { ...NO_MODIFIERS, key: "Enter", mod: true };
const ALT_ENTER: AppShortcut = { ...NO_MODIFIERS, key: "Enter", alt: true };

const config = vi.hoisted(() => ({
  loaded: true,
  secondarySubmit: null as AppShortcut | null,
}));

vi.mock("@/hooks/queries/system-queries", () => ({
  useSystemConfig: () => ({
    data: config.loaded
      ? {
          generalSettings: { ...defaultAppSettings },
          keybindings:
            config.secondarySubmit === null
              ? []
              : [
                  {
                    command: "composer.submitSecondary" as const,
                    desktopOnly: false,
                    shortcut: config.secondarySubmit,
                    when: {
                      all: [
                        "mainSurface" as const,
                        "promptAvailable" as const,
                        "editableFocus" as const,
                      ],
                      none: [
                        "terminalFocus" as const,
                        "browserFocus" as const,
                        "questionFocus" as const,
                      ],
                    },
                  },
                ],
        }
      : undefined,
  }),
}));

vi.mock("@/lib/bb-desktop", () => ({
  getBbDesktopInfo: () => null,
}));

function renderComposer({
  swapSubmitActions = false,
}: { swapSubmitActions?: boolean } = {}) {
  const onSubmit = vi.fn();
  const onModifierSubmit = vi.fn();
  render(
    <ComposerTestProviders>
      <AppCommandProvider>
        <ComposerBox
          surface="thread"
          value="Follow up"
          mentionRanges={[]}
          onChange={vi.fn()}
          onSubmit={onSubmit}
          submission={{ onModifierSubmit, swapSubmitActions }}
          mentionMenuPlacement="bottom"
          typeahead={testTypeaheadConfig()}
        />
      </AppCommandProvider>
    </ComposerTestProviders>,
  );
  const editor = document.querySelector<HTMLElement>(
    "[data-promptbox-editor-content] [contenteditable]",
  );
  if (editor === null) throw new Error("prompt editor did not render");
  editor.focus();
  const press = (init: KeyboardEventInit) => {
    onSubmit.mockClear();
    onModifierSubmit.mockClear();
    editor.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter",
        ...init,
      }),
    );
    if (
      onSubmit.mock.calls.length > 0 &&
      onModifierSubmit.mock.calls.length > 0
    )
      throw new Error("both actions ran");
    if (onSubmit.mock.calls.length > 0) return "enter";
    if (onModifierSubmit.mock.calls.length > 0) return "modifier";
    return "none";
  };
  return { editor, press };
}

beforeEach(async () => {
  vi.spyOn(navigator, "platform", "get").mockReturnValue("Linux x86_64");
  await registerComposerPlugin();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  config.loaded = true;
  config.secondarySubmit = null;
});

describe("composer secondary send shortcut", () => {
  it("runs the modifier action on the default Mod+Enter with either Ctrl or Cmd", () => {
    config.secondarySubmit = MOD_ENTER;
    const { editor, press } = renderComposer();

    expect(editor.getAttribute("aria-keyshortcuts")).toBe("Control+Enter");
    expect(press({ ctrlKey: true })).toBe("modifier");
    expect(press({ metaKey: true })).toBe("modifier");
    expect(press({ altKey: true })).toBe("enter");
    expect(press({ ctrlKey: true, shiftKey: true })).toBe("none");
    expect(press({})).toBe("enter");
  });

  it("keeps Mod+Enter until keyboard settings load", () => {
    config.loaded = false;
    const { editor, press } = renderComposer();

    expect(editor.getAttribute("aria-keyshortcuts")).toBe("Control+Enter");
    expect(press({ ctrlKey: true })).toBe("modifier");
  });

  it("moves the modifier action to a rebound Alt+Enter and lets Mod+Enter act as Enter", () => {
    config.secondarySubmit = ALT_ENTER;
    const { editor, press } = renderComposer();

    expect(editor.getAttribute("aria-keyshortcuts")).toBe("Alt+Enter");
    expect(press({ altKey: true })).toBe("modifier");
    expect(press({ ctrlKey: true })).toBe("enter");
    expect(press({ metaKey: true })).toBe("enter");
    expect(press({ shiftKey: true })).toBe("none");
  });

  it("leaves no key for the modifier action when the shortcut is disabled", () => {
    const { editor, press } = renderComposer();

    expect(editor.hasAttribute("aria-keyshortcuts")).toBe(false);
    expect(press({ ctrlKey: true })).toBe("enter");
    expect(press({ altKey: true })).toBe("enter");
  });

  it("keeps the steer-on-Enter swap on a rebound shortcut", () => {
    config.secondarySubmit = ALT_ENTER;
    const { press } = renderComposer({ swapSubmitActions: true });

    expect(press({})).toBe("modifier");
    expect(press({ altKey: true })).toBe("enter");
  });
});
