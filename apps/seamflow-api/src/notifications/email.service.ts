// ============================================================================
// Transactional email, through Resend.
//
// WHY EMAIL MATTERS MORE THAN IT LOOKS
// Subscriptions are sold on the web, because neither store allows selling
// in-app features through our own rails. That makes email the one channel
// where SeamFlow may actually say "your trial ends in three days, here is
// what it costs, here is where to pay" — and the only way an iPhone tailor
// ever finds that out, since the app itself is forbidden from telling them.
//
// Unconfigured (no RESEND_API_KEY) it logs and returns false rather than
// throwing: a missing key must never take down the job that was sending.
// Plain REST rather than the SDK — one POST, no dependency.
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const RESEND_URL = 'https://api.resend.com/emails';

export interface OutgoingEmail {
  to: string;
  subject: string;
  /** Plain text. Always sent — some clients and most filters prefer it. */
  text: string;
  html?: string;
}

/**
 * Where replies go.
 *
 * The From address sends but cannot receive: seamflowtech.com has no inbox
 * records, so a tailor who answers a renewal email would be writing into
 * nothing. EMAIL_REPLY_TO points those replies at a mailbox a person reads.
 * Someone replying to an email about money is the most valuable message we
 * will get all week; losing it is worse than any delivery problem.
 */

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>('RESEND_API_KEY');
  }

  /** Returns whether it was actually sent. Never throws. */
  async send(email: OutgoingEmail): Promise<boolean> {
    const key = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM');
    const replyTo = this.config.get<string>('EMAIL_REPLY_TO');
    if (!key || !from) {
      this.logger.warn(`Email not configured; would have sent "${email.subject}" to ${email.to}`);
      return false;
    }
    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [email.to],
          subject: email.subject,
          text: email.text,
          ...(replyTo ? { reply_to: replyTo } : {}),
          ...(email.html ? { html: email.html } : {}),
        }),
      });
      if (!res.ok) {
        this.logger.error(`Resend refused "${email.subject}" to ${email.to}: ${res.status} ${await res.text()}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Sending "${email.subject}" failed: ${(err as Error).message}`);
      return false;
    }
  }
}
