var nodemailer = require('nodemailer');

var transporter;

function init(config) {
    if (config.send_mails) {
        transporter = nodemailer.createTransport(config.mail_config);
    }
}
