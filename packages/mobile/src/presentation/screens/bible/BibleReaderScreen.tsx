import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal, 
  FlatList,
  useWindowDimensions,
  useColorScheme as useDeviceColorScheme 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBible } from '@/presentation/hooks/useBible';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useReaderSettingsStore } from '@/presentation/state/readerSettings.store';

export default function BibleReaderScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const { t } = useTranslation();
  const { fontSize, setFontSize } = useReaderSettingsStore();

  const [isSelectorVisible, setIsSelectorVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [selectorTab, setSelectorTab] = useState<'books' | 'chapters'>('books');
  
  const { 
    versionId, 
    secondaryVersionId,
    isParallelMode,
    toggleParallelMode,
    bookId,
    bookName, 
    chapter, 
    chapterContent, 
    secondaryChapterContent,
    isLoadingChapter,
    isLoadingSecondaryChapter,
    nextChapter,
    prevChapter,
    books,
    setBook,
    setChapter,
    setVersion,
    availableVersions,
    setSecondaryVersion
  } = useBible();

  const currentBook = books.find((b: { id: string; chapters: number }) => b.id === bookId);
  const chapterCount = currentBook?.chapters || 0;

  const currentVersion = availableVersions.find(v => v.id === versionId);
  const secondaryVersion = availableVersions.find(v => v.id === secondaryVersionId);

  const handleSelectBook = (id: string, name: string) => {
    setBook(id, name);
    setSelectorTab('chapters');
  };

  const handleSelectChapter = (ch: number) => {
    setChapter(ch);
    setIsSelectorVisible(false);
    setSelectorTab('books');
  };

  const adjustFontSize = (delta: number) => {
    setFontSize(Math.max(12, Math.min(32, fontSize + delta)));
  };

  const deviceColorScheme = useDeviceColorScheme();
  const isDark = deviceColorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Premium Styles
  const primaryColor = '#1754cf';
  const accentColor = '#b59410';
  const accentColorLight = '#c5a059';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const secondaryTextColor = isDark ? '#94a3b8' : '#64748b';
  const surfaceColor = isDark ? '#1e293b' : '#ffffff';
  const backgroundColor = isDark ? '#0b1120' : '#fcfcf9'; // Slightly warmer paper color for light mode
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

  const renderVerses = () => {
    if (isParallelMode) {
      return (
        <View style={{ flexDirection: 'row' }}>
          {/* Primary Version */}
          <View style={{ flex: 1, paddingRight: 16, borderRightWidth: 1, borderRightColor: borderColor }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: primaryColor, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' }}>
              {currentVersion?.id}
            </Text>
            {chapterContent?.map((verseText: string, index: number) => (
              <View key={`p-${index}`} style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: primaryColor, marginBottom: 4 }}>
                  {index + 1}
                </Text>
                <Text 
                  style={{ 
                    fontSize: fontSize * 0.9, 
                    lineHeight: fontSize * 1.5,
                    color: isDark ? '#cbd5e1' : '#334155',
                    fontWeight: '500',
                    letterSpacing: 0.2
                  }}
                >
                  {verseText}
                </Text>
              </View>
            ))}
          </View>

          {/* Secondary Version */}
          <View style={{ flex: 1, paddingLeft: 16 }}>
             <Text style={{ fontSize: 10, fontWeight: 'bold', color: accentColor, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' }}>
              {secondaryVersion?.id}
            </Text>
            {isLoadingSecondaryChapter ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              secondaryChapterContent?.map((verseText: string, index: number) => (
                <View key={`s-${index}`} style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: accentColor, marginBottom: 4 }}>
                    {index + 1}
                  </Text>
                  <Text 
                    style={{ 
                      fontSize: fontSize * 0.9, 
                      lineHeight: fontSize * 1.5,
                      color: isDark ? '#cbd5e1' : '#334155',
                      fontWeight: '500',
                      letterSpacing: 0.2
                    }}
                  >
                    {verseText}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      );
    }

    return (
      <View>
        {chapterContent?.map((verseText: string, index: number) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: primaryColor, marginRight: 12, marginTop: 4, width: 20, textAlign: 'right' }}>
              {index + 1}
            </Text>
            <Text 
              style={{ 
                fontSize, 
                lineHeight: fontSize * 1.6,
                color: isDark ? '#e2e8f0' : '#1e293b',
                flex: 1,
                fontWeight: '500', // Medium weight for better readability
                letterSpacing: 0.2,
                fontFamily: 'System' // Ensure system font is used
              }}
            >
              {verseText}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Premium Header */}
        <View style={{ 
          paddingHorizontal: 24, 
          paddingVertical: 16, 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottomWidth: 1, 
          borderBottomColor: borderColor, 
          backgroundColor: isDark ? '#0b1120' : '#ffffff',
          zIndex: 10
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: textColor, letterSpacing: -0.5 }}>{t('bible:reader')}</Text>
              <Text style={{ fontSize: 10, color: secondaryTextColor, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600', marginTop: 2 }}>
                {t('bible:biblical_reading')}
              </Text>
            </View>
          </View>

          {/* Library/Reader Toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#1e293b' : '#f1f5f9', padding: 4, borderRadius: 9999, borderWidth: 1, borderColor: borderColor }}>
            <TouchableOpacity 
              onPress={() => router.navigate('/bible')}
              style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9999 }}
            >
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: secondaryTextColor }}>{t('bible:library')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9999, backgroundColor: primaryColor, shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, shadowColor: primaryColor }}
            >
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ffffff' }}>{t('bible:reader')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={{ flex: 1 }}>
          {isLoadingChapter ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={primaryColor} size="large" />
              <Text style={{ marginTop: 16, color: secondaryTextColor, fontWeight: '600' }}>{t('bible:preparing_scriptures')}</Text>
            </View>
          ) : (
            <ScrollView 
              style={{ flex: 1, backgroundColor }} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ 
                paddingHorizontal: isParallelMode ? 24 : (isTablet ? 48 : 32), 
                paddingVertical: 32 
              }}
            >
              <Text style={{ fontSize: 12, color: isDark ? accentColorLight : accentColor, textTransform: 'uppercase', letterSpacing: 3, fontWeight: '800', marginBottom: 12, textAlign: 'center' }}>
                 {bookName}
              </Text>
              <Text style={{ fontSize: 36, fontWeight: '800', color: textColor, marginBottom: 40, textAlign: 'center', letterSpacing: -1 }}>
                {t('bible:chapter_title', { chapter })}
              </Text>
              
              {renderVerses()}
              
              <View style={{ height: 160 }} />
            </ScrollView>
          )}
        </View>

        {/* Floating Reader Controls */}
        <View style={{ position: 'absolute', bottom: 40, left: 32, right: 32, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
            borderWidth: 1, 
            borderColor: borderColor, 
            borderRadius: 9999, 
            paddingHorizontal: 16, 
            paddingVertical: 10, 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 8 }, 
            shadowOpacity: isDark ? 0.3 : 0.1, 
            shadowRadius: 16, 
            elevation: 8 
          }}>
            <TouchableOpacity 
              onPress={prevChapter}
              disabled={chapter <= 1}
              style={{ padding: 8, opacity: chapter <= 1 ? 0.3 : 1 }}
            >
              <MaterialIcons name="chevron-left" size={28} color={textColor} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setIsSelectorVisible(true)}
              style={{ paddingHorizontal: 20, borderLeftWidth: 1, borderRightWidth: 1, borderColor: borderColor, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4 }}
            >
              <Text style={{ color: textColor, fontWeight: '800', fontSize: 16, marginRight: 6 }}>{bookName}</Text>
              <Text style={{ color: isDark ? accentColorLight : accentColor, fontWeight: '800', fontSize: 16 }}>{chapter}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={nextChapter}
              style={{ padding: 8 }}
            >
              <MaterialIcons name="chevron-right" size={28} color={textColor} />
            </TouchableOpacity>

            <View style={{ marginLeft: 8, paddingLeft: 12, borderLeftWidth: 1, borderColor: borderColor, flexDirection: 'row', alignItems: 'center' }}>
               <TouchableOpacity 
                 onPress={toggleParallelMode}
                 style={{ 
                   padding: 8, 
                   borderRadius: 9999, 
                   marginRight: 8, 
                   backgroundColor: isParallelMode ? 'rgba(23, 84, 207, 0.15)' : (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9') 
                 }}
               >
                  <MaterialIcons name="view-week" size={20} color={isParallelMode ? primaryColor : (isDark ? '#cbd5e1' : '#64748b')} />
               </TouchableOpacity>

               <TouchableOpacity 
                 onPress={() => setIsSettingsVisible(true)}
                 style={{ padding: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 9999 }}
               >
                  <MaterialIcons name="format-size" size={20} color={isDark ? accentColorLight : accentColor} />
               </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Selector Modal (Books/Chapters) */}
        <Modal
          visible={isSelectorVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsSelectorVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
            <View style={{ 
              backgroundColor: isDark ? '#1e293b' : '#ffffff', 
              borderRadius: 32, 
              width: '100%', 
              maxWidth: 500, 
              height: '80%', 
              overflow: 'hidden', 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 10 }, 
              shadowOpacity: 0.25, 
              shadowRadius: 24, 
              elevation: 10 
            }}>
              {/* Modal Header */}
              <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: borderColor, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#0b1120' : '#e2e8f0', padding: 4, borderRadius: 12 }}>
                  <TouchableOpacity 
                    onPress={() => setSelectorTab('books')}
                    style={{ 
                      paddingHorizontal: 20, 
                      paddingVertical: 8, 
                      borderRadius: 10, 
                      backgroundColor: selectorTab === 'books' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
                      shadowColor: selectorTab === 'books' ? '#000' : 'transparent',
                      shadowOpacity: selectorTab === 'books' ? 0.05 : 0,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 1 }
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, color: selectorTab === 'books' ? textColor : secondaryTextColor }}>{t('bible:books_tab')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setSelectorTab('chapters')}
                    style={{ 
                      paddingHorizontal: 20, 
                      paddingVertical: 8, 
                      borderRadius: 10, 
                      backgroundColor: selectorTab === 'chapters' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
                      shadowColor: selectorTab === 'chapters' ? '#000' : 'transparent',
                      shadowOpacity: selectorTab === 'chapters' ? 0.05 : 0,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 1 }
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, color: selectorTab === 'chapters' ? textColor : secondaryTextColor }}>{t('bible:chapters_tab')}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setIsSelectorVisible(false)} style={{ padding: 8, backgroundColor: isDark ? '#0b1120' : '#e2e8f0', borderRadius: 9999 }}>
                  <MaterialIcons name="close" size={20} color={textColor} />
                </TouchableOpacity>
              </View>

              {/* Modal Content */}
              <View style={{ flex: 1, padding: 24 }}>
                {selectorTab === 'books' ? (
                  <FlatList
                    data={books}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    showsVerticalScrollIndicator={false}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        onPress={() => handleSelectBook(item.id, item.name)}
                        style={{ 
                          width: '48%', 
                          paddingVertical: 16, 
                          paddingHorizontal: 12, 
                          borderRadius: 16, 
                          marginBottom: 12, 
                          borderWidth: 1, 
                          backgroundColor: item.id === bookId ? (isDark ? 'rgba(23, 84, 207, 0.2)' : 'rgba(23, 84, 207, 0.08)') : (isDark ? '#0b1120' : '#f8fafc'),
                          borderColor: item.id === bookId ? primaryColor : borderColor
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '700', textAlign: 'center', color: item.id === bookId ? (isDark ? '#ffffff' : primaryColor) : secondaryTextColor }} numberOfLines={1}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <View style={{ flex: 1 }}>
                     <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: isDark ? accentColorLight : accentColor, fontWeight: '800', marginBottom: 24, textAlign: 'center' }}>{t('bible:available_chapters')}</Text>
                     <FlatList
                      data={Array.from({ length: chapterCount }, (_, i) => i + 1)}
                      keyExtractor={(item) => item.toString()}
                      numColumns={5}
                      showsVerticalScrollIndicator={false}
                      columnWrapperStyle={{ justifyContent: 'space-between' }}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          onPress={() => handleSelectChapter(item)}
                          style={{ 
                            width: '18%', 
                            aspectRatio: 1, 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            borderRadius: 16, 
                            marginBottom: 12, 
                            borderWidth: 1, 
                            backgroundColor: item === chapter ? primaryColor : (isDark ? '#0b1120' : '#f8fafc'),
                            borderColor: item === chapter ? primaryColor : borderColor,
                            shadowColor: item === chapter ? primaryColor : 'transparent',
                            shadowOpacity: item === chapter ? 0.3 : 0,
                            shadowOffset: { width: 0, height: 4 },
                            shadowRadius: 8
                          }}
                        >
                          <Text style={{ fontSize: 18, fontWeight: '700', color: item === chapter ? '#ffffff' : secondaryTextColor }}>{item}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Settings Modal (Font Size) */}
        <Modal
          visible={isSettingsVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsSettingsVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setIsSettingsVisible(false)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, minHeight: 300 }}
            >
              <View style={{ width: 48, height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: 9999, alignSelf: 'center', marginBottom: 32 }} />
              
              <Text style={{ fontSize: 22, fontWeight: '800', color: textColor, marginBottom: 32, textAlign: 'center', letterSpacing: -0.5 }}>{t('bible:reader_settings')}</Text>
              
              <View style={{ backgroundColor: isDark ? '#0b1120' : '#f8fafc', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: borderColor }}>
                {/* Font Size */}
                <View style={{ marginBottom: 32 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: secondaryTextColor, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>{t('bible:font_size')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TouchableOpacity 
                      onPress={() => adjustFontSize(-2)}
                      style={{ width: 48, height: 48, backgroundColor: surfaceColor, borderWidth: 1, borderColor: borderColor, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}
                    >
                      <MaterialIcons name="remove" size={24} color={secondaryTextColor} />
                    </TouchableOpacity>
                    
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 24, fontWeight: '800', color: textColor }}>{fontSize}</Text>
                    </View>
                    
                    <TouchableOpacity 
                      onPress={() => adjustFontSize(2)}
                      style={{ width: 48, height: 48, backgroundColor: surfaceColor, borderWidth: 1, borderColor: borderColor, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}
                    >
                      <MaterialIcons name="add" size={24} color={secondaryTextColor} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Primary Version Selector */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: secondaryTextColor, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>{t('bible:version')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {availableVersions.map(v => (
                      <TouchableOpacity
                        key={v.id}
                        onPress={() => setVersion(v.id)}
                        style={{ 
                          paddingHorizontal: 16, 
                          paddingVertical: 10, 
                          borderRadius: 12, 
                          marginRight: 8, 
                          marginBottom: 8, 
                          borderWidth: 1, 
                          backgroundColor: versionId === v.id ? primaryColor : surfaceColor, 
                          borderColor: versionId === v.id ? primaryColor : borderColor 
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: versionId === v.id ? '#ffffff' : secondaryTextColor }}>
                          {v.id}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Secondary Version Selector (Parallel Mode) */}
                {isParallelMode && (
                  <View style={{ marginTop: 24 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? accentColorLight : accentColor, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>{t('bible:secondary_version') || 'Segunda Versión'}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {availableVersions.map(v => (
                        <TouchableOpacity
                          key={v.id}
                          onPress={() => setSecondaryVersion(v.id)}
                          style={{ 
                            paddingHorizontal: 16, 
                            paddingVertical: 10, 
                            borderRadius: 12, 
                            marginRight: 8, 
                            marginBottom: 8, 
                            borderWidth: 1, 
                            backgroundColor: secondaryVersionId === v.id ? accentColor : surfaceColor, 
                            borderColor: secondaryVersionId === v.id ? accentColor : borderColor 
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: secondaryVersionId === v.id ? '#ffffff' : secondaryTextColor }}>
                            {v.id}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                onPress={() => setIsSettingsVisible(false)}
                style={{ marginTop: 32, backgroundColor: primaryColor, paddingVertical: 16, borderRadius: 16, shadowColor: primaryColor, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
              >
                <Text style={{ textAlign: 'center', color: '#ffffff', fontWeight: '800', fontSize: 16 }}>{t('common:back')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}
