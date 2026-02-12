/**
 * M-Pesa C2B Router
 * Handles M-Pesa callback endpoints and transaction management
 */

const express = require('express');
const router = express.Router();
const auth = require('../middelwer/auth');
const access = require('../middelwer/access');
const {
    getMpesaConfig,
    getAccessToken,
    registerC2BUrls,
    saveTransaction,
    matchTransactionToOrder,
    getTransactions
} = require('../middelwer/mpesa');
const { DataFind, DataUpdate } = require('../middelwer/databaseQurey');

/**
 * C2B Validation URL
 * Called by M-Pesa to validate incoming payments before processing
 * POST /mpesa/validation
 */
router.post('/validation', async (req, res) => {
    try {
        console.log('M-Pesa Validation Request:', JSON.stringify(req.body, null, 2));

        const { TransAmount, BillRefNumber, MSISDN } = req.body;

        // Basic validation - you can add custom validation logic here
        // For example, check if the BillRefNumber matches a valid order

        if (!TransAmount || parseFloat(TransAmount) <= 0) {
            return res.json({
                ResultCode: 'C2B00012',
                ResultDesc: 'Invalid Amount'
            });
        }

        // Accept the transaction
        res.json({
            ResultCode: '0',
            ResultDesc: 'Accepted'
        });

    } catch (error) {
        console.error('M-Pesa Validation Error:', error);
        res.json({
            ResultCode: 'C2B00016',
            ResultDesc: 'System Error'
        });
    }
});

/**
 * C2B Confirmation URL
 * Called by M-Pesa after successful payment
 * POST /mpesa/confirmation
 */
router.post('/confirmation', async (req, res) => {
    try {
        console.log('M-Pesa Confirmation Request:', JSON.stringify(req.body, null, 2));

        const transaction = req.body;

        // Save the transaction to database
        const transactionId = await saveTransaction(transaction);
        console.log('Transaction saved with ID:', transactionId);

        // Try to match to an order
        const matchResult = await matchTransactionToOrder(
            transactionId,
            transaction.BillRefNumber
        );

        console.log('Match result:', matchResult);

        // Always respond with success to M-Pesa
        res.json({
            ResultCode: '0',
            ResultDesc: 'Confirmation received successfully'
        });

    } catch (error) {
        console.error('M-Pesa Confirmation Error:', error);

        // Still respond with success to prevent M-Pesa retries
        // Log the error for manual handling
        res.json({
            ResultCode: '0',
            ResultDesc: 'Received'
        });
    }
});

/**
 * Register C2B URLs with Safaricom
 * POST /mpesa/register-urls
 */
router.post('/register-urls', auth, async (req, res) => {
    try {
        const accessdata = await access(req.user);

        // Check if user has permission (master settings access)
        if (!accessdata.master_setting || !accessdata.master_setting.includes('edit')) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to perform this action'
            });
        }

        const { callbackUrl } = req.body;

        if (!callbackUrl) {
            return res.status(400).json({
                success: false,
                message: 'Callback URL is required'
            });
        }

        const result = await registerC2BUrls(callbackUrl);

        res.json({
            success: true,
            message: 'URLs registered successfully',
            data: result
        });

    } catch (error) {
        console.error('URL Registration Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to register URLs'
        });
    }
});

/**
 * Get M-Pesa transactions list
 * GET /mpesa/transactions
 */
router.get('/transactions', auth, async (req, res) => {
    try {
        const accessdata = await access(req.user);
        const { id, roll, store, loginas } = req.user;

        // Get filter parameters
        const filters = {
            status: req.query.status,
            from_date: req.query.from_date,
            to_date: req.query.to_date,
            limit: req.query.limit || 100
        };

        // If not master, filter by store
        if (loginas !== 0) {
            const rolldetail = await DataFind(`
        SELECT sr.*, r.roll_status, r.rollType 
        FROM tbl_staff_roll sr
        JOIN tbl_roll r ON sr.main_roll_id = r.id
        WHERE sr.id = ${roll}
      `);

            if (rolldetail[0].rollType !== 'master') {
                const admin = await DataFind(`SELECT store_ID FROM tbl_admin WHERE id = ${id}`);
                filters.store_id = admin[0].store_ID;
            }
        }

        const transactions = await getTransactions(filters);

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error('Get Transactions Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions'
        });
    }
});

