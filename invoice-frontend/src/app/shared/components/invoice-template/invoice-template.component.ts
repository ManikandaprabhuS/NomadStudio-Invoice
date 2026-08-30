import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-invoice-template',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './invoice-template.component.html',
    styleUrl: './invoice-template.component.css'
})
export class InvoiceTemplateComponent implements OnChanges {
    @Input() invoice: any;

    displayServices: any[] = [];
    amountInWords: string = '';
    displaySubTotal = 0;
    displayCgst = 0;
    displaySgst = 0;
    displayRoundOff = 0;
    displayTotal = 0;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['invoice'] && this.invoice) {
            this.prepareDisplayData();
            this.prepareAmounts();
            this.amountInWords = this.numberToWords(this.displayTotal);
        }
    }

    prepareDisplayData() {
        // Clone services to avoid mutating original input
        this.displayServices = this.invoice.services ? [...this.invoice.services] : [];

        // Ensure minimum rows for PDF layout (Requirement: at least 5 empty rows)
        const minRows = 5;
        const currentCount = this.displayServices.length;
        if (currentCount < minRows) {
            const diff = minRows - currentCount;
            for (let i = 0; i < diff; i++) {
                this.displayServices.push({ isEmpty: true });
            }
        }
    }

    prepareAmounts() {
        const serviceSubTotal = (this.invoice.services || []).reduce(
            (sum: number, service: any) => {
                const storedAmount = Number(service.amountCharged);
                const calculatedAmount = Number(service.quantity || 0) * Number(service.pricePerUnit || 0);
                return sum + (Number.isFinite(storedAmount) ? storedAmount : calculatedAmount);
            },
            0
        );
        this.displaySubTotal = this.hasNumber(this.invoice.subTotal)
            ? Number(this.invoice.subTotal)
            : this.roundCurrency(serviceSubTotal);
        this.displayCgst = this.hasNumber(this.invoice.cgstAmount)
            ? Number(this.invoice.cgstAmount)
            : this.roundCurrency(this.displaySubTotal * 0.09);
        this.displaySgst = this.hasNumber(this.invoice.sgstAmount)
            ? Number(this.invoice.sgstAmount)
            : this.roundCurrency(this.displaySubTotal * 0.09);
        const totalBeforeRoundOff = this.roundCurrency(
            this.displaySubTotal + this.displayCgst + this.displaySgst
        );
        this.displayTotal = this.roundFinalAmount(totalBeforeRoundOff);
        this.displayRoundOff = this.hasNumber(this.invoice.roundOff)
            ? Number(this.invoice.roundOff)
            : this.roundCurrency(this.displayTotal - totalBeforeRoundOff);
    }

    trackServiceRow(index: number): number {
        return index;
    }

    private hasNumber(value: unknown): boolean {
        return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
    }

    private roundCurrency(value: number): number {
        return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    }

    private roundFinalAmount(value: number): number {
        const wholeAmount = Math.floor(value);
        const decimalAmount = this.roundCurrency(value - wholeAmount);
        return decimalAmount <= 0.5 ? wholeAmount : wholeAmount + 1;
    }

    numberToWords(amount: number): string {
        if (amount === 0) return 'Zero Rupees Only';

        const words = [
            '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
        ];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        const numString = Math.floor(amount).toString();
        const parts = numString.split('.');
        let integerPart = parseInt(parts[0]);

        if (integerPart === 0) return 'Zero Rupees Only';

        const convertGroup = (n: number): string => {
            if (n < 20) return words[n];
            const digit = n % 10;
            const ten = Math.floor(n / 10);
            return tens[ten] + (digit ? ' ' + words[digit] : '');
        };

        const convertRecursive = (n: number): string => {
            if (n < 100) return convertGroup(n);
            if (n < 1000) return words[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertRecursive(n % 100) : '');
            if (n < 100000) return convertRecursive(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convertRecursive(n % 1000) : '');
            if (n < 10000000) return convertRecursive(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convertRecursive(n % 100000) : '');
            return convertRecursive(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convertRecursive(n % 10000000) : '');
        };

        return convertRecursive(integerPart) + ' Rupees Only';
    }
}
