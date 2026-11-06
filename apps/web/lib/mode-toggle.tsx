import { MODES, type Mode } from './color-mode';
import { chooseMode } from './color-mode-action';
import { Button, Group } from './ui';

const LABELS: Record<Mode, string> = { system: 'System', light: 'Light', dark: 'Dark' };

// A plain form, so the choice works before JavaScript loads.
export function ModeToggle({ mode }: { mode: Mode }) {
  return (
    <form action={chooseMode}>
      <Group gap="sm" role="group" aria-label="Colour scheme">
        {MODES.map((option) => (
          <Button
            key={option}
            type="submit"
            name="mode"
            value={option}
            size="sm"
            variant={option === mode ? 'primary' : 'secondary'}
            aria-pressed={option === mode}
          >
            {LABELS[option]}
          </Button>
        ))}
      </Group>
    </form>
  );
}