/**
 * M-Pesa transactions view page
 * GET /mpesa/list
 */
router.get('/list', auth, async (req, res) => {
    try {
        const accessdata = await access(req.user);
        const transactions = await getTransactions({ limit: 50 });

        res.render('mpesa_transactions', {
            transactions,
            accessdata,
            language: req.language_data,
            language_name: req.language_name
        });

    } catch (error) {
        console.error('M-Pesa List Error:', error);
        req.flash('error', 'Failed to load M-Pesa transactions');
        res.redirect('/');
    }
});

/**
 * Manually match a transaction to an order
 * POST /mpesa/match/:transId
 */
router.post('/match/:transId', auth, async (req, res) => {
    try {
        const accessdata = await access(req.user);

        // Check permission
        if (!accessdata.orders || !accessdata.orders.includes('edit')) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const { transId } = req.params;
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        // Get the transaction
        const transactions = await DataFind(`
      SELECT * FROM tbl_mpesa_transactions WHERE id = ${transId}
    `);

        if (transactions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Try to match
        const result = await matchTransactionToOrder(parseInt(transId), orderId);

        if (result.matched) {
            res.json({
                success: true,
                message: `Payment matched to order #${result.orderNumber}`,
                data: result
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.reason || 'Failed to match payment'
            });
        }

    } catch (error) {
        console.error('Match Transaction Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to match transaction'
        });
    }
});

/**
 * Update M-Pesa settings
 * POST /mpesa/settings
 */
router.post('/settings', auth, async (req, res) => {
    try {
        const accessdata = await access(req.user);

        if (!accessdata.master_setting || !accessdata.master_setting.includes('edit')) {
            req.flash('error', 'Not authorized');
            return res.redirect('/');
        }

        const {
            mpesa_consumer_key,
            mpesa_consumer_secret,
            mpesa_shortcode,
            mpesa_passkey,
            mpesa_environment,
            mpesa_enabled
        } = req.body;

        const updates = [];

        if (mpesa_consumer_key && mpesa_consumer_key !== '*****') updates.push(`mpesa_consumer_key='${mpesa_consumer_key}'`);
        if (mpesa_consumer_secret && mpesa_consumer_secret !== '*****') updates.push(`mpesa_consumer_secret='${mpesa_consumer_secret}'`);
        if (mpesa_passkey && mpesa_passkey !== '*****') updates.push(`mpesa_passkey='${mpesa_passkey}'`);

        // Always update these non-sensitive fields
        updates.push(`mpesa_shortcode='${mpesa_shortcode}'`);
        updates.push(`mpesa_environment='${mpesa_environment || 'sandbox'}'`);
        updates.push(`mpesa_enabled=${mpesa_enabled ? 1 : 0}`);

        await DataUpdate(
            'tbl_master_shop',
            updates.join(', '),
            'id = 1'
        );

        req.flash('success', 'M-Pesa settings updated successfully');
        res.redirect('/tool/master_settings');

    } catch (error) {
        console.error('Update Settings Error:', error);
        req.flash('error', 'Failed to update M-Pesa settings');
        res.redirect('/tool/master_settings');
    }
});

/**
 * Test M-Pesa connection
 * GET /mpesa/test-connection
 */
router.get('/test-connection', auth, async (req, res) => {
    try {
        const accessdata = await access(req.user);

        if (!accessdata.master_setting) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Try to get access token
        const token = await getAccessToken();

        res.json({
            success: true,
            message: 'Connection successful',
            tokenPreview: token.substring(0, 20) + '...'
        });

    } catch (error) {
        console.error('Test Connection Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Connection failed'
        });
    }
});

module.exports = router;
