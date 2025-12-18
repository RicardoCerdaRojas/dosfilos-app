/**
 * Language Switcher Component
 * 
 * Provides UI for switching between supported languages.
 * Following Open/Closed Principle - easily extensible for new languages
 */

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '../hooks/useTranslation';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../types';

interface LanguageSwitcherProps {
  /**
   * Variant of the button
   */
  variant?: 'default' | 'ghost' | 'outline';
  
  /**
   * Show text label or icon only
   */
  showLabel?: boolean;
  
  /**
   * Custom className
   */
  className?: string;
}

/**
 * Language switcher component with dropdown menu
 */
export function LanguageSwitcher({ 
  variant = 'ghost', 
  showLabel = true,
  className = ''
}: LanguageSwitcherProps) {
  const { language, changeLanguage } = useTranslation();

  const currentLanguage = SUPPORTED_LANGUAGES[language as SupportedLanguage] 
    || SUPPORTED_LANGUAGES.es;

  const handleLanguageChange = (langCode: SupportedLanguage) => {
    changeLanguage(langCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className={className}>
          <Globe className="h-4 w-4" />
          {showLabel && (
            <>
              <span className="ml-2">{currentLanguage.flag}</span>
              <span className="ml-1">{currentLanguage.nativeName}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.values(SUPPORTED_LANGUAGES).map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="cursor-pointer"
          >
            <span className="mr-2">{lang.flag}</span>
            <span className="flex-1">{lang.nativeName}</span>
            {language === lang.code && (
              <span className="ml-2 text-blue-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
