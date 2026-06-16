// @spendlio/ui — design system barrel.
// Components are token-driven; the token stylesheet ships separately:
//   import '@spendlio/ui/styles.css'   (once, in the web app root layout)

export { cn } from './cn';
export type { ClassValue } from './cn';

export { formatWhole, capitalize } from './format';

export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

export { Divider } from './components/Divider';
export type { DividerProps } from './components/Divider';

export { IconButton } from './components/IconButton';
export type { IconButtonProps, IconButtonVariant, IconButtonSize } from './components/IconButton';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Card } from './components/Card';
export type { CardProps } from './components/Card';

export { Badge } from './components/Badge';
export type { BadgeProps, BadgeTone } from './components/Badge';

export { Avatar, AvatarGroup } from './components/Avatar';
export type { AvatarProps, AvatarGroupProps, AvatarSize } from './components/Avatar';

export { MoneyAmount, formatSignedMoney } from './components/MoneyAmount';
export type { MoneyAmountProps } from './components/MoneyAmount';

export { CategoryIcon, categoryColor } from './components/CategoryIcon';
export type { CategoryIconProps, CategoryIconSize } from './components/CategoryIcon';

export { TransactionRow } from './components/TransactionRow';
export type { TransactionRowProps } from './components/TransactionRow';

export { ProgressBar } from './components/ProgressBar';
export type { ProgressBarProps } from './components/ProgressBar';

export { Stat } from './components/Stat';
export type { StatProps } from './components/Stat';

export { Toast } from './components/Toast';
export type { ToastProps, ToastTone } from './components/Toast';

export { SegmentedControl } from './components/SegmentedControl';
export type { SegmentedControlProps, SegmentedOption } from './components/SegmentedControl';

export { Tag } from './components/Tag';
export type { TagProps } from './components/Tag';

export { Select } from './components/Select';
export type { SelectProps, SelectOption } from './components/Select';

export { Switch } from './components/Switch';
export type { SwitchProps } from './components/Switch';

export { Checkbox } from './components/Checkbox';
export type { CheckboxProps } from './components/Checkbox';

export { AmountInput } from './components/AmountInput';
export type { AmountInputProps, AmountInputSize } from './components/AmountInput';

export { EmptyState } from './components/EmptyState';
export type { EmptyStateProps } from './components/EmptyState';

export { Modal } from './components/Modal';
export type { ModalProps } from './components/Modal';

export { Skeleton, SkeletonRow } from './components/Skeleton';
export type { SkeletonProps } from './components/Skeleton';
