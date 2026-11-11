import {
  isMacKeyboardPlatform,
  matchesAppShortcut,
  type AppShortcut,
  type AppShortcutInput,
} from "@bb/domain";
import { useEffectiveAppShortcut } from "@/components/commands/AppCommandProvider";
import {
  browserPlatform,
  presentAppShortcut,
  type AppShortcutPresentation,
} from "@/lib/app-keybindings";

const DEFAULT_MODIFIER_SUBMIT_SHORTCUT: AppShortcut = {
  key: "Enter",
  mod: true,
  meta: false,
  control: false,
  alt: false,
  shift: false,
};

export function useModifierSubmitShortcut(): AppShortcut | null {
  return useEffectiveAppShortcut(
    "composer.submitSecondary",
    DEFAULT_MODIFIER_SUBMIT_SHORTCUT,
  );
}

export function presentModifierSubmitShortcut(
  shortcut: AppShortcut | null,
): AppShortcutPresentation | null {
  return shortcut === null
    ? null
    : presentAppShortcut(shortcut, browserPlatform());
}

export function matchesModifierSubmitShortcut(
  input: AppShortcutInput,
  shortcut: AppShortcut | null,
): boolean {
  if (shortcut === null) return false;
  const isMac = isMacKeyboardPlatform(browserPlatform());
  if (matchesAppShortcut(input, shortcut, isMac)) return true;
  return (
    shortcut.mod &&
    !shortcut.meta &&
    !shortcut.control &&
    matchesAppShortcut(input, shortcut, !isMac)
  );
}
