import { ToggleGroup, ToggleGroupItem } from '@asnewyla/toggle-group';
import { MODES, type Mode } from './color-mode';
import { chooseMode } from './color-mode-action';

const LABELS: Record<Mode, string> = { system: 'System', light: 'Light', dark: 'Dark' };

// A plain form whose items submit mode=<value>, so the choice works before JavaScript loads.
// Given only `value`, the group shows the saved mode and the server moves it.
export function ModeToggle({ mode }: { mode: Mode }) {
  return (
    <form action={chooseMode}>
      <ToggleGroup aria-label="Colour scheme" name="mode" value={mode} size="sm">
        {MODES.map((option) => (
          <ToggleGroupItem key={option} type="submit" value={option}>
            {LABELS[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </form>
  );
}
