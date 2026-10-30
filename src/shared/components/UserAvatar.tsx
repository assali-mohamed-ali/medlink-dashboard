import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'

type Props = {
  firstName: string
  lastName: string
  size?: 'sm' | 'default' | 'lg'
  /**
   * Shown without the name next to it: then it is an image named after the person. By default it is decorative
   * (hidden from screen readers), because the name is written beside it.
   */
  alone?: boolean
}

function initials(firstName: string, lastName: string) {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toLocaleUpperCase('fr')
}

/** The person's initials in a sage circle (shadcn avatar); no photo for now. */
export default function UserAvatar({ firstName, lastName, size = 'default', alone = false }: Props) {
  const a11y = alone
    ? { role: 'img', 'aria-label': `${firstName} ${lastName}`.trim() }
    : { 'aria-hidden': true as const }
  return (
    <Avatar size={size} {...a11y}>
      <AvatarFallback className="bg-accent font-medium text-accent-foreground">
        {initials(firstName, lastName)}
      </AvatarFallback>
    </Avatar>
  )
}
