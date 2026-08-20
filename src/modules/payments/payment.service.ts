import crypto from "crypto";

export interface PaymentResult {
  paymentId: string;
  status: "SUCCESS" | "FAILED";
}

export class PaymentService {
  static async processPayment(amount: number): Promise<PaymentResult> {
    // Simulated payment - always succeeds in development
    const paymentId = `SIM-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    return {
      paymentId,
      status: "SUCCESS",
    };
  }
}
