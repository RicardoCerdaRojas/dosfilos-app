import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  useColorScheme as useDeviceColorScheme 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BibleVersionCard } from '@/presentation/components/bible/BibleVersionCard';
import { useBible } from '@/presentation/hooks/useBible';
import { UserAvatar } from '@/presentation/components/UserAvatar';
import { useRouter } from 'expo-router';
import { BibleCategory } from '@/domain/bible/utils/BibleMetadata';
import { useTranslation } from 'react-i18next';

export default function BibleLibraryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width > 768; // Standard tablet breakpoint
  const { t } = useTranslation();
  const { 
    versionId,
    availableVersions, 
    setVersion, 
    setBook, 
    books, 
    categorizedBooks, 
    isLoadingBooks 
  } = useBible();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(versionId);
  const [selectedCategory, setSelectedCategory] = useState<BibleCategory | 'All'>('All');
  const [selectedTestament, setSelectedTestament] = useState<'Old' | 'New'>('Old');

  // Sync selectedVersionId with store version only if it changes externally
  // (render-phase adjustment — https://react.dev/learn/you-might-not-need-an-effect)
  if (versionId && selectedVersionId !== null && versionId !== selectedVersionId) {
    setSelectedVersionId(versionId);
  }

  const handleSelectVersion = (id: string) => {
    setVersion(id);
    setSelectedVersionId(id);
  };

  const handleSelectBook = (bookId: string, bookName: string) => {
    setBook(bookId, bookName);
    router.navigate('/bible/reader');
  };

  const filteredVersions = useMemo(() => 
    availableVersions.filter((v: { name: string; id: string }) => 
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.id.toLowerCase().includes(searchQuery.toLowerCase())
    ), [availableVersions, searchQuery]
  );

  const displayedBooks = useMemo(() => {
    if (!selectedVersionId) return [];
    
    let result: any[] = books;
    
    if (selectedCategory !== 'All') {
      const testamentBooks = categorizedBooks[selectedTestament] || {};
      result = testamentBooks[selectedCategory] || [];
    } else {
      const testamentBooks = categorizedBooks[selectedTestament] || {};
      result = Object.values(testamentBooks).flat() as any[];
    }

    if (searchQuery) {
      result = result.filter((b: any) => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    return result;
  }, [books, categorizedBooks, selectedVersionId, selectedCategory, selectedTestament, searchQuery]);

  const sidebarCategories: { label: string; value: BibleCategory | 'All' }[] = [
    { label: t('bible:categories_list.all'), value: 'All' },
    { label: t('bible:categories_list.pentateuch'), value: 'Pentateuch' },
    { label: t('bible:categories_list.history'), value: 'History' },
    { label: t('bible:categories_list.poetry'), value: 'Poetry' },
    { label: t('bible:categories_list.major_prophets'), value: 'Major Prophets' },
    { label: t('bible:categories_list.minor_prophets'), value: 'Minor Prophets' },
    { label: t('bible:categories_list.pauline_epistles'), value: 'Pauline Epistles' },
    { label: t('bible:categories_list.general_epistles'), value: 'General Epistles' },
    { label: t('bible:categories_list.prophecy'), value: 'Prophecy' },
  ];

  const deviceColorScheme = useDeviceColorScheme();
  const isDark = deviceColorScheme === 'dark';
  const insets = useSafeAreaInsets();
  
  // Calculate dynamic column width based on screen width
  // For tablet (iPad): 3 columns (~32%). For mobile: 2 columns (~48%)
  const numColumns = isTablet ? 3 : 2;
  const columnWidth = isTablet ? '32%' : '48%';
  const gap = 12;

  // Render dummy spacers for last row if needed (flex-start helps but space-between looks nicer if count matches)
  // Actually, let's use flexWrap + margin right approach? Or just space-between.
  // Space-between with fixed width works great for 2 columns. For 3, it works if 3 items. If 2, they spread out.
  // Better approach for 3+ cols:
  // Use `gap` via negative margin on container and padding on item, OR manually calculate margins.
  // We'll stick to `justifyContent: 'flex-start'` + explicit margins for stability.
  
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0b1120' : '#f8fafc' }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Premium Header */}
        <View style={{
          paddingHorizontal: 24,
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
          backgroundColor: isDark ? '#0b1120' : '#ffffff',
          zIndex: 10
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {selectedVersionId && (
            <Pressable 
              onPress={() => setSelectedVersionId(null)} 
              style={({ pressed }) => ({ marginRight: 16, opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialIcons name="arrow-back" size={24} color={isDark ? '#ffffff' : '#0f172a'} />
            </Pressable>
          )}
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? '#ffffff' : '#0f172a', letterSpacing: -0.5 }}>
              {t('bible:title')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700' }}>
                {selectedVersionId ? t('bible:select_book') : t('bible:library')}
              </Text>
              {selectedVersionId && (
                <View style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(23, 84, 207, 0.1)', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(23, 84, 207, 0.2)' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#1754cf', textTransform: 'uppercase' }}>{selectedVersionId}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Library/Reader Toggle & Avatar */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#1e293b' : '#f1f5f9', padding: 4, borderRadius: 9999, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0', marginRight: 16 }}>
            <Pressable style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, backgroundColor: '#1754cf', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, shadowColor: '#1754cf' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>{t('bible:title')}</Text>
            </Pressable>
            <Pressable 
              onPress={() => router.navigate('/bible/reader')}
              style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>{t('bible:reader')}</Text>
            </Pressable>
          </View>
          <UserAvatar />
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Tablet Sidebar - Enhanced Design */}
        {isTablet && selectedVersionId && (
          <View style={{ width: 280, backgroundColor: isDark ? '#111621' : '#ffffff', borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              {/* Refined Versions Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#c5a059', fontWeight: '800' }}>{t('bible:versions')}</Text>
                <Pressable><MaterialIcons name="edit" size={14} color="#94a3b8" /></Pressable>
              </View>
              
              <View style={{ marginBottom: 32 }}>
                {availableVersions.map((v: any) => (
                  <View 
                    key={v.id}
                    style={{
                      marginBottom: 8,
                      borderRadius: 12,
                      backgroundColor: selectedVersionId === v.id ? (isDark ? 'rgba(23, 84, 207, 0.15)' : '#eff6ff') : 'transparent',
                      borderWidth: 1,
                      borderColor: selectedVersionId === v.id ? 'rgba(23, 84, 207, 0.3)' : 'transparent',
                      overflow: 'hidden'
                    }}
                  >
                    <Pressable
                      onPress={() => handleSelectVersion(v.id)}
                      style={({ pressed }) => ({
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: pressed ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') : 'transparent'
                      })}
                    >
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                        backgroundColor: selectedVersionId === v.id ? '#1754cf' : (isDark ? '#1e293b' : '#e2e8f0')
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: selectedVersionId === v.id ? '#ffffff' : '#64748b' }}>{v.id.substring(0, 3)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#ffffff' : '#0f172a' }}>{v.name}</Text>
                      </View>
                      {selectedVersionId === v.id && (
                        <MaterialIcons name="check" size={16} color="#1754cf" />
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>

              {/* Enhanced Testament Toggle */}
              <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#0b1120' : '#f1f5f9', padding: 4, borderRadius: 12, marginBottom: 32, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#cbd5e1' }}>
                <Pressable 
                  onPress={() => setSelectedTestament('Old')}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: selectedTestament === 'Old' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent', alignItems: 'center', justifyContent: 'center', shadowColor: selectedTestament === 'Old' ? '#000' : 'transparent', shadowOpacity: selectedTestament === 'Old' ? 0.05 : 0, shadowOffset: { width: 0, height: 1 } }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, color: selectedTestament === 'Old' ? (isDark ? '#ffffff' : '#0f172a') : '#64748b' }}>{t('bible:old_testament')}</Text>
                </Pressable>
                <Pressable 
                  onPress={() => setSelectedTestament('New')}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: selectedTestament === 'New' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent', alignItems: 'center', justifyContent: 'center', shadowColor: selectedTestament === 'New' ? '#000' : 'transparent', shadowOpacity: selectedTestament === 'New' ? 0.05 : 0, shadowOffset: { width: 0, height: 1 } }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, color: selectedTestament === 'New' ? (isDark ? '#ffffff' : '#0f172a') : '#64748b' }}>{t('bible:new_testament')}</Text>
                </Pressable>
              </View>

              <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#c5a059', fontWeight: '800', marginBottom: 16 }}>{t('bible:categories')}</Text>
              
              {sidebarCategories.map((cat) => (
                <View 
                  key={cat.value}
                  style={{
                    marginBottom: 4,
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: selectedCategory === cat.value ? (isDark ? 'rgba(23, 84, 207, 0.15)' : 'rgba(23, 84, 207, 0.08)') : 'transparent',
                  }}
                >
                  <Pressable
                    onPress={() => setSelectedCategory(cat.value)}
                    style={({ pressed }) => ({
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      opacity: pressed ? 0.7 : 1
                    })}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, marginRight: 10, backgroundColor: selectedCategory === cat.value ? '#1754cf' : (isDark ? '#334155' : '#cbd5e1') }} />
                    <Text style={{ fontSize: 13, fontWeight: selectedCategory === cat.value ? '700' : '500', color: selectedCategory === cat.value ? '#1754cf' : (isDark ? '#94a3b8' : '#64748b') }}>
                      {cat.label}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Main Content Area */}
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 24, marginTop: 24, marginBottom: 16 }}>
            <View style={{ position: 'relative' }}>
              <View style={{ position: 'absolute', left: 16, top: '50%', transform: [{ translateY: -10 }], zIndex: 10 }}>
                <MaterialIcons name="search" size={20} color="#64748b" />
              </View>
              <TextInput
                style={{
                  backgroundColor: isDark ? '#111621' : '#ffffff',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingLeft: 48,
                  paddingRight: 24,
                  fontSize: 14,
                  color: isDark ? '#ffffff' : '#0f172a',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.03,
                  shadowRadius: 3,
                  elevation: 1,
                }}
                placeholder={selectedVersionId ? t('bible:search_placeholder') : t('bible:search_versions')}
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => {
                   if (selectedVersionId) {
                     router.navigate('/bible/search');
                   }
                }}
              />
            </View>
          </View>

          {/* Mobile Categories & Versions (Sticky Horizontal Scroll) */}
          {!isTablet && selectedVersionId && (
            <View style={{ marginBottom: 16 }}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {/* Simplified Mobile Controls */}
                <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#1e293b' : '#f1f5f9', padding: 4, borderRadius: 12, marginRight: 12 }}>
                  <Pressable onPress={() => router.push('/bible/versions' as any)} style={{ backgroundColor: '#1754cf', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>{selectedVersionId}</Text>
                  </Pressable>
                </View>

                 <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#111621' : '#f1f5f9', padding: 4, borderRadius: 12, marginRight: 16 }}>
                  <Pressable 
                    onPress={() => setSelectedTestament('Old')}
                    style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, backgroundColor: selectedTestament === 'Old' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent', borderWidth: selectedTestament === 'Old' ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: selectedTestament === 'Old' ? (isDark ? '#ffffff' : '#0f172a') : '#64748b' }}>{t('bible:old_testament')}</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => setSelectedTestament('New')}
                    style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, backgroundColor: selectedTestament === 'New' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent', borderWidth: selectedTestament === 'New' ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: selectedTestament === 'New' ? (isDark ? '#ffffff' : '#0f172a') : '#64748b' }}>{t('bible:new_testament')}</Text>
                  </Pressable>
                </View>

                {sidebarCategories.map((cat) => (
                  <Pressable
                    key={cat.value}
                    onPress={() => setSelectedCategory(cat.value)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      marginRight: 8,
                      borderWidth: 1,
                      backgroundColor: selectedCategory === cat.value ? 'rgba(23, 84, 207, 0.1)' : (isDark ? '#111621' : '#ffffff'),
                      borderColor: selectedCategory === cat.value ? 'rgba(23, 84, 207, 0.3)' : (isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'),
                      opacity: pressed ? 0.7 : 1
                    })}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: selectedCategory === cat.value ? '#1754cf' : '#64748b' }}>
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
            {isLoadingBooks ? (
              <View style={{ paddingVertical: 80, alignItems: 'center' }}>
                <ActivityIndicator color="#1754cf" />
                <Text style={{ marginTop: 16, color: '#64748b', fontWeight: '500' }}>{t('bible:preparing_scriptures')}</Text>
              </View>
            ) : !selectedVersionId ? (
              <View style={{ paddingVertical: 8 }}>
                {filteredVersions.map((version: any) => (
                  <BibleVersionCard 
                    key={version.id}
                    abbreviation={version.id.substring(0, 3)}
                    name={version.name}
                    subtitle={version.language === 'es' ? t('bible:spanish_translation') : t('bible:english_translation')}
                    language={version.language}
                    isVerified
                    onPress={() => handleSelectVersion(version.id)}
                  />
                ))}
              </View>
            ) : (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                   <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#ffffff' : '#0f172a', letterSpacing: -0.5 }}>
                     {selectedCategory === 'All' ? (selectedTestament === 'Old' ? t('bible:old_testament_full') : t('bible:new_testament_full')) : sidebarCategories.find(c => c.value === selectedCategory)?.label}
                   </Text>
                   <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>{t('bible:books_count', { count: displayedBooks.length })}</Text>
                </View>

                {/* Grid Layout Container -- RESPONSIVE FIXED */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  {displayedBooks.map((book: any, index: number) => {
                    // Calculate Margin Right for Gap
                    // If it's NOT the last item in the row, add margin right
                    const isLastInRow = (index + 1) % numColumns === 0;
                    
                    return (
                      <View 
                        key={book.id}
                        style={{
                          width: columnWidth,
                          marginRight: isLastInRow ? 0 : '2%', // approx gap
                          marginBottom: 12,
                          borderRadius: 16,
                          overflow: 'hidden',
                          backgroundColor: isDark ? '#1e293b' : '#ffffff', // Slightly lighter dark bg for cards
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
                          // Shadows
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isDark ? 0.2 : 0.05,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Pressable 
                          onPress={() => handleSelectBook(book.id, book.name)}
                          style={({ pressed }) => ({
                            flex: 1,
                            padding: 16,
                            backgroundColor: pressed ? (isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc') : 'transparent',
                          })}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#ffffff' : '#0f172a', marginBottom: 6 }} numberOfLines={1}>{book.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 9, color: '#c5a059', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 6 }}>
                              {(book.metadata?.category || 'Book').substring(0, 4)}
                            </Text>
                            <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '600' }}>•  {book.chapters} chaps</Text>
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
                
                {/* Bottom Spacer */}
                <View style={{ height: 40 }} />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
      </View>
    </View>
  );
}
