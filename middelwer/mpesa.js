/**
 * M-Pesa Daraja API Utility Module
 * Handles OAuth token generation, URL registration, and C2B operations
 */

const https = require('https');
const { conn } = require('./db');

// Get M-Pesa configuration from database
const getMpesaConfig = () => {
    return new Promise((resolve, reject) => {
        conn.query(
            'SELECT mpesa_consumer_key, mpesa_consumer_secret, mpesa_shortcode, mpesa_passkey, mpesa_environment, mpesa_enabled FROM tbl_master_shop WHERE id = 1',
            (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (results.length === 0) {
                    reject(new Error('M-Pesa configuration not found'));
                    return;
                }
                resolve(results[0]);
            }
        );
    });
};

// Get base URL based on environment
const getBaseUrl = (environment) => {
    return environment === 'production'
        ? 'api.safaricom.co.ke'
        : 'sandbox.safaricom.co.ke';
};

// Generate OAuth Access Token
const getAccessToken = async () => {
    const config = await getMpesaConfig();

    if (!config.mpesa_consumer_key || !config.mpesa_consumer_secret) {
        throw new Error('M-Pesa credentials not configured');
    }

    const auth = Buffer.from(
        `${config.mpesa_consumer_key}:${config.mpesa_consumer_secret}`
    ).toString('base64');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: getBaseUrl(config.mpesa_environment),
            path: '/oauth/v1/generate?grant_type=client_credentials',
            method: 'GET',
            headers: {
                Authorization: `Basic ${auth}`,
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.access_token) {
                        resolve(response.access_token);
                    } else {
                        reject(new Error(response.errorMessage || 'Failed to get access token'));
                    }
                } catch (e) {
                    reject(new Error('Invalid response from M-Pesa API'));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
};

// Register C2B Validation and Confirmation URLs
const registerC2BUrls = async (callbackBaseUrl) => {
    const config = await getMpesaConfig();
    const accessToken = await getAccessToken();

    const payload = JSON.stringify({
        ShortCode: config.mpesa_shortcode,
        ResponseType: 'Completed', // or 'Cancelled'
        ConfirmationURL: `${callbackBaseUrl}/mpesa/confirmation`,
        ValidationURL: `${callbackBaseUrl}/mpesa/validation`,
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: getBaseUrl(config.mpesa_environment),
            path: '/mpesa/c2b/v1/registerurl',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (e) {
                    reject(new Error('Invalid response from M-Pesa API'));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(payload);
        req.end();
    });
};

// Format phone number to M-Pesa format (254XXXXXXXXX)
const formatPhoneNumber = (phone) => {
    if (!phone) return null;

    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
        // Kenyan local format: 07XXXXXXXX -> 254XXXXXXXXX
        cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
        // Short format: 7XXXXXXXX -> 254XXXXXXXXX
        cleaned = '254' + cleaned;
    } else if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    }

    return cleaned;
};

// Parse M-Pesa timestamp format (YYYYMMDDHHmmss) to Date
const parseMpesaTimestamp = (timestamp) => {
    if (!timestamp || timestamp.length !== 14) return new Date();

    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    const second = timestamp.substring(12, 14);

    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
};

