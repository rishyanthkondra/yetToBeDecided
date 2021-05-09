const Orders = require('../models/orders');
const User = require("../models/user");
const checksum_lib = require("../Paytm/checksum");
const config = require("../Paytm/config");

exports.order = async (req,res,next) => {

    const email = req.oidc.user.email;
    const usr = new User(email);
    const details_id = await usr.getDetailsId().catch(err=>console.log(err));
    
    const orderitem = new Orders();
    const checks = await orderitem.order_cond(details_id);
    // console.log(checks.rows.length)

    if(checks.rows.length > 0){
        // const credits = await orderitem.get_credits().catch(err => console.log(err));
        var cartvalue = await orderitem.get_cartvalue(details_id).catch(err => console.log(err));
        cartvalue = cartvalue.rows[0].cartvalue
        // console.log(cartvalue);

        const details = await usr.getDetailsUsingDetailsId(details_id);
        // console.log(details.rows[0])
    
        var paymentDetails = {
            amount: cartvalue.toString(),
            customerId:  details_id.toString(),
            customerEmail:  email,
            customerPhone: details.rows[0].phone_number
        }

        if(!paymentDetails.amount || !paymentDetails.customerId || !paymentDetails.customerEmail || !paymentDetails.customerPhone) {
            res.status(400).send('Payment failed')
        } else {
            var params = {};
            params['MID'] = config.PaytmConfig.mid;
            params['WEBSITE'] = config.PaytmConfig.website;
            params['CHANNEL_ID'] = 'WEB';
            params['INDUSTRY_TYPE_ID'] = 'Retail';
            params['ORDER_ID'] = 'TEST_'  + new Date().getTime();
            params['CUST_ID'] = paymentDetails.customerId;
            params['TXN_AMOUNT'] = paymentDetails.amount;
            params['CALLBACK_URL'] = 'http://localhost:3000/paytm/callback/'+details_id.toString();
            params['EMAIL'] = paymentDetails.customerEmail;
            params['MOBILE_NO'] = paymentDetails.customerPhone;
        
        
            checksum_lib.genchecksum(params, config.PaytmConfig.key, function (err, checksum) {
                var txn_url = "https://securegw-stage.paytm.in/theia/processTransaction"; // for staging
                // var txn_url = "https://securegw.paytm.in/theia/processTransaction"; // for production
        
                var form_fields = "";
                for (var x in params) {
                    form_fields += "<input type='hidden' name='" + x + "' value='" + params[x] + "' >";
                }
                form_fields += "<input type='hidden' name='CHECKSUMHASH' value='" + checksum + "' >";
        
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write('<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="' + txn_url + '" name="f1">' + form_fields + '</form><script type="text/javascript">document.f1.submit();</script></body></html>');
                res.end();
            });
        }

    }
    else{
        res.redirect('/cart');
    }

    
};

exports.get_orders = async (req,res,next) => {
    const orderitem = new Orders();
    const orders = await orderitem.get_all().catch(err => console.log(err));
    res.render('includes/orders.ejs', {
        pageTitle: 'Orders',
        path: '/orders',
        editing: false,
        items: orders.rows
    });
};