// Switch 开关组件 - NaiveUI 风格
// 圆润设计，激活时 thumb 平滑滑动，支持禁用状态

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export function Switch({ checked, onChange, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      // 轨道：宽 44px 高 24px，激活 indigo，未激活 slate
      className={[
        'relative inline-flex shrink-0 cursor-pointer rounded-full',
        'transition-all duration-200 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2',
        'w-[44px] h-[24px]',
        checked
          ? 'bg-indigo-500'
          : 'bg-slate-300 dark:bg-slate-600',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {/* Thumb 圆点：20x20，有阴影，激活时右移 */}
      <span
        className={[
          'pointer-events-none absolute top-[2px] left-[2px]',
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm',
          'transition-all duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}