// Save M-Pesa transaction to database
const saveTransaction = (transaction) => {
    return new Promise((resolve, reject) => {
        const sql = `
      INSERT INTO tbl_mpesa_transactions 
      (trans_id, trans_type, trans_time, trans_amount, business_shortcode, 
       bill_ref_number, invoice_number, org_account_balance, third_party_trans_id,
       msisdn, first_name, middle_name, last_name, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

        const values = [
            transaction.TransID,
            transaction.TransactionType,
            parseMpesaTimestamp(transaction.TransTime),
            parseFloat(transaction.TransAmount),
            transaction.BusinessShortCode,
            transaction.BillRefNumber,
            transaction.InvoiceNumber || null,
            transaction.OrgAccountBalance ? parseFloat(transaction.OrgAccountBalance) : null,
            transaction.ThirdPartyTransID || null,
            transaction.MSISDN,
            transaction.FirstName || null,
            transaction.MiddleName || null,
            transaction.LastName || null,
        ];

        conn.query(sql, values, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result.insertId);
        });
    });
};

// Try to match transaction to an order based on BillRefNumber (Account Number)
const matchTransactionToOrder = async (transactionId, billRefNumber) => {
    return new Promise((resolve, reject) => {
        // First, try to find an order with matching order_id
        const findOrderSql = `
      SELECT id, order_id, gross_total, paid_amount, balance_amount, store_id 
      FROM tbl_order 
      WHERE order_id = ? OR id = ?
    `;

        conn.query(findOrderSql, [billRefNumber, billRefNumber], (err, orders) => {
            if (err) {
                reject(err);
                return;
            }

            if (orders.length === 0) {
                // No matching order found, mark as unmatched
                conn.query(
                    'UPDATE tbl_mpesa_transactions SET status = ? WHERE id = ?',
                    ['unmatched', transactionId],
                    (updateErr) => {
                        if (updateErr) reject(updateErr);
                        else resolve({ matched: false, reason: 'No matching order found' });
                    }
                );
                return;
            }

            const order = orders[0];

            // Get the transaction amount
            conn.query(
                'SELECT trans_amount FROM tbl_mpesa_transactions WHERE id = ?',
                [transactionId],
                (txErr, txResults) => {
                    if (txErr) {
                        reject(txErr);
                        return;
                    }

                    const transAmount = parseFloat(txResults[0].trans_amount);
                    const newPaidAmount = parseFloat(order.paid_amount || 0) + transAmount;
                    const newBalance = parseFloat(order.gross_total) - newPaidAmount;

                    // Update the order with the new payment
                    const updateOrderSql = `
            UPDATE tbl_order 
            SET paid_amount = ?, balance_amount = ?
            WHERE id = ?
          `;

                    conn.query(updateOrderSql, [newPaidAmount, newBalance, order.id], (orderErr) => {
                        if (orderErr) {
                            reject(orderErr);
                            return;
                        }

                        // Update the M-Pesa transaction with order reference
                        const updateTxSql = `
              UPDATE tbl_mpesa_transactions 
              SET status = 'matched', order_id = ?, store_id = ?
              WHERE id = ?
            `;

                        conn.query(updateTxSql, [order.id, order.store_id, transactionId], (txUpdateErr) => {
                            if (txUpdateErr) {
                                reject(txUpdateErr);
                                return;
                            }

                            // Record the payment in tbl_order_payment
                            const paymentSql = `
                INSERT INTO tbl_order_payment (payment_amount, payment_account, order_id)
                VALUES (?, 'M-Pesa', ?)
              `;

                            conn.query(paymentSql, [transAmount, order.order_id || order.id], (payErr) => {
                                if (payErr) {
                                    console.error('Error recording payment:', payErr);
                                }
                                resolve({
                                    matched: true,
                                    orderId: order.id,
                                    orderNumber: order.order_id,
                                    amountApplied: transAmount,
                                    newBalance: newBalance
                                });
                            });
                        });
                    });
                }
            );
        });
    });
};

// Get all M-Pesa transactions with optional filtering
const getTransactions = (filters = {}) => {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT * FROM tbl_mpesa_transactions WHERE 1=1';
        const params = [];

        if (filters.status) {
            sql += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.from_date) {
            sql += ' AND created_at >= ?';
            params.push(filters.from_date);
        }

        if (filters.to_date) {
            sql += ' AND created_at <= ?';
            params.push(filters.to_date);
        }

        if (filters.store_id) {
            sql += ' AND store_id = ?';
            params.push(filters.store_id);
        }

        sql += ' ORDER BY created_at DESC';

        if (filters.limit) {
            sql += ' LIMIT ?';
            params.push(parseInt(filters.limit));
        }

        conn.query(sql, params, (err, results) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(results);
        });
    });
};

module.exports = {
    getMpesaConfig,
    getAccessToken,
    registerC2BUrls,
    formatPhoneNumber,
    parseMpesaTimestamp,
    saveTransaction,
    matchTransactionToOrder,
    getTransactions,
};
