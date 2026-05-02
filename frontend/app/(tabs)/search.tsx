import { useRouter } from 'expo-router';
import { AlertTriangle, ChevronRight, Search as SearchIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { scoreColor, useScreenTokens } from '../../hooks/useScreenTokens';
import { useScan } from '../../lib/hooks/useScan';
import { useSearch } from '../../lib/hooks/useSearch';
import type { SearchResultItem } from '../../lib/types';

const PAGE_MARGIN = 16;
const TAB_BAR_HEIGHT = 49;

function tierAccent(
  item: SearchResultItem,
  C: ReturnType<typeof useScreenTokens>,
): string {
  if (item.rating.avoid) return C.red;
  return scoreColor(item.rating.score, C.theme) ?? C.green;
}

export default function SearchTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useScreenTokens();
  const { userId } = useAuth();
  const [query, setQuery] = useState('');
  const { data, isFetching, isError, refetch } = useSearch(userId, query);
  const scan = useScan(userId);

  const items = data?.items ?? [];
  const trimmed = query.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 2;
  const idle = trimmed.length === 0;
  const showEmpty =
    !isFetching && !isError && trimmed.length >= 2 && items.length === 0;

  const onPickItem = (item: SearchResultItem) => {
    Keyboard.dismiss();
    scan.mutate(
      { barcode: item.product.barcode },
      {
        onSuccess: () => {
          router.push({
            pathname: '/product/[barcode]',
            params: { barcode: item.product.barcode },
          });
        },
      },
    );
  };

  const listPadBottom = insets.bottom + TAB_BAR_HEIGHT + 16;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.pageBg }}
      edges={['top', 'left', 'right']}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.primary }]}>Search</Text>
          <Text style={[styles.subtitle, { color: C.secondary }]}>
            Find any product by name. Results are scored for your profile.
          </Text>
        </View>
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: C.cardBg,
            borderColor: C.dark ? 'transparent' : C.separatorLight,
            borderWidth: C.dark ? 0 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <SearchIcon size={18} color={C.secondary} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="e.g. oat milk, greek yogurt, granola"
          placeholderTextColor={C.tertiary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.input, { color: C.primary }]}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <X size={18} color={C.secondary} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      {tooShort ? (
        <Text style={[styles.hint, { color: C.tertiary }]}>
          Type at least 2 characters to search.
        </Text>
      ) : null}

      {idle ? (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.centered}>
            <SearchIcon size={48} color={C.tertiary} />
            <Text style={[styles.errTitle, { color: C.primary }]}>
              Start typing to search
            </Text>
            <Text style={[styles.errBody, { color: C.secondary }]}>
              Try a brand (&quot;Chobani&quot;) or a product type (&quot;oat milk&quot;).
            </Text>
          </View>
        </TouchableWithoutFeedback>
      ) : isFetching && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.green} size="large" />
          <Text style={{ color: C.secondary, marginTop: 12 }}>Searching...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <AlertTriangle size={48} color={C.red} />
          <Text style={[styles.errTitle, { color: C.primary }]}>Couldn&apos;t search</Text>
          <Text style={[styles.errBody, { color: C.secondary }]}>
            Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => void refetch()}
            style={[styles.retryBtn, { backgroundColor: C.green }]}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Try again</Text>
          </Pressable>
        </View>
      ) : showEmpty ? (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.centered}>
            <SearchIcon size={48} color={C.tertiary} />
            <Text style={[styles.errTitle, { color: C.primary }]}>No matches</Text>
            <Text style={[styles.errBody, { color: C.secondary }]}>
              Try a different term or a more specific product name.
            </Text>
          </View>
        </TouchableWithoutFeedback>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.product.id}
          contentContainerStyle={{
            paddingHorizontal: PAGE_MARGIN,
            paddingTop: 4,
            paddingBottom: listPadBottom,
            gap: 10,
          }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const accent = tierAccent(item, C);
            const busy = scan.isPending && scan.variables?.barcode === item.product.barcode;
            return (
              <Pressable
                onPress={() => onPickItem(item)}
                disabled={scan.isPending}
                style={[
                  styles.row,
                  {
                    backgroundColor: C.cardBg,
                    borderColor: C.dark ? 'transparent' : C.separatorLight,
                    borderWidth: C.dark ? 0 : StyleSheet.hairlineWidth,
                  },
                  C.shadow,
                ]}
              >
                <View style={[styles.thumbWrap, { backgroundColor: C.elevated }]}>
                  {item.product.image_url ? (
                    <Image
                      source={{ uri: item.product.image_url }}
                      style={styles.thumb}
                      resizeMode="contain"
                    />
                  ) : (
                    <SearchIcon size={20} color={C.tertiary} />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 15, fontWeight: '600', color: C.primary }}
                  >
                    {item.product.name}
                  </Text>
                  {item.product.brand ? (
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}
                    >
                      {item.product.brand}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.scorePill, { backgroundColor: accent }]}>
                  <Text style={styles.scoreText}>
                    {item.rating.avoid ? 'AVOID' : String(item.rating.score)}
                  </Text>
                </View>
                {busy ? (
                  <ActivityIndicator color={C.secondary} style={{ marginLeft: 6 }} />
                ) : (
                  <ChevronRight size={18} color={C.tertiary} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: PAGE_MARGIN,
    paddingTop: 14,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  inputWrap: {
    marginHorizontal: PAGE_MARGIN,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  hint: {
    paddingHorizontal: PAGE_MARGIN,
    fontSize: 12,
    marginBottom: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errTitle: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  errBody: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  thumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  scorePill: {
    minWidth: 48,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  scoreText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
