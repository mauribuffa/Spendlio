// @spendlio/ui — design system barrel.
// Components are token-driven; the token stylesheet ships separately:
//   import '@spendlio/ui/styles.css'   (once, in the web app root layout)

export { cn } from './cn';
export type { ClassValue } from './cn';

export { formatWhole, capitalize } from './format';

export { Button } from './components/button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/button';

export { Divider } from './components/divider';
export type { DividerProps } from './components/divider';

export { IconButton } from './components/icon-button';
export type { IconButtonProps, IconButtonVariant, IconButtonSize } from './components/icon-button';

export { Input } from './components/input';
export type { InputProps } from './components/input';

export { Card } from './components/card';
export type { CardProps } from './components/card';

export { Badge } from './components/badge';
export type { BadgeProps, BadgeTone } from './components/badge';

export { Avatar, AvatarGroup } from './components/avatar';
export type { AvatarProps, AvatarGroupProps, AvatarSize } from './components/avatar';

export { MoneyAmount, formatSignedMoney } from './components/money-amount';
export type { MoneyAmountProps } from './components/money-amount';

export { CategoryIcon, categoryColor } from './components/category-icon';
export type { CategoryIconProps, CategoryIconSize } from './components/category-icon';

export { TransactionRow } from './components/transaction-row';
export type { TransactionRowProps } from './components/transaction-row';

export { ProgressBar } from './components/progress-bar';
export type { ProgressBarProps } from './components/progress-bar';

export { Stat } from './components/stat';
export type { StatProps } from './components/stat';

export { Toast } from './components/toast';
export type { ToastProps, ToastTone } from './components/toast';

export { SegmentedControl } from './components/segmented-control';
export type { SegmentedControlProps, SegmentedOption } from './components/segmented-control';

export { Tag } from './components/tag';
export type { TagProps } from './components/tag';

export { Select } from './components/select';
export type { SelectProps, SelectOption } from './components/select';

export { Switch } from './components/switch';
export type { SwitchProps } from './components/switch';

export { Checkbox } from './components/checkbox';
export type { CheckboxProps } from './components/checkbox';

export { AmountInput } from './components/amount-input';
export type { AmountInputProps, AmountInputSize } from './components/amount-input';

export { EmptyState } from './components/empty-state';
export type { EmptyStateProps } from './components/empty-state';

export { Modal } from './components/modal';
export type { ModalProps } from './components/modal';

export { Skeleton, SkeletonRow } from './components/skeleton';
export type { SkeletonProps } from './components/skeleton';
