import { Button, Heading, Section, Text, Link } from '@react-email/components';
import * as React from 'react';
import { emailTheme as t } from './theme';

/**
 * Reusable building blocks. Templates compose these instead of
 * styling raw <h1>/<p>/<a> so typography stays consistent across
 * every email surface.
 */

export function H1({ children }: { children: React.ReactNode }) {
    return (
        <Heading as="h1" style={{
            fontSize: t.sizes.h1,
            fontWeight: 700,
            color: t.palette.textPrimary,
            lineHeight: 1.25,
            margin: `${t.spacing.lg} 0 ${t.spacing.md} 0`,
        }}>
            {children}
        </Heading>
    );
}

export function H2({ children }: { children: React.ReactNode }) {
    return (
        <Heading as="h2" style={{
            fontSize: t.sizes.h2,
            fontWeight: 700,
            color: t.palette.textPrimary,
            lineHeight: 1.3,
            margin: `${t.spacing.xl} 0 ${t.spacing.sm} 0`,
        }}>
            {children}
        </Heading>
    );
}

export function H3({ children }: { children: React.ReactNode }) {
    return (
        <Heading as="h3" style={{
            fontSize: t.sizes.h3,
            fontWeight: 600,
            color: t.palette.textPrimary,
            lineHeight: 1.4,
            margin: `${t.spacing.lg} 0 ${t.spacing.xs} 0`,
        }}>
            {children}
        </Heading>
    );
}

export function P({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
    return (
        <Text style={{
            fontSize: t.sizes.body,
            lineHeight: t.sizes.bodyLineHeight,
            color: muted ? t.palette.textSecondary : t.palette.textPrimary,
            margin: `${t.spacing.sm} 0`,
        }}>
            {children}
        </Text>
    );
}

interface CtaButtonProps {
    href: string;
    children: React.ReactNode;
}

export function CtaButton({ href, children }: CtaButtonProps) {
    return (
        <Section style={{ textAlign: 'center', margin: `${t.spacing.xl} 0` }}>
            <Button
                href={href}
                style={{
                    backgroundColor: t.palette.brandPrimary,
                    color: '#FFFFFF',
                    padding: `14px 28px`,
                    borderRadius: t.radius.lg,
                    fontWeight: 600,
                    fontSize: '15px',
                    textDecoration: 'none',
                    display: 'inline-block',
                }}
            >
                {children}
            </Button>
        </Section>
    );
}

interface QuoteProps {
    children: React.ReactNode;
    /** Optional citation rendered below the quote in muted style. */
    cite?: string;
}

export function Quote({ children, cite }: QuoteProps) {
    return (
        <Section style={{
            backgroundColor: t.palette.brandTint,
            borderLeft: `3px solid ${t.palette.brandPrimary}`,
            padding: `${t.spacing.md} ${t.spacing.lg}`,
            margin: `${t.spacing.lg} 0`,
            borderRadius: `0 ${t.radius.md} ${t.radius.md} 0`,
        }}>
            <Text style={{
                fontStyle: 'italic',
                fontSize: t.sizes.body,
                lineHeight: t.sizes.bodyLineHeight,
                color: t.palette.textSecondary,
                margin: 0,
            }}>
                {children}
            </Text>
            {cite && (
                <Text style={{
                    fontSize: t.sizes.small,
                    color: t.palette.textMuted,
                    margin: `${t.spacing.xs} 0 0 0`,
                }}>
                    — {cite}
                </Text>
            )}
        </Section>
    );
}

interface SenderCardProps {
    senderName: string;
    note?: string | null;
    label?: string;
}

/**
 * Card shown above the body when the email is from a person (vs from
 * the platform). The recipient sees who sent it and any personal
 * note before getting to the artifact content.
 */
export function SenderCard({ senderName, note, label = 'Recurso compartido por' }: SenderCardProps) {
    return (
        <Section style={{
            backgroundColor: t.palette.bgPage,
            borderLeft: `3px solid ${t.palette.brandPrimary}`,
            padding: `${t.spacing.md} ${t.spacing.lg}`,
            margin: `0 0 ${t.spacing.xl} 0`,
            borderRadius: `0 ${t.radius.md} ${t.radius.md} 0`,
        }}>
            <Text style={{
                fontSize: t.sizes.micro,
                color: t.palette.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: 0,
                fontWeight: 600,
            }}>
                {label}
            </Text>
            <Text style={{
                fontSize: t.sizes.body,
                color: t.palette.textPrimary,
                margin: `${t.spacing.xs} 0 ${note ? t.spacing.sm : '0'} 0`,
                fontWeight: 600,
            }}>
                {senderName}
            </Text>
            {note && (
                <Text style={{
                    fontSize: t.sizes.body,
                    color: t.palette.textSecondary,
                    margin: 0,
                    fontStyle: 'italic',
                    lineHeight: 1.6,
                }}>
                    "{note}"
                </Text>
            )}
        </Section>
    );
}

export function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link href={href} style={{
            color: t.palette.brandPrimary,
            textDecoration: 'underline',
        }}>
            {children}
        </Link>
    );
}
