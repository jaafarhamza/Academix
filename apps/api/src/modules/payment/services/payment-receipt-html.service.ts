import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';
import type { PaymentReceiptTemplateInput } from './payment-receipt.types';

@Injectable()
export class PaymentReceiptHtmlService {
  renderReceipt(input: PaymentReceiptTemplateInput): string {
    const statusTone = this.getStatusTone(input.status);
    const escapedCenterName = this.escapeHtml(input.centerName);
    const escapedStampLabel = this.escapeHtml(
      input.centerStampLabel?.trim() || 'Official Stamp',
    );
    const escapedReceiptNumber = this.escapeHtml(input.receiptNumber);
    const escapedStudentName = this.escapeHtml(input.studentName);
    const escapedTeacherName = this.escapeHtml(input.teacherName);
    const escapedGroupName = this.escapeHtml(
      input.studentGroupName?.trim() || 'Private payment',
    );
    const escapedNotes =
      input.notes && input.notes.trim().length > 0
        ? this.escapeHtml(input.notes.trim())
        : null;
    const logoMarkup =
      input.centerLogoUrl && input.centerLogoUrl.trim().length > 0
        ? `<img class="brand-logo" src="${this.escapeHtml(input.centerLogoUrl)}" alt="${escapedCenterName} logo" />`
        : `<div class="brand-logo brand-logo--fallback" aria-hidden="true">${this.buildInitials(
            input.centerName,
          )}</div>`;
    const stampMarkup =
      input.centerStampUrl && input.centerStampUrl.trim().length > 0
        ? `<div class="stamp stamp--image"><img class="stamp-image" src="${this.escapeHtml(input.centerStampUrl)}" alt="${escapedCenterName} official stamp" /></div>`
        : `<div class="stamp">${escapedStampLabel}</div>`;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Receipt ${escapedReceiptNumber}</title>
    <style>
      :root {
        color-scheme: light;
        --page-bg: #f5efe4;
        --paper-bg: #fffdf8;
        --ink: #1f2937;
        --muted: #6b7280;
        --line: #e5dccf;
        --accent: #8c6239;
        --accent-soft: #efe0ce;
        --status-bg: ${statusTone.background};
        --status-fg: ${statusTone.foreground};
        --status-border: ${statusTone.border};
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 32px;
        background:
          radial-gradient(circle at top left, rgba(140, 98, 57, 0.12), transparent 34%),
          linear-gradient(180deg, #f8f3ea 0%, var(--page-bg) 100%);
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
      }

      .receipt {
        max-width: 860px;
        margin: 0 auto;
        background: var(--paper-bg);
        border: 1px solid var(--line);
        border-radius: 28px;
        overflow: hidden;
        box-shadow: 0 24px 80px rgba(31, 41, 55, 0.12);
      }

      .receipt-header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding: 32px 36px 24px;
        background:
          linear-gradient(135deg, rgba(140, 98, 57, 0.12), rgba(140, 98, 57, 0.02)),
          linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 253, 248, 0.95));
        border-bottom: 1px solid var(--line);
      }

      .brand {
        display: flex;
        gap: 18px;
        align-items: center;
      }

      .brand-logo {
        width: 72px;
        height: 72px;
        border-radius: 22px;
        object-fit: cover;
        background: #ffffff;
        border: 1px solid rgba(140, 98, 57, 0.15);
      }

      .brand-logo--fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--accent) 0%, #b98a57 100%);
        color: #fffaf0;
        font-weight: 700;
        letter-spacing: 0.08em;
      }

      .brand-kicker {
        margin: 0 0 6px;
        font-size: 11px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--accent);
      }

      .brand-name {
        margin: 0;
        font-size: 28px;
        line-height: 1.1;
        font-weight: 700;
      }

      .receipt-title {
        margin: 10px 0 0;
        color: var(--muted);
        font-size: 14px;
      }

      .receipt-meta {
        min-width: 220px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 14px;
        border-radius: 999px;
        background: var(--status-bg);
        color: var(--status-fg);
        border: 1px solid var(--status-border);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .stamp {
        width: 118px;
        height: 118px;
        border-radius: 999px;
        border: 3px dashed rgba(140, 98, 57, 0.45);
        color: var(--accent);
        display: grid;
        place-items: center;
        text-align: center;
        padding: 16px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.2;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        transform: rotate(-10deg);
        background: rgba(255, 253, 248, 0.72);
      }

      .stamp--image {
        padding: 10px;
        background: rgba(255, 253, 248, 0.96);
      }

      .stamp-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 999px;
      }

      .receipt-body {
        padding: 32px 36px 40px;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 260px;
        gap: 24px;
        margin-bottom: 28px;
      }

      .hero-card,
      .summary-card,
      .notes-card {
        border: 1px solid var(--line);
        border-radius: 22px;
        background: #fffdfa;
      }

      .hero-card {
        padding: 24px;
      }

      .hero-label {
        margin: 0 0 10px;
        font-size: 12px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.18em;
      }

      .hero-amount {
        margin: 0;
        font-size: 42px;
        line-height: 1;
        font-weight: 800;
        color: #111827;
      }

      .hero-caption {
        margin: 12px 0 0;
        color: var(--muted);
        font-size: 14px;
      }

      .summary-card {
        padding: 18px 20px;
      }

      .summary-list {
        display: grid;
        gap: 14px;
      }

      .summary-item dt {
        margin: 0 0 4px;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .summary-item dd {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }

      .detail-card {
        padding: 18px 20px;
        border: 1px solid var(--line);
        border-radius: 22px;
        background: #fffdfa;
      }

      .detail-label {
        margin: 0 0 6px;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .detail-value {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        line-height: 1.35;
      }

      .notes-card {
        margin-top: 18px;
        padding: 20px;
      }

      .notes-title {
        margin: 0 0 10px;
        font-size: 12px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.18em;
      }

      .notes-body {
        margin: 0;
        font-size: 15px;
        line-height: 1.6;
        color: #374151;
        white-space: pre-wrap;
      }

      .receipt-footer {
        padding-top: 20px;
        margin-top: 24px;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 13px;
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }
    </style>
  </head>
  <body>
    <main class="receipt">
      <header class="receipt-header">
        <section class="brand">
          ${logoMarkup}
          <div>
            <p class="brand-kicker">Official Payment Receipt</p>
            <h1 class="brand-name">${escapedCenterName}</h1>
            <p class="receipt-title">Receipt #${escapedReceiptNumber}</p>
          </div>
        </section>
        <section class="receipt-meta">
          <div class="status-pill">${this.escapeHtml(
            this.toReadableStatus(input.status),
          )}</div>
          ${stampMarkup}
        </section>
      </header>

      <section class="receipt-body">
        <div class="hero">
          <article class="hero-card">
            <p class="hero-label">Amount Received</p>
            <p class="hero-amount">${this.formatCurrency(input.paidAmount)}</p>
            <p class="hero-caption">Issued on ${this.escapeHtml(
              this.formatDate(input.paymentDate),
            )}</p>
          </article>

          <aside class="summary-card">
            <dl class="summary-list">
              <div class="summary-item">
                <dt>Expected Amount</dt>
                <dd>${this.formatCurrency(input.amount)}</dd>
              </div>
              <div class="summary-item">
                <dt>Remaining Balance</dt>
                <dd>${this.formatCurrency(input.rest)}</dd>
              </div>
              <div class="summary-item">
                <dt>Method</dt>
                <dd>${this.escapeHtml(this.toReadableMethod(input.method))}</dd>
              </div>
            </dl>
          </aside>
        </div>

        <section class="details-grid">
          <article class="detail-card">
            <p class="detail-label">Student</p>
            <p class="detail-value">${escapedStudentName}</p>
          </article>
          <article class="detail-card">
            <p class="detail-label">Teacher</p>
            <p class="detail-value">${escapedTeacherName}</p>
          </article>
          <article class="detail-card">
            <p class="detail-label">Group</p>
            <p class="detail-value">${escapedGroupName}</p>
          </article>
          <article class="detail-card">
            <p class="detail-label">Payment Status</p>
            <p class="detail-value">${this.escapeHtml(
              this.toReadableStatus(input.status),
            )}</p>
          </article>
        </section>

        ${
          escapedNotes
            ? `<section class="notes-card">
          <h2 class="notes-title">Notes</h2>
          <p class="notes-body">${escapedNotes}</p>
        </section>`
            : ''
        }

        <footer class="receipt-footer">
          <span>Generated by Academix</span>
          <span>Keep this receipt as proof of payment.</span>
        </footer>
      </section>
    </main>
  </body>
</html>`;
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private getStatusTone(status: PaymentStatus): {
    background: string;
    foreground: string;
    border: string;
  } {
    switch (status) {
      case PaymentStatus.PAID:
        return {
          background: '#e8f7ef',
          foreground: '#0f6b42',
          border: '#8fd5ae',
        };
      case PaymentStatus.PARTIALLY_PAID:
        return {
          background: '#fff4de',
          foreground: '#9a5a00',
          border: '#e8c276',
        };
      case PaymentStatus.UNPAID:
        return {
          background: '#fde8e8',
          foreground: '#9f1d1d',
          border: '#f1aaaa',
        };
      default:
        return {
          background: '#f3f4f6',
          foreground: '#374151',
          border: '#d1d5db',
        };
    }
  }

  private toReadableStatus(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.PAID:
        return 'Paid';
      case PaymentStatus.PARTIALLY_PAID:
        return 'Partially paid';
      case PaymentStatus.UNPAID:
        return 'Unpaid';
      default:
        return status;
    }
  }

  private toReadableMethod(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH:
        return 'Cash';
      default:
        return method;
    }
  }

  private buildInitials(value: string): string {
    const initials = value
      .split(/\s+/)
      .filter((segment) => segment.length > 0)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase() ?? '')
      .join('');

    return initials || 'AC';
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
