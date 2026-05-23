import Razorpay from 'razorpay';
import crypto from 'crypto';

// Lazy-initialize Razorpay instance to avoid crashing when keys are not configured
let razorpay;
function getRazorpay() {
    if (!razorpay) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.warn('⚠️  RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not configured - payment features will not work');
            return null;
        }
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }
    return razorpay;
}

/**
 * Create a Razorpay order for escrow payment
 * @param {number} amount - Amount in INR (will be converted to paise)
 * @param {string} receipt - Unique receipt ID for tracking
 * @param {object} notes - Additional metadata
 * @returns {Promise<object>} Razorpay order object
 */
export const createOrder = async (amount, receipt, notes = {}) => {
    const options = {
        amount: Math.round(amount * 100), // Razorpay expects amount in paise
        currency: 'INR',
        receipt: receipt,
        notes: notes,
        payment_capture: 1 // Auto-capture payment
    };

    try {
        const instance = getRazorpay();
        if (!instance) throw new Error('Razorpay is not configured');
        const order = await instance.orders.create(options);
        console.log('📦 Razorpay order created:', order.id);
        return order;
    } catch (error) {
        console.error('❌ Failed to create Razorpay order:', error);
        throw new Error(`Failed to create payment order: ${error.message}`);
    }
};

/**
 * Verify payment signature from Razorpay
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean} Whether the signature is valid
 */
export const verifyPaymentSignature = (orderId, paymentId, signature) => {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    try {
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');
        const providedBuffer = Buffer.from(signature, 'hex');

        if (expectedBuffer.length !== providedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch {
        return false;
    }
};

/**
 * Get order details from Razorpay
 * @param {string} orderId - Razorpay order ID
 * @returns {Promise<object>} Order details
 */
export const getOrder = async (orderId) => {
    try {
        const instance = getRazorpay();
        if (!instance) throw new Error('Razorpay is not configured');
        return await instance.orders.fetch(orderId);
    } catch (error) {
        console.error('❌ Failed to fetch order:', error);
        throw new Error(`Failed to fetch order: ${error.message}`);
    }
};

/**
 * Get payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<object>} Payment details
 */
export const getPayment = async (paymentId) => {
    try {
        const instance = getRazorpay();
        if (!instance) throw new Error('Razorpay is not configured');
        return await instance.payments.fetch(paymentId);
    } catch (error) {
        console.error('❌ Failed to fetch payment:', error);
        throw new Error(`Failed to fetch payment: ${error.message}`);
    }
};

export default getRazorpay;
