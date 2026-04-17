import { Text } from 'react-native';

import { useScreenTokens } from '../hooks/useScreenTokens';

type Props = { title: string };

export function SectionHeader({ title }: Props) {
  const C = useScreenTokens();
  return (
    <Text
      style={{
        fontWeight: '600',
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: C.tertiary,
        marginBottom: 10,
      }}
    >
      {title}
    </Text>
  );
}
