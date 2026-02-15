import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Keyboard,
  useColorScheme as useDeviceColorScheme 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBible } from '@/presentation/hooks/useBible';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBibleStore } from '@/presentation/state/bible.store';

interface SearchResult {
  reference: string;
  text: string;
}

export default function BibleSearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { search, versionId } = useBible();
  const { setBook, setVersion, setChapter } = useBibleStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 3) return;
    
    setIsLoading(true);
    Keyboard.dismiss();
    try {
      const searchResults = await search(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, search]);

  const handleResultPress = (reference: string) => {
    const match = reference.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (match) {
        const bookName = match[1];
        const chapter = parseInt(match[2]);
        setBook(bookName, bookName); 
        setChapter(chapter);
        router.navigate('/bible/reader');
    }
  };

  const deviceColorScheme = useDeviceColorScheme();
  const isDark = deviceColorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Premium Styles
  const primaryColor = '#1754cf';
  const accentColor = '#b59410';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const secondaryTextColor = isDark ? '#94a3b8' : '#64748b';
  const surfaceColor = isDark ? '#1e293b' : '#ffffff';
  const backgroundColor = isDark ? '#0b1120' : '#f6f6f8';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header */}
        <View style={{ 
          paddingHorizontal: 24, 
          paddingVertical: 16, 
          flexDirection: 'row', 
          alignItems: 'center', 
          borderBottomWidth: 1, 
          borderBottomColor: borderColor, 
          backgroundColor: isDark ? '#0b1120' : '#ffffff' 
        }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <MaterialIcons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '800', color: textColor, letterSpacing: -0.5 }}>{t('bible:search_results')}</Text>
        </View>

        {/* Search Input Area */}
        <View style={{ padding: 24, backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc' }}>
          <View style={{ position: 'relative' }}>
            <View style={{ position: 'absolute', left: 16, top: '50%', transform: [{ translateY: -10 }], zIndex: 10 }}>
              <MaterialIcons name="search" size={20} color="#64748b" />
            </View>
            <TextInput
              style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderWidth: 1,
                borderColor: borderColor,
                borderRadius: 16,
                paddingVertical: 16,
                paddingLeft: 48,
                paddingRight: 56,
                fontSize: 15,
                color: textColor,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2
              }}
              placeholder={t('bible:search_placeholder')}
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity 
                onPress={handleSearch}
                style={{ position: 'absolute', right: 16, top: '50%', transform: [{ translateY: -10 }], zIndex: 10 }}
              >
                <MaterialIcons name="arrow-forward" size={20} color={primaryColor} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={{ fontSize: 10, color: secondaryTextColor, marginTop: 12, marginLeft: 8, fontWeight: '600' }}>
            {versionId} • {t('bible:biblical_reading')}
          </Text>
        </View>

        {/* Results List */}
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={primaryColor} size="large" />
              <Text style={{ marginTop: 16, color: secondaryTextColor, fontWeight: '600' }}>{t('bible:searching')}</Text>
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item, index) => `${item.reference}-${index}`}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => (
                <Text style={{ fontSize: 12, fontWeight: '800', color: secondaryTextColor, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 24, marginBottom: 16 }}>
                  {t('bible:results_count', { count: results.length })}
                </Text>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => handleResultPress(item.reference)}
                  style={{ 
                    backgroundColor: surfaceColor, 
                    borderWidth: 1, 
                    borderColor: borderColor, 
                    padding: 20, 
                    borderRadius: 16, 
                    marginBottom: 16, 
                    shadowColor: '#000', 
                    shadowOffset: { width: 0, height: 2 }, 
                    shadowOpacity: 0.05, 
                    shadowRadius: 4, 
                    elevation: 2 
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: primaryColor }}>{item.reference}</Text>
                    <MaterialIcons name="chevron-right" size={20} color={secondaryTextColor} />
                  </View>
                  <Text style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: 14, lineHeight: 22, fontWeight: '500' }}>
                    {item.text}
                  </Text>
                </TouchableOpacity>
              )}
              ListFooterComponent={<View style={{ height: 80 }} />}
            />
          ) : query.length >= 3 && !isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
              <View style={{ width: 80, height: 80, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <MaterialIcons name="search-off" size={40} color={secondaryTextColor} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: textColor, marginBottom: 8 }}>{t('bible:no_results_found')}</Text>
              <Text style={{ color: secondaryTextColor, textAlign: 'center', lineHeight: 22 }}>{t('bible:try_different_words') || t('common:soon')}</Text>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
               <MaterialIcons name="auto-stories" size={60} color={isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} />
               <Text style={{ color: secondaryTextColor, textAlign: 'center', marginTop: 16, fontWeight: '500', fontStyle: 'italic' }}>
                  {t('bible:search_tip') || "Ingresa al menos 3 caracteres para buscar..."}
               </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
