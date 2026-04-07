import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { launch } from 'puppeteer-core';
import type { PaymentReceiptTemplateInput } from './payment-receipt.types';
import { PaymentReceiptHtmlService } from './payment-receipt-html.service';

export type PaymentReceiptPdfInput = PaymentReceiptTemplateInput;

@Injectable()
export class PaymentReceiptPdfService {
  constructor(
    private readonly paymentReceiptHtmlService: PaymentReceiptHtmlService,
    private readonly configService: ConfigService,
  ) {}

  async generateReceipt(input: PaymentReceiptPdfInput): Promise<Buffer> {
    const html = this.paymentReceiptHtmlService.renderReceipt(input);
    const executablePath = this.resolveExecutablePath();
    const browser = await launch({
      executablePath,
      headless: this.resolveHeadlessMode(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=medium',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '16px',
          right: '16px',
          bottom: '16px',
          left: '16px',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private resolveExecutablePath(): string {
    const configuredPath =
      this.configService.get<string>('receiptPdf.executablePath') ?? '';
    const candidatePaths = [
      configuredPath.trim(),
      ...this.getDefaultExecutablePaths(),
    ].filter((value) => value.length > 0);

    const executablePath = candidatePaths.find((candidatePath) =>
      existsSync(candidatePath),
    );

    if (executablePath) {
      return executablePath;
    }

    throw new InternalServerErrorException(
      'Chromium executable is not configured for receipt PDF generation',
    );
  }

  private resolveHeadlessMode(): boolean {
    return this.configService.get<boolean>('receiptPdf.headless') ?? true;
  }

  private getDefaultExecutablePaths(): string[] {
    switch (process.platform) {
      case 'win32':
        return [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Chromium\\Application\\chrome.exe',
        ];
      case 'darwin':
        return [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ];
      default:
        return [
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
        ];
    }
  }
}
