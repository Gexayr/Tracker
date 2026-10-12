import React from 'react';
import { FiMonitor, FiMoon, FiSun } from 'react-icons/fi';
import { t } from '../i18n';

const META = {
  light: { Icon: FiSun, label: t.themeLight },
  dark: { Icon: FiMoon, label: t.themeDark },
  system: { Icon: FiMonitor, label: t.themeSystem },
};

export function ThemeToggle({ preference, onCycle }) {
  const { Icon, label } = META[preference] || META.system;
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onCycle}
      aria-label={t.themeToggle(label)}
      title={label}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}
