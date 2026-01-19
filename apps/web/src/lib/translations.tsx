"use client";

import { createContext, useContext, useCallback } from "react";

type Messages = Record<string, Record<string, string> | string>;

interface TranslationsContextValue {
  messages: Messages;
  locale: string;
}

const TranslationsContext = createContext<TranslationsContextValue | null>(null);

interface TranslationsProviderProps {
  children: React.ReactNode;
  messages: Messages;
  locale: string;
}

export function TranslationsProvider({ children, messages, locale }: TranslationsProviderProps) {
  return (
    <TranslationsContext.Provider value={{ messages, locale }}>
      {children}
    </TranslationsContext.Provider>
  );
}

export function useTranslations(namespace?: string) {
  const context = useContext(TranslationsContext);
  
  if (!context) {
    throw new Error("useTranslations must be used within a TranslationsProvider");
  }

  const { messages } = context;

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let value: string = key;
    
    if (namespace) {
      // Support nested namespaces like "vendor.wallet"
      const namespaceParts = namespace.split(".");
      let namespaceMessages: unknown = messages;
      
      // Navigate to the namespace
      for (const part of namespaceParts) {
        if (namespaceMessages && typeof namespaceMessages === "object" && part in namespaceMessages) {
          namespaceMessages = (namespaceMessages as Record<string, unknown>)[part];
        } else {
          namespaceMessages = undefined;
          break;
        }
      }
      
      if (typeof namespaceMessages === "object" && namespaceMessages !== null) {
        // Support nested keys within namespace
        const nestedParts = key.split(".");
        let current: unknown = namespaceMessages;
        for (const part of nestedParts) {
          if (current && typeof current === "object" && part in current) {
            current = (current as Record<string, unknown>)[part];
          } else {
            current = undefined;
            break;
          }
        }
        value = typeof current === "string" ? current : key;
      }
    } else {
      // Support dot-notation for nested keys like "hero.account.title"
      const parts = key.split(".");
      if (parts.length >= 2) {
        let current: unknown = messages;
        for (const part of parts) {
          if (current && typeof current === "object" && part in current) {
            current = (current as Record<string, unknown>)[part];
          } else {
            current = undefined;
            break;
          }
        }
        value = typeof current === "string" ? current : key;
      } else {
        value = (messages[key] as string) || key;
      }
    }

    // Simple interpolation for {param} placeholders
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
      });
    }

    return value;
  }, [messages, namespace]);

  return t;
}

export function useLocale() {
  const context = useContext(TranslationsContext);
  
  if (!context) {
    throw new Error("useLocale must be used within a TranslationsProvider");
  }

  return context.locale;
}
