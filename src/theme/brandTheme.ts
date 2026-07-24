import { themes } from '@clickhouse/click-ui';

/**
 * click-ui ships its own design-token tree (`themes.dark`/`themes.light`)
 * consumed via styled-components' ThemeProvider, entirely separate from this
 * app's `--cui-color-*` CSS variables in styles.css. `ClickUIProvider` only
 * accepts a theme *name* ("dark"/"light") with no override hook, and — worse
 * — click-ui bundles its own nested copy of styled-components
 * (`@clickhouse/click-ui/node_modules/styled-components`, a different
 * version than this app's top-level one), so nesting a second
 * styled-components `ThemeProvider` around app content has no effect: it's a
 * different React Context instance than the one click-ui's internals read
 * from. Since `themes` is a plain, mutable, module-singleton data object
 * shared regardless of which styled-components copy renders it, patching it
 * in place — once, at import time — reaches click-ui's internals correctly
 * where a competing context provider could not.
 *
 * Paths below are every token that carries click-ui's own brand/accent color
 * (found by searching the shipped dark theme for its brand hex, `#faff69`),
 * excluding the three gradient-valued "promotion card" paths.
 */
const ACCENT_PATHS = [
  'click.accordion.color.link.label.default',
  'click.accordion.color.link.label.active',
  'click.accordion.color.link.icon.default',
  'click.accordion.color.link.icon.active',
  'click.button.basic.color.primary.background.default',
  'click.button.basic.color.primary.stroke.default',
  'click.button.basic.color.primary.stroke.hover',
  'click.button.basic.color.empty.text.default',
  'click.button.basic.color.empty.text.active',
  'click.button.iconButton.color.secondary.background.default',
  'click.button.split.primary.background.main.default',
  'click.card.secondary.color.link.hover',
  'click.card.primary.color.stroke.active',
  'click.card.horizontal.default.color.stroke.active',
  'click.card.horizontal.muted.color.stroke.active',
  'click.card.promotion.color.icon.default',
  'click.card.promotion.color.icon.hover',
  'click.card.promotion.color.icon.active',
  'click.card.promotion.color.stroke.focus',
  'click.checkbox.color.variations.default.background.active',
  'click.checkbox.color.variations.default.stroke.active',
  'click.checkbox.color.variations.var4.stroke.default',
  'click.checkbox.color.background.active',
  'click.checkbox.color.stroke.active',
  'click.datePicker.dateOption.color.background.active',
  'click.datePicker.dateOption.color.stroke.hover',
  'click.datePicker.dateOption.color.stroke.active',
  'click.field.color.stroke.active',
  'click.genericMenu.item.color.default.stroke.focus',
  'click.genericMenu.item.color.danger.stroke.focus',
  'click.grid.body.cell.color.stroke.selectDirect',
  'click.radio.color.background.active',
  'click.sidebar.main.navigation.dragControl.separator.color.default',
  'click.sidebar.sqlSidebar.navigation.dragControl.separator.color.default',
  'click.switch.color.background.active',
  'click.switch.color.stroke.active',
  'click.table.row.color.link.default',
  'click.tabs.basic.color.stroke.active',
  'click.dashboards.chartWidget.stroke.selected',
  'click.dashboards.chartWidget.color.stroke.selected',
  'click.dashboards.chartWidget.color.icon.selected',
  'click.global.color.text.link.default',
  'click.global.color.accent.default',
  'click.global.color.outline.default',
  'palette.brand.300',
  'global.color.text.link.default',
  'global.color.accent.default',
  'global.color.outline.default',
  'global.color.iconButton.badge.background',
] as const;

const HEX_PATTERN = /#[0-9a-fA-F]{3,8}/;

function getAtPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, key) => {
    if (cur === null || typeof cur !== 'object') {
      return undefined;
    }
    return (cur as Record<string, unknown>)[key];
  }, obj);
}

function setAtPath(obj: Record<string, unknown>, path: string, value: string): void {
  const keys = path.split('.');
  const last = keys.pop();
  if (!last) {
    return;
  }
  const parent = keys.reduce<Record<string, unknown>>(
    (cur, key) => cur[key] as Record<string, unknown>,
    obj,
  );
  parent[last] = value;
}

function patchInPlace(theme: Record<string, unknown>, accentHex: string): void {
  for (const path of ACCENT_PATHS) {
    const current = getAtPath(theme, path);
    if (typeof current !== 'string') {
      continue;
    }
    setAtPath(theme, path, current.replace(HEX_PATTERN, accentHex));
  }
}

patchInPlace(themes.dark as unknown as Record<string, unknown>, '#fba24d');
patchInPlace(themes.light as unknown as Record<string, unknown>, '#f5871f');
