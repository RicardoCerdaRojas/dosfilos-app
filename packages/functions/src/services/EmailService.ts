/**
 * Email Service - Clean Architecture
 * 
 * Responsibilities:
 * - Send transactional emails via Resend
 * - Support i18n templates
 * - Type-safe email data
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles email sending
 * - Open/Closed: Easy to add new email types
 * - Dependency Inversion: Depends on EmailProvider interface
 */

import { Resend } from 'resend';

// ============================================================================
// Domain Models (Types)
// ============================================================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export type SupportedLocale = 'en' | 'es';

export interface EmailContext {
  locale: SupportedLocale;
  recipient: EmailRecipient;
  data: Record<string, any>;
}

// ============================================================================
// Email Provider Interface (Dependency Inversion)
// ============================================================================

export interface IEmailProvider {
  send(params: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<{ id: string }>;
}

// ============================================================================
// Resend Provider Implementation
// ============================================================================

export class ResendProvider implements IEmailProvider {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async send(params: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<{ id: string }> {
    const result = await this.resend.emails.send({
      from: params.from || 'DosFilos.Preach <noreply@dosfilos.com>',
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    return { id: result.data?.id || '' };
  }
}

// ============================================================================
// Email Templates (i18n)
// ============================================================================

interface TrialWelcomeData {
  displayName: string;
  planName: string;
  trialEndDate: string;
  dashboardUrl: string;
}

interface SetPasswordData {
  displayName: string;
  setPasswordUrl: string;
  expiresIn: string;
}

class EmailTemplates {
  /**
   * Welcome email after trial starts
   */
  static trialWelcome(context: EmailContext): { subject: string; html: string } {
    const { locale, data } = context;
    const d = data as TrialWelcomeData;

    const templates = {
      en: {
        subject: `Welcome to DosFilos.Preach, ${d.displayName}! 🎉`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .feature { margin: 15px 0; padding-left: 25px; position: relative; }
              .feature:before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              .trial-box { background: #fef3c7; border: 2px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Welcome to DosFilos.Preach!</h1>
              </div>
              <div class="content">
                <p>Hi ${d.displayName},</p>
                
                <p>Your <strong>30-day free trial</strong> of the <strong>${d.planName}</strong> plan has started!</p>
                
                <div class="trial-box">
                  <strong>🎁 Your trial details:</strong><br>
                  Plan: ${d.planName}<br>
                  Trial ends: ${d.trialEndDate}<br>
                  Status: Active
                </div>
                
                <p><strong>What you can do now:</strong></p>
                <div class="feature">Create sermons with AI assistance</div>
                <div class="feature">Access advanced homiletical analysis</div>
                <div class="feature">Study biblical Greek interactively</div>
                <div class="feature">Build your sermon library</div>
                <div class="feature">Plan your preaching schedule</div>
                
                <center>
                  <a href="${d.dashboardUrl}" class="button">Go to Dashboard</a>
                </center>
                
                <p><strong>No payment today!</strong> You won't be charged until your trial ends on ${d.trialEndDate}. Cancel anytime with one click.</p>
                
                <p>If you have questions, just reply to this email.</p>
                
                <p>Blessings,<br>The DosFilos Team</p>
              </div>
              <div class="footer">
                © 2026 DosFilos.Preach. All rights reserved.
              </div>
            </div>
          </body>
          </html>
        `
      },
      es: {
        subject: `¡Bienvenido a DosFilos.Preach, ${d.displayName}! 🎉`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .feature { margin: 15px 0; padding-left: 25px; position: relative; }
              .feature:before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              .trial-box { background: #fef3c7; border: 2px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 ¡Bienvenido a DosFilos.Preach!</h1>
              </div>
              <div class="content">
                <p>Hola ${d.displayName},</p>
                
                <p>¡Tu <strong>prueba gratuita de 30 días</strong> del plan <strong>${d.planName}</strong> ha comenzado!</p>
                
                <div class="trial-box">
                  <strong>🎁 Detalles de tu prueba:</strong><br>
                  Plan: ${d.planName}<br>
                  Fin de prueba: ${d.trialEndDate}<br>
                  Estado: Activo
                </div>
                
                <p><strong>Lo que puedes hacer ahora:</strong></p>
                <div class="feature">Crear sermones con asistencia de IA</div>
                <div class="feature">Acceder a análisis homilético avanzado</div>
                <div class="feature">Estudiar griego bíblico de forma interactiva</div>
                <div class="feature">Construir tu biblioteca de sermones</div>
                <div class="feature">Planificar tu calendario de predicación</div>
                
                <center>
                  <a href="${d.dashboardUrl}" class="button">Ir al Dashboard</a>
                </center>
                
                <p><strong>¡No se cobra nada hoy!</strong> No se te cobrará hasta que termine tu prueba el ${d.trialEndDate}. Cancela en cualquier momento con un solo clic.</p>
                
                <p>Si tienes preguntas, simplemente responde a este email.</p>
                
                <p>Bendiciones,<br>El equipo de DosFilos</p>
              </div>
              <div class="footer">
                © 2026 DosFilos.Preach. Todos los derechos reservados.
              </div>
            </div>
          </body>
          </html>
        `
      }
    };

    return templates[locale];
  }

  /**
   * Email with link to set password after payment
   */
  static setPassword(context: EmailContext): { subject: string; html: string } {
    const { locale, data } = context;
    const d = data as SetPasswordData;

    const templates = {
      en: {
        subject: 'Set your password - DosFilos.Preach',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Set Your Password</h1>
              </div>
              <div class="content">
                <p>Hi ${d.displayName},</p>
                
                <p>Welcome to DosFilos.Preach! Your payment was successful and your trial has started.</p>
                
                <p>To complete your registration, please set your password:</p>
                
                <center>
                  <a href="${d.setPasswordUrl}" class="button">Set Password</a>
                </center>
                
                <div class="warning-box">
                  <strong>⏰ This link expires in ${d.expiresIn}</strong><br>
                  For security, make sure to set your password soon.
                </div>
                
                <p>If you didn't sign up for DosFilos.Preach, please ignore this email or contact us.</p>
                
                <p>Blessings,<br>The DosFilos Team</p>
              </div>
              <div class="footer">
                © 2026 DosFilos.Preach. All rights reserved.
              </div>
            </div>
          </body>
          </html>
        `
      },
      es: {
        subject: 'Configura tu contraseña - DosFilos.Preach',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Configura tu Contraseña</h1>
              </div>
              <div class="content">
                <p>Hola ${d.displayName},</p>
                
                <p>¡Bienvenido a DosFilos.Preach! Tu pago fue exitoso y tu prueba ha comenzado.</p>
                
                <p>Para completar tu registro, por favor configura tu contraseña:</p>
                
                <center>
                  <a href="${d.setPasswordUrl}" class="button">Configurar Contraseña</a>
                </center>
                
                <div class="warning-box">
                  <strong>⏰ Este enlace expira en ${d.expiresIn}</strong><br>
                  Por seguridad, asegúrate de configurar tu contraseña pronto.
                </div>
                
                <p>Si no te registraste en DosFilos.Preach, por favor ignora este email o contáctanos.</p>
                
                <p>Bendiciones,<br>El equipo de DosFilos</p>
              </div>
              <div class="footer">
                © 2026 DosFilos.Preach. Todos los derechos reservados.
              </div>
            </div>
          </body>
          </html>
        `
      }
    };

    return templates[locale];
  }
}

// ============================================================================
// Email Service (Application Layer)
// ============================================================================

export class EmailService {
  constructor(private provider: IEmailProvider) { }

  async sendTrialWelcome(
    recipient: EmailRecipient,
    data: TrialWelcomeData,
    locale: SupportedLocale = 'es'
  ): Promise<{ id: string }> {
    const context: EmailContext = { locale, recipient, data };
    const { subject, html } = EmailTemplates.trialWelcome(context);

    return this.provider.send({
      to: recipient.email,
      subject,
      html
    });
  }

  async sendSetPassword(
    recipient: EmailRecipient,
    data: SetPasswordData,
    locale: SupportedLocale = 'es'
  ): Promise<{ id: string }> {
    const context: EmailContext = { locale, recipient, data };
    const { subject, html } = EmailTemplates.setPassword(context);

    return this.provider.send({
      to: recipient.email,
      subject,
      html
    });
  }
}

// ============================================================================
// Factory (Dependency Injection)
// ============================================================================

export function createEmailService(): EmailService {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required');
  }

  const provider = new ResendProvider(apiKey);
  return new EmailService(provider);
}
